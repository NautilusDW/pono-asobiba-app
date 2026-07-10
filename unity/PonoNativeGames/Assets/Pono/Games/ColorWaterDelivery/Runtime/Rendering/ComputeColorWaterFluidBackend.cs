using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.Experimental.Rendering;
using UnityEngine.Rendering;

namespace Pono.ColorWaterDelivery.Rendering
{
    public sealed class ComputeColorWaterFluidBackend : IColorWaterFluidBackend
    {
        private const int ThreadGroupSize = 8;
        private const int MaxSplats = 32;
        private const int MaxObstacles = 32;
        private const int GoalMetricCount = 6;
        private const float GoalMetricScale = 4096f;
        private const float GoalSinkRatePerSecond = 4.8f;
        private const float FixedStep = 1f / 30f;
        private const int MaxSubsteps = 2;
        private const float SimulationTailSeconds = 6f;
        private const float VelocityDissipation = 0.986f;
        private const float PigmentDissipation = 0.987f;
        private const float VorticityStrength = 0.012f;
        private const float SourceImpulse = 0.45f;
        private static readonly GraphicsFormat FluidFormat =
            GraphicsFormat.R16G16B16A16_SFloat;

        private static readonly int Input0Id = Shader.PropertyToID("_Input0");
        private static readonly int Input1Id = Shader.PropertyToID("_Input1");
        private static readonly int OutputId = Shader.PropertyToID("_Output");
        private static readonly int ResolutionId = Shader.PropertyToID("_Resolution");
        private static readonly int DeltaTimeId = Shader.PropertyToID("_DeltaTime");
        private static readonly int DissipationId = Shader.PropertyToID("_Dissipation");
        private static readonly int AspectId = Shader.PropertyToID("_Aspect");
        private static readonly int VorticityStrengthId =
            Shader.PropertyToID("_VorticityStrength");
        private static readonly int FieldKindId = Shader.PropertyToID("_FieldKind");
        private static readonly int SplatsId = Shader.PropertyToID("_Splats");
        private static readonly int SplatCountId = Shader.PropertyToID("_SplatCount");
        private static readonly int ObstaclesId = Shader.PropertyToID("_Obstacles");
        private static readonly int ObstacleCountId = Shader.PropertyToID("_ObstacleCount");
        private static readonly int VelocityInputId = Shader.PropertyToID("_VelocityInput");
        private static readonly int PigmentInputId = Shader.PropertyToID("_PigmentInput");
        private static readonly int VelocityOutputId = Shader.PropertyToID("_VelocityOutput");
        private static readonly int PigmentOutputId = Shader.PropertyToID("_PigmentOutput");
        private static readonly int ObstacleMaskId = Shader.PropertyToID("_ObstacleMask");
        private static readonly int ObstacleOutputId = Shader.PropertyToID("_ObstacleOutput");
        private static readonly int GoalMetricsId = Shader.PropertyToID("_GoalMetrics");
        private static readonly int GoalShapeId = Shader.PropertyToID("_GoalShape");
        private static readonly int GoalCenterId = Shader.PropertyToID("_GoalCenter");
        private static readonly int GoalSizeId = Shader.PropertyToID("_GoalSize");
        private static readonly int GoalSinkAmountId =
            Shader.PropertyToID("_GoalSinkAmount");

        private readonly ComputeShader _shader;
        private readonly int _width;
        private readonly int _height;
        private readonly int _pressureIterations;
        private readonly PendingSplat[] _queuedSplats = new PendingSplat[MaxSplats];
        private readonly GpuSplat[] _gpuSplats = new GpuSplat[MaxSplats];
        private readonly GpuObstacle[] _gpuObstacles = new GpuObstacle[MaxObstacles];
        private readonly int _clearKernel;
        private readonly int _splatKernel;
        private readonly int _rasterObstacleKernel;
        private readonly int _advectKernel;
        private readonly int _curlKernel;
        private readonly int _vorticityKernel;
        private readonly int _divergenceKernel;
        private readonly int _pressureKernel;
        private readonly int _projectKernel;
        private readonly int _sinkGoalKernel;
        private readonly int _clearMetricsKernel;

