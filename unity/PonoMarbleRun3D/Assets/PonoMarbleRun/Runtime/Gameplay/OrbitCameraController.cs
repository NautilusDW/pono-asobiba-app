using System.Collections.Generic;
using UnityEngine;

namespace Pono.MarbleRun3D.Gameplay
{
    public readonly struct FollowGroupSample
    {
        public FollowGroupSample(Vector3 center, Vector3 averageVelocity, float spread)
        {
            IsValid = true;
            Center = center;
            AverageVelocity = averageVelocity;
            Spread = Mathf.Max(0f, spread);
        }

        public bool IsValid { get; }
        public Vector3 Center { get; }
        public Vector3 AverageVelocity { get; }
        public float Spread { get; }
    }

    public readonly struct FollowViewPlan
    {
        public FollowViewPlan(Vector3 target, Vector3 heading, float yaw, float pitch, float distance)
        {
            Target = target;
            Heading = heading;
            Yaw = yaw;
            Pitch = pitch;
            Distance = distance;
        }

        public Vector3 Target { get; }
        public Vector3 Heading { get; }
        public float Yaw { get; }
        public float Pitch { get; }
        public float Distance { get; }
    }

    [DisallowMultipleComponent]
    public sealed class OrbitCameraController : MonoBehaviour
    {
        private const float TopViewDistanceMultiplier = 1.48f;
        public const float FollowMinimumDistance = 11.5f;
        public const float FollowMaximumDistance = 16f;
        public const float ManualOrbitHoldDuration = 3.5f;
        private const float FollowShoulderDegrees = 28f;
        private const float FollowPositionOutlierRadius = 7f;
        private const float FollowVelocityOutlierRadius = 4.5f;
        private const float FollowYawSpeed = 18f;
        private const float FollowYawFastSpeed = 22f;
        private const float FollowPitchSpeed = 6f;
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
        private bool _isFollowing;
        private float _manualOrbitHoldUntil;
        private Vector3 _followHeading = Vector3.forward;
        private float _followDesiredYaw;
        private float _followDesiredPitch = 38f;
        private float _followRecommendedDistance = 12.5f;
        private float _followZoomOffset;
        private Vector3 _followFilteredVelocity;
        private bool _hasFollowVelocity;
        private bool _isVerticalFollowMotion;

        public float Yaw => _yaw;
        public float Pitch => _pitch;
        public float Distance => _distance;
        public Vector3 Target => _target;
        public Vector3 CourseTarget => _defaultTarget;
        public float CourseDistance => _defaultDistance;
        public bool IsTopView => _isTopView;
        public bool IsFollowing => _isFollowing;
        public bool IsAutomaticOrbitHeld => _isFollowing && Time.unscaledTime < _manualOrbitHoldUntil;
        public Vector3 FollowHeading => _followHeading;
        public float FollowDesiredYaw => _followDesiredYaw;
        public float FollowDesiredPitch => _followDesiredPitch;
        public float FollowRecommendedDistance => _followRecommendedDistance;
        public bool IsVerticalFollowMotion => _isVerticalFollowMotion;

        public void ConfigureDefault(float yaw = 34f, float pitch = 48f, float distance = 38f)
        {
            _yaw = _smoothYaw = _defaultYaw = yaw;
            _pitch = _smoothPitch = _defaultPitch = pitch;
            _distance = _smoothDistance = _defaultDistance = distance;
            _target = _smoothTarget = _defaultTarget = new Vector3(0f, 0.8f, 0f);
            _isTopView = false;
            _isFollowing = false;
            _followHeading = FlattenDirection(Quaternion.Euler(0f, yaw - FollowShoulderDegrees, 0f)
                * Vector3.forward, Vector3.forward);
            _followDesiredYaw = yaw;
            _followDesiredPitch = 38f;
            _followRecommendedDistance = 12.5f;
            _followZoomOffset = 0f;
            _followFilteredVelocity = Vector3.zero;
            _hasFollowVelocity = false;
            _isVerticalFollowMotion = false;
            ApplyImmediately();
        }

        public void Orbit(Vector2 screenDelta)
        {
            _isTopView = false;
            _yaw += screenDelta.x * 0.20f;
            _pitch = Mathf.Clamp(_pitch - screenDelta.y * 0.16f, 28f, 68f);
            HoldAutomaticOrbit();
        }

