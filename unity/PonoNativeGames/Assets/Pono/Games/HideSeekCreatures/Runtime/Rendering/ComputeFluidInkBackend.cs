using System;
using UnityEngine;
using UnityEngine.Experimental.Rendering;

namespace Pono.HideSeekCreatures.Rendering
{
    public sealed class ComputeFluidInkBackend : IInkVisualBackend
    {
        private const int MaxSplats = 12;
        private const float FixedStep = 1f / 30f;
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

        private readonly ComputeShader _shader;
        private readonly InkSplat[] _queuedSplats = new InkSplat[MaxSplats];
        private readonly int _width;
        private readonly int _height;
        private readonly int _pressureIterations;
        private readonly int _clearKernel;
        private readonly int _splatKernel;
        private readonly int _advectKernel;
        private readonly int _curlKernel;
        private readonly int _vorticityKernel;
        private readonly int _divergenceKernel;
        private readonly int _pressureKernel;
        private readonly int _projectKernel;

        private RenderTexture _velocityRead;
        private RenderTexture _velocityWrite;
        private RenderTexture _dyeRead;
        private RenderTexture _dyeWrite;
        private RenderTexture _pressureRead;
        private RenderTexture _pressureWrite;
        private RenderTexture _divergence;
        private RenderTexture _curl;
        private int _queuedCount;
        private float _accumulator;

        public ComputeFluidInkBackend(ComputeShader asset, int height = 216, int pressureIterations = 10)
        {
            if (!IsSupported())
            {
                throw new NotSupportedException("Compute FluidInk is not supported on this device.");
            }
            if (asset == null)
            {
                throw new ArgumentNullException(nameof(asset));
            }

            _height = Mathf.Clamp(height, 144, 288);
            var aspect = Screen.height > 0 ? Screen.width / (float)Screen.height : 16f / 9f;
            _width = Mathf.Clamp(Mathf.RoundToInt(_height * aspect), 256, 512);
            _pressureIterations = Mathf.Clamp(pressureIterations, 6, 18);
            _shader = UnityEngine.Object.Instantiate(asset);
            _shader.name = "FluidInk Compute (Runtime)";

            _clearKernel = _shader.FindKernel("Clear");
            _splatKernel = _shader.FindKernel("Splat");
            _advectKernel = _shader.FindKernel("Advect");
            _curlKernel = _shader.FindKernel("Curl");
            _vorticityKernel = _shader.FindKernel("ApplyVorticity");
            _divergenceKernel = _shader.FindKernel("Divergence");
            _pressureKernel = _shader.FindKernel("PressureJacobi");
            _projectKernel = _shader.FindKernel("Project");
            AllocateTargets();
            Reset();
        }

        public Texture OutputTexture => _dyeRead;
        public Texture VelocityTexture => _velocityRead;
        public string Label => $"GPU {_width}×{_height}";
        public bool IsReady => TargetsAreReady();

        public static bool IsSupported()
        {
            return SystemInfo.supportsComputeShaders
                && SystemInfo.IsFormatSupported(FluidFormat, FormatUsage.LoadStore)
                && SystemInfo.IsFormatSupported(FluidFormat, FormatUsage.Sample);
        }

        public void Inject(in InkSplat splat)
        {
            if (_queuedCount < MaxSplats)
            {
                _queuedSplats[_queuedCount++] = splat;
            }
        }

        public void Tick(float unscaledDeltaTime)
        {
            if (!TargetsAreReady())
            {
                RecreateTargets();
            }

            _accumulator = Mathf.Min(_accumulator + Mathf.Min(unscaledDeltaTime, 0.05f), FixedStep * 2f);
            if (_accumulator < FixedStep)
            {
                return;
            }

            _accumulator -= FixedStep;
            ApplyQueuedSplats();
            AdvectVelocity(FixedStep);
            ApplyVorticity(FixedStep);
            ProjectVelocity();
            AdvectDye(FixedStep);
        }

        public void Reset()
        {
            _queuedCount = 0;
            _accumulator = 0f;
            ClearTarget(_velocityRead);
            ClearTarget(_velocityWrite);
            ClearTarget(_dyeRead);
            ClearTarget(_dyeWrite);
            ClearTarget(_pressureRead);
            ClearTarget(_pressureWrite);
            ClearTarget(_divergence);
            ClearTarget(_curl);
        }

        public void Dispose()
        {
            ReleaseTarget(ref _velocityRead);
            ReleaseTarget(ref _velocityWrite);
            ReleaseTarget(ref _dyeRead);
            ReleaseTarget(ref _dyeWrite);
            ReleaseTarget(ref _pressureRead);
            ReleaseTarget(ref _pressureWrite);
            ReleaseTarget(ref _divergence);
            ReleaseTarget(ref _curl);
            DestroyOwned(_shader);
        }

        private void ApplyQueuedSplats()
        {
            for (var i = 0; i < _queuedCount; i++)
            {
                var splat = _queuedSplats[i];
                var velocity = splat.Velocity * 0.38f;
                Splat(ref _velocityRead, ref _velocityWrite, new Vector4(velocity.x, velocity.y, 0f, 0f), splat);
                var pigment = (Vector4)splat.Color * 0.78f;
                pigment.w = 0.9f;
                Splat(ref _dyeRead, ref _dyeWrite, pigment, splat);
            }
            _queuedCount = 0;
        }

        private void Splat(ref RenderTexture read, ref RenderTexture write, Vector4 value, in InkSplat splat)
        {
            _shader.SetVector(SplatCenterId, splat.Uv);
            _shader.SetVector(SplatValueId, value);
            _shader.SetFloat(SplatInvRadiusSquaredId, 1f / Mathf.Max(0.0001f, splat.Radius * splat.Radius));
            Dispatch(_splatKernel, read, Texture2D.blackTexture, write, 1f, FixedStep);
            Swap(ref read, ref write);
        }

