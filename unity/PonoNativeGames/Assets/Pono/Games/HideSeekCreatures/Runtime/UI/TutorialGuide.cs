using System;
using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.HideSeekCreatures.UI
{
    [DisallowMultipleComponent]
    public sealed class TutorialGuide : MonoBehaviour
    {
        private const string SeenPref = "pono_hide_seek_tutorial_seen";
        private RectTransform _guideIcon;
        private Text _instruction;
        private Coroutine _routine;
        private bool _active;

        public event Action<Vector2, Vector2> GuideMoved;
        public bool Paused { get; set; }

        public void Initialize(RectTransform guideIcon, Text instruction)
        {
            _guideIcon = guideIcon;
            _instruction = instruction;
            _guideIcon.gameObject.SetActive(false);
            _instruction.gameObject.SetActive(false);
        }

        public void BeginIfNeeded()
        {
            if (PlayerPrefs.GetInt(SeenPref, 0) != 0)
            {
                return;
            }
            _active = true;
            _instruction.text = "インクを ゆびで ながしてみよう";
            _instruction.gameObject.SetActive(true);
            _routine = StartCoroutine(GuideRoutine());
        }

        public void NotifyUserInput()
        {
            if (!_active)
            {
                return;
            }
            _active = false;
            PlayerPrefs.SetInt(SeenPref, 1);
            PlayerPrefs.Save();
            if (_routine != null)
            {
                StopCoroutine(_routine);
                _routine = null;
            }
            _guideIcon.gameObject.SetActive(false);
            _instruction.gameObject.SetActive(false);
        }

        public void Hide()
        {
            _active = false;
            if (_routine != null)
            {
                StopCoroutine(_routine);
                _routine = null;
            }
            _guideIcon.gameObject.SetActive(false);
            _instruction.gameObject.SetActive(false);
        }

        private IEnumerator GuideRoutine()
        {
            var delay = 0f;
            while (delay < 2.5f && _active)
            {
                if (!Paused)
                {
                    delay += Time.unscaledDeltaTime;
                }
                yield return null;
            }
            if (!_active)
            {
                yield break;
            }

            var start = new Vector2(0.35f, 0.39f);
            var end = new Vector2(0.43f, 0.46f);
            var previous = start;
            _guideIcon.gameObject.SetActive(true);
            var duration = 1.15f;
            var elapsed = 0f;
            while (elapsed < duration && _active)
            {
                if (Paused)
                {
                    yield return null;
                    continue;
                }
                elapsed += Time.unscaledDeltaTime;
                var t = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(elapsed / duration));
                var curve = Vector2.Lerp(start, end, t);
                curve.y += Mathf.Sin(t * Mathf.PI) * 0.025f;
                _guideIcon.anchorMin = _guideIcon.anchorMax = curve;
                _guideIcon.anchoredPosition = Vector2.zero;
                GuideMoved?.Invoke(curve, curve - previous);
                previous = curve;
                yield return null;
            }
            _guideIcon.gameObject.SetActive(false);
            _routine = null;
        }
    }
}