        public void Zoom(float amount)
        {
            if (_isFollowing)
            {
                var minimum = _isTopView ? 15f : FollowMinimumDistance - 1.5f;
                var maximum = _isTopView ? 28f : FollowMaximumDistance + 4f;
                _distance = Mathf.Clamp(_distance + amount, minimum, maximum);
                _followZoomOffset = _distance - (_isTopView
                    ? Mathf.Clamp(_followRecommendedDistance * 1.42f, 15f, 24f)
                    : _followRecommendedDistance);
                HoldAutomaticOrbit();
                return;
            }

            _distance = Mathf.Clamp(_distance + amount, 17f, 58f);
        }

        public void ResetView()
        {
            _celebrating = false;
            _isTopView = false;
            _isFollowing = false;
            _yaw = _defaultYaw;
            _pitch = _defaultPitch;
            _distance = _defaultDistance;
            _target = _defaultTarget;
            _followZoomOffset = 0f;
            _hasFollowVelocity = false;
            _isVerticalFollowMotion = false;
        }

        public void SetFollowEnabled(bool enabled, bool returnToCourseOverview = true)
        {
            _isFollowing = enabled;
            _celebrating = false;
            if (enabled)
            {
                _isTopView = false;
                _followHeading = FlattenDirection(
                    Quaternion.Euler(0f, _yaw - FollowShoulderDegrees, 0f) * Vector3.forward,
                    Vector3.forward);
                _followDesiredYaw = _yaw;
                _followDesiredPitch = 38f;
                _pitch = Mathf.Clamp(_pitch, 36f, 40f);
                _followRecommendedDistance = Mathf.Clamp(_defaultDistance * 0.38f,
                    FollowMinimumDistance, 13.25f);
                _followZoomOffset = 0f;
                _distance = _followRecommendedDistance;
                _manualOrbitHoldUntil = 0f;
                _followFilteredVelocity = Vector3.zero;
                _hasFollowVelocity = false;
                _isVerticalFollowMotion = false;
                return;
            }

            if (returnToCourseOverview) RestoreCourseOverview();
        }

        public void SetFollowTarget(Vector3 target)
        {
            if (!_isFollowing || !IsFinite(target)) return;
            _target = target;
        }

        public void SetFollowFrame(FollowGroupSample group, Vector3 courseDirection)
        {
            if (!_isFollowing || !group.IsValid) return;
            if (!_hasFollowVelocity)
            {
                _followFilteredVelocity = group.AverageVelocity;
                _hasFollowVelocity = true;
            }
            else
            {
                var delta = Mathf.Clamp(Time.unscaledDeltaTime, 1f / 120f, 0.05f);
                var velocityBlend = 1f - Mathf.Exp(-delta / 0.55f);
                _followFilteredVelocity = Vector3.Lerp(
                    _followFilteredVelocity,
                    group.AverageVelocity,
                    velocityBlend);
            }
            var filteredGroup = new FollowGroupSample(
                group.Center,
                _followFilteredVelocity,
                group.Spread);
            var horizontalSpeed = new Vector2(
                _followFilteredVelocity.x,
                _followFilteredVelocity.z).magnitude;
            _isVerticalFollowMotion = horizontalSpeed < 0.45f
                && Mathf.Abs(_followFilteredVelocity.y) > 0.65f;
            var plan = CalculateFollowViewPlan(
                filteredGroup,
                courseDirection,
                _followHeading,
                _yaw);
            _target = plan.Target;
            _followHeading = plan.Heading;
            _followDesiredYaw = plan.Yaw;
            _followDesiredPitch = plan.Pitch;
            _followRecommendedDistance = plan.Distance;

            if (_isTopView)
            {
                _distance = Mathf.Clamp(
                    _followRecommendedDistance * 1.42f + _followZoomOffset,
                    15f,
                    28f);
                return;
            }

            _distance = Mathf.Clamp(
                _followRecommendedDistance + _followZoomOffset,
                FollowMinimumDistance - 1.5f,
                FollowMaximumDistance + 4f);
        }

        public void RestoreCourseOverview()
        {
            _isFollowing = false;
            _isTopView = false;
            _yaw = _defaultYaw;
            _pitch = _defaultPitch;
            _distance = _defaultDistance;
            _target = _defaultTarget;
            _followZoomOffset = 0f;
            _hasFollowVelocity = false;
            _isVerticalFollowMotion = false;
        }

