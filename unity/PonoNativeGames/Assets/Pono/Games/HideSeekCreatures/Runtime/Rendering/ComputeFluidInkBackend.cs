using System;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.Experimental.Rendering;

namespace Pono.HideSeekCreatures.Rendering
{
    public sealed class ComputeFluidInkBackend : IInkVisualBackend
    {
        private const int MaxSplats = 16;
        private const float FixedStep = 1f / 30f;
        private const int MaxSubsteps = 2;
        private const float SimulationTailSeconds = 5f;
        private const float TerminalFadeSeconds = 1f;
        private const float PointerImpulse = 0.30f;
        private const float VelocitySplatRadiusScale = 1.35f;
        private const float PigmentSplatRadiusScale = 1.20f;
        private const float VelocityDissipation = 0.984f;
        private const float PigmentDissipation = 0.986f;
        private const float TerminalPigmentDissipation = 0.78f;
        private const float VorticityStrength = 0.015f;
        private static readonly GraphicsFormat FluidFormat = GraphicsFormat.R16G16B16A16_SFloat;

        private static readonly int Input0Id = Shader.PropertyToID("_Input0");
        private static readonly int Input1Id = Shader.PropertyToID("_Input1");
        private static readonly int OutputId = Shader.PropertyToID("_Output");
        private static readonly int ResolutionId = Shader.PropertyToID("_Resolution");
        private static readonly int DeltaTimeId = Shader.PropertyToID("_DeltaTime");
        private static readonly int DissipationId = Shader.PropertyToID("_Dissipation");
        private static readonly int AspectId = Shader.PropertyToID("_Aspect");
        private static readonly int SplatsId = Shader.PropertyToID("_Splats");
        private static readonly int SplatCountId = Shader.PropertyToID("_SplatCount");
        private static readonly int VelocityInputId = Shader.PropertyToID("_VelocityInput");
        private static readonly int PigmentInputId = Shader.PropertyToID("_PigmentInput");
        private static readonly int VelocityOutputId = Shader.PropertyToID("_VelocityOutput");
        private static readonly int PigmentOutputId = Shader.PropertyToID("_PigmentOutput");
        private static readonly int VorticityStrengthId = Shader.PropertyToID("_VorticityStrength");

        private readonly ComputeShader _shader;
        private readonly InkSplat[] _queuedSplats = new InkSplat[MaxSplats];
        private readonly GpuSplat[] _gpuSplats = new GpuSplat[MaxSplats];
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
        private ComputeBuffer _splatBuffer;
        private int _queuedCount;
        private float _accumulator;
        private float _simulationTail;
        private bool _simulationActive;

        public ComputeFluidInkBackend(ComputeShader asset, int height = 216, int pressureIterations = 12)
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
            _width = Mathf.Clamp(Mathf.RoundToInt(_height * (16f / 9f)), 256, 512);
            _pressureIterations = Mathf.Clamp(pressureIterations, 8, 20);
            _shader = UnityEngine.Object.Instantiate(asset);
            _shader.name = "FluidInk Compute (Runtime)";

            try
            {
                _clearKernel = _shader.FindKernel("Clear");
                _splatKernel = _shader.FindKernel("Splat");
                _advectKernel = _shader.FindKernel("Advect");
                _curlKernel = _shader.FindKernel("Curl");
                _vorticityKernel = _shader.FindKernel("ApplyVorticity");
                _divergenceKernel = _shader.FindKernel("Divergence");
                _pressureKernel = _shader.FindKernel("PressureJacobi");
                _projectKernel = _shader.FindKernel("Project");
                _splatBuffer = new ComputeBuffer(MaxSplats, GpuSplat.Stride, ComputeBufferType.Structured);
                AllocateTargets();
                Reset();
            }
            catch
            {
                Dispose();
                throw;
            }
        }

        public Texture OutputTexture => _dyeRead;
        public Texture VelocityTexture => _velocityRead;
        public string Label => $"GPU {_width}×{_height}";
        public bool IsReady => TargetsAreReady();

        public static bool IsSupported()
        {
            return SystemInfo.supportsComputeShaders
                && SystemInfo.IsFormatSupported(FluidFormat, GraphicsFormatUsage.LoadStore)
                && SystemInfo.IsFormatSupported(FluidFormat, GraphicsFormatUsage.Sample)
                && SystemInfo.IsFormatSupported(FluidFormat, GraphicsFormatUsage.Linear);
        }