        private RenderTexture _velocityRead;
        private RenderTexture _velocityWrite;
        private RenderTexture _pigmentRead;
        private RenderTexture _pigmentWrite;
        private RenderTexture _pressureRead;
        private RenderTexture _pressureWrite;
        private RenderTexture _divergence;
        private RenderTexture _curl;
        private RenderTexture _obstacleMask;
        private ComputeBuffer _splatBuffer;
        private ComputeBuffer _obstacleBuffer;
        private ComputeBuffer _goalMetricWriteBuffer;
        private ComputeBuffer _goalMetricReadBuffer;
        private FluidGoalRegion _goal = FluidGoalRegion.Circle(
            new Vector2(0.86f, 0.5f),
            0.09f);
        private GoalFluidMetrics _latestGoalMetrics = GoalFluidMetrics.Invalid();
        private int _queuedCount;
        private int _obstacleCount;
        private float _accumulator;
        private float _simulationTail;
        private uint _metricSequence;
        private uint _readbackGeneration;
        private bool _simulationActive;
        private bool _metricPending;
        private bool _disposed;

        public ComputeColorWaterFluidBackend(
            ComputeShader asset,
            int simulationHeight = 216,
            int pressureIterations = 12)
        {
            if (!IsSupported())
            {
                throw new NotSupportedException(
                    "Compute color-water fluid is not supported on this device.");
            }
            if (asset == null)
            {
                throw new ArgumentNullException(nameof(asset));
            }

            _height = Mathf.Clamp(simulationHeight, 144, 288);
            _width = Mathf.Clamp(
                Mathf.RoundToInt(_height * (16f / 9f)),
                256,
                512);
            _pressureIterations = Mathf.Clamp(pressureIterations, 8, 20);
            _shader = UnityEngine.Object.Instantiate(asset);
            _shader.name = "Color Water Fluid Compute (Runtime)";

            try
            {
                _clearKernel = _shader.FindKernel("Clear");
                _splatKernel = _shader.FindKernel("Splat");
                _rasterObstacleKernel = _shader.FindKernel("RasterizeObstacles");
                _advectKernel = _shader.FindKernel("Advect");
                _curlKernel = _shader.FindKernel("Curl");
                _vorticityKernel = _shader.FindKernel("ApplyVorticity");
                _divergenceKernel = _shader.FindKernel("Divergence");
                _pressureKernel = _shader.FindKernel("PressureJacobi");
                _projectKernel = _shader.FindKernel("Project");
                _sinkGoalKernel = _shader.FindKernel("SinkGoal");
                _clearMetricsKernel = _shader.FindKernel("ClearGoalMetrics");

                _splatBuffer = new ComputeBuffer(
                    MaxSplats,
                    GpuSplat.Stride,
                    ComputeBufferType.Structured);
                _obstacleBuffer = new ComputeBuffer(
                    MaxObstacles,
                    GpuObstacle.Stride,
                    ComputeBufferType.Structured);
                _goalMetricWriteBuffer = new ComputeBuffer(
                    GoalMetricCount,
                    sizeof(uint),
                    ComputeBufferType.Structured);
                _goalMetricReadBuffer = new ComputeBuffer(
                    GoalMetricCount,
                    sizeof(uint),
                    ComputeBufferType.Structured);
                AllocateTargets();
                RasterizeObstacles();
                ClearMetricBuffer(_goalMetricWriteBuffer);
                ClearMetricBuffer(_goalMetricReadBuffer);
                Reset();
            }
            catch
            {
                Dispose();
                throw;
            }
        }

        public Texture PigmentTexture => _pigmentRead;
        public Texture VelocityTexture => _velocityRead;
        public Texture ObstacleTexture => _obstacleMask;
        public string Label => $"GPU {_width}×{_height}";
        public bool IsGpu => true;
        public bool IsReady => !_disposed && TargetsAreReady();
        public bool GoalMetricReadbackPending => _metricPending;
        public GoalFluidMetrics LatestGoalMetrics => _latestGoalMetrics;

