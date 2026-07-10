using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pono.FluidMarbleLab
{
    [DisallowMultipleComponent]
    public sealed class TrackEditor : MonoBehaviour
    {
        [SerializeField, Min(0.1f)] private float pickRadius = 0.48f;
        [SerializeField, Min(0.05f)] private float gridSize = 0.25f;

        private readonly List<TrackPiece> pieces = new List<TrackPiece>(12);
        private LabViewport viewport;
        private LabModeController modeController;
        private TrackPiece selectedPiece;
        private Vector2 dragOffset;
        private Vector2 dragStartWorld;
        private bool dragging;
        private bool dragHasMoved;
        private int activePointerId = int.MinValue;

        public TrackPiece SelectedPiece => selectedPiece;
        public IReadOnlyList<TrackPiece> Pieces => pieces;
        public event Action<TrackPiece> SelectionChanged;

        public void Configure(LabViewport labViewport, LabModeController labMode)
        {
            viewport = labViewport;
            if (modeController != null)
            {
                modeController.ModeChanged -= HandleModeChanged;
            }
            modeController = labMode;
            if (modeController != null)
            {
                modeController.ModeChanged += HandleModeChanged;
                HandleModeChanged(modeController.Mode);
            }
        }

        public void Register(TrackPiece piece)
        {
            if (piece != null && !pieces.Contains(piece))
            {
                pieces.Add(piece);
                piece.SetSimulationEnabled(modeController == null || modeController.Mode == LabMode.Flow);
            }
        }

        public bool TryBeginDrag(int pointerId, Vector2 worldPosition)
        {
            if (modeController == null || modeController.Mode != LabMode.Build)
            {
                return false;
            }
            if (activePointerId != int.MinValue && activePointerId != pointerId)
            {
                return false;
            }

            var nearest = FindNearest(worldPosition);
            Select(nearest);
            if (nearest == null)
            {
                return false;
            }

            dragOffset = (Vector2)nearest.transform.position - worldPosition;
            dragStartWorld = worldPosition;
            dragging = true;
            dragHasMoved = false;
            activePointerId = pointerId;
            return true;
        }

        public void Drag(int pointerId, Vector2 worldPosition)
        {
            if (!dragging || activePointerId != pointerId || selectedPiece == null || viewport == null)
            {
                return;
            }

            if (!dragHasMoved)
            {
                dragHasMoved = Vector2.Distance(worldPosition, dragStartWorld) >= 0.08f;
                if (!dragHasMoved)
                {
                    return;
                }
            }

            var target = worldPosition + dragOffset;
            var rect = viewport.GameplayRect;
            target.x = Mathf.Clamp(target.x, rect.xMin + 0.65f, rect.xMax - 0.65f);
            target.y = Mathf.Clamp(target.y, rect.yMin + 0.65f, rect.yMax - 0.65f);
            selectedPiece.MoveTo(target);
        }

        public void EndDrag(int pointerId)
        {
            if (!dragging || activePointerId != pointerId || selectedPiece == null)
            {
                return;
            }

            dragging = false;
            activePointerId = int.MinValue;
            if (dragHasMoved)
            {
                var position = (Vector2)selectedPiece.transform.position;
                position.x = Mathf.Round(position.x / gridSize) * gridSize;
                position.y = Mathf.Round(position.y / gridSize) * gridSize;
                selectedPiece.MoveTo(position);
            }
            dragHasMoved = false;
        }

        public void RotateSelected()
        {
            if (modeController != null && modeController.Mode == LabMode.Build && selectedPiece != null)
            {
                selectedPiece.RotateBy(15f);
            }
        }

        public void ResetAll()
        {
            CancelDrag();
            for (var i = 0; i < pieces.Count; i++)
            {
                pieces[i].ResetPose();
            }
            Select(null);
        }

        public void Select(TrackPiece piece)
        {
            if (selectedPiece == piece)
            {
                return;
            }
            selectedPiece?.SetSelected(false);
            selectedPiece = piece;
            selectedPiece?.SetSelected(true);
            SelectionChanged?.Invoke(selectedPiece);
        }

        private void HandleModeChanged(LabMode mode)
        {
            dragging = false;
            activePointerId = int.MinValue;
            dragHasMoved = false;
            for (var i = 0; i < pieces.Count; i++)
            {
                pieces[i].SetSimulationEnabled(mode == LabMode.Flow);
            }
            if (mode == LabMode.Flow)
            {
                Select(null);
            }
        }

        public void CancelDrag()
        {
            dragging = false;
            activePointerId = int.MinValue;
            dragHasMoved = false;
        }

        private TrackPiece FindNearest(Vector2 worldPosition)
        {
            TrackPiece nearest = null;
            var nearestDistance = pickRadius;
            for (var i = 0; i < pieces.Count; i++)
            {
                var distance = pieces[i].DistanceToWorldPoint(worldPosition);
                if (distance <= nearestDistance)
                {
                    nearestDistance = distance;
                    nearest = pieces[i];
                }
            }
            return nearest;
        }

        private void OnDestroy()
        {
            if (modeController != null)
            {
                modeController.ModeChanged -= HandleModeChanged;
            }
        }
    }
}
