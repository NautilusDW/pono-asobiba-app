using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using System.Collections.Generic;
using InputTouch = UnityEngine.InputSystem.EnhancedTouch.Touch;
using InputTouchPhase = UnityEngine.InputSystem.TouchPhase;

namespace Pono.FluidMarbleLab
{
    [DisallowMultipleComponent]
    public sealed class LabPointerRouter : MonoBehaviour
    {
        private static readonly Color[] InkPalette =
        {
            new Color(0.09f, 0.68f, 0.92f, 1f),
            new Color(0.91f, 0.21f, 0.52f, 1f),
            new Color(0.99f, 0.63f, 0.10f, 1f),
            new Color(0.31f, 0.78f, 0.53f, 1f),
            new Color(0.51f, 0.28f, 0.91f, 1f)
        };

        private readonly PointerGesture[] gestures = new PointerGesture[12];
        private readonly List<RaycastResult> uiRaycastResults = new List<RaycastResult>(8);
        private LabViewport viewport;
        private FluidSimulationController simulation;
        private TrackEditor trackEditor;
        private LabModeController modeController;
        private bool enhancedTouchEnabledHere;

        public void Configure(
            LabViewport labViewport,
            FluidSimulationController fluidSimulation,
            TrackEditor editor,
            LabModeController labMode)
        {
            viewport = labViewport;
            simulation = fluidSimulation;
            trackEditor = editor;
            if (modeController != null)
            {
                modeController.ModeChanged -= HandleModeChanged;
            }
            modeController = labMode;
            if (modeController != null)
            {
                modeController.ModeChanged += HandleModeChanged;
            }
        }

        private void OnEnable()
        {
            if (!EnhancedTouchSupport.enabled)
            {
                EnhancedTouchSupport.Enable();
                enhancedTouchEnabledHere = true;
            }
        }

        private void OnDisable()
        {
            CancelAll();
            if (enhancedTouchEnabledHere && EnhancedTouchSupport.enabled)
            {
                EnhancedTouchSupport.Disable();
                enhancedTouchEnabledHere = false;
            }
        }

        private void Update()
        {
            for (var i = 0; i < gestures.Length; i++)
            {
                gestures[i].SeenThisFrame = false;
            }

            var touches = InputTouch.activeTouches;
            if (touches.Count > 0)
            {
                for (var i = 0; i < touches.Count; i++)
                {
                    var touch = touches[i];
                    HandleTouch(touch.touchId, touch.screenPosition, touch.phase);
                }
                ReleaseMissingTouchGestures();
                return;
            }

            HandleMouse();
        }

        private void HandleTouch(int pointerId, Vector2 screenPosition, InputTouchPhase phase)
        {
            switch (phase)
            {
                case InputTouchPhase.Began:
                    Begin(pointerId, screenPosition);
                    break;
                case InputTouchPhase.Moved:
                case InputTouchPhase.Stationary:
                    Move(pointerId, screenPosition, phase == InputTouchPhase.Moved);
                    break;
                case InputTouchPhase.Ended:
                case InputTouchPhase.Canceled:
                    End(pointerId);
                    break;
            }

            var slot = FindGesture(pointerId);
            if (slot >= 0)
            {
                gestures[slot].SeenThisFrame = true;
            }
        }

        private void HandleMouse()
        {
            var pointer = Pointer.current;
            if (pointer == null)
            {
                return;
            }

            var screenPosition = pointer.position.ReadValue();
            if (pointer.press.wasPressedThisFrame)
            {
                Begin(-1, screenPosition);
            }
            else if (pointer.press.isPressed)
            {
                Move(-1, screenPosition, true);
            }
            if (pointer.press.wasReleasedThisFrame)
            {
                End(-1);
            }
        }

        private void Begin(int pointerId, Vector2 screenPosition)
        {
            var slot = AllocateGesture(pointerId);
            if (slot < 0)
            {
                return;
            }

            var gesture = gestures[slot];
            gesture.Active = true;
            gesture.PointerId = pointerId;
            gesture.LastScreenPosition = screenPosition;
            gesture.SeenThisFrame = true;
            gesture.ColorIndex = Mathf.Abs(pointerId == -1 ? 0 : pointerId) % InkPalette.Length;

            if (IsOverUi(pointerId, screenPosition))
            {
                gesture.Owner = PointerOwner.Ui;
            }
            else if (modeController != null && modeController.Mode == LabMode.Build)
            {
                var world = viewport.ScreenToWorld(screenPosition);
                gesture.Owner = trackEditor != null && trackEditor.TryBeginDrag(pointerId, world)
                    ? PointerOwner.Track
                    : PointerOwner.None;
            }
            else
            {
                gesture.Owner = PointerOwner.Fluid;
                simulation?.Inject(viewport.ScreenToUv(screenPosition), Vector2.zero, InkPalette[gesture.ColorIndex], 0.052f);
            }
            gestures[slot] = gesture;
        }