        public static bool IsSupported()
        {
            return SystemInfo.supportsComputeShaders
                && SystemInfo.IsFormatSupported(
                    FluidFormat,
                    GraphicsFormatUsage.LoadStore)
                && SystemInfo.IsFormatSupported(
                    FluidFormat,
                    GraphicsFormatUsage.Sample)
                && SystemInfo.IsFormatSupported(
                    FluidFormat,
                    GraphicsFormatUsage.Linear);
        }

        public void InjectSource(
            ColorWaterSource source,
            Vector2 uv,
            Vector2 velocityUvPerSecond,
            float radius,
            float amount = 1f)
        {
            EnsureAlive();
            var splat = new PendingSplat(
                source,
                new Vector2(Mathf.Clamp01(uv.x), Mathf.Clamp01(uv.y)),
                Vector2.ClampMagnitude(velocityUvPerSecond, 3f),
                Mathf.Clamp(radius, 0.006f, 0.2f),
                Mathf.Clamp01(amount));
            if (_queuedCount < MaxSplats)
            {
                _queuedSplats[_queuedCount++] = splat;
            }
            else
            {
                // Keep the most recent emitter position instead of introducing
                // visible latency if a frame produces more than the bounded batch.
                _queuedSplats[MaxSplats - 1] = splat;
            }

            _simulationTail = SimulationTailSeconds;
            _simulationActive = true;
        }

        public void SetObstacles(IReadOnlyList<FluidObstacle> obstacles)
        {
            EnsureAlive();
            _obstacleCount = obstacles == null
                ? 0
                : Mathf.Min(obstacles.Count, MaxObstacles);
            for (var i = 0; i < _obstacleCount; i++)
            {
                var obstacle = obstacles[i];
                _gpuObstacles[i] = new GpuObstacle(
                    new Vector4(
                        obstacle.Start.x,
                        obstacle.Start.y,
                        obstacle.End.x,
                        obstacle.End.y),
                    new Vector4(
                        obstacle.Radius,
                        obstacle.Solidity,
                        0f,
                        0f));
            }

            if (_obstacleCount > 0)
            {
                _obstacleBuffer.SetData(_gpuObstacles, 0, 0, _obstacleCount);
            }
            RasterizeObstacles();
            _simulationTail = SimulationTailSeconds;
            _simulationActive = true;
        }

        public void SetGoal(in FluidGoalRegion goal)
        {
            EnsureAlive();
            _goal = goal;
            ResetGoalProgress();
        }

