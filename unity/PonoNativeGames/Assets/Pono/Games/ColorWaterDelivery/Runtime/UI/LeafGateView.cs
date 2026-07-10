using System;
using Pono.ColorWaterDelivery.Core;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.ColorWaterDelivery.UI
{
    [DisallowMultipleComponent]
    public sealed class LeafGateView : MonoBehaviour
    {
        private RectTransform _leaf;
        private Image _glow;
        private Text _arrow;
        private float _targetAngle;
        private float _angleVelocity;
        private float _hintClock;
        private bool _hinting;

        public string GateId { get; private set; }

        public Vector2 CenterUv { get; private set; }

        public float PhysicalAngleDegrees => _targetAngle;

        public void Initialize(
            string gateId,
            Vector2 centerUv,
            Action<string> tapped)
        {
            GateId = gateId;
            CenterUv = centerUv;
            var rect = (RectTransform)transform;
            rect.anchorMin = rect.anchorMax = centerUv;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.sizeDelta = new Vector2(280f, 180f);
            rect.anchoredPosition = Vector2.zero;

            var hit = gameObject.AddComponent<Image>();
            hit.color = new Color(1f, 1f, 1f, 0.001f);
            hit.raycastTarget = true;
            var button = gameObject.AddComponent<Button>();
            button.targetGraphic = hit;
            button.transition = Selectable.Transition.None;
            button.onClick.AddListener(() => tapped?.Invoke(GateId));

            var leafSprite = ColorWaterUiFactory.LoadSprite("HideSeekCreatures/UI/leaf_token");
            _glow = ColorWaterUiFactory.CreateImage(
                "Gate Glow",
                rect,
                leafSprite,
                new Color(1f, 0.88f, 0.28f, 0f));
            ColorWaterUiFactory.Place(_glow.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(250f, 125f));

            var leafImage = ColorWaterUiFactory.CreateImage(
                "Leaf Gate",
                rect,
                leafSprite,
                new Color(0.30f, 0.75f, 0.33f, 1f));
            _leaf = leafImage.rectTransform;
            ColorWaterUiFactory.Place(_leaf, new Vector2(0.5f, 0.5f), new Vector2(230f, 105f));

            var arrowBadge = ColorWaterUiFactory.CreateImage(
                "Direction Badge",
                rect,
                ColorWaterUiFactory.GetCircleSprite(),
                new Color(1f, 0.98f, 0.80f, 0.88f));
            ColorWaterUiFactory.Place(
                arrowBadge.rectTransform,
                new Vector2(0.5f, 0.5f),
                new Vector2(78f, 78f));

            _arrow = ColorWaterUiFactory.CreateText(
                "Flow Arrow",
                rect,
                "▶",
                44,
                TextAnchor.MiddleCenter,
                new Color(0.16f, 0.28f, 0.12f, 0.92f));
            ColorWaterUiFactory.Place(_arrow.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(92f, 92f));
        }

        public void SetDirection(CardinalDirection direction, bool instant = false)
        {
            _targetAngle = DirectionToPhysicalAngle(direction);
            _arrow.text = direction switch
            {
                CardinalDirection.North => "▲",
                CardinalDirection.South => "▼",
                CardinalDirection.West => "◀",
                _ => "▶"
            };
            if (instant)
            {
                SetLeafRotation(_targetAngle);
            }
        }

        public void SetHint(bool hinting)
        {
            _hinting = hinting;
            if (!hinting)
            {
                _glow.color = new Color(1f, 0.88f, 0.28f, 0f);
            }
        }

        private void Update()
        {
            var current = _leaf.localEulerAngles.z;
            var visualTargetAngle = _targetAngle + 90f;
            var next = Mathf.SmoothDampAngle(
                current,
                visualTargetAngle,
                ref _angleVelocity,
                0.12f,
                Mathf.Infinity,
                Time.unscaledDeltaTime);
            _leaf.localRotation = Quaternion.Euler(0f, 0f, next);
            _glow.rectTransform.localRotation = _leaf.localRotation;

            if (!_hinting)
            {
                return;
            }

            _hintClock += Time.unscaledDeltaTime;
            var pulse = 0.34f + Mathf.Sin(_hintClock * 4.2f) * 0.18f;
            _glow.color = new Color(1f, 0.88f, 0.28f, pulse);
            _glow.rectTransform.localScale = Vector3.one * (1f + pulse * 0.10f);
        }

        private static float DirectionToPhysicalAngle(CardinalDirection direction)
        {
            return direction switch
            {
                CardinalDirection.North => 35f,
                CardinalDirection.South => -35f,
                CardinalDirection.West => 0f,
                _ => 0f
            };
        }

        private void SetLeafRotation(float physicalAngle)
        {
            var rotation = Quaternion.Euler(0f, 0f, physicalAngle + 90f);
            _leaf.localRotation = rotation;
            _glow.rectTransform.localRotation = rotation;
        }
    }
}
