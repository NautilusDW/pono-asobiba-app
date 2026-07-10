using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.HideSeekCreatures.UI
{
    [DisallowMultipleComponent]
    public sealed class CelebrationOverlay : MonoBehaviour
    {
        private const int ParticleCount = 16;
        private readonly RectTransform[] _particles = new RectTransform[ParticleCount];
        private readonly Image[] _images = new Image[ParticleCount];
        private Coroutine _routine;
        private bool _reduceMotion;
        public bool Paused { get; set; }

        public void Initialize()
        {
            var sprite = RuntimeAssetLoader.LoadSprite("HideSeekCreatures/UI/leaf_token");
            for (var i = 0; i < ParticleCount; i++)
            {
                var image = UiFactory.CreateImage($"Light Leaf {i + 1}", transform, sprite, Color.white);
                var rect = image.rectTransform;
                rect.sizeDelta = new Vector2(48f, 48f);
                rect.gameObject.SetActive(false);
                _particles[i] = rect;
                _images[i] = image;
            }
        }

        public void SetReduceMotion(bool reduceMotion)
        {
            _reduceMotion = reduceMotion;
        }

        public void Play()
        {
            if (_routine != null)
            {
                StopCoroutine(_routine);
            }
            _routine = StartCoroutine(PlayRoutine());
        }

        public void StopAndHide()
        {
            if (_routine != null)
            {
                StopCoroutine(_routine);
                _routine = null;
            }
            for (var i = 0; i < ParticleCount; i++)
            {
                if (_particles[i] != null)
                {
                    _particles[i].gameObject.SetActive(false);
                }
            }
        }

        private IEnumerator PlayRoutine()
        {
            var activeCount = _reduceMotion ? 8 : ParticleCount;
            var seed = 7319;
            var random = new System.Random(seed);
            for (var i = 0; i < activeCount; i++)
            {
                var x = 0.16f + (float)random.NextDouble() * 0.68f;
                var y = 0.22f + (float)random.NextDouble() * 0.42f;
                var rect = _particles[i];
                rect.anchorMin = rect.anchorMax = new Vector2(x, y);
                rect.anchoredPosition = Vector2.zero;
                rect.localScale = Vector3.one * Mathf.Lerp(0.6f, 1.1f, (float)random.NextDouble());
                rect.localRotation = Quaternion.Euler(0f, 0f, (float)random.NextDouble() * 360f);
                _images[i].color = Color.HSVToRGB(Mathf.Lerp(0.09f, 0.43f, (float)random.NextDouble()), 0.38f, 1f);
                rect.gameObject.SetActive(true);
            }

            var duration = _reduceMotion ? 1.3f : 1.8f;
            var elapsed = 0f;
            while (elapsed < duration)
            {
                if (Paused)
                {
                    yield return null;
                    continue;
                }
                elapsed += Time.unscaledDeltaTime;
                var t = Mathf.Clamp01(elapsed / duration);
                for (var i = 0; i < activeCount; i++)
                {
                    var rect = _particles[i];
                    rect.anchoredPosition += new Vector2(
                        Mathf.Sin(elapsed * 3f + i) * Time.unscaledDeltaTime * 15f,
                        Time.unscaledDeltaTime * (45f + i * 2f));
                    if (!_reduceMotion)
                    {
                        rect.Rotate(0f, 0f, Time.unscaledDeltaTime * (20f + i * 3f));
                    }
                    var color = _images[i].color;
                    color.a = Mathf.SmoothStep(1f, 0f, Mathf.InverseLerp(0.58f, 1f, t));
                    _images[i].color = color;
                }
                yield return null;
            }
            StopAndHide();
        }
    }
}
