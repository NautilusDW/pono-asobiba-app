using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Experimental.Rendering;

namespace Pono.FluidMarbleLab
{
    public enum FluidQuality
    {
        Beautiful,
        Balanced,
        Light
    }

    /// <summary>
    /// Runs a visual GPU fluid and an independent CPU gameplay field from the same splats.
    /// GPU data is never read back into game physics.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class FluidSimulationController : MonoBehaviour
    {
        private const float CpuStep = 1f / 30f;
        private const int MaxQueuedSplats = 16;
        private static readonly GraphicsFormat FluidFormat = GraphicsFormat.R16G16B16A16_SFloat;

        private static readonly int Input0Id = Shader.PropertyToID("_Input0");
        private static readonly int Input1Id = Shader.PropertyToID("_Input1");
        private static readonly int OutputId = Shader.PropertyToID("_Output");
        private static readonly int ResolutionId = Shader.PropertyToID("_Resolution");
        private static readonly int DeltaTimeId = Shader.PropertyToID("_DeltaTime");
        private static readonly int DissipationId = Shader.PropertyToID("_Dissipation");
        private static readonly int AspectId = Shader.PropertyToID("_Aspect");
        private static readonly int SplatCenterId = Shader.PropertyToID("_SplatCenter");
        private static readonly int SplatValueId = Shader.PropertyToID("_SplatValue");
        private static readonly int SplatInvRadiusSquaredId = Shader.PropertyToID("_SplatInvRadiusSquared");
        private static readonly int VorticityStrengthId = Shader.PropertyToID("_VorticityStrength");
        private static readonly int DyeTextureId = Shader.PropertyToID("_DyeTex");
        private static readonly int VelocityTextureId = Shader.PropertyToID("_VelocityTex");

        [SerializeField] private ComputeShader computeShaderAsset;
        [SerializeField] private Renderer surfaceRenderer;
        [SerializeField] private FluidQuality quality = FluidQuality.Balanced;
        [SerializeField] private bool forceCpuFallback;

        private readonly List<Splat> queuedSplats = new List<Splat>(32);
        private readonly Dictionary<int, Vector2Int> threadGroupSizes = new Dictionary<int, Vector2Int>(8);

        private ComputeShader shader;
        private Material surfaceMaterial;
        private CpuFlowField2D cpuField;
        private RenderTexture velocityRead;
        private RenderTexture velocityWrite;
        private RenderTexture dyeRead;
        private RenderTexture dyeWrite;
        private RenderTexture pressureRead;
        private RenderTexture pressureWrite;
        private RenderTexture divergence;
        private RenderTexture curl;

        private int clearKernel;
        private int splatKernel;
        private int advectKernel;
        private int curlKernel;
        private int vorticityKernel;
        private int divergenceKernel;
        private int pressureKernel;
        private int projectKernel;
        private int simulationWidth;
        private int simulationHeight;
        private int pressureIterations;
        private float vorticityStrength;
        private float cpuAccumulator;
        private bool initialized;
        private bool gpuActive;

        public CpuFlowField2D CpuField => cpuField;
        public bool GpuActive => gpuActive;
        public FluidQuality Quality => quality;
        public Vector2Int SimulationSize => new Vector2Int(simulationWidth, simulationHeight);
        public string BackendLabel => gpuActive
            ? $"GPU {simulationWidth}×{simulationHeight}"
            : $"CPU {cpuField?.Width ?? 0}×{cpuField?.Height ?? 0}";

        public void Configure(ComputeShader fluidShader, Renderer renderer)
        {
            computeShaderAsset = fluidShader;
            surfaceRenderer = renderer;
            Reinitialize();
        }

        private void Awake()
        {
            Initialize();
        }

        private void OnEnable()
        {
            if (!initialized)
            {
                Initialize();
            }
        }

        private void Update()
        {
            if (!initialized)
            {
                return;
            }

            if (gpuActive && !GpuTargetsAreCreated())
            {
                ReleaseGpuResources();
                TryInitializeGpu();
            }

            var deltaTime = Mathf.Min(Time.unscaledDeltaTime, 1f / 20f);
            cpuAccumulator = Mathf.Min(cpuAccumulator + deltaTime, CpuStep * 3f);
            while (cpuAccumulator >= CpuStep)
            {
                cpuField.Step(CpuStep);
                cpuAccumulator -= CpuStep;
            }

            if (gpuActive)
            {
                StepGpu(deltaTime);
            }
            else
            {
                queuedSplats.Clear();
            }

            UpdateSurfaceTextures();
        }

        private void OnDestroy()
        {
            ReleaseResources();
            cpuField?.Dispose();
            cpuField = null;
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (hasFocus && initialized && !forceCpuFallback && !GpuTargetsAreCreated())
            {
                ReleaseGpuResources();
                TryInitializeGpu();
                UpdateSurfaceTextures();
            }
        }

        public void Inject(Vector2 uv, Vector2 uvVelocity, Color color, float radius = 0.055f)
        {
            if (!initialized)
            {
                Initialize();
            }

            uv.x = Mathf.Clamp01(uv.x);
            uv.y = Mathf.Clamp01(uv.y);
            uvVelocity = Vector2.ClampMagnitude(uvVelocity, 3f);
            radius = Mathf.Clamp(radius, 0.012f, 0.22f);
            color.a = 1f;
            cpuField.Inject(uv, uvVelocity * 0.72f, color, radius * 1.18f);

            if (queuedSplats.Count < MaxQueuedSplats)
            {
                queuedSplats.Add(new Splat(uv, uvVelocity, color, radius));
            }
        }

        public void ResetSimulation()
        {
            queuedSplats.Clear();
            cpuAccumulator = 0f;
            cpuField?.Clear();
            if (gpuActive)
            {
                ClearAllTargets();
            }
            UpdateSurfaceTextures();
        }

        public void CycleQuality()
        {
            quality = quality switch
            {
                FluidQuality.Beautiful => FluidQuality.Balanced,
                FluidQuality.Balanced => FluidQuality.Light,
                _ => FluidQuality.Beautiful
            };
            Reinitialize();
        }

        public void SetCpuFallback(bool enabled)
        {
            if (forceCpuFallback == enabled)
            {
                return;
            }
            forceCpuFallback = enabled;
            Reinitialize();
        }

        private void Initialize()
        {
            if (initialized)
            {
                return;
            }

            initialized = true;
            if (surfaceMaterial == null && surfaceRenderer != null && surfaceRenderer.sharedMaterial != null)
            {
                surfaceMaterial = new Material(surfaceRenderer.sharedMaterial)
                {
                    name = "Fluid Surface (Runtime)"
                };
                surfaceRenderer.sharedMaterial = surfaceMaterial;
            }

            ConfigureQuality();
            var cpuHeight = 27;
            var cpuWidth = Mathf.Clamp(Mathf.RoundToInt(cpuHeight * simulationWidth / (float)simulationHeight), 32, 64);
            if (cpuField == null || cpuField.Width != cpuWidth || cpuField.Height != cpuHeight)
            {
                cpuField?.Dispose();
                cpuField = new CpuFlowField2D(cpuWidth, cpuHeight);
            }
            TryInitializeGpu();
            UpdateSurfaceTextures();
        }

        private void Reinitialize()
        {
            ReleaseGpuResources();
            initialized = false;
            Initialize();
            ResetSimulation();
        }

        private void ConfigureQuality()
        {
            switch (quality)
            {
                case FluidQuality.Beautiful:
                    simulationHeight = 288;
                    pressureIterations = 18;
                    vorticityStrength = 0.32f;
                    break;
                case FluidQuality.Light:
                    simulationHeight = 144;
                    pressureIterations = 8;
                    vorticityStrength = 0.12f;
                    break;
                default:
                    simulationHeight = 216;
                    pressureIterations = 12;
                    vorticityStrength = 0.24f;
                    break;
            }

            var aspect = Screen.height > 0 ? Screen.width / (float)Screen.height : 16f / 9f;
            simulationWidth = Mathf.RoundToInt(simulationHeight * aspect);
            if (simulationWidth > 512)
            {
                simulationWidth = 512;
                simulationHeight = Mathf.Max(128, Mathf.RoundToInt(simulationWidth / aspect));
            }
            else if (simulationWidth < 128)
            {
                simulationWidth = 128;
                simulationHeight = Mathf.Max(128, Mathf.RoundToInt(simulationWidth / Mathf.Max(0.5f, aspect)));
            }
        }

        private void TryInitializeGpu()
        {
            gpuActive = false;
            if (forceCpuFallback || computeShaderAsset == null || !SystemInfo.supportsComputeShaders)
            {
                return;
            }

            if (!SystemInfo.IsFormatSupported(FluidFormat, GraphicsFormatUsage.LoadStore)
                || !SystemInfo.IsFormatSupported(FluidFormat, GraphicsFormatUsage.Sample)
                || !SystemInfo.IsFormatSupported(FluidFormat, GraphicsFormatUsage.Linear))
            {
                return;
            }

            try
            {
                shader = Instantiate(computeShaderAsset);
                shader.name = "Fluid Solver (Runtime)";
                CacheKernels();
                velocityRead = CreateTarget("Velocity A");
                velocityWrite = CreateTarget("Velocity B");
                dyeRead = CreateTarget("Dye A");
                dyeWrite = CreateTarget("Dye B");
                pressureRead = CreateTarget("Pressure A");
                pressureWrite = CreateTarget("Pressure B");
                divergence = CreateTarget("Divergence");
                curl = CreateTarget("Curl");
                ClearAllTargets();
                gpuActive = true;
            }
            catch (Exception exception)
            {
                Debug.LogWarning($"GPU fluid unavailable; using CPU fallback. {exception.Message}", this);
                ReleaseGpuResources();
                gpuActive = false;
            }
        }

        private void CacheKernels()
        {
            clearKernel = CacheKernel("Clear");
            splatKernel = CacheKernel("Splat");
            advectKernel = CacheKernel("Advect");
            curlKernel = CacheKernel("Curl");
            vorticityKernel = CacheKernel("ApplyVorticity");
            divergenceKernel = CacheKernel("Divergence");
            pressureKernel = CacheKernel("PressureJacobi");
            projectKernel = CacheKernel("Project");
            shader.SetInts(ResolutionId, simulationWidth, simulationHeight);
            shader.SetFloat(AspectId, simulationWidth / (float)simulationHeight);
        }

        private int CacheKernel(string name)
        {
            var kernel = shader.FindKernel(name);
            shader.GetKernelThreadGroupSizes(kernel, out var x, out var y, out _);
            threadGroupSizes[kernel] = new Vector2Int(Mathf.Max(1, (int)x), Mathf.Max(1, (int)y));
            return kernel;
        }

        private RenderTexture CreateTarget(string label)
        {
            var descriptor = new RenderTextureDescriptor(simulationWidth, simulationHeight, FluidFormat, 0)
            {
                msaaSamples = 1,
                volumeDepth = 1,
                enableRandomWrite = true,
                useMipMap = false,
                autoGenerateMips = false,
                sRGB = false,
                dimension = UnityEngine.Rendering.TextureDimension.Tex2D
            };
            var target = new RenderTexture(descriptor)
            {
                name = $"Fluid {label}",
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.DontSave
            };
            if (!target.Create() || !target.IsCreated())
            {
                DestroyOwnedObject(target);
                throw new InvalidOperationException($"Could not create {label} render texture.");
            }
            return target;
        }

        private void StepGpu(float deltaTime)
        {
            shader.SetFloat(DeltaTimeId, deltaTime);

            shader.SetFloat(DissipationId, Mathf.Exp(-0.21f * deltaTime));
            Dispatch(advectKernel, velocityRead, velocityRead, velocityWrite);
            Swap(ref velocityRead, ref velocityWrite);

            Dispatch(curlKernel, velocityRead, Texture2D.blackTexture, curl);
            shader.SetFloat(VorticityStrengthId, vorticityStrength);
            Dispatch(vorticityKernel, velocityRead, curl, velocityWrite);
            Swap(ref velocityRead, ref velocityWrite);

            for (var i = 0; i < queuedSplats.Count; i++)
            {
                var splat = queuedSplats[i];
                ConfigureSplat(splat, new Vector4(splat.Velocity.x, splat.Velocity.y, 0f, 0f));
                Dispatch(splatKernel, velocityRead, Texture2D.blackTexture, velocityWrite);
                Swap(ref velocityRead, ref velocityWrite);
            }

            Dispatch(divergenceKernel, velocityRead, Texture2D.blackTexture, divergence);
            for (var i = 0; i < pressureIterations; i++)
            {
                Dispatch(pressureKernel, pressureRead, divergence, pressureWrite);
                Swap(ref pressureRead, ref pressureWrite);
            }

            Dispatch(projectKernel, velocityRead, pressureRead, velocityWrite);
            Swap(ref velocityRead, ref velocityWrite);

            shader.SetFloat(DissipationId, Mathf.Exp(-0.055f * deltaTime));
            Dispatch(advectKernel, dyeRead, velocityRead, dyeWrite);
            Swap(ref dyeRead, ref dyeWrite);

            for (var i = 0; i < queuedSplats.Count; i++)
            {
                var splat = queuedSplats[i];
                ConfigureSplat(splat, new Vector4(splat.Color.r, splat.Color.g, splat.Color.b, 1f));
                Dispatch(splatKernel, dyeRead, Texture2D.blackTexture, dyeWrite);
                Swap(ref dyeRead, ref dyeWrite);
            }

            queuedSplats.Clear();
        }

        private void ConfigureSplat(Splat splat, Vector4 value)
        {
            shader.SetVector(SplatCenterId, splat.Uv);
            shader.SetVector(SplatValueId, value);
            shader.SetFloat(SplatInvRadiusSquaredId, 3.2f / Mathf.Max(0.0001f, splat.Radius * splat.Radius));
        }

        private void ClearAllTargets()
        {
            ClearTarget(velocityRead);
            ClearTarget(velocityWrite);
            ClearTarget(dyeRead);
            ClearTarget(dyeWrite);
            ClearTarget(pressureRead);
            ClearTarget(pressureWrite);
            ClearTarget(divergence);
            ClearTarget(curl);
        }

        private void ClearTarget(RenderTexture target)
        {
            Dispatch(clearKernel, Texture2D.blackTexture, Texture2D.blackTexture, target);
        }

        private void Dispatch(int kernel, Texture input0, Texture input1, RenderTexture output)
        {
            shader.SetTexture(kernel, Input0Id, input0 != null ? input0 : Texture2D.blackTexture);
            shader.SetTexture(kernel, Input1Id, input1 != null ? input1 : Texture2D.blackTexture);
            shader.SetTexture(kernel, OutputId, output);
            var threads = threadGroupSizes[kernel];
            var groupsX = Mathf.CeilToInt(simulationWidth / (float)threads.x);
            var groupsY = Mathf.CeilToInt(simulationHeight / (float)threads.y);
            shader.Dispatch(kernel, groupsX, groupsY, 1);
        }

        private void UpdateSurfaceTextures()
        {
            if (surfaceMaterial == null || cpuField == null)
            {
                return;
            }

            if (gpuActive && dyeRead != null && velocityRead != null)
            {
                surfaceMaterial.SetTexture(DyeTextureId, dyeRead);
                surfaceMaterial.SetTexture(VelocityTextureId, velocityRead);
            }
            else
            {
                surfaceMaterial.SetTexture(DyeTextureId, cpuField.DisplayTexture);
                surfaceMaterial.SetTexture(VelocityTextureId, Texture2D.blackTexture);
            }
        }

        private void ReleaseResources()
        {
            ReleaseGpuResources();
            DestroyOwnedObject(surfaceMaterial);
            surfaceMaterial = null;
            initialized = false;
        }

        private bool GpuTargetsAreCreated()
        {
            return velocityRead != null && velocityRead.IsCreated()
                && velocityWrite != null && velocityWrite.IsCreated()
                && dyeRead != null && dyeRead.IsCreated()
                && dyeWrite != null && dyeWrite.IsCreated()
                && pressureRead != null && pressureRead.IsCreated()
                && pressureWrite != null && pressureWrite.IsCreated()
                && divergence != null && divergence.IsCreated()
                && curl != null && curl.IsCreated();
        }

        private void ReleaseGpuResources()
        {
            ReleaseTarget(ref velocityRead);
            ReleaseTarget(ref velocityWrite);
            ReleaseTarget(ref dyeRead);
            ReleaseTarget(ref dyeWrite);
            ReleaseTarget(ref pressureRead);
            ReleaseTarget(ref pressureWrite);
            ReleaseTarget(ref divergence);
            ReleaseTarget(ref curl);
            DestroyOwnedObject(shader);
            shader = null;
            threadGroupSizes.Clear();
            gpuActive = false;
        }

        private static void ReleaseTarget(ref RenderTexture target)
        {
            if (target == null)
            {
                return;
            }
            if (target.IsCreated())
            {
                target.Release();
            }
            DestroyOwnedObject(target);
            target = null;
        }

        private static void DestroyOwnedObject(UnityEngine.Object target)
        {
            if (target == null)
            {
                return;
            }
            if (Application.isPlaying)
            {
                Destroy(target);
            }
            else
            {
                DestroyImmediate(target);
            }
        }

        private static void Swap<T>(ref T left, ref T right)
        {
            (left, right) = (right, left);
        }

        private readonly struct Splat
        {
            public readonly Vector2 Uv;
            public readonly Vector2 Velocity;
            public readonly Color Color;
            public readonly float Radius;

            public Splat(Vector2 uv, Vector2 velocity, Color color, float radius)
            {
                Uv = uv;
                Velocity = velocity;
                Color = color;
                Radius = radius;
            }
        }
    }
}
