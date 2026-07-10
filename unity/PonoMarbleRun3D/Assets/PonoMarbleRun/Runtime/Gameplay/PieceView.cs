using System;
using System.Collections.Generic;
using Pono.MarbleRun3D.Core;
using UnityEngine;

namespace Pono.MarbleRun3D.Gameplay
{
    [DisallowMultipleComponent]
    public sealed class MarbleActor : MonoBehaviour
    {
        [SerializeField] private int _index = -1;
        [SerializeField] private string _stableId = "marble-unassigned";

        public int Index => _index;
        public string StableId => _stableId;

        public void Configure(int index)
        {
            _index = index;
            _stableId = "marble-" + index.ToString("D2");
        }
    }

    [DisallowMultipleComponent]
    public sealed class GoalSensor : MonoBehaviour
    {
        public event Action<MarbleActor> MarbleEntered;
        private readonly HashSet<MarbleActor> _enteredMarbles = new HashSet<MarbleActor>();

        public void ResetSensor()
        {
            _enteredMarbles.Clear();
        }

        private void OnTriggerEnter(Collider other)
        {
            var marble = other.GetComponentInParent<MarbleActor>();
            NotifyMarble(marble);
        }

        public bool NotifyMarble(MarbleActor marble)
        {
            if (marble == null || !_enteredMarbles.Add(marble)) return false;
            MarbleEntered?.Invoke(marble);
            return true;
        }
    }

    /// <summary>
    /// Keeps the entry energy for one passive guide. Unity's segmented toy-track
    /// colliders can shave speed at each seam; reconstructing velocity from the
    /// stored energy corrects that numerical loss without inventing a motor.
    /// </summary>
    internal sealed class PassivePathEnergyState
    {
        private readonly Dictionary<Rigidbody, float> _specificEnergies =
            new Dictionary<Rigidbody, float>();

        public void Capture(Rigidbody body)
        {
            if (body == null) return;
            if (PassiveGuidePhysics.TryCalculateSpecificMechanicalEnergy(
                    body.linearVelocity,
                    body.worldCenterOfMass.y,
                    Mathf.Abs(Physics.gravity.y),
                    out var specificEnergy))
            {
                _specificEnergies[body] = specificEnergy;
            }
        }

        public void Apply(Rigidbody body, Transform pieceRoot, Vector3 localPathTangent)
        {
            if (body == null || pieceRoot == null || body.isKinematic) return;
            if (!_specificEnergies.TryGetValue(body, out var specificEnergy))
            {
                Capture(body);
                if (!_specificEnergies.TryGetValue(body, out specificEnergy)) return;
            }

            var worldTangent = pieceRoot.TransformDirection(localPathTangent);
            if (PassiveGuidePhysics.TryCalculateEnergyConservingVelocity(
                    specificEnergy,
                    body.worldCenterOfMass.y,
                    worldTangent,
                    Mathf.Abs(Physics.gravity.y),
                    MarbleRunPhysicsProfile.MarbleMaximumSpeed,
                    out var constrainedVelocity))
            {
                body.linearVelocity = constrainedVelocity;
            }
        }

        public void Remove(Rigidbody body)
        {
            if (body != null) _specificEnergies.Remove(body);
        }
    }

    /// <summary>
    /// Geometry shared by the wooden and transparent 90-degree curve guides. The
    /// physical part is only the quarter arc from local south to local east; clamping
    /// to that finite arc prevents a broad trigger from continuing the invisible
    /// circle before its entrance or after its exit.
    /// </summary>
    internal static class QuarterCurvePath
    {
        public const float Radius = 1.5f;
        private static readonly Vector3 Centre = new Vector3(1.5f, 0f, -1.5f);

