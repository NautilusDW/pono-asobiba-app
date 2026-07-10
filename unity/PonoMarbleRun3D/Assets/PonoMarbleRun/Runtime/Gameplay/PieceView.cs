using System;
using System.Collections.Generic;
using Pono.MarbleRun3D.Core;
using UnityEngine;

namespace Pono.MarbleRun3D.Gameplay
{
    [DisallowMultipleComponent]
    public sealed class MarbleActor : MonoBehaviour
    {
    }

    [DisallowMultipleComponent]
    public sealed class GoalSensor : MonoBehaviour
    {
        public event Action<MarbleActor> MarbleEntered;
        private bool _raised;

        public void ResetSensor()
        {
            _raised = false;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (_raised) return;
            var marble = other.GetComponentInParent<MarbleActor>();
            if (marble == null) return;
            _raised = true;
            MarbleEntered?.Invoke(marble);
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
