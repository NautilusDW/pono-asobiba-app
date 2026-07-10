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