        public static bool TryEvaluate(
            Vector3 localPosition,
            float corridorRadius,
            out Vector3 nearestPoint,
            out Vector3 forwardTangent,
            out Vector3 outwardRadial)
        {
            var offset = new Vector3(localPosition.x - Centre.x, 0f, localPosition.z - Centre.z);
            if (offset.sqrMagnitude < 0.0001f)
            {
                nearestPoint = localPosition;
                forwardTangent = Vector3.forward;
                outwardRadial = Vector3.left;
                return false;
            }

            var angle = Mathf.Atan2(offset.z, offset.x);
            if (angle < 0f) angle += Mathf.PI * 2f;
            angle = Mathf.Clamp(angle, Mathf.PI * 0.5f, Mathf.PI);
            outwardRadial = new Vector3(Mathf.Cos(angle), 0f, Mathf.Sin(angle));
            nearestPoint = Centre + outwardRadial * Radius;
            nearestPoint.y = localPosition.y;
            forwardTangent = new Vector3(Mathf.Sin(angle), 0f, -Mathf.Cos(angle));

            var horizontalError = new Vector2(
                localPosition.x - nearestPoint.x,
                localPosition.z - nearestPoint.z);
            return horizontalError.sqrMagnitude <= corridorRadius * corridorRadius;
        }
    }

    [DisallowMultipleComponent]
    public sealed class HelixMarbleGuide : MonoBehaviour
    {
        private Transform _pieceRoot;
        private float _radius = 0.82f;
        private float _height = WoodenPieceFactory.LevelHeight * 2f;
        private float _turns = 1.5f;
        private readonly Dictionary<Rigidbody, float> _travelSigns = new Dictionary<Rigidbody, float>();
        private readonly PassivePathEnergyState _energyState = new PassivePathEnergyState();

        public void Configure(Transform pieceRoot, float radius, float height, float turns)
        {
            _pieceRoot = pieceRoot;
            _radius = Mathf.Max(0.45f, radius);
            _height = Mathf.Max(0.25f, height);
            _turns = Mathf.Max(0.5f, turns);
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var t = EstimateProgress(localPosition);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var onStraightConnector = (t <= 0.015f && localPosition.z <= -_radius * 0.80f)
                || (t >= 0.985f && localPosition.z >= _radius * 0.80f);
            var along = onStraightConnector
                ? localVelocity.z
                : Vector3.Dot(localVelocity, Tangent(t));
            _travelSigns[body] = Mathf.Abs(along) > 0.15f ? Mathf.Sign(along) : 1f;
            _energyState.Capture(body);
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var travelSign = _travelSigns.TryGetValue(body, out var storedSign) ? storedSign : 1f;
            Vector3 target;
            Vector3 tangent;
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var centripetalAcceleration = Vector3.zero;
            var marbleHeight = WoodenPieceFactory.MarbleRadius + 0.18f;
            if (localPosition.z < -_radius && localPosition.y > _height * 0.72f)
            {
                target = new Vector3(0f, _height + marbleHeight, localPosition.z);
                tangent = Vector3.forward * travelSign;
            }
            else if (localPosition.z > _radius && localPosition.y < _height * 0.28f + marbleHeight)
            {
                target = new Vector3(0f, marbleHeight, localPosition.z);
                tangent = Vector3.forward * travelSign;
            }
            else
            {
                var t = EstimateProgress(localPosition);
                // The visible helix ends at (0, +radius) and then has a straight
                // +Z connector. Select that exit by progress/height; selecting only
                // by z left a fast marble on the helix's terminal -X tangent forever.
                if (t >= 0.985f)
                {
                    target = new Vector3(0f, marbleHeight, Mathf.Max(_radius, localPosition.z));
                    tangent = Vector3.forward * travelSign;
                }
                else
                {
                    target = PathPoint(t) + Vector3.up * marbleHeight;
                    tangent = Tangent(t) * travelSign;

                    var horizontalTangent = new Vector3(tangent.x, 0f, tangent.z);
                    var inward = new Vector3(-target.x, 0f, -target.z);
                    if (horizontalTangent.sqrMagnitude > 0.0001f && inward.sqrMagnitude > 0.0001f)
                    {
                        var horizontalSpeed = Vector3.Dot(localVelocity, horizontalTangent.normalized);
                        // omega = v / r, therefore inward acceleration is omega^2 * r.
                        var horizontalAngularSpeed = horizontalSpeed / _radius;
                        centripetalAcceleration = inward.normalized
                            * (horizontalAngularSpeed * horizontalAngularSpeed * _radius);
                    }
                }
            }
            var correction = target - localPosition;
            var acceleration = PassiveGuidePhysics.CalculateConstraintAcceleration(
                localVelocity,
                tangent,
                correction,
                7.5f,
                14f,
                120f,
                centripetalAcceleration);
            body.AddForce(_pieceRoot.TransformDirection(acceleration), ForceMode.Acceleration);
            _energyState.Apply(body, _pieceRoot, tangent);
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.attachedRigidbody == null) return;
            _travelSigns.Remove(other.attachedRigidbody);
            _energyState.Remove(other.attachedRigidbody);
        }

