using UnityEngine;

namespace Pono.HideSeekCreatures.Gameplay
{
    [DisallowMultipleComponent]
    public sealed class HideSeekAudio : MonoBehaviour
    {
        private const string SoundPref = "pono_hide_seek_sound";
        private AudioSource _effects;
        private AudioSource _inkLoop;
        private AudioClip _touch;
        private AudioClip _ink;
        private AudioClip _hint;
        private AudioClip _found;
        private AudioClip _allFound;
        private AudioClip _back;
        private AudioClip _fogClear;
        private float _lastTouchTime = -1f;

        public bool SoundEnabled { get; private set; }

        public void Initialize()
        {
            _effects = gameObject.AddComponent<AudioSource>();
            _effects.playOnAwake = false;
            _effects.spatialBlend = 0f;
            _effects.volume = 0.72f;
            _inkLoop = gameObject.AddComponent<AudioSource>();
            _inkLoop.playOnAwake = false;
            _inkLoop.loop = true;
            _inkLoop.spatialBlend = 0f;
            _inkLoop.volume = 0f;

            _touch = Load("touch");
            _ink = Load("ink");
            _hint = Load("hint");
            _found = Load("found");
            _allFound = Load("all_found");
            _back = Load("back");
            _fogClear = Load("fog_clear");
            _inkLoop.clip = _ink;
            SoundEnabled = PlayerPrefs.GetInt(SoundPref, 1) != 0;
            ApplyEnabled();
        }

        public bool ToggleSound()
        {
            SoundEnabled = !SoundEnabled;
            PlayerPrefs.SetInt(SoundPref, SoundEnabled ? 1 : 0);
            PlayerPrefs.Save();
            ApplyEnabled();
            if (SoundEnabled)
            {
                PlayTouch();
            }
            return SoundEnabled;
        }

        public void PlayTouch()
        {
            if (Time.unscaledTime - _lastTouchTime < 0.06f)
            {
                return;
            }
            _lastTouchTime = Time.unscaledTime;
            PlayOneShot(_touch, 0.32f);
        }

        public void PlayHint() => PlayOneShot(_hint, 0.34f);
        public void PlayFound() => PlayOneShot(_found, 0.76f);
        public void PlayAllFound() => PlayOneShot(_allFound, 0.82f);
        public void PlayBack() => PlayOneShot(_back, 0.55f);
        public void PlayFogClear() => PlayOneShot(_fogClear, 0.38f);

        public void SetInkActivity(bool active, float speed)
        {
            if (!SoundEnabled || _inkLoop.clip == null)
            {
                if (_inkLoop.isPlaying)
                {
                    _inkLoop.Stop();
                }
                return;
            }

            var targetVolume = active ? Mathf.Lerp(0.05f, 0.2f, Mathf.Clamp01(speed * 0.7f)) : 0f;
            _inkLoop.volume = Mathf.MoveTowards(_inkLoop.volume, targetVolume, Time.unscaledDeltaTime * 0.8f);
            _inkLoop.pitch = Mathf.Lerp(0.88f, 1.08f, Mathf.Clamp01(speed * 0.55f));
            if (active && !_inkLoop.isPlaying)
            {
                _inkLoop.Play();
            }
            if (!active && _inkLoop.volume <= 0.001f && _inkLoop.isPlaying)
            {
                _inkLoop.Stop();
            }
        }

        public void StopInkImmediately()
        {
            if (_inkLoop == null)
            {
                return;
            }
            _inkLoop.volume = 0f;
            if (_inkLoop.isPlaying)
            {
                _inkLoop.Stop();
            }
        }

        private void ApplyEnabled()
        {
            _effects.mute = !SoundEnabled;
            _inkLoop.mute = !SoundEnabled;
            if (!SoundEnabled)
            {
                _inkLoop.Stop();
            }
        }

        private void PlayOneShot(AudioClip clip, float volume)
        {
            if (SoundEnabled && clip != null)
            {
                _effects.PlayOneShot(clip, volume);
            }
        }

        private static AudioClip Load(string name)
        {
            return Resources.Load<AudioClip>($"HideSeekCreatures/Audio/{name}");
        }

        private void OnDestroy()
        {
            StopInkImmediately();
        }
    }
}