        public void Inject(in InkSplat splat)
        {
            _simulationTail = SimulationTailSeconds;
            _simulationActive = true;
            if (_queuedCount < MaxSplats)
            {
                _queuedSplats[_queuedCount++] = splat;
                return;
            }

            // Retain the newest pointer position when a two-finger frame exceeds
            // the bounded queue instead of making the visible trail lag behind.
            _queuedSplats[MaxSplats - 1] = splat;
        }

        public void Tick(float unscaledDeltaTime)
        {
            if (!TargetsAreReady())
            {
                RecreateTargets();
            }
            if (!_simulationActive && _queuedCount == 0)
            {
                return;
            }

            _accumulator = Mathf.Min(
                _accumulator + Mathf.Clamp(unscaledDeltaTime, 0f, FixedStep * MaxSubsteps),
                FixedStep * MaxSubsteps);
            var substepCount = 0;
            while (_accumulator >= FixedStep && substepCount < MaxSubsteps)
            {
                if (substepCount == 0)
                {
                    ApplyQueuedSplats();
                }
                SimulateStep(FixedStep);
                _simulationTail = Mathf.Max(0f, _simulationTail - FixedStep);
                _accumulator -= FixedStep;
                substepCount++;
            }
            if (_simulationActive && _simulationTail <= 0f && _queuedCount == 0)
            {
                _simulationActive = false;
                _accumulator = 0f;
                ClearSimulationTargets();
            }
        }

        public void Reset()
        {
            if (!TargetsAreReady())
            {
                throw new InvalidOperationException("FluidInk render targets are unavailable.");
            }
            _queuedCount = 0;
            _accumulator = 0f;
            _simulationTail = 0f;
            _simulationActive = false;
            ClearSimulationTargets();
        }

        private void ClearSimulationTargets()
        {
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
            ReleaseAllTargets();
            _splatBuffer?.Release();
            _splatBuffer = null;
            DestroyOwned(_shader);
        }

        private void ApplyQueuedSplats()
        {
            if (_queuedCount == 0)
            {
                return;
            }

            var aspect = _width / (float)_height;
            for (var i = 0; i < _queuedCount; i++)
            {
                var splat = _queuedSplats[i];
                var pointerVelocity = new Vector2(splat.Velocity.x * aspect, splat.Velocity.y);
                var velocity = pointerVelocity * PointerImpulse;
                var speedAmount = Mathf.Clamp01(pointerVelocity.magnitude / 2.4f);
                var swirl = GetSwirlDirection(splat.Color) * Mathf.Lerp(0.08f, 0.22f, speedAmount);
                var pigmentStrength = Mathf.Clamp01(splat.Color.a);
                var pigment = new Vector4(
                    splat.Color.r * pigmentStrength * 0.92f,
                    splat.Color.g * pigmentStrength * 0.92f,
                    splat.Color.b * pigmentStrength * 0.92f,
                    pigmentStrength);
                var velocityRadius = Mathf.Max(0.006f, splat.Radius * VelocitySplatRadiusScale);
                var pigmentRadius = Mathf.Max(0.006f, splat.Radius * PigmentSplatRadiusScale);
                _gpuSplats[i] = new GpuSplat(
                    new Vector4(
                        splat.Uv.x,
                        splat.Uv.y,
                        1f / (velocityRadius * velocityRadius),
                        1f / (pigmentRadius * pigmentRadius)),
                    new Vector4(velocity.x, velocity.y, swirl, 0f),
                    pigment);
            }

            _splatBuffer.SetData(_gpuSplats, 0, 0, _queuedCount);
            _shader.SetInts(ResolutionId, _width, _height);
            _shader.SetFloat(AspectId, aspect);
            _shader.SetInt(SplatCountId, _queuedCount);
            _shader.SetBuffer(_splatKernel, SplatsId, _splatBuffer);
            _shader.SetTexture(_splatKernel, VelocityInputId, _velocityRead);
            _shader.SetTexture(_splatKernel, PigmentInputId, _dyeRead);
            _shader.SetTexture(_splatKernel, VelocityOutputId, _velocityWrite);
            _shader.SetTexture(_splatKernel, PigmentOutputId, _dyeWrite);
            DispatchKernel(_splatKernel);
            Swap(ref _velocityRead, ref _velocityWrite);
            Swap(ref _dyeRead, ref _dyeWrite);
            _queuedCount = 0;
        }

        private void SimulateStep(float deltaTime)
        {
            AdvectVelocity(deltaTime);
            ApplyVorticity(deltaTime);
            ProjectVelocity();
            AdvectDye(deltaTime);
        }