        private float EstimateProgress(Vector3 localPosition)
        {
            var trackY = localPosition.y - (WoodenPieceFactory.MarbleRadius + 0.18f);
            return Mathf.Clamp01(1f - trackY / _height);
        }

        private Vector3 PathPoint(float t)
        {
            var angle = -Mathf.PI * 0.5f + Mathf.PI * 2f * _turns * t;
            return new Vector3(
                Mathf.Cos(angle) * _radius,
                Mathf.Lerp(_height, 0f, t),
                Mathf.Sin(angle) * _radius);
        }

        private Vector3 Tangent(float t)
        {
            var angle = -Mathf.PI * 0.5f + Mathf.PI * 2f * _turns * t;
            var angleSpan = Mathf.PI * 2f * _turns;
            return new Vector3(
                -Mathf.Sin(angle) * _radius * angleSpan,
                -_height,
                Mathf.Cos(angle) * _radius * angleSpan).normalized;
        }

        private static bool TryGetMarble(Collider other, out Rigidbody body)
        {
            body = other.attachedRigidbody;
            return body != null && other.GetComponentInParent<MarbleActor>() != null;
        }
    }

    [DisallowMultipleComponent]
    public sealed class LiftMarbleGuide : MonoBehaviour
    {
        private Transform _pieceRoot;
        private Vector3 _uphillDirection;

        public void Configure(Transform pieceRoot)
        {
            _pieceRoot = pieceRoot;
            _uphillDirection = new Vector3(
                0f,
                WoodenPieceFactory.LevelHeight,
                WoodenPieceFactory.CellSize).normalized;
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var targetSpeed = Mathf.Clamp(localVelocity.magnitude, 2.8f, 5.4f);
            var centreCorrection = new Vector3(-localPosition.x * 3.2f, 0f, 0f);
            var acceleration = (_uphillDirection * targetSpeed - localVelocity) * 7.2f + centreCorrection;
            acceleration = Vector3.ClampMagnitude(acceleration, 22f);
            body.AddForce(_pieceRoot.TransformDirection(acceleration), ForceMode.Acceleration);
        }

        private static bool TryGetMarble(Collider other, out Rigidbody body)
        {
            body = other.attachedRigidbody;
            return body != null && other.GetComponentInParent<MarbleActor>() != null;
        }
    }

    [DisallowMultipleComponent]
    public sealed class ClearTubeMarbleGuide : MonoBehaviour
    {
        private Transform _pieceRoot;
        private readonly Dictionary<Rigidbody, float> _travelSigns = new Dictionary<Rigidbody, float>();
        private readonly PassivePathEnergyState _energyState = new PassivePathEnergyState();

        public void Configure(Transform pieceRoot)
        {
            _pieceRoot = pieceRoot;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            _travelSigns[body] = Mathf.Abs(localVelocity.z) > 0.10f
                ? Mathf.Sign(localVelocity.z)
                : localPosition.z <= 0f ? 1f : -1f;
            _energyState.Capture(body);
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var sign = _travelSigns.TryGetValue(body, out var storedSign) ? storedSign : 1f;
            var tangent = Vector3.forward * sign;
            var target = new Vector3(
                0f,
                WoodenPieceFactory.MarbleRadius + 0.20f,
                localPosition.z);
            var acceleration = PassiveGuidePhysics.CalculateConstraintAcceleration(
                localVelocity,
                tangent,
                target - localPosition,
                8.5f,
                15f,
                32f);
            body.AddForce(_pieceRoot.TransformDirection(acceleration),
                ForceMode.Acceleration);
            _energyState.Apply(body, _pieceRoot, tangent);
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.attachedRigidbody == null) return;
            _travelSigns.Remove(other.attachedRigidbody);
            _energyState.Remove(other.attachedRigidbody);
        }

        private static bool TryGetMarble(Collider other, out Rigidbody body)
        {
            body = other.attachedRigidbody;
            return body != null && other.GetComponentInParent<MarbleActor>() != null;
        }
    }

    [DisallowMultipleComponent]
    public sealed class SpinnerMarbleGuide : MonoBehaviour
    {
        private Transform _pieceRoot;
        private Rigidbody _rotor;
        private readonly Dictionary<Rigidbody, float> _travelSigns = new Dictionary<Rigidbody, float>();

        public void Configure(Transform pieceRoot, Rigidbody rotor)
        {
            _pieceRoot = pieceRoot;
            _rotor = rotor;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            _travelSigns[body] = Mathf.Abs(localVelocity.z) > 0.10f
                ? Mathf.Sign(localVelocity.z)
                : localPosition.z <= 0f ? 1f : -1f;
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var sign = _travelSigns.TryGetValue(body, out var storedSign) ? storedSign : 1f;
            var tangent = Vector3.forward * sign;
            var target = new Vector3(
                0f,
                WoodenPieceFactory.MarbleRadius + 0.24f,
                localPosition.z);
            var acceleration = PassiveGuidePhysics.CalculateConstraintAcceleration(
                localVelocity,
                tangent,
                target - localPosition,
                7.8f,
                10.5f,
                25f);

            // The visible paddles have lightweight non-blocking geometry. Transfer a
            // small, speed-proportional amount of the marble's energy to the rotor so
            // it only turns while a moving marble passes through.
            var forwardSpeed = Mathf.Max(0f, Vector3.Dot(localVelocity, tangent));
            if (_rotor != null && !_rotor.isKinematic && forwardSpeed > 0.15f)
            {
                _rotor.AddTorque(_pieceRoot.right * (forwardSpeed * 0.72f * sign),
                    ForceMode.Acceleration);
                acceleration -= tangent * Mathf.Min(1.4f, forwardSpeed * 0.22f);
            }

            body.AddForce(_pieceRoot.TransformDirection(Vector3.ClampMagnitude(acceleration, 25f)),
                ForceMode.Acceleration);
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.attachedRigidbody != null) _travelSigns.Remove(other.attachedRigidbody);
        }

        private static bool TryGetMarble(Collider other, out Rigidbody body)
        {
            body = other.attachedRigidbody;
            return body != null && other.GetComponentInParent<MarbleActor>() != null;
        }
    }

    [DisallowMultipleComponent]
    public sealed class ElevatorMarbleGuide : MonoBehaviour
    {
        private enum TravelStage
        {
            Entering,
            Rising,
            Exiting
        }

        private Transform _pieceRoot;
        private float _height = WoodenPieceFactory.LevelHeight * 3f;
        private readonly Dictionary<Rigidbody, TravelStage> _stages =
            new Dictionary<Rigidbody, TravelStage>();
        private readonly Dictionary<Rigidbody, float> _lanes =
            new Dictionary<Rigidbody, float>();

        public float TravelHeight => _height;
        public int ActiveBodyCount => _stages.Count;

        public void Configure(Transform pieceRoot, float height)
        {
            _pieceRoot = pieceRoot;
            _height = Mathf.Max(WoodenPieceFactory.LevelHeight, height);
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null) return;
            RegisterBody(body, other.GetComponentInParent<MarbleActor>());
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            if (!_stages.ContainsKey(body))
                RegisterBody(body, other.GetComponentInParent<MarbleActor>());

            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var stage = _stages[body];
            var lane = _lanes[body];
            var marbleHeight = WoodenPieceFactory.MarbleRadius + 0.20f;
            Vector3 desiredVelocity;
            Vector3 correction;

            if (stage == TravelStage.Entering && localPosition.z >= -0.18f)
            {
                stage = TravelStage.Rising;
                _stages[body] = stage;
            }
            if (stage == TravelStage.Rising && localPosition.y >= _height + marbleHeight - 0.10f)
            {
                stage = TravelStage.Exiting;
                _stages[body] = stage;
            }

            switch (stage)
            {
                case TravelStage.Entering:
                    desiredVelocity = new Vector3((lane - localPosition.x) * 4f, 0f, 3.8f);
                    correction = new Vector3(lane - localPosition.x, marbleHeight - localPosition.y, 0f);
                    break;
                case TravelStage.Rising:
                    desiredVelocity = new Vector3(0f, 3.25f, 0f);
                    correction = new Vector3(lane - localPosition.x, 0f, -localPosition.z);
                    break;
                default:
                    desiredVelocity = new Vector3(0f, 0f, 4.8f);
                    correction = new Vector3(-localPosition.x, _height + marbleHeight - localPosition.y, 0f);
                    break;
            }

            var acceleration = (desiredVelocity - localVelocity) * 8.5f + correction * 12f;
            acceleration = Vector3.ClampMagnitude(acceleration, 30f);
            body.AddForce(_pieceRoot.TransformDirection(acceleration), ForceMode.Acceleration);

            const float maximumSpeed = 7.2f;
            if (body.linearVelocity.sqrMagnitude > maximumSpeed * maximumSpeed)
                body.linearVelocity = body.linearVelocity.normalized * maximumSpeed;
        }

        private void OnTriggerExit(Collider other)
        {
            var body = other.attachedRigidbody;
            if (body == null) return;
            _stages.Remove(body);
            _lanes.Remove(body);
        }

        private void RegisterBody(Rigidbody body, MarbleActor actor)
        {
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            _stages[body] = localPosition.y > _height * 0.72f
                ? TravelStage.Exiting
                : localPosition.z >= -0.18f ? TravelStage.Rising : TravelStage.Entering;
            var laneIndex = actor == null || actor.Index < 0 ? 1 : actor.Index % 3;
            _lanes[body] = (laneIndex - 1) * 0.25f;
        }

        private static bool TryGetMarble(Collider other, out Rigidbody body)
        {
            body = other.attachedRigidbody;
            return body != null && other.GetComponentInParent<MarbleActor>() != null;
        }
    }

    [DisallowMultipleComponent]
    public sealed class ElevatorVisualAnimator : MonoBehaviour
    {
        private Transform _movingCar;
        private Vector3 _baseLocalPosition;
        private float _travelHeight;
        private float _phase;

        public float TravelHeight => _travelHeight;

        public void Configure(Transform movingCar, float travelHeight)
        {
            _movingCar = movingCar;
            _travelHeight = Mathf.Max(0.1f, travelHeight);
            _baseLocalPosition = movingCar == null ? Vector3.zero : movingCar.localPosition;
        }

        private void Update()
        {
            if (_movingCar == null) return;
            _phase = Mathf.Repeat(_phase + Time.deltaTime * 0.22f, 2f);
            var normalized = _phase <= 1f ? _phase : 2f - _phase;
            var eased = normalized * normalized * (3f - 2f * normalized);
            _movingCar.localPosition = _baseLocalPosition + Vector3.up * (_travelHeight * eased);
        }
    }

    [DisallowMultipleComponent]
    public sealed class ClearCurveMarbleGuide : MonoBehaviour
    {
        private Transform _pieceRoot;
        private readonly Dictionary<Rigidbody, float> _travelSigns = new Dictionary<Rigidbody, float>();
        private readonly PassivePathEnergyState _energyState = new PassivePathEnergyState();

        public void Configure(Transform pieceRoot)
        {
            _pieceRoot = pieceRoot;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            if (!QuarterCurvePath.TryEvaluate(
                    localPosition, 1.05f, out _, out var forwardTangent, out _)) return;
            var along = Vector3.Dot(localVelocity, forwardTangent);
            _travelSigns[body] = Mathf.Abs(along) > 0.10f ? Mathf.Sign(along) : 1f;
            _energyState.Capture(body);
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            if (!QuarterCurvePath.TryEvaluate(
                    localPosition, 1.05f, out var targetPoint, out var forwardTangent, out var radial)) return;
            if (!_travelSigns.TryGetValue(body, out var sign))
            {
                var along = Vector3.Dot(localVelocity, forwardTangent);
                sign = Mathf.Abs(along) > 0.10f ? Mathf.Sign(along) : 1f;
                _travelSigns[body] = sign;
                _energyState.Capture(body);
            }
            var tangent = forwardTangent * sign;
            var correction = targetPoint - localPosition;
            correction.y = WoodenPieceFactory.MarbleRadius + 0.20f - localPosition.y;
            var tangentialSpeed = Vector3.Dot(localVelocity, tangent);
            var centripetalAcceleration = -radial
                * (tangentialSpeed * tangentialSpeed / QuarterCurvePath.Radius);
            var acceleration = PassiveGuidePhysics.CalculateConstraintAcceleration(
                localVelocity,
                tangent,
                correction,
                10f,
                18f,
                96f,
                centripetalAcceleration);
            body.AddForce(_pieceRoot.TransformDirection(acceleration),
                ForceMode.Acceleration);
            _energyState.Apply(body, _pieceRoot, tangent);
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.attachedRigidbody == null) return;
            _travelSigns.Remove(other.attachedRigidbody);
            _energyState.Remove(other.attachedRigidbody);
        }

        private static bool TryGetMarble(Collider other, out Rigidbody body)
        {
            body = other.attachedRigidbody;
            return body != null && other.GetComponentInParent<MarbleActor>() != null;
        }
    }

    [DisallowMultipleComponent]
    public sealed class WaveMarbleGuide : MonoBehaviour
    {
        private Transform _pieceRoot;
        private float _amplitude;
        private readonly Dictionary<Rigidbody, float> _travelSigns = new Dictionary<Rigidbody, float>();
        private readonly PassivePathEnergyState _energyState = new PassivePathEnergyState();

        public void Configure(Transform pieceRoot, float amplitude)
        {
            _pieceRoot = pieceRoot;
            _amplitude = Mathf.Clamp(amplitude, 0.2f, 1.0f);
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null) return;
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            _travelSigns[body] = Mathf.Abs(localVelocity.z) > 0.10f ? Mathf.Sign(localVelocity.z) : 1f;
            _energyState.Capture(body);
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var t = Mathf.InverseLerp(-WoodenPieceFactory.CellSize * 0.5f,
                WoodenPieceFactory.CellSize * 0.5f, localPosition.z);
            var surfaceY = Mathf.Sin(t * Mathf.PI) * _amplitude;
            var slope = Mathf.Cos(t * Mathf.PI) * _amplitude * Mathf.PI / WoodenPieceFactory.CellSize;
            var sign = _travelSigns.TryGetValue(body, out var value) ? value : 1f;
            var tangent = new Vector3(0f, slope * sign, sign).normalized;
            var target = new Vector3(0f, surfaceY + WoodenPieceFactory.MarbleRadius + 0.19f, localPosition.z);
            var acceleration = PassiveGuidePhysics.CalculateConstraintAcceleration(
                localVelocity,
                tangent,
                target - localPosition,
                7f,
                13f,
                30f);
            body.AddForce(_pieceRoot.TransformDirection(acceleration),
                ForceMode.Acceleration);
            _energyState.Apply(body, _pieceRoot, tangent);
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.attachedRigidbody == null) return;
            _travelSigns.Remove(other.attachedRigidbody);
            _energyState.Remove(other.attachedRigidbody);
        }

        private static bool TryGetMarble(Collider other, out Rigidbody body)
        {
            body = other.attachedRigidbody;
            return body != null && other.GetComponentInParent<MarbleActor>() != null;
        }
    }

    [DisallowMultipleComponent]
    public sealed class CurveMarbleGuide : MonoBehaviour
    {
        private Transform _pieceRoot;
        private readonly Dictionary<Rigidbody, float> _travelSigns = new Dictionary<Rigidbody, float>();
        private readonly PassivePathEnergyState _energyState = new PassivePathEnergyState();

        public void Configure(Transform pieceRoot)
        {
            _pieceRoot = pieceRoot;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            if (!QuarterCurvePath.TryEvaluate(
                    localPosition, 1.05f, out _, out var forwardTangent, out _)) return;
            var dot = Vector3.Dot(new Vector3(localVelocity.x, 0f, localVelocity.z), forwardTangent);
            _travelSigns[body] = Mathf.Abs(dot) > 0.1f ? Mathf.Sign(dot) : 1f;
            _energyState.Capture(body);
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            if (!QuarterCurvePath.TryEvaluate(
                    localPosition, 1.05f, out var targetPoint, out var forwardTangent, out var radial)) return;
            if (!_travelSigns.TryGetValue(body, out var travelSign))
            {
                var along = Vector3.Dot(localVelocity, forwardTangent);
                travelSign = Mathf.Abs(along) > 0.10f ? Mathf.Sign(along) : 1f;
                _travelSigns[body] = travelSign;
                _energyState.Capture(body);
            }
            var tangent = forwardTangent * travelSign;
            var correction = targetPoint - localPosition;
            correction.y = 0f;
            var tangentialSpeed = Vector3.Dot(localVelocity, tangent);
            var centripetalAcceleration = -radial
                * (tangentialSpeed * tangentialSpeed / QuarterCurvePath.Radius);
            var acceleration = PassiveGuidePhysics.CalculateConstraintAcceleration(
                localVelocity,
                tangent,
                correction,
                10f,
                18f,
                96f,
                centripetalAcceleration);
            body.AddForce(_pieceRoot.TransformDirection(acceleration), ForceMode.Acceleration);
            _energyState.Apply(body, _pieceRoot, tangent);
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.attachedRigidbody == null) return;
            _travelSigns.Remove(other.attachedRigidbody);
            _energyState.Remove(other.attachedRigidbody);
        }

        private static bool TryGetMarble(Collider other, out Rigidbody body)
        {
            body = other.attachedRigidbody;
            return body != null && other.GetComponentInParent<MarbleActor>() != null;
        }
    }

    [DisallowMultipleComponent]
    public sealed class FunnelMarbleGuide : MonoBehaviour
    {
        private Transform _pieceRoot;
        private readonly Dictionary<Rigidbody, float> _travelSigns = new Dictionary<Rigidbody, float>();
        private readonly PassivePathEnergyState _energyState = new PassivePathEnergyState();

        public void Configure(Transform pieceRoot)
        {
            _pieceRoot = pieceRoot;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            _travelSigns[body] = Mathf.Abs(localVelocity.z) > 0.1f
                ? Mathf.Sign(localVelocity.z)
                : localPosition.z <= 0f ? 1f : -1f;
            _energyState.Capture(body);
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var travelSign = _travelSigns.TryGetValue(body, out var storedSign) ? storedSign : 1f;
            var tangent = Vector3.forward * travelSign;
            var target = new Vector3(0f, localPosition.y, localPosition.z);
            var acceleration = PassiveGuidePhysics.CalculateConstraintAcceleration(
                localVelocity,
                tangent,
                target - localPosition,
                8f,
                16f,
                24f);
            body.AddForce(_pieceRoot.TransformDirection(acceleration), ForceMode.Acceleration);
            _energyState.Apply(body, _pieceRoot, tangent);
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.attachedRigidbody == null) return;
            _travelSigns.Remove(other.attachedRigidbody);
            _energyState.Remove(other.attachedRigidbody);
        }

        private static bool TryGetMarble(Collider other, out Rigidbody body)
        {
            body = other.attachedRigidbody;
            return body != null && other.GetComponentInParent<MarbleActor>() != null;
        }
    }

    public sealed class PieceView : MonoBehaviour
    {
        private readonly List<Renderer> _renderers = new List<Renderer>();
        private readonly List<Rigidbody> _dynamicBodies = new List<Rigidbody>();
        private readonly List<DynamicStartState> _dynamicStartStates = new List<DynamicStartState>();
        private readonly List<GameObject> _connectorMarkers = new List<GameObject>();
        private Material[] _normalMaterials;
        private GameObject _selectionMark;
        private GameObject _invalidMark;
        private Collider _placementVolume;
        private bool _isGhost;

        public PieceRecord Record { get; private set; }
        public Transform MarbleSpawn { get; private set; }
        public GoalSensor GoalSensor { get; private set; }
        public IReadOnlyList<Rigidbody> DynamicBodies => _dynamicBodies;
        public Collider PlacementVolume => _placementVolume;
        public bool IsGhost => _isGhost;

        public void Initialize(PieceRecord record, Collider placementVolume, bool isGhost)
        {
            Record = record;
            _placementVolume = placementVolume;
            _isGhost = isGhost;
        }

        public void RegisterRenderer(Renderer renderer)
        {
            if (renderer != null) _renderers.Add(renderer);
        }

        public void RegisterConnector(GameObject connector)
        {
            if (connector != null) _connectorMarkers.Add(connector);
        }

        public void RegisterDynamicBody(Rigidbody body)
        {
            if (body == null) return;
            _dynamicBodies.Add(body);
            _dynamicStartStates.Add(new DynamicStartState(
                body.transform.localPosition,
                body.transform.localRotation));
        }

        public void SetMarbleSpawn(Transform spawn)
        {
            MarbleSpawn = spawn;
        }

        public void SetGoalSensor(GoalSensor sensor)
        {
            GoalSensor = sensor;
        }

        public void SetSelectionMark(GameObject mark)
        {
            _selectionMark = mark;
            if (_selectionMark != null) _selectionMark.SetActive(false);
        }

        public void SetInvalidMark(GameObject mark)
        {
            _invalidMark = mark;
            if (_invalidMark != null) _invalidMark.SetActive(false);
        }

        public void CaptureNormalMaterials()
        {
            _normalMaterials = new Material[_renderers.Count];
            for (var i = 0; i < _renderers.Count; i++)
            {
                _normalMaterials[i] = _renderers[i].sharedMaterial;
            }
        }

        public void SetSelected(bool selected)
        {
            if (_selectionMark != null) _selectionMark.SetActive(selected && !_isGhost);
        }

        public void SetGhostValidity(bool valid, ToyMaterialLibrary materials)
        {
            if (!_isGhost) return;
            var material = valid ? materials.GhostValid : materials.GhostInvalid;
            for (var i = 0; i < _renderers.Count; i++)
            {
                _renderers[i].sharedMaterial = material;
            }
            if (_invalidMark != null) _invalidMark.SetActive(!valid);
        }

        public void SetRunMode(bool running)
        {
            if (_placementVolume != null) _placementVolume.enabled = !running && !_isGhost;
            for (var i = 0; i < _connectorMarkers.Count; i++)
            {
                _connectorMarkers[i].SetActive(!running);
            }
            if (_selectionMark != null) _selectionMark.SetActive(false);
            if (_invalidMark != null && !_isGhost) _invalidMark.SetActive(false);

            for (var i = 0; i < _dynamicBodies.Count; i++)
            {
                var body = _dynamicBodies[i];
                if (!running)
                {
                    if (!body.isKinematic)
                    {
                        body.linearVelocity = Vector3.zero;
                        body.angularVelocity = Vector3.zero;
                    }
                    body.isKinematic = true;
                    body.transform.localPosition = _dynamicStartStates[i].LocalPosition;
                    body.transform.localRotation = _dynamicStartStates[i].LocalRotation;
                }
                else
                {
                    body.isKinematic = false;
                    body.WakeUp();
                }
            }
            GoalSensor?.ResetSensor();
        }

        public void RestoreNormalMaterials()
        {
            if (_normalMaterials == null) return;
            for (var i = 0; i < _renderers.Count && i < _normalMaterials.Length; i++)
            {
                _renderers[i].sharedMaterial = _normalMaterials[i];
            }
        }

        private readonly struct DynamicStartState
        {
            public readonly Vector3 LocalPosition;
            public readonly Quaternion LocalRotation;

            public DynamicStartState(Vector3 localPosition, Quaternion localRotation)
            {
                LocalPosition = localPosition;
                LocalRotation = localRotation;
            }
        }
    }
}