        public void Tick(float unscaledDeltaTime)
        {
            EnsureAlive();
            if (!TargetsAreReady())
            {
                RecreateTargets();
            }
            if (!_simulationActive && _queuedCount == 0)
            {
                return;
            }

            _accumulator = Mathf.Min(
                _accumulator + Mathf.Clamp(
                    unscaledDeltaTime,
                    0f,
                    FixedStep * MaxSubsteps),
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

            if (_simulationTail <= 0f && _queuedCount == 0)
            {
                _simulationActive = false;
                _accumulator = 0f;
            }
        }

        public bool RequestGoalMetrics(Action<GoalFluidMetrics> completed = null)
        {
            EnsureAlive();
            if (_metricPending || !TargetsAreReady())
            {
                return false;
            }

            _metricPending = true;
            var sequence = ++_metricSequence;
            var generation = _readbackGeneration;
            Swap(ref _goalMetricWriteBuffer, ref _goalMetricReadBuffer);
            ClearMetricBuffer(_goalMetricWriteBuffer);
            var bufferBeingRead = _goalMetricReadBuffer;
            AsyncGPUReadback.Request(bufferBeingRead, request =>
            {
                if (_disposed)
                {
                    return;
                }
                if (generation != _readbackGeneration)
                {
                    _metricPending = false;
                    return;
                }

                _metricPending = false;
                GoalFluidMetrics metrics;
                if (request.hasError)
                {
                    metrics = GoalFluidMetrics.Invalid(sequence);
                }
                else
                {
                    var values = request.GetData<uint>();
                    var cellSamples = values.Length >= GoalMetricCount
                        ? values[4]
                        : 0u;
                    var simulationSteps = values.Length >= GoalMetricCount
                        ? values[5]
                        : 0u;
                    if (cellSamples == 0u || simulationSteps == 0u)
                    {
                        metrics = GoalFluidMetrics.Invalid(sequence);
                    }
                    else
                    {
                        var goalCellCount = cellSamples / (double)simulationSteps;
                        var volumeNormalization = 1.0
                            / (goalCellCount * GoalMetricScale);
                        metrics = new GoalFluidMetrics(
                            (float)(values[0] * volumeNormalization),
                            (float)(values[1] * volumeNormalization),
                            (float)(values[2] * volumeNormalization),
                            values[3] / (float)cellSamples,
                            cellSamples > (uint)int.MaxValue
                                ? int.MaxValue
                                : (int)cellSamples,
                            sequence,
                            true);
                    }
                }

                _latestGoalMetrics = metrics;
                if (completed == null)
                {
                    return;
                }
                try
                {
                    completed(metrics);
                }
                catch (Exception exception)
                {
                    Debug.LogException(exception);
                }
            });
            return true;
        }

        public void Reset()
        {
            EnsureAlive();
            _queuedCount = 0;
            _accumulator = 0f;
            _simulationTail = 0f;
            _simulationActive = false;
            ResetGoalProgress();
            ClearTarget(_velocityRead);
            ClearTarget(_velocityWrite);
            ClearTarget(_pigmentRead);
            ClearTarget(_pigmentWrite);
            ClearTarget(_pressureRead);
            ClearTarget(_pressureWrite);
            ClearTarget(_divergence);
            ClearTarget(_curl);
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }
            _disposed = true;
            _readbackGeneration++;
            ReleaseAllTargets();
            ReleaseBuffer(ref _splatBuffer);
            ReleaseBuffer(ref _obstacleBuffer);
            ReleaseBuffer(ref _goalMetricWriteBuffer);
            ReleaseBuffer(ref _goalMetricReadBuffer);
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
                var pending = _queuedSplats[i];
                var physicalVelocity = new Vector2(
                    pending.Velocity.x * aspect,
                    pending.Velocity.y) * SourceImpulse;
                var pigment = pending.Source == ColorWaterSource.Blue
                    ? new Vector4(pending.Amount, 0f, 0f, pending.Amount)
                    : new Vector4(0f, pending.Amount, 0f, pending.Amount);
                _gpuSplats[i] = new GpuSplat(
                    new Vector4(
                        pending.Uv.x,
                        pending.Uv.y,
                        1f / (pending.Radius * pending.Radius),
                        0f),
                    new Vector4(
                        physicalVelocity.x,
                        physicalVelocity.y,
                        0f,
                        0f),
                    pigment);
            }

            _splatBuffer.SetData(_gpuSplats, 0, 0, _queuedCount);
            SetSharedSimulationProperties();
            _shader.SetInt(SplatCountId, _queuedCount);
            _shader.SetBuffer(_splatKernel, SplatsId, _splatBuffer);
            _shader.SetTexture(_splatKernel, VelocityInputId, _velocityRead);
            _shader.SetTexture(_splatKernel, PigmentInputId, _pigmentRead);
            _shader.SetTexture(_splatKernel, ObstacleMaskId, _obstacleMask);
            _shader.SetTexture(_splatKernel, VelocityOutputId, _velocityWrite);
            _shader.SetTexture(_splatKernel, PigmentOutputId, _pigmentWrite);
            DispatchGrid(_splatKernel);
            Swap(ref _velocityRead, ref _velocityWrite);
            Swap(ref _pigmentRead, ref _pigmentWrite);
            _queuedCount = 0;
        }

