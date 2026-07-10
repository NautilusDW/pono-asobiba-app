using System.Collections.Generic;
using UnityEngine;

namespace Pono.MarbleRun3D.Gameplay
{
    [DisallowMultipleComponent]
    public sealed class OrbitCameraController : MonoBehaviour
    {
        private Vector3 _target = new Vector3(0f, 0.8f, 0f);
        private Vector3 _smoothTarget;
        private Vector3 _targetVelocity;
        private float _yaw = 34f;
        private float _pitch = 48f;
        private float _distance = 38f;
        private float _smoothYaw;
        private float _smoothPitch;
        private float _smoothDistance;
        private float _defaultYaw;
        private float _defaultPitch;
        private float _defaultDistance;
        private Vector3 _defaultTarget;
        private bool _celebrating;
        private bool _isTopView;

        public float Yaw => _yaw;
        public float Pitch => _pitch;
        public float Distance => _distance;
        public Vector3 Target => _target;
        public bool IsTopView => _isTopView;

        public void ConfigureDefault(float yaw = 34f, float pitch = 48f, float distance = 38f)
        {
            _yaw = _smoothYaw = _defaultYaw = yaw;
            _pitch = _smoothPitch = _defaultPitch = pitch;
            _distance = _smoothDistance = _defaultDistance = distance;
            _target = _smoothTarget = _defaultTarget = new Vector3(0f, 0.8f, 0f);
            _isTopView = false;
            ApplyImmediately();
        }

        public void Orbit(Vector2 screenDelta)
        {
            if (_celebrating) return;
            _isTopView = false;
            _yaw += screenDelta.x * 0.20f;
            _pitch = Mathf.Clamp(_pitch - screenDelta.y * 0.16f, 28f, 68f);
        }

        public void Zoom(float amount)
        {
            if (_celebrating) return;
            _distance = Mathf.Clamp(_distance + amount, 17f, 58f);
        }

        public void ResetView()
        {
            _celebrating = false;
            _isTopView = false;
            _yaw = _defaultYaw;
            _pitch = _defaultPitch;
            _distance = _defaultDistance;
            _target = _defaultTarget;
        }

        public void ToggleTopView()
        {
            if (_celebrating) return;
            _isTopView = !_isTopView;
            _yaw = _defaultYaw;
            _pitch = _isTopView ? 78f : _defaultPitch;
            _distance = _isTopView
                ? Mathf.Clamp(_defaultDistance * 1.08f, 17f, 58f)
                : _defaultDistance;
            _target = _defaultTarget;
        }

        public void FrameCourse(IReadOnlyList<Vector3> positions)
        {
            if (positions == null || positions.Count == 0)
            {
                ResetView();
                return;
            }

            var minimum = Vector3.zero;
            var maximum = Vector3.zero;
            var found = false;
            for (var index = 0; index < positions.Count; index++)
            {
                var position = positions[index];
                if (!IsFinite(position)) continue;
                if (!found)
                {
                    minimum = maximum = position;
                    found = true;
                }
                else
                {
                    minimum = Vector3.Min(minimum, position);
                    maximum = Vector3.Max(maximum, position);
                }
            }
            if (!found)
            {
                ResetView();
                return;
            }

            var bounds = new Bounds((minimum + maximum) * 0.5f, maximum - minimum);
            var cameraComponent = GetComponent<Camera>();
            var verticalFieldOfView = cameraComponent != null ? cameraComponent.fieldOfView : 43f;
            var aspect = cameraComponent != null && cameraComponent.aspect > 0.01f
                ? cameraComponent.aspect
                : 16f / 9f;
            var verticalHalfAngle = Mathf.Max(12f, verticalFieldOfView * 0.5f) * Mathf.Deg2Rad;
            var horizontalHalfAngle = Mathf.Atan(Mathf.Tan(verticalHalfAngle) * aspect);
            var horizontalRadius = Mathf.Sqrt(
                bounds.extents.x * bounds.extents.x + bounds.extents.z * bounds.extents.z) + 3.2f;
            // A diagonal camera projects a long ground-plane course into screen height.
            // Reserve that space as well as the top/bottom child UI overlays.
            var verticalRadius = bounds.extents.y + 2.8f + horizontalRadius * 0.35f;
            var horizontalDistance = horizontalRadius / Mathf.Max(0.15f, Mathf.Tan(horizontalHalfAngle));
            var verticalDistance = verticalRadius / Mathf.Max(0.15f, Mathf.Tan(verticalHalfAngle));
            var framedDistance = Mathf.Clamp(Mathf.Max(horizontalDistance, verticalDistance) * 1.14f, 17f, 58f);

            _defaultTarget = new Vector3(bounds.center.x, Mathf.Max(0.8f, bounds.center.y), bounds.center.z);
            _defaultDistance = framedDistance;
            _target = _defaultTarget;
            _yaw = _defaultYaw;
            _pitch = _isTopView ? 78f : _defaultPitch;
            _distance = _isTopView
                ? Mathf.Clamp(_defaultDistance * 1.08f, 17f, 58f)
                : _defaultDistance;
        }

        public void FocusForGoal(Vector3 target)
        {
            _celebrating = true;
            _target = target + Vector3.up * 0.55f;
            _distance = 12.5f;
            _pitch = 38f;
        }

        public void EndGoalFocus()
        {
            ResetView();
        }

        private void LateUpdate()
        {
            var delta = Mathf.Min(0.05f, Time.unscaledDeltaTime);
            if (_celebrating) _yaw += delta * 16f;
            _smoothYaw = Mathf.LerpAngle(_smoothYaw, _yaw, 1f - Mathf.Exp(-delta * 8f));
            _smoothPitch = Mathf.Lerp(_smoothPitch, _pitch, 1f - Mathf.Exp(-delta * 8f));
            _smoothDistance = Mathf.Lerp(_smoothDistance, _distance, 1f - Mathf.Exp(-delta * 7f));
            _smoothTarget = Vector3.SmoothDamp(
                _smoothTarget,
                _target,
                ref _targetVelocity,
                0.18f,
                Mathf.Infinity,
                delta);
            Apply(_smoothYaw, _smoothPitch, _smoothDistance, _smoothTarget);
        }

        private void ApplyImmediately()
        {
            Apply(_yaw, _pitch, _distance, _target);
        }

        private void Apply(float yaw, float pitch, float distance, Vector3 target)
        {
            var rotation = Quaternion.Euler(pitch, yaw, 0f);
            transform.position = target + rotation * new Vector3(0f, 0f, -distance);
            transform.rotation = rotation;
        }

        private static bool IsFinite(Vector3 value)
        {
            return !float.IsNaN(value.x) && !float.IsInfinity(value.x)
                && !float.IsNaN(value.y) && !float.IsInfinity(value.y)
                && !float.IsNaN(value.z) && !float.IsInfinity(value.z);
        }
    }
}