        public void ToggleTopView()
        {
            _isTopView = !_isTopView;
            _yaw = _defaultYaw;
            _pitch = _isTopView ? 78f : _defaultPitch;
            if (_isFollowing)
            {
                _pitch = _isTopView ? 78f : _followDesiredPitch;
                _distance = _isTopView
                    ? Mathf.Clamp(_followRecommendedDistance * 1.42f + _followZoomOffset, 15f, 28f)
                    : Mathf.Clamp(_followRecommendedDistance + _followZoomOffset,
                        FollowMinimumDistance - 1.5f, FollowMaximumDistance + 4f);
            }
            else
            {
                _distance = _isTopView
                    ? Mathf.Clamp(_defaultDistance * TopViewDistanceMultiplier, 17f, 58f)
                    : _defaultDistance;
            }
            if (!_isFollowing) _target = _defaultTarget;
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
            var verticalRadius = bounds.extents.y + 2.8f + horizontalRadius * 0.50f;
            var horizontalDistance = horizontalRadius / Mathf.Max(0.15f, Mathf.Tan(horizontalHalfAngle));
            var verticalDistance = verticalRadius / Mathf.Max(0.15f, Mathf.Tan(verticalHalfAngle));
            var framedDistance = Mathf.Clamp(Mathf.Max(horizontalDistance, verticalDistance) * 1.14f, 17f, 58f);

            _defaultTarget = new Vector3(bounds.center.x, Mathf.Max(0.8f, bounds.center.y), bounds.center.z);
            _defaultDistance = framedDistance;
            _target = _defaultTarget;
            _isFollowing = false;
            _yaw = _defaultYaw;
            _pitch = _isTopView ? 78f : _defaultPitch;
            _distance = _isTopView
                ? Mathf.Clamp(_defaultDistance * TopViewDistanceMultiplier, 17f, 58f)
                : _defaultDistance;
        }

