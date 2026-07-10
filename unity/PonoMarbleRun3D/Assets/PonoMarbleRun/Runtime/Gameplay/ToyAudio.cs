using System;
using UnityEngine;

namespace Pono.MarbleRun3D.Gameplay
{
    [DisallowMultipleComponent]
    public sealed class ToyAudio : MonoBehaviour
    {
        private AudioSource _source;
        private AudioClip _click;
        private AudioClip _place;
        private AudioClip _gentleNo;
        private AudioClip _reset;
        private AudioClip _goal;

        private void Awake()
        {
            _source = gameObject.AddComponent<AudioSource>();
            _source.playOnAwake = false;
            _source.spatialBlend = 0f;
            _source.volume = 0.52f;
            _click = CreateTone("こつ", 520f, 0.075f, 0.18f, 0.02f);
            _place = CreateChord("ことん", new[] { 420f, 630f }, 0.16f, 0.21f);
            _gentleNo = CreateChord("おけない", new[] { 310f, 270f }, 0.18f, 0.14f);
            _reset = CreateChord("もどす", new[] { 360f, 480f }, 0.26f, 0.18f);
            _goal = CreateMelody();
        }

        public void PlayClick() => Play(_click, 0.72f);
        public void PlayPlace() => Play(_place, 0.92f);
        public void PlayGentleNo() => Play(_gentleNo, 0.72f);
        public void PlayReset() => Play(_reset, 0.84f);
        public void PlayGoal() => Play(_goal, 1f);

        private void Play(AudioClip clip, float volume)
        {
            if (clip != null && _source != null) _source.PlayOneShot(clip, volume);
        }

        private static AudioClip CreateTone(string name, float frequency, float duration, float volume, float noise)
        {
            const int sampleRate = 22050;
            var count = Mathf.CeilToInt(sampleRate * duration);
            var data = new float[count];
            var random = new System.Random(name.GetHashCode());
            for (var i = 0; i < count; i++)
            {
                var t = i / (float)sampleRate;
                var envelope = Mathf.Sin(Mathf.Clamp01(t / 0.018f) * Mathf.PI * 0.5f)
                    * Mathf.Exp(-t * 13f);
                var wave = Mathf.Sin(t * frequency * Mathf.PI * 2f)
                    + 0.24f * Mathf.Sin(t * frequency * 2.02f * Mathf.PI * 2f);
                var grit = ((float)random.NextDouble() * 2f - 1f) * noise;
                data[i] = (wave * 0.5f + grit) * envelope * volume;
            }
            var clip = AudioClip.Create(name, count, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private static AudioClip CreateChord(string name, float[] frequencies, float duration, float volume)
        {
            const int sampleRate = 22050;
            var count = Mathf.CeilToInt(sampleRate * duration);
            var data = new float[count];
            for (var i = 0; i < count; i++)
            {
                var t = i / (float)sampleRate;
                var envelope = Mathf.Sin(Mathf.Clamp01(t / 0.02f) * Mathf.PI * 0.5f)
                    * Mathf.Exp(-t * 8.4f);
                var sample = 0f;
                for (var tone = 0; tone < frequencies.Length; tone++)
                {
                    sample += Mathf.Sin(t * frequencies[tone] * Mathf.PI * 2f);
                }
                data[i] = sample / Mathf.Max(1, frequencies.Length) * envelope * volume;
            }
            var clip = AudioClip.Create(name, count, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private static AudioClip CreateMelody()
        {
            const int sampleRate = 22050;
            const float duration = 1.15f;
            var count = Mathf.CeilToInt(sampleRate * duration);
            var data = new float[count];
            var notes = new[] { 523.25f, 659.25f, 783.99f, 1046.5f };
            for (var i = 0; i < count; i++)
            {
                var t = i / (float)sampleRate;
                var sample = 0f;
                for (var note = 0; note < notes.Length; note++)
                {
                    var local = t - note * 0.19f;
                    if (local < 0f) continue;
                    var envelope = Mathf.Exp(-local * 5.8f) * Mathf.Clamp01(local / 0.012f);
                    sample += Mathf.Sin(local * notes[note] * Mathf.PI * 2f) * envelope * 0.17f;
                }
                data[i] = sample;
            }
            var clip = AudioClip.Create("ゴール おと", count, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
