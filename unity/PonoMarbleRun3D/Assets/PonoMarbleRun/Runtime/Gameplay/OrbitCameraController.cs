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

        public float Yaw => _yaw;
        public float Pitch => _pitch;
        public float Distance => _distance;
        public Vector3 Target => _target;

        public void ConfigureDefault(float yaw = 34f, float pitch = 48f, float distance = 38f)
        {
            _yaw = _smoothYaw = _defaultYaw = yaw;
            _pitch = _smoothPitch = _defaultPitch = pitch;
            _distance = _smoothDistance = _defaultDistance = distance;
            _target = _smoothTarget = _defaultTarget = new Vector3(0f, 0.8f, 0f);
            ApplyImmediately();
        }

        public void Orbit(Vector2 screenDelta)
        {
            if (_celebrating) return;
            _yaw += screenDelta.x * 0.20f;
            _pitch = Mathf.Clamp(_pitch - screenDelta.y * 0.16f, 28f, 68f);
        }

        public void Zoom(float amount)
        {
            if (_celebrating) return;
            _distance = Mathf.Clamp(_distance + amount, 17f, 48f);
        }

        public void ResetView()
        {
            _celebrating = false;
            _yaw = _defaultYaw;
            _pitch = _defaultPitch;
            _distance = _defaultDistance;
            _target = _defaultTarget;
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
    }
}
