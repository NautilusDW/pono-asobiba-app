using System.Collections;
using Pono.HideSeekCreatures.UI;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.HideSeekCreatures.Gameplay
{
    [DisallowMultipleComponent]
    public sealed class CreatureView : MonoBehaviour
    {
        private CreatureVisualSpec _spec;
        private RectTransform _rectTransform;
        private RectTransform _hiddenParent;
        private RectTransform _foundParent;
        private Image _image;
        private Vector3 _baseScale;
        private float _phase;
        private float _idleClock;
        private bool _found;
        private Coroutine _animation;

        public string Id => _spec.Id;
        public string DisplayName => _spec.DisplayName;
        public Rect NormalizedRect => _spec.NormalizedRect;
        public Vector2 HintUv => _spec.HintUv;
        public Color InkColor => _spec.InkColor;
        public bool IsFound => _found;
        public bool AnimationsPaused { get; set; }

        public void Initialize(CreatureVisualSpec spec, RectTransform hiddenParent, RectTransform foundParent)
        {
            _spec = spec;
            _rectTransform = (RectTransform)transform;
            _hiddenParent = hiddenParent;
            _foundParent = foundParent;
            PlaceInLayer(_hiddenParent);

            _image = gameObject.GetComponent<Image>();
            if (_image == null)
            {
                _image = gameObject.AddComponent<Image>();
            }
            _image.sprite = RuntimeAssetLoader.LoadSprite(spec.ResourcePath);
            _image.preserveAspect = true;
            _image.raycastTarget = false;
            _image.color = Color.white;
            _baseScale = Vector3.one;
            _phase = Mathf.Abs(spec.Id.GetHashCode() % 1000) * 0.001f * Mathf.PI * 2f;
            _idleClock = 0f;
        }

        private void PlaceInLayer(RectTransform parent)
        {
            _rectTransform.SetParent(parent, worldPositionStays: false);
            _rectTransform.anchorMin = _spec.CenterUv - _spec.SizeUv * 0.5f;
            _rectTransform.anchorMax = _spec.CenterUv + _spec.SizeUv * 0.5f;
            _rectTransform.pivot = new Vector2(0.5f, 0.5f);
            _rectTransform.anchoredPosition = Vector2.zero;
            _rectTransform.sizeDelta = Vector2.zero;
        }

        private void Update()
        {
            if (AnimationsPaused || _animation != null)
            {
                return;
            }
            _idleClock += Time.unscaledDeltaTime;
            var amplitude = _found ? 0.012f : 0.006f;
            var breathing = 1f + Mathf.Sin(_idleClock * 1.8f + _phase) * amplitude;
            _rectTransform.localScale = _baseScale * breathing;
        }

        public bool ContainsUv(Vector2 uv, float padding = 0f)
        {
            var rect = _spec.NormalizedRect;
            rect.xMin -= padding;
            rect.xMax += padding;
            rect.yMin -= padding;
            rect.yMax += padding;
            return rect.Contains(uv);
        }

        public void ResetView()
        {
            _found = false;
            StopAnimation();
            PlaceInLayer(_hiddenParent);
            _image.color = Color.white;
            _rectTransform.localScale = Vector3.one;
            _rectTransform.localRotation = Quaternion.identity;
            _idleClock = 0f;
        }

        public IEnumerator PlayFound()
        {
            _found = true;
            StopAnimation();
            _image.color = new Color(1f, 0.94f, 0.75f, 0.18f);
            PlaceInLayer(_foundParent);
            _animation = StartCoroutine(FoundRoutine());
            yield return _animation;
        }

        public void PlayHint(int level)
        {
            if (_found)
            {
                return;
            }
            StopAnimation();
            _animation = StartCoroutine(HintRoutine(Mathf.Clamp(level, 1, 3)));
        }

        public void PlayTap()
        {
            if (!_found)
            {
                return;
            }
            StopAnimation();
            _animation = StartCoroutine(TapRoutine());
        }

        private IEnumerator FoundRoutine()
        {
            var duration = 1.2f;
            var elapsed = 0f;
            while (elapsed < duration)
            {
                if (AnimationsPaused)
                {
                    yield return null;
                    continue;
                }
                elapsed += Time.unscaledDeltaTime;
                var t = Mathf.Clamp01(elapsed / duration);
                var bounce = Mathf.Sin(t * Mathf.PI) * 0.12f;
                var wiggle = Mathf.Sin(t * Mathf.PI * 3f) * (1f - t) * 5f;
                _rectTransform.localScale = Vector3.one * (1f + bounce);
                _rectTransform.localRotation = Quaternion.Euler(0f, 0f, wiggle);
                var tint = Color.Lerp(new Color(1f, 0.94f, 0.75f), Color.white, t);
                tint.a = Mathf.SmoothStep(0.18f, 1f, Mathf.Clamp01(t / 0.24f));
                _image.color = tint;
                yield return null;
            }
            _rectTransform.localScale = Vector3.one;
            _rectTransform.localRotation = Quaternion.identity;
            _image.color = Color.white;
            _animation = null;
        }

        private IEnumerator HintRoutine(int level)
        {
            var duration = 0.55f + level * 0.12f;
            var elapsed = 0f;
            while (elapsed < duration)
            {
                if (AnimationsPaused)
                {
                    yield return null;
                    continue;
                }
                elapsed += Time.unscaledDeltaTime;
                var t = Mathf.Clamp01(elapsed / duration);
                var pulse = Mathf.Sin(t * Mathf.PI * 2f);
                var scale = 1f + pulse * (0.012f + level * 0.008f);
                _rectTransform.localScale = Vector3.one * scale;
                _rectTransform.localRotation = Quaternion.Euler(0f, 0f, pulse * level * 1.5f);
                _image.color = Color.Lerp(Color.white, new Color(1f, 0.95f, 0.72f), Mathf.Abs(pulse) * 0.35f);
                yield return null;
            }
            _rectTransform.localScale = Vector3.one;
            _rectTransform.localRotation = Quaternion.identity;
            _image.color = Color.white;
            _animation = null;
        }

        private IEnumerator TapRoutine()
        {
            var duration = 0.48f;
            var elapsed = 0f;
            while (elapsed < duration)
            {
                if (AnimationsPaused)
                {
                    yield return null;
                    continue;
                }
                elapsed += Time.unscaledDeltaTime;
                var t = Mathf.Clamp01(elapsed / duration);
                var pulse = Mathf.Sin(t * Mathf.PI);
                _rectTransform.localScale = Vector3.one * (1f + pulse * 0.07f);
                _rectTransform.localRotation = Quaternion.Euler(0f, 0f, Mathf.Sin(t * Mathf.PI * 4f) * 3f);
                yield return null;
            }
            _rectTransform.localScale = Vector3.one;
            _rectTransform.localRotation = Quaternion.identity;
            _animation = null;
        }

        private void StopAnimation()
        {
            if (_animation != null)
            {
                StopCoroutine(_animation);
                _animation = null;
            }
        }
    }
}