        private void SimulateStep(float deltaTime)
        {
            Dispatch(
                _advectKernel,
                _velocityRead,
                _velocityRead,
                _velocityWrite,
                VelocityDissipation,
                deltaTime);
            Swap(ref _velocityRead, ref _velocityWrite);

            Dispatch(
                _curlKernel,
                _velocityRead,
                Texture2D.blackTexture,
                _curl,
                1f,
                deltaTime);
            _shader.SetFloat(VorticityStrengthId, VorticityStrength);
            Dispatch(
                _vorticityKernel,
                _velocityRead,
                _curl,
                _velocityWrite,
                1f,
                deltaTime);
            Swap(ref _velocityRead, ref _velocityWrite);

            Dispatch(
                _divergenceKernel,
                _velocityRead,
                Texture2D.blackTexture,
                _divergence,
                1f,
                deltaTime);
            for (var i = 0; i < _pressureIterations; i++)
            {
                Dispatch(
                    _pressureKernel,
                    _pressureRead,
                    _divergence,
                    _pressureWrite,
                    1f,
                    deltaTime);
                Swap(ref _pressureRead, ref _pressureWrite);
            }
            Dispatch(
                _projectKernel,
                _velocityRead,
                _pressureRead,
                _velocityWrite,
                1f,
                deltaTime);
            Swap(ref _velocityRead, ref _velocityWrite);

            Dispatch(
                _advectKernel,
                _pigmentRead,
                _velocityRead,
                _pigmentWrite,
                PigmentDissipation,
                deltaTime,
                pigmentField: true);
            Swap(ref _pigmentRead, ref _pigmentWrite);
            ApplyGoalSink(deltaTime);
        }

        private void Dispatch(
            int kernel,
            Texture input0,
            Texture input1,
            RenderTexture output,
            float dissipation,
            float deltaTime,
            bool pigmentField = false)
        {
            SetSharedSimulationProperties();
            _shader.SetFloat(DeltaTimeId, deltaTime);
            _shader.SetFloat(DissipationId, dissipation);
            _shader.SetInt(FieldKindId, pigmentField ? 1 : 0);
            _shader.SetTexture(kernel, Input0Id, input0);
            _shader.SetTexture(kernel, Input1Id, input1);
            _shader.SetTexture(kernel, ObstacleMaskId, _obstacleMask);
            _shader.SetTexture(kernel, OutputId, output);
            DispatchGrid(kernel);
        }

        private void ApplyGoalSink(float deltaTime)
        {
            SetSharedSimulationProperties();
            SetGoalProperties();
            var sinkAmount = 1f - Mathf.Exp(-GoalSinkRatePerSecond * deltaTime);
            _shader.SetFloat(GoalSinkAmountId, sinkAmount);
            _shader.SetTexture(_sinkGoalKernel, PigmentInputId, _pigmentRead);
            _shader.SetTexture(_sinkGoalKernel, PigmentOutputId, _pigmentWrite);
            _shader.SetBuffer(
                _sinkGoalKernel,
                GoalMetricsId,
                _goalMetricWriteBuffer);
            DispatchGrid(_sinkGoalKernel);
            Swap(ref _pigmentRead, ref _pigmentWrite);
        }

        private void RasterizeObstacles()
        {
            SetSharedSimulationProperties();
            _shader.SetInt(ObstacleCountId, _obstacleCount);
            _shader.SetBuffer(
                _rasterObstacleKernel,
                ObstaclesId,
                _obstacleBuffer);
            _shader.SetTexture(
                _rasterObstacleKernel,
                ObstacleOutputId,
                _obstacleMask);
            DispatchGrid(_rasterObstacleKernel);
        }

        private void SetSharedSimulationProperties()
        {
            _shader.SetInts(ResolutionId, _width, _height);
            _shader.SetFloat(AspectId, _width / (float)_height);
        }

        private void SetGoalProperties()
        {
            _shader.SetInt(GoalShapeId, (int)_goal.Shape);
            _shader.SetVector(
                GoalCenterId,
                new Vector4(_goal.Center.x, _goal.Center.y, 0f, 0f));
            _shader.SetVector(
                GoalSizeId,
                new Vector4(_goal.Size.x, _goal.Size.y, 0f, 0f));
        }

        private void ResetGoalProgress()
        {
            _latestGoalMetrics = GoalFluidMetrics.Invalid(_metricSequence);
            _readbackGeneration++;
            ClearMetricBuffer(_goalMetricWriteBuffer);
            if (!_metricPending)
            {
                ClearMetricBuffer(_goalMetricReadBuffer);
            }
        }

        private void ClearMetricBuffer(ComputeBuffer buffer)
        {
            if (buffer == null)
            {
                return;
            }
            _shader.SetBuffer(_clearMetricsKernel, GoalMetricsId, buffer);
            _shader.Dispatch(_clearMetricsKernel, 1, 1, 1);
        }

