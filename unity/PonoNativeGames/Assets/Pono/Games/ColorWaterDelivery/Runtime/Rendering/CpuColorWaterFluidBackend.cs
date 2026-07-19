using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pono.ColorWaterDelivery.Rendering
{
    /// <summary>
    /// Reduced-resolution fallback for devices without compute shader support.
    /// It preserves the same source, gate, sink and goal-metric semantics as the
    /// GPU backend; its pressure solve is intentionally shorter.
    /// </summary>
    public sealed class CpuColorWaterFluidBackend : IColorWaterFluidBackend
    {
        private const float FixedStep = 1f / 30f;
        private const int MaxSubsteps = 2;
        private const float SimulationTailSeconds = 6f;
        private const float VelocityDissipation = 0.986f;
        private const float PigmentDissipation = 0.987f;
        private const float GoalSinkRatePerSecond = 4.8f;
        private const float SourceImpulse = 0.45f;
        private const float GreenCoverageThreshold = 0.22f;
        private const int PressureIterations = 4;

        private readonly int _width;
        private readonly int _height;
        private readonly float _aspect;
        private readonly Texture2D _pigmentTexture;
        private readonly Texture2D _obstacleTexture;
        private readonly Color32[] _pigmentPixels;
        private readonly Color32[] _obstaclePixels;
        private Vector2[] _velocity;
        private Vector2[] _nextVelocity;
        private Vector2[] _pigment;
        private Vector2[] _nextPigment;
        private float[] _pressure;
        private float[] _nextPressure;
        private readonly float[] _divergence;
        private readonly float[] _obstacle;
        private FluidGoalRegion _goal = FluidGoalRegion.Circle(
            new Vector2(0.86f, 0.5f),
            0.09f);
        private GoalFluidMetrics _latestGoalMetrics = GoalFluidMetrics.Invalid();
        private float _accumulator;
        private float _simulationTail;
        private double _intervalBlueMass;
        private double _intervalYellowMass;
        private double _intervalGreenMass;
        private double _intervalCoverageHits;
        private double _intervalCellSamples;
        private double _intervalSteps;
        private uint _metricSequence;
        private bool _simulationActive;
        private bool _pigmentDirty;
        private bool _disposed;

        public CpuColorWaterFluidBackend(int width = 128, int height = 72)
        {
            _width = Mathf.Clamp(width, 64, 256);
            _height = Mathf.Clamp(height, 36, 144);
            _aspect = _width / (float)_height;
            var cellCount = _width * _height;
            _velocity = new Vector2[cellCount];
            _nextVelocity = new Vector2[cellCount];
            _pigment = new Vector2[cellCount];
            _nextPigment = new Vector2[cellCount];
            _pressure = new float[cellCount];
            _nextPressure = new float[cellCount];
            _divergence = new float[cellCount];
            _obstacle = new float[cellCount];
            _pigmentPixels = new Color32[cellCount];
            _obstaclePixels = new Color32[cellCount];
            _pigmentTexture = CreateTexture("Color Water CPU Pigment");
            _obstacleTexture = CreateTexture("Color Water CPU Obstacles");
            UploadObstacleTexture();
            Reset();
        }

        public Texture PigmentTexture => _pigmentTexture;
        public Texture VelocityTexture => Texture2D.blackTexture;
        public Texture ObstacleTexture => _obstacleTexture;
        public string Label => $"CPU {_width}×{_height}";
        public bool IsGpu => false;
        public bool IsReady => !_disposed && _pigmentTexture != null;
        public bool GoalMetricReadbackPending => false;
        public GoalFluidMetrics LatestGoalMetrics => _latestGoalMetrics;

        public void InjectSource(
            ColorWaterSource source,
            Vector2 uv,
            Vector2 velocityUvPerSecond,
            float radius,
            float amount = 1f)
        {
            EnsureAlive();
            uv = new Vector2(Mathf.Clamp01(uv.x), Mathf.Clamp01(uv.y));
            radius = Mathf.Clamp(radius, 0.006f, 0.2f);
            amount = Mathf.Clamp01(amount);
            var physicalVelocity = new Vector2(
                velocityUvPerSecond.x * _aspect,
                velocityUvPerSecond.y) * SourceImpulse;
            physicalVelocity = Vector2.ClampMagnitude(physicalVelocity, 1.1f);
            var inverseRadiusSquared = 1f / (radius * radius);
            var minX = Mathf.Max(0, Mathf.FloorToInt((uv.x - radius / _aspect) * _width));
            var maxX = Mathf.Min(_width - 1, Mathf.CeilToInt((uv.x + radius / _aspect) * _width));
            var minY = Mathf.Max(0, Mathf.FloorToInt((uv.y - radius) * _height));
            var maxY = Mathf.Min(_height - 1, Mathf.CeilToInt((uv.y + radius) * _height));
            for (var y = minY; y <= maxY; y++)
            {
                for (var x = minX; x <= maxX; x++)
                {
                    var index = Index(x, y);
                    var offset = CellUv(x, y) - uv;
                    offset.x *= _aspect;
                    var weight = Mathf.Exp(-offset.sqrMagnitude * inverseRadiusSquared);
                    var fluidAmount = 1f - _obstacle[index];
                    _velocity[index] = Vector2.ClampMagnitude(
                        _velocity[index] + physicalVelocity * weight,
                        1.1f) * fluidAmount;
                    var addedPigment = source == ColorWaterSource.Blue
                        ? new Vector2(amount * weight, 0f)
                        : new Vector2(0f, amount * weight);
                    _pigment[index] = Clamp01(_pigment[index] + addedPigment)
                        * fluidAmount;
                }
            }

            _pigmentDirty = true;
            _simulationTail = SimulationTailSeconds;
            _simulationActive = true;
        }

        public void SetObstacles(IReadOnlyList<FluidObstacle> obstacles)
        {
            EnsureAlive();
            Array.Clear(_obstacle, 0, _obstacle.Length);
            var feather = 1.25f / _height;
            for (var y = 0; y < _height; y++)
            {
                for (var x = 0; x < _width; x++)
                {
                    var point = CellUv(x, y);
                    point.x *= _aspect;
                    var solidity = 0f;
                    if (obstacles != null)
                    {
                        for (var obstacleIndex = 0;
                             obstacleIndex < obstacles.Count;
                             obstacleIndex++)
                        {
                            var item = obstacles[obstacleIndex];
                            var start = item.Start;
                            var end = item.End;
                            start.x *= _aspect;
                            end.x *= _aspect;
                            var signedDistance = DistanceToSegment(point, start, end)
                                - item.Radius;
                            var coverage = 1f - Mathf.SmoothStep(
                                0f,
                                1f,
                                Mathf.InverseLerp(-feather, feather, signedDistance));
                            solidity = Mathf.Max(
                                solidity,
                                coverage * item.Solidity);
                        }
                    }
                    _obstacle[Index(x, y)] = Mathf.Clamp01(solidity);
                }
            }

            for (var i = 0; i < _velocity.Length; i++)
            {
                var fluidAmount = 1f - _obstacle[i];
                _velocity[i] *= fluidAmount;
                _pigment[i] *= fluidAmount;
            }
            UploadObstacleTexture();
            _pigmentDirty = true;
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
            if (_simulationActive)
            {
                _accumulator = Mathf.Min(
                    _accumulator + Mathf.Clamp(
                        unscaledDeltaTime,
                        0f,
                        FixedStep * MaxSubsteps),
                    FixedStep * MaxSubsteps);
                var substepCount = 0;
                while (_accumulator >= FixedStep && substepCount < MaxSubsteps)
                {
                    SimulateStep(FixedStep);
                    _simulationTail = Mathf.Max(0f, _simulationTail - FixedStep);
                    _accumulator -= FixedStep;
                    substepCount++;
                }
                if (_simulationTail <= 0f)
                {
                    _simulationActive = false;
                    _accumulator = 0f;
                }
            }

            if (_pigmentDirty)
            {
                UploadPigmentTexture();
            }
        }

        public bool RequestGoalMetrics(Action<GoalFluidMetrics> completed = null)
        {
            EnsureAlive();
            var sequence = ++_metricSequence;
            GoalFluidMetrics metrics;
            if (_intervalSteps <= 0.0 || _intervalCellSamples <= 0.0)
            {
                metrics = GoalFluidMetrics.Invalid(sequence);
            }
            else
            {
                var goalCellCount = _intervalCellSamples / _intervalSteps;
                metrics = new GoalFluidMetrics(
                    (float)(_intervalBlueMass / goalCellCount),
                    (float)(_intervalYellowMass / goalCellCount),
                    (float)(_intervalGreenMass / goalCellCount),
                    (float)(_intervalCoverageHits / _intervalCellSamples),
                    _intervalCellSamples > int.MaxValue
                        ? int.MaxValue
                        : (int)_intervalCellSamples,
                    sequence,
                    true);
            }

            ClearIntervalMetrics();
            _latestGoalMetrics = metrics;
            if (completed != null)
            {
                try
                {
                    completed(metrics);
                }
                catch (Exception exception)
                {
                    Debug.LogException(exception);
                }
            }
            return true;
        }

        public void Reset()
        {
            EnsureAlive();
            Array.Clear(_velocity, 0, _velocity.Length);
            Array.Clear(_nextVelocity, 0, _nextVelocity.Length);
            Array.Clear(_pigment, 0, _pigment.Length);
            Array.Clear(_nextPigment, 0, _nextPigment.Length);
            Array.Clear(_pressure, 0, _pressure.Length);
            Array.Clear(_nextPressure, 0, _nextPressure.Length);
            Array.Clear(_divergence, 0, _divergence.Length);
            _accumulator = 0f;
            _simulationTail = 0f;
            _simulationActive = false;
            _pigmentDirty = true;
            ResetGoalProgress();
            UploadPigmentTexture();
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }
            _disposed = true;
            DestroyOwned(_pigmentTexture);
            DestroyOwned(_obstacleTexture);
        }

        private void SimulateStep(float deltaTime)
        {
            AdvectVelocity(deltaTime);
            ProjectVelocity();
            AdvectPigment(deltaTime);
            SinkGoal(deltaTime);
            _pigmentDirty = true;
        }

        private void AdvectVelocity(float deltaTime)
        {
            for (var y = 0; y < _height; y++)
            {
                for (var x = 0; x < _width; x++)
                {
                    var index = Index(x, y);
                    var obstacle = _obstacle[index];
                    if (obstacle > 0.5f)
                    {
                        _nextVelocity[index] = Vector2.zero;
                        continue;
                    }

                    var uv = CellUv(x, y);
                    var current = _velocity[index];
                    var previousUv = uv - new Vector2(
                        current.x / _aspect,
                        current.y) * deltaTime;
                    previousUv = ClampUv(previousUv);
                    if (SampleObstacle(previousUv) > 0.5f)
                    {
                        previousUv = uv;
                    }
                    var transported = Sample(_velocity, previousUv)
                        * VelocityDissipation;
                    var obstacleGradient = new Vector2(
                        ObstacleAt(x + 1, y) - ObstacleAt(x - 1, y),
                        ObstacleAt(x, y + 1) - ObstacleAt(x, y - 1));
                    if (obstacleGradient.sqrMagnitude > 0.000001f)
                    {
                        var normal = obstacleGradient.normalized;
                        transported -= normal * Mathf.Max(
                            Vector2.Dot(transported, normal),
                            0f);
                    }
                    if (x == 0 || x == _width - 1) transported.x = 0f;
                    if (y == 0 || y == _height - 1) transported.y = 0f;
                    _nextVelocity[index] = Vector2.ClampMagnitude(
                        transported * (1f - obstacle),
                        1.1f);
                }
            }
            Swap(ref _velocity, ref _nextVelocity);
        }

        private void ProjectVelocity()
        {
            var inverseTwoCellSize = 0.5f * _height;
            var cellSize = 1f / _height;
            for (var y = 0; y < _height; y++)
            {
                for (var x = 0; x < _width; x++)
                {
                    var index = Index(x, y);
                    if (_obstacle[index] > 0.5f)
                    {
                        _divergence[index] = 0f;
                        continue;
                    }
                    var center = _velocity[index];
                    var left = IsSolid(x - 1, y) ? -center.x : VelocityAt(x - 1, y).x;
                    var right = IsSolid(x + 1, y) ? -center.x : VelocityAt(x + 1, y).x;
                    var bottom = IsSolid(x, y - 1) ? -center.y : VelocityAt(x, y - 1).y;
                    var top = IsSolid(x, y + 1) ? -center.y : VelocityAt(x, y + 1).y;
                    _divergence[index] = inverseTwoCellSize
                        * ((right - left) + (top - bottom));
                }
            }

            for (var iteration = 0; iteration < PressureIterations; iteration++)
            {
                for (var y = 0; y < _height; y++)
                {
                    for (var x = 0; x < _width; x++)
                    {
                        var index = Index(x, y);
                        if (_obstacle[index] > 0.5f)
                        {
                            _nextPressure[index] = 0f;
                            continue;
                        }
                        var center = _pressure[index];
                        var left = IsSolid(x - 1, y) ? center : PressureAt(x - 1, y);
                        var right = IsSolid(x + 1, y) ? center : PressureAt(x + 1, y);
                        var bottom = IsSolid(x, y - 1) ? center : PressureAt(x, y - 1);
                        var top = IsSolid(x, y + 1) ? center : PressureAt(x, y + 1);
                        _nextPressure[index] = (left + right + bottom + top
                            - _divergence[index] * cellSize * cellSize) * 0.25f;
                    }
                }
                Swap(ref _pressure, ref _nextPressure);
            }

            for (var y = 0; y < _height; y++)
            {
                for (var x = 0; x < _width; x++)
                {
                    var index = Index(x, y);
                    if (_obstacle[index] > 0.5f)
                    {
                        _velocity[index] = Vector2.zero;
                        continue;
                    }
                    var center = _pressure[index];
                    var left = IsSolid(x - 1, y) ? center : PressureAt(x - 1, y);
                    var right = IsSolid(x + 1, y) ? center : PressureAt(x + 1, y);
                    var bottom = IsSolid(x, y - 1) ? center : PressureAt(x, y - 1);
                    var top = IsSolid(x, y + 1) ? center : PressureAt(x, y + 1);
                    var gradient = inverseTwoCellSize * new Vector2(
                        right - left,
                        top - bottom);
                    _velocity[index] = Vector2.ClampMagnitude(
                        _velocity[index] - gradient,
                        1.1f);
                }
            }
        }

        private void AdvectPigment(float deltaTime)
        {
            for (var y = 0; y < _height; y++)
            {
                for (var x = 0; x < _width; x++)
                {
                    var index = Index(x, y);
                    var obstacle = _obstacle[index];
                    if (obstacle > 0.5f)
                    {
                        _nextPigment[index] = Vector2.zero;
                        continue;
                    }
                    var uv = CellUv(x, y);
                    var velocity = _velocity[index];
                    var previousUv = ClampUv(uv - new Vector2(
                        velocity.x / _aspect,
                        velocity.y) * deltaTime);
                    if (SampleObstacle(previousUv) > 0.5f)
                    {
                        previousUv = uv;
                    }
                    _nextPigment[index] = Clamp01(
                        Sample(_pigment, previousUv) * PigmentDissipation)
                        * (1f - obstacle);
                }
            }
            Swap(ref _pigment, ref _nextPigment);
        }

        private void SinkGoal(float deltaTime)
        {
            var sinkAmount = 1f - Mathf.Exp(-GoalSinkRatePerSecond * deltaTime);
            _intervalSteps += 1.0;
            for (var y = 0; y < _height; y++)
            {
                for (var x = 0; x < _width; x++)
                {
                    var uv = CellUv(x, y);
                    if (!_goal.Contains(uv, _aspect))
                    {
                        continue;
                    }
                    var index = Index(x, y);
                    var pigment = _pigment[index];
                    var greenBefore = Mathf.Clamp01(
                        2f * Mathf.Min(pigment.x, pigment.y));
                    var absorbed = pigment * sinkAmount;
                    _intervalBlueMass += absorbed.x;
                    _intervalYellowMass += absorbed.y;
                    _intervalGreenMass += Mathf.Clamp01(
                        2f * Mathf.Min(absorbed.x, absorbed.y));
                    if (greenBefore >= GreenCoverageThreshold)
                    {
                        _intervalCoverageHits += 1.0;
                    }
                    _intervalCellSamples += 1.0;
                    _pigment[index] = Clamp01(pigment - absorbed);
                }
            }
        }

        private Texture2D CreateTexture(string name)
        {
            return new Texture2D(
                _width,
                _height,
                TextureFormat.RGBA32,
                mipChain: false,
                linear: true)
            {
                name = name,
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.DontSave
            };
        }

        private void UploadPigmentTexture()
        {
            for (var i = 0; i < _pigment.Length; i++)
            {
                var value = Clamp01(_pigment[i]);
                var green = Mathf.Clamp01(2f * Mathf.Min(value.x, value.y));
                var density = Mathf.Clamp01(Mathf.Max(value.x, value.y));
                _pigmentPixels[i] = new Color32(
                    ToByte(value.x),
                    ToByte(value.y),
                    ToByte(green),
                    ToByte(density));
            }
            _pigmentTexture.SetPixels32(_pigmentPixels);
            _pigmentTexture.Apply(updateMipmaps: false, makeNoLongerReadable: false);
            _pigmentDirty = false;
        }

        private void UploadObstacleTexture()
        {
            for (var i = 0; i < _obstacle.Length; i++)
            {
                _obstaclePixels[i] = new Color32(ToByte(_obstacle[i]), 0, 0, 255);
            }
            _obstacleTexture.SetPixels32(_obstaclePixels);
            _obstacleTexture.Apply(updateMipmaps: false, makeNoLongerReadable: false);
        }

        private void ResetGoalProgress()
        {
            ClearIntervalMetrics();
            _latestGoalMetrics = GoalFluidMetrics.Invalid(_metricSequence);
        }

        private void ClearIntervalMetrics()
        {
            _intervalBlueMass = 0.0;
            _intervalYellowMass = 0.0;
            _intervalGreenMass = 0.0;
            _intervalCoverageHits = 0.0;
            _intervalCellSamples = 0.0;
            _intervalSteps = 0.0;
        }

        private Vector2 Sample(Vector2[] source, Vector2 uv)
        {
            var position = new Vector2(
                uv.x * _width - 0.5f,
                uv.y * _height - 0.5f);
            position.x = Mathf.Clamp(position.x, 0f, _width - 1f);
            position.y = Mathf.Clamp(position.y, 0f, _height - 1f);
            var x0 = Mathf.FloorToInt(position.x);
            var y0 = Mathf.FloorToInt(position.y);
            var x1 = Mathf.Min(x0 + 1, _width - 1);
            var y1 = Mathf.Min(y0 + 1, _height - 1);
            var tx = position.x - x0;
            var ty = position.y - y0;
            var bottom = Vector2.Lerp(source[Index(x0, y0)], source[Index(x1, y0)], tx);
            var top = Vector2.Lerp(source[Index(x0, y1)], source[Index(x1, y1)], tx);
            return Vector2.Lerp(bottom, top, ty);
        }

        private float SampleObstacle(Vector2 uv)
        {
            var x = Mathf.Clamp(Mathf.RoundToInt(uv.x * (_width - 1)), 0, _width - 1);
            var y = Mathf.Clamp(Mathf.RoundToInt(uv.y * (_height - 1)), 0, _height - 1);
            return _obstacle[Index(x, y)];
        }

        private Vector2 CellUv(int x, int y)
        {
            return new Vector2(
                (x + 0.5f) / _width,
                (y + 0.5f) / _height);
        }

        private int Index(int x, int y)
        {
            return Mathf.Clamp(x, 0, _width - 1)
                + Mathf.Clamp(y, 0, _height - 1) * _width;
        }

        private float ObstacleAt(int x, int y)
        {
            return _obstacle[Index(x, y)];
        }

        private bool IsSolid(int x, int y)
        {
            return x < 0 || x >= _width || y < 0 || y >= _height
                || _obstacle[Index(x, y)] > 0.5f;
        }

        private Vector2 VelocityAt(int x, int y)
        {
            return _velocity[Index(x, y)];
        }

        private float PressureAt(int x, int y)
        {
            return _pressure[Index(x, y)];
        }

        private void EnsureAlive()
        {
            if (_disposed)
            {
                throw new ObjectDisposedException(nameof(CpuColorWaterFluidBackend));
            }
        }

        private static float DistanceToSegment(Vector2 point, Vector2 start, Vector2 end)
        {
            var segment = end - start;
            var lengthSquared = segment.sqrMagnitude;
            var along = lengthSquared > 0.000001f
                ? Mathf.Clamp01(Vector2.Dot(point - start, segment) / lengthSquared)
                : 0f;
            return Vector2.Distance(point, start + segment * along);
        }

        private static Vector2 Clamp01(Vector2 value)
        {
            return new Vector2(Mathf.Clamp01(value.x), Mathf.Clamp01(value.y));
        }

        private static Vector2 ClampUv(Vector2 uv)
        {
            return new Vector2(Mathf.Clamp01(uv.x), Mathf.Clamp01(uv.y));
        }

        private static byte ToByte(float value)
        {
            return (byte)Mathf.RoundToInt(Mathf.Clamp01(value) * 255f);
        }

        private static void Swap<T>(ref T left, ref T right)
        {
            (left, right) = (right, left);
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
    }
}
