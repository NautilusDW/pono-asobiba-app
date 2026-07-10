using System;
using System.Collections.Generic;
using Pono.ColorWaterDelivery.Rendering;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.ColorWaterDelivery.Gameplay
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RawImage))]
    public sealed class ColorWaterFluidPresenter : MonoBehaviour
    {
        private static readonly int PigmentTexId = Shader.PropertyToID("_PigmentTex");
        private static readonly int VelocityTexId = Shader.PropertyToID("_VelocityTex");
        private static readonly int ObstacleTexId = Shader.PropertyToID("_ObstacleTex");
        private static readonly int MotionAmountId = Shader.PropertyToID("_MotionAmount");

        private readonly List<FluidObstacle> _obstacles = new List<FluidObstacle>();
        private RawImage _image;
        private Material _material;
        private IColorWaterFluidBackend _backend;
        private FluidGoalRegion _goal;
        private bool _hasGoal;
        private bool _forceCpuForSession;

        public bool Paused { get; set; }

        public string BackendLabel => _backend?.Label ?? "なし";

        public bool IsGpu => _backend?.IsGpu == true;

        public GoalFluidMetrics LatestGoalMetrics => _backend?.LatestGoalMetrics
            ?? GoalFluidMetrics.Invalid();

        public void Initialize(bool forceCpu = false)
        {
            ReleaseResources();
            _forceCpuForSession = forceCpu;
            _image = GetComponent<RawImage>();
            var shader = Resources.Load<Shader>(
                "ColorWaterDelivery/Rendering/ColorWaterComposite");
            if (shader == null)
            {
                shader = Shader.Find("Pono/ColorWaterDelivery/Composite");
            }

            if (shader == null)
            {
                throw new InvalidOperationException("ColorWater composite shader was not found.");
            }

            _material = new Material(shader)
            {
                name = "Color Water Composite (Runtime)",
                hideFlags = HideFlags.DontSave
            };
            _image.texture = Texture2D.whiteTexture;
            _image.material = _material;
            _backend = ColorWaterFluidFactory.Create(forceCpu);
            ApplyConfiguration();
            UpdateMaterial();
        }

        public void SetObstacles(IReadOnlyList<FluidObstacle> obstacles)
        {
            _obstacles.Clear();
            if (obstacles != null)
            {
                for (var index = 0; index < obstacles.Count; index++)
                {
                    _obstacles.Add(obstacles[index]);
                }
            }

            TryBackendCall(() => _backend?.SetObstacles(_obstacles));
            UpdateMaterial();
        }

        public void SetGoal(in FluidGoalRegion goal)
        {
            _goal = goal;
            _hasGoal = true;
            TryBackendCall(ApplyGoal);
        }

        public void InjectSource(
            ColorWaterSource source,
            Vector2 uv,
            Vector2 velocity,
            float radius,
            float amount)
        {
            TryBackendCall(() => _backend?.InjectSource(source, uv, velocity, radius, amount));
        }

        public void Tick(float unscaledDeltaTime)
        {
            if (Paused)
            {
                return;
            }

            TryBackendCall(() => _backend?.Tick(unscaledDeltaTime));
            UpdateMaterial();
        }

        public bool RequestGoalMetrics(Action<GoalFluidMetrics> completed)
        {
            var requested = false;
            TryBackendCall(() => requested = _backend != null
                && _backend.RequestGoalMetrics(completed));
            return requested;
        }

        public void ResetFluid()
        {
            TryBackendCall(() => _backend?.Reset());
            UpdateMaterial();
        }

        public void ReleaseResources()
        {
            if (_image != null)
            {
                _image.material = null;
            }

            _backend?.Dispose();
            _backend = null;
            if (_material == null)
            {
                return;
            }

            if (Application.isEditor)
            {
                DestroyImmediate(_material);
            }
            else
            {
                Destroy(_material);
            }
            _material = null;
        }

        private void OnDestroy()
        {
            ReleaseResources();
        }

        private void TryBackendCall(Action action)
        {
            try
            {
                action?.Invoke();
            }
            catch (Exception exception)
            {
                if (_backend?.IsGpu != true || _forceCpuForSession)
                {
                    Debug.LogError($"ColorWater fluid failed: {exception.Message}");
                    return;
                }

                Debug.LogWarning($"ColorWater switched to CPU fluid: {exception.Message}");
                _forceCpuForSession = true;
                _backend.Dispose();
                _backend = ColorWaterFluidFactory.Create(forceCpu: true);
                ApplyConfiguration();
            }
        }

        private void ApplyConfiguration()
        {
            if (_backend == null)
            {
                return;
            }

            if (_obstacles.Count > 0)
            {
                _backend.SetObstacles(_obstacles);
            }
            if (_hasGoal)
            {
                ApplyGoal();
            }
        }

        private void ApplyGoal()
        {
            if (_backend != null)
            {
                _backend.SetGoal(in _goal);
            }
        }

        private void UpdateMaterial()
        {
            if (_material == null)
            {
                return;
            }

            _material.SetTexture(
                PigmentTexId,
                _backend?.PigmentTexture ?? Texture2D.blackTexture);
            _material.SetTexture(
                VelocityTexId,
                _backend?.VelocityTexture ?? Texture2D.blackTexture);
            _material.SetTexture(
                ObstacleTexId,
                _backend?.ObstacleTexture ?? Texture2D.blackTexture);
            _material.SetFloat(MotionAmountId, Paused ? 0f : 1f);
        }
    }
}
