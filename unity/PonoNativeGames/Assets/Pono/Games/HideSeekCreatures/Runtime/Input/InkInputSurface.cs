using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;

namespace Pono.HideSeekCreatures.Input
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RectTransform))]
    public sealed class InkInputSurface : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler, IPointerExitHandler
    {
        private readonly HashSet<int> _activePointers = new HashSet<int>();
        private RectTransform _rectTransform;

        public event Action<int, Vector2> Pressed;
        public event Action<int, Vector2> Dragged;
        public event Action<int, Vector2> Released;

        public bool InputEnabled { get; set; } = true;

        private void Awake()
        {
            _rectTransform = (RectTransform)transform;
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            if (!InputEnabled || _activePointers.Count >= 2 || _activePointers.Contains(eventData.pointerId))
            {
                return;
            }
            _activePointers.Add(eventData.pointerId);
            Pressed?.Invoke(eventData.pointerId, ToUv(eventData));
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (!InputEnabled || !_activePointers.Contains(eventData.pointerId))
            {
                return;
            }
            Dragged?.Invoke(eventData.pointerId, ToUv(eventData));
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            Release(eventData);
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            if (eventData.pointerPressRaycast.gameObject == gameObject)
            {
                return;
            }
            Release(eventData);
        }

        public void CancelAll()
        {
            _activePointers.Clear();
        }

        private void Release(PointerEventData eventData)
        {
            if (!_activePointers.Remove(eventData.pointerId))
            {
                return;
            }
            Released?.Invoke(eventData.pointerId, ToUv(eventData));
        }

        private Vector2 ToUv(PointerEventData eventData)
        {
            if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(
                    _rectTransform,
                    eventData.position,
                    eventData.pressEventCamera,
                    out var local))
            {
                return Vector2.zero;
            }
            var rect = _rectTransform.rect;
            return new Vector2(
                Mathf.InverseLerp(rect.xMin, rect.xMax, local.x),
                Mathf.InverseLerp(rect.yMin, rect.yMax, local.y));
        }
    }
}