        private void Move(int pointerId, Vector2 screenPosition, bool moved)
        {
            var slot = FindGesture(pointerId);
            if (slot < 0)
            {
                Begin(pointerId, screenPosition);
                slot = FindGesture(pointerId);
                if (slot < 0)
                {
                    return;
                }
            }

            var gesture = gestures[slot];
            gesture.SeenThisFrame = true;
            if (gesture.Owner == PointerOwner.Fluid && moved)
            {
                var delta = screenPosition - gesture.LastScreenPosition;
                var deltaUv = new Vector2(
                    delta.x / Mathf.Max(1f, Screen.width),
                    delta.y / Mathf.Max(1f, Screen.height));
                var velocity = deltaUv / Mathf.Max(Time.unscaledDeltaTime, 1f / 120f);
                velocity = Vector2.ClampMagnitude(velocity * 0.72f, 2.6f);
                if (delta.sqrMagnitude >= 0.25f)
                {
                    simulation?.Inject(viewport.ScreenToUv(screenPosition), velocity, InkPalette[gesture.ColorIndex], 0.055f);
                }
            }
            else if (gesture.Owner == PointerOwner.Track)
            {
                trackEditor?.Drag(pointerId, viewport.ScreenToWorld(screenPosition));
            }

            gesture.LastScreenPosition = screenPosition;
            gestures[slot] = gesture;
        }

        private void End(int pointerId)
        {
            var slot = FindGesture(pointerId);
            if (slot < 0)
            {
                return;
            }
            if (gestures[slot].Owner == PointerOwner.Track)
            {
                trackEditor?.EndDrag(pointerId);
            }
            gestures[slot] = default;
        }

        private void ReleaseMissingTouchGestures()
        {
            for (var i = 0; i < gestures.Length; i++)
            {
                if (gestures[i].Active && gestures[i].PointerId >= 0 && !gestures[i].SeenThisFrame)
                {
                    End(gestures[i].PointerId);
                }
            }
        }

        private int AllocateGesture(int pointerId)
        {
            var existing = FindGesture(pointerId);
            if (existing >= 0)
            {
                return existing;
            }
            for (var i = 0; i < gestures.Length; i++)
            {
                if (!gestures[i].Active)
                {
                    return i;
                }
            }
            return -1;
        }

        private int FindGesture(int pointerId)
        {
            for (var i = 0; i < gestures.Length; i++)
            {
                if (gestures[i].Active && gestures[i].PointerId == pointerId)
                {
                    return i;
                }
            }
            return -1;
        }

        private bool IsOverUi(int pointerId, Vector2 screenPosition)
        {
            if (EventSystem.current == null)
            {
                return false;
            }
            var eventData = new PointerEventData(EventSystem.current)
            {
                pointerId = pointerId,
                position = screenPosition
            };
            uiRaycastResults.Clear();
            EventSystem.current.RaycastAll(eventData, uiRaycastResults);
            return uiRaycastResults.Count > 0;
        }

        private void HandleModeChanged(LabMode _)
        {
            CancelAll();
        }

        private void CancelAll()
        {
            for (var i = 0; i < gestures.Length; i++)
            {
                if (gestures[i].Active && gestures[i].Owner == PointerOwner.Track)
                {
                    trackEditor?.EndDrag(gestures[i].PointerId);
                }
                gestures[i] = default;
            }
        }

        private void OnDestroy()
        {
            if (modeController != null)
            {
                modeController.ModeChanged -= HandleModeChanged;
            }
        }

        private enum PointerOwner
        {
            None,
            Ui,
            Fluid,
            Track
        }

        private struct PointerGesture
        {
            public int PointerId;
            public bool Active;
            public bool SeenThisFrame;
            public PointerOwner Owner;
            public Vector2 LastScreenPosition;
            public int ColorIndex;
        }
    }
}