        private void AdvectVelocity(float deltaTime)
        {
            Dispatch(_advectKernel, _velocityRead, _velocityRead, _velocityWrite, 0.994f, deltaTime);
            Swap(ref _velocityRead, ref _velocityWrite);
        }

        private void ApplyVorticity(float deltaTime)
        {
            Dispatch(_curlKernel, _velocityRead, Texture2D.blackTexture, _curl, 1f, deltaTime);
            _shader.SetFloat(VorticityStrengthId, 0.22f);
            Dispatch(_vorticityKernel, _velocityRead, _curl, _velocityWrite, 1f, deltaTime);
            Swap(ref _velocityRead, ref _velocityWrite);
        }

        private void ProjectVelocity()
        {
            Dispatch(_divergenceKernel, _velocityRead, Texture2D.blackTexture, _divergence, 1f, FixedStep);
            ClearTarget(_pressureRead);
            ClearTarget(_pressureWrite);
            for (var i = 0; i < _pressureIterations; i++)
            {
                Dispatch(_pressureKernel, _pressureRead, _divergence, _pressureWrite, 1f, FixedStep);
                Swap(ref _pressureRead, ref _pressureWrite);
            }
            Dispatch(_projectKernel, _velocityRead, _pressureRead, _velocityWrite, 1f, FixedStep);
            Swap(ref _velocityRead, ref _velocityWrite);
        }

        private void AdvectDye(float deltaTime)
        {
            Dispatch(_advectKernel, _dyeRead, _velocityRead, _dyeWrite, 0.998f, deltaTime);
            Swap(ref _dyeRead, ref _dyeWrite);
        }

        private void Dispatch(int kernel, Texture input0, Texture input1, RenderTexture output, float dissipation, float deltaTime)
        {
            _shader.SetInts(ResolutionId, _width, _height);
            _shader.SetFloat(DeltaTimeId, deltaTime);
            _shader.SetFloat(DissipationId, dissipation);
            _shader.SetFloat(AspectId, _width / (float)_height);
            _shader.SetTexture(kernel, Input0Id, input0);
            _shader.SetTexture(kernel, Input1Id, input1);
            _shader.SetTexture(kernel, OutputId, output);
            _shader.GetKernelThreadGroupSizes(kernel, out var tx, out var ty, out _);
            _shader.Dispatch(kernel, Mathf.CeilToInt(_width / (float)tx), Mathf.CeilToInt(_height / (float)ty), 1);
        }

        private void AllocateTargets()
        {
            _velocityRead = CreateTarget("FluidInk Velocity A");
            _velocityWrite = CreateTarget("FluidInk Velocity B");
            _dyeRead = CreateTarget("FluidInk Pigment A");
            _dyeWrite = CreateTarget("FluidInk Pigment B");
            _pressureRead = CreateTarget("FluidInk Pressure A");
            _pressureWrite = CreateTarget("FluidInk Pressure B");
            _divergence = CreateTarget("FluidInk Divergence");
            _curl = CreateTarget("FluidInk Curl");
        }

        private RenderTexture CreateTarget(string name)
        {
            var descriptor = new RenderTextureDescriptor(_width, _height)
            {
                graphicsFormat = FluidFormat,
                depthBufferBits = 0,
                msaaSamples = 1,
                volumeDepth = 1,
                dimension = UnityEngine.Rendering.TextureDimension.Tex2D,
                enableRandomWrite = true,
                useMipMap = false,
                autoGenerateMips = false,
                sRGB = false
            };
            var target = new RenderTexture(descriptor)
            {
                name = name,
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.DontSave
            };
            target.Create();
            return target;
        }

        private bool TargetsAreReady()
        {
            return _velocityRead != null && _velocityRead.IsCreated()
                && _velocityWrite != null && _velocityWrite.IsCreated()
                && _dyeRead != null && _dyeRead.IsCreated()
                && _dyeWrite != null && _dyeWrite.IsCreated()
                && _pressureRead != null && _pressureRead.IsCreated()
                && _pressureWrite != null && _pressureWrite.IsCreated()
                && _divergence != null && _divergence.IsCreated()
                && _curl != null && _curl.IsCreated();
        }

        private void RecreateTargets()
        {
            ReleaseTarget(ref _velocityRead);
            ReleaseTarget(ref _velocityWrite);
            ReleaseTarget(ref _dyeRead);
            ReleaseTarget(ref _dyeWrite);
            ReleaseTarget(ref _pressureRead);
            ReleaseTarget(ref _pressureWrite);
            ReleaseTarget(ref _divergence);
            ReleaseTarget(ref _curl);
            AllocateTargets();
            Reset();
        }

        private static void ClearTarget(RenderTexture target)
        {
            if (target == null || !target.IsCreated())
            {
                return;
            }
            var previous = RenderTexture.active;
            RenderTexture.active = target;
            GL.Clear(clearDepth: false, clearColor: true, Color.clear);
            RenderTexture.active = previous;
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
            DestroyOwned(target);
            target = null;
        }

        private static void DestroyOwned(UnityEngine.Object target)
        {
            if (target == null)
            {
                return;
            }
            if (Application.isPlaying)
            {
                UnityEngine.Object.Destroy(target);
            }
            else
            {
                UnityEngine.Object.DestroyImmediate(target);
            }
        }

        private static void Swap<T>(ref T left, ref T right)
        {
            (left, right) = (right, left);
        }
    }
}