        private void AdvectVelocity(float deltaTime)
        {
            Dispatch(_advectKernel, _velocityRead, _velocityRead, _velocityWrite, VelocityDissipation, deltaTime);
            Swap(ref _velocityRead, ref _velocityWrite);
        }

        private void ApplyVorticity(float deltaTime)
        {
            Dispatch(_curlKernel, _velocityRead, Texture2D.blackTexture, _curl, 1f, deltaTime);
            _shader.SetFloat(VorticityStrengthId, VorticityStrength);
            Dispatch(_vorticityKernel, _velocityRead, _curl, _velocityWrite, 1f, deltaTime);
            Swap(ref _velocityRead, ref _velocityWrite);
        }

        private void ProjectVelocity()
        {
            Dispatch(_divergenceKernel, _velocityRead, Texture2D.blackTexture, _divergence, 1f, FixedStep);
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
            var terminalFade = Mathf.Clamp01(1f - _simulationTail / TerminalFadeSeconds);
            var dissipation = Mathf.Lerp(
                PigmentDissipation,
                TerminalPigmentDissipation,
                terminalFade);
            Dispatch(_advectKernel, _dyeRead, _velocityRead, _dyeWrite, dissipation, deltaTime);
            Swap(ref _dyeRead, ref _dyeWrite);
        }

        private static float GetSwirlDirection(Color color)
        {
            // The three stage pigments alternate rotation direction without storing
            // pointer-specific state, so every sample in one stroke reinforces its vortex.
            return color.b >= color.r && color.b >= color.g ? 1f : -1f;
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
            DispatchKernel(kernel);
        }

        private void DispatchKernel(int kernel)
        {
            _shader.GetKernelThreadGroupSizes(kernel, out var tx, out var ty, out _);
            _shader.Dispatch(kernel, Mathf.CeilToInt(_width / (float)tx), Mathf.CeilToInt(_height / (float)ty), 1);
        }

        private void AllocateTargets()
        {
            try
            {
                _velocityRead = CreateTarget("FluidInk Velocity A");
                _velocityWrite = CreateTarget("FluidInk Velocity B");
                _dyeRead = CreateTarget("FluidInk Pigment A");
                _dyeWrite = CreateTarget("FluidInk Pigment B");
                _pressureRead = CreateTarget("FluidInk Pressure A");
                _pressureWrite = CreateTarget("FluidInk Pressure B");
                _divergence = CreateTarget("FluidInk Divergence");
                _curl = CreateTarget("FluidInk Curl");
                if (!TargetsAreReady())
                {
                    throw new InvalidOperationException("FluidInk render target allocation was incomplete.");
                }
            }
            catch
            {
                ReleaseAllTargets();
                throw;
            }
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
            if (!target.Create() || !target.IsCreated())
            {
                DestroyOwned(target);
                throw new InvalidOperationException($"Could not create render target '{name}'.");
            }
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
            ReleaseAllTargets();
            AllocateTargets();
            Reset();
        }

        private void ReleaseAllTargets()
        {
            ReleaseTarget(ref _velocityRead);
            ReleaseTarget(ref _velocityWrite);
            ReleaseTarget(ref _dyeRead);
            ReleaseTarget(ref _dyeWrite);
            ReleaseTarget(ref _pressureRead);
            ReleaseTarget(ref _pressureWrite);
            ReleaseTarget(ref _divergence);
            ReleaseTarget(ref _curl);
        }

        private void ClearTarget(RenderTexture target)
        {
            if (target == null || !target.IsCreated())
            {
                return;
            }
            _shader.SetInts(ResolutionId, _width, _height);
            _shader.SetTexture(_clearKernel, OutputId, target);
            DispatchKernel(_clearKernel);
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
            if (Application.isEditor)
            {
                UnityEngine.Object.DestroyImmediate(target);
            }
            else
            {
                UnityEngine.Object.Destroy(target);
            }
        }

        private static void Swap<T>(ref T left, ref T right)
        {
            (left, right) = (right, left);
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GpuSplat
        {
            public const int Stride = sizeof(float) * 12;

            public GpuSplat(Vector4 centerRadii, Vector4 velocitySwirl, Vector4 pigment)
            {
                CenterRadii = centerRadii;
                VelocitySwirl = velocitySwirl;
                Pigment = pigment;
            }

            public Vector4 CenterRadii;
            public Vector4 VelocitySwirl;
            public Vector4 Pigment;
        }
    }
}
