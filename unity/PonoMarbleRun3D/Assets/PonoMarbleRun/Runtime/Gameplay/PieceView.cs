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

    [DisallowMultipleComponent]
    public sealed class HelixMarbleGuide : MonoBehaviour
    {
        private Transform _pieceRoot;
        private float _radius = 0.82f;
        private float _height = WoodenPieceFactory.LevelHeight * 2f;
        private float _turns = 1.5f;
        private readonly Dictionary<Rigidbody, float> _travelSigns = new Dictionary<Rigidbody, float>();

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
            var along = Vector3.Dot(localVelocity, Tangent(t));
            _travelSigns[body] = Mathf.Abs(along) > 0.15f ? Mathf.Sign(along) : 1f;
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var travelSign = _travelSigns.TryGetValue(body, out var storedSign) ? storedSign : 1f;
            Vector3 target;
            Vector3 tangent;
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
                target = PathPoint(t) + Vector3.up * marbleHeight;
                tangent = Tangent(t) * travelSign;
            }
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var targetSpeed = Mathf.Clamp(localVelocity.magnitude, 3.0f, 6.2f);
            var correction = target - localPosition;
            var acceleration = (tangent * targetSpeed - localVelocity) * 5.8f + correction * 10.5f;
            acceleration = Vector3.ClampMagnitude(acceleration, 18f);
            body.AddForce(_pieceRoot.TransformDirection(acceleration), ForceMode.Acceleration);
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.attachedRigidbody != null) _travelSigns.Remove(other.attachedRigidbody);
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
    public sealed class CurveMarbleGuide : MonoBehaviour
    {
        private Transform _pieceRoot;
        private float _travelSign = 1f;

        public void Configure(Transform pieceRoot)
        {
            _pieceRoot = pieceRoot;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var tangent = TangentAt(localPosition);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var dot = Vector3.Dot(new Vector3(localVelocity.x, 0f, localVelocity.z), tangent);
            if (Mathf.Abs(dot) > 0.1f) _travelSign = Mathf.Sign(dot);
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var radial = new Vector3(localPosition.x - 1.5f, 0f, localPosition.z + 1.5f);
            var radius = radial.magnitude;
            if (radius < 0.65f || radius > 2.35f) return;

            var tangent = TangentAt(localPosition) * _travelSign;
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var horizontalVelocity = new Vector3(localVelocity.x, 0f, localVelocity.z);
            var targetSpeed = Mathf.Clamp(horizontalVelocity.magnitude, 3.2f, 7.5f);
            var targetPoint = new Vector3(1.5f, localPosition.y, -1.5f) + radial.normalized * 1.5f;
            var correction = targetPoint - localPosition;
            correction.y = 0f;
            var acceleration = (tangent * targetSpeed - horizontalVelocity) * 7f + correction * 12f;
            acceleration = Vector3.ClampMagnitude(acceleration, 20f);
            body.AddForce(_pieceRoot.TransformDirection(acceleration), ForceMode.Acceleration);
        }

        private static Vector3 TangentAt(Vector3 localPosition)
        {
            var angle = Mathf.Atan2(localPosition.z + 1.5f, localPosition.x - 1.5f);
            return new Vector3(Mathf.Sin(angle), 0f, -Mathf.Cos(angle)).normalized;
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
        private float _travelSign = 1f;

        public void Configure(Transform pieceRoot)
        {
            _pieceRoot = pieceRoot;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null) return;
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            if (Mathf.Abs(localVelocity.z) > 0.1f) _travelSign = Mathf.Sign(localVelocity.z);
        }

        private void OnTriggerStay(Collider other)
        {
            if (!TryGetMarble(other, out var body) || _pieceRoot == null || body.isKinematic) return;
            var localPosition = _pieceRoot.InverseTransformPoint(body.worldCenterOfMass);
            var localVelocity = _pieceRoot.InverseTransformDirection(body.linearVelocity);
            var horizontalVelocity = new Vector3(localVelocity.x, 0f, localVelocity.z);
            var targetSpeed = Mathf.Clamp(horizontalVelocity.magnitude, 2.8f, 6f);
            var desired = new Vector3(-localPosition.x * 2.2f, 0f, _travelSign * targetSpeed);
            var acceleration = (desired - horizontalVelocity) * 6f;
            acceleration = Vector3.ClampMagnitude(acceleration, 16f);
            body.AddForce(_pieceRoot.TransformDirection(acceleration), ForceMode.Acceleration);
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
