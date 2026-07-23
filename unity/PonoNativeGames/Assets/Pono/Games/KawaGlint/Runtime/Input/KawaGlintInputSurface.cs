using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace Pono.KawaGlint.Input
{
    /// <summary>
    /// Full-screen uGUI tap surface for KawaGlint. Mirrors
    /// <c>Pono.HideSeekCreatures.Input.InkInputSurface</c>'s uv-normalization
    /// pattern, but only needs "was the surface tapped" -- there is no
    /// drag/paint gameplay here, so only <see cref="IPointerDownHandler"/> is
    /// implemented, and it fires immediately on press rather than waiting for
    /// release. This is deliberate: the renda (連打) phase needs every rapid
    /// tap counted, including from a child mashing with two fingers, and
    /// waiting for PointerUp would drop taps whose release lands on a
    /// different frame or gets coalesced by the platform.
    /// </summary>
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RectTransform))]
    public sealed class KawaGlintInputSurface : MonoBehaviour, IPointerDownHandler
    {
        private RectTransform _rectTransform;

        /// <summary>Fires once per PointerDown with the tap position normalized to 0-1 (left/bottom origin).</summary>
        public event Action<Vector2> Tapped;

        /// <summary>Gate for the whole surface -- set false to ignore taps (unused today, mirrors InkInputSurface's InputEnabled contract).</summary>
        public bool InputEnabled { get; set; } = true;

        private void Awake()
        {
            _rectTransform = (RectTransform)transform;
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            if (!InputEnabled)
            {
                return;
            }
            Tapped?.Invoke(ToUv(eventData));
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