        private void DispatchGrid(int kernel)
        {
            _shader.Dispatch(
                kernel,
                Mathf.CeilToInt(_width / (float)ThreadGroupSize),
                Mathf.CeilToInt(_height / (float)ThreadGroupSize),
                1);
        }

        private void AllocateTargets()
        {
            try
            {
                _velocityRead = CreateTarget("Color Water Velocity A");
                _velocityWrite = CreateTarget("Color Water Velocity B");
                _pigmentRead = CreateTarget("Color Water Pigment A");
                _pigmentWrite = CreateTarget("Color Water Pigment B");
                _pressureRead = CreateTarget("Color Water Pressure A");
                _pressureWrite = CreateTarget("Color Water Pressure B");
                _divergence = CreateTarget("Color Water Divergence");
                _curl = CreateTarget("Color Water Curl");
                _obstacleMask = CreateTarget("Color Water Obstacles");
                if (!TargetsAreReady())
                {
                    throw new InvalidOperationException(
                        "Color-water render target allocation was incomplete.");
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
                dimension = TextureDimension.Tex2D,
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
                throw new InvalidOperationException(
                    $"Could not create render target '{name}'.");
            }
            return target;
        }

        private bool TargetsAreReady()
        {
            return _velocityRead != null && _velocityRead.IsCreated()
                && _velocityWrite != null && _velocityWrite.IsCreated()
                && _pigmentRead != null && _pigmentRead.IsCreated()
                && _pigmentWrite != null && _pigmentWrite.IsCreated()
                && _pressureRead != null && _pressureRead.IsCreated()
                && _pressureWrite != null && _pressureWrite.IsCreated()
                && _divergence != null && _divergence.IsCreated()
                && _curl != null && _curl.IsCreated()
                && _obstacleMask != null && _obstacleMask.IsCreated();
        }

        private void RecreateTargets()
        {
            ReleaseAllTargets();
            AllocateTargets();
            RasterizeObstacles();
            Reset();
        }

        private void ClearTarget(RenderTexture target)
        {
            if (target == null || !target.IsCreated())
            {
                return;
            }
            SetSharedSimulationProperties();
            _shader.SetTexture(_clearKernel, OutputId, target);
            DispatchGrid(_clearKernel);
        }

        private void ReleaseAllTargets()
        {
            ReleaseTarget(ref _velocityRead);
            ReleaseTarget(ref _velocityWrite);
            ReleaseTarget(ref _pigmentRead);
            ReleaseTarget(ref _pigmentWrite);
            ReleaseTarget(ref _pressureRead);
            ReleaseTarget(ref _pressureWrite);
            ReleaseTarget(ref _divergence);
            ReleaseTarget(ref _curl);
            ReleaseTarget(ref _obstacleMask);
        }

        private void EnsureAlive()
        {
            if (_disposed)
            {
                throw new ObjectDisposedException(nameof(ComputeColorWaterFluidBackend));
            }
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

        private static void ReleaseBuffer(ref ComputeBuffer buffer)
        {
            buffer?.Release();
            buffer = null;
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

        private readonly struct PendingSplat
        {
            public PendingSplat(
                ColorWaterSource source,
                Vector2 uv,
                Vector2 velocity,
                float radius,
                float amount)
            {
                Source = source;
                Uv = uv;
                Velocity = velocity;
                Radius = radius;
                Amount = amount;
            }

            public ColorWaterSource Source { get; }
            public Vector2 Uv { get; }
            public Vector2 Velocity { get; }
            public float Radius { get; }
            public float Amount { get; }
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GpuSplat
        {
            public const int Stride = sizeof(float) * 12;

            public GpuSplat(Vector4 centerRadius, Vector4 velocity, Vector4 pigment)
            {
                CenterRadius = centerRadius;
                Velocity = velocity;
                Pigment = pigment;
            }

            public Vector4 CenterRadius;
            public Vector4 Velocity;
            public Vector4 Pigment;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GpuObstacle
        {
            public const int Stride = sizeof(float) * 8;

            public GpuObstacle(Vector4 endpoints, Vector4 properties)
            {
                Endpoints = endpoints;
                Properties = properties;
            }

            public Vector4 Endpoints;
            public Vector4 Properties;
        }
    }
}