        public void FocusForGoal(Vector3 target)
        {
            _isFollowing = false;
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
            if (_celebrating && Time.unscaledTime >= _manualOrbitHoldUntil) _yaw += delta * 10f;
            if (_isFollowing && !_isTopView && !IsAutomaticOrbitHeld)
            {
                var yawSpeed = _isVerticalFollowMotion
                    ? 6f
                    : CalculateFollowYawSpeed(_yaw, _followDesiredYaw);
                _yaw = Mathf.MoveTowardsAngle(_yaw, _followDesiredYaw, yawSpeed * delta);
                _pitch = Mathf.MoveTowards(_pitch, _followDesiredPitch, FollowPitchSpeed * delta);
            }
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

        public static FollowGroupSample CalculateFollowGroup(
            IReadOnlyList<Vector3> positions,
            IReadOnlyList<Vector3> velocities,
            int count)
        {
            if (positions == null || velocities == null || count <= 0) return default;
            var limit = Mathf.Min(count, Mathf.Min(positions.Count, velocities.Count));
            var validCount = 0;
            for (var i = 0; i < limit; i++)
            {
                if (IsFinite(positions[i]) && IsFinite(velocities[i])) validCount++;
            }
            if (validCount == 0) return default;

            var middle = validCount / 2;
            var positionMedian = new Vector3(
                SelectValidAxis(positions, velocities, limit, false, 0, middle),
                SelectValidAxis(positions, velocities, limit, false, 1, middle),
                SelectValidAxis(positions, velocities, limit, false, 2, middle));
            var velocityMedian = new Vector3(
                SelectValidAxis(positions, velocities, limit, true, 0, middle),
                SelectValidAxis(positions, velocities, limit, true, 1, middle),
                SelectValidAxis(positions, velocities, limit, true, 2, middle));

            if (validCount % 2 == 0)
            {
                var lower = middle - 1;
                positionMedian = (positionMedian + new Vector3(
                    SelectValidAxis(positions, velocities, limit, false, 0, lower),
                    SelectValidAxis(positions, velocities, limit, false, 1, lower),
                    SelectValidAxis(positions, velocities, limit, false, 2, lower))) * 0.5f;
                velocityMedian = (velocityMedian + new Vector3(
                    SelectValidAxis(positions, velocities, limit, true, 0, lower),
                    SelectValidAxis(positions, velocities, limit, true, 1, lower),
                    SelectValidAxis(positions, velocities, limit, true, 2, lower))) * 0.5f;
            }

            var center = Vector3.zero;
            var averageVelocity = Vector3.zero;
            var includedCount = 0;
            for (var i = 0; i < limit; i++)
            {
                if (!IsFinite(positions[i]) || !IsFinite(velocities[i])) continue;
                var positionOffset = positions[i] - positionMedian;
                if (validCount >= 3 && positionOffset.sqrMagnitude
                    > FollowPositionOutlierRadius * FollowPositionOutlierRadius)
                {
                    continue;
                }
                center += validCount >= 3
                    ? positions[i]
                    : positionMedian + Vector3.ClampMagnitude(
                        positionOffset,
                        FollowPositionOutlierRadius);
                averageVelocity += velocityMedian + Vector3.ClampMagnitude(
                    velocities[i] - velocityMedian,
                    FollowVelocityOutlierRadius);
                includedCount++;
            }
            if (includedCount == 0)
            {
                center = positionMedian;
                averageVelocity = velocityMedian;
                includedCount = 1;
            }
            center /= includedCount;
            averageVelocity /= includedCount;

            // The upper quartile shows the main pack without letting one fallen or
            // reset marble pull the camera far away from the course.
            var spreadRank = Mathf.FloorToInt((validCount - 1) * 0.75f);
            var spread = SelectValidSpread(
                positions,
                velocities,
                limit,
                center,
                spreadRank);
            return new FollowGroupSample(center, averageVelocity, Mathf.Clamp(spread, 0f, 5.5f));
        }

        public static Vector3 SelectCourseLookDirection(
            Vector3 center,
            Vector3 averageVelocity,
            IReadOnlyList<Vector3> coursePositions,
            int count,
            Vector3 fallbackDirection)
        {
            var travel = FlattenDirection(averageVelocity, fallbackDirection);
            if (coursePositions == null || count <= 0) return travel;

            var limit = Mathf.Min(count, coursePositions.Count);
            var speed = new Vector2(averageVelocity.x, averageVelocity.z).magnitude;
            var preferredDistance = Mathf.Clamp(3.6f + speed * 0.30f, 3.6f, 5.8f);
            var bestScore = float.NegativeInfinity;
            var bestDirection = travel;
            for (var i = 0; i < limit; i++)
            {
                var point = coursePositions[i];
                if (!IsFinite(point)) continue;
                var offset = point - center;
                var horizontal = new Vector3(offset.x, 0f, offset.z);
                var distance = horizontal.magnitude;
                if (distance < 0.75f || distance > 11.5f || Mathf.Abs(offset.y) > 6f) continue;
                var direction = horizontal / distance;
                var alignment = Vector3.Dot(direction, travel);
                if (alignment < 0.12f) continue;
                var score = alignment * 4f
                    - Mathf.Abs(distance - preferredDistance) * 0.20f
                    - Mathf.Abs(offset.y) * 0.055f;
                if (score <= bestScore) continue;
                bestScore = score;
                bestDirection = direction;
            }

            return FlattenDirection(Vector3.Lerp(travel, bestDirection, 0.42f), travel);
        }

        public static FollowViewPlan CalculateFollowViewPlan(
            FollowGroupSample group,
            Vector3 courseDirection,
            Vector3 fallbackHeading,
            float fallbackYaw)
        {
            var fallback = FlattenDirection(fallbackHeading, Vector3.forward);
            if (!group.IsValid)
            {
                return new FollowViewPlan(Vector3.zero, fallback, fallbackYaw, 38f, 12.5f);
            }

            var horizontalVelocity = new Vector3(
                group.AverageVelocity.x,
                0f,
                group.AverageVelocity.z);
            var horizontalSpeed = horizontalVelocity.magnitude;
            var course = FlattenDirection(courseDirection, fallback);
            Vector3 heading;
            float yaw;
            if (horizontalSpeed >= 0.45f)
            {
                var motion = horizontalVelocity / horizontalSpeed;
                heading = FlattenDirection(Vector3.Lerp(motion, course, 0.34f), motion);
                yaw = Mathf.Atan2(heading.x, heading.z) * Mathf.Rad2Deg + FollowShoulderDegrees;
            }
            else if (Mathf.Abs(group.AverageVelocity.y) > 0.65f)
            {
                // While an elevator carries the marbles vertically there is no
                // trustworthy horizontal heading. A very slow orbit reveals the
                // lift mechanism without hunting between nearby rails.
                heading = fallback;
                yaw = fallbackYaw + Mathf.Sign(group.AverageVelocity.y) * 10f;
            }
            else
            {
                // Keep the last readable side while a marble waits in a funnel,
                // elevator, or reset. Near-zero velocity must not cause yaw noise.
                heading = fallback;
                yaw = fallbackYaw;
            }

            var lookAhead = Mathf.Clamp(0.80f + horizontalSpeed * 0.14f, 0.80f, 1.60f);
            var target = group.Center
                + heading * lookAhead
                + Vector3.up * (0.42f + Mathf.Clamp(group.AverageVelocity.y * 0.05f, -0.12f, 0.12f));
            var distance = Mathf.Clamp(
                12.15f + group.Spread * 0.70f + Mathf.Clamp(horizontalSpeed, 0f, 6f) * 0.06f,
                FollowMinimumDistance,
                FollowMaximumDistance);
            var pitch = Mathf.Clamp(38f - group.AverageVelocity.y * 0.65f, 36f, 40f);
            return new FollowViewPlan(target, heading, yaw, pitch, distance);
        }

        public static float CalculateFollowYawSpeed(float currentYaw, float desiredYaw)
        {
            var yawDelta = Mathf.Abs(Mathf.DeltaAngle(currentYaw, desiredYaw));
            return Mathf.Lerp(
                FollowYawSpeed,
                FollowYawFastSpeed,
                Mathf.InverseLerp(35f, 100f, yawDelta));
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

        private void HoldAutomaticOrbit()
        {
            if (_isFollowing)
                _manualOrbitHoldUntil = Time.unscaledTime + ManualOrbitHoldDuration;
        }

        private static Vector3 FlattenDirection(Vector3 value, Vector3 fallback)
        {
            var flattened = new Vector3(value.x, 0f, value.z);
            if (flattened.sqrMagnitude > 0.0001f) return flattened.normalized;
            flattened = new Vector3(fallback.x, 0f, fallback.z);
            return flattened.sqrMagnitude > 0.0001f ? flattened.normalized : Vector3.forward;
        }

        private static float SelectValidAxis(
            IReadOnlyList<Vector3> positions,
            IReadOnlyList<Vector3> velocities,
            int count,
            bool useVelocity,
            int axis,
            int rank)
        {
            for (var candidateIndex = 0; candidateIndex < count; candidateIndex++)
            {
                if (!IsFinite(positions[candidateIndex]) || !IsFinite(velocities[candidateIndex])) continue;
                var candidateVector = useVelocity ? velocities[candidateIndex] : positions[candidateIndex];
                var candidate = Axis(candidateVector, axis);
                var less = 0;
                var equal = 0;
                for (var compareIndex = 0; compareIndex < count; compareIndex++)
                {
                    if (!IsFinite(positions[compareIndex]) || !IsFinite(velocities[compareIndex])) continue;
                    var compareVector = useVelocity ? velocities[compareIndex] : positions[compareIndex];
                    var compare = Axis(compareVector, axis);
                    if (compare < candidate) less++;
                    else if (compare == candidate) equal++;
                }
                if (less <= rank && rank < less + equal) return candidate;
            }
            return 0f;
        }

        private static float SelectValidSpread(
            IReadOnlyList<Vector3> positions,
            IReadOnlyList<Vector3> velocities,
            int count,
            Vector3 center,
            int rank)
        {
            for (var candidateIndex = 0; candidateIndex < count; candidateIndex++)
            {
                if (!IsFinite(positions[candidateIndex]) || !IsFinite(velocities[candidateIndex])) continue;
                var candidate = FollowSpreadDistance(positions[candidateIndex], center);
                var less = 0;
                var equal = 0;
                for (var compareIndex = 0; compareIndex < count; compareIndex++)
                {
                    if (!IsFinite(positions[compareIndex]) || !IsFinite(velocities[compareIndex])) continue;
                    var compare = FollowSpreadDistance(positions[compareIndex], center);
                    if (compare < candidate) less++;
                    else if (compare == candidate) equal++;
                }
                if (less <= rank && rank < less + equal) return candidate;
            }
            return 0f;
        }

        private static float Axis(Vector3 value, int axis)
        {
            return axis == 0 ? value.x : axis == 1 ? value.y : value.z;
        }

        private static float FollowSpreadDistance(Vector3 position, Vector3 center)
        {
            var offset = position - center;
            offset.y *= 0.55f;
            return offset.magnitude;
        }
    }
}
