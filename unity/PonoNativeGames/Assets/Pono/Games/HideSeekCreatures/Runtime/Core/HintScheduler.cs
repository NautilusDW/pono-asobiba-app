using System;
using System.Collections.Generic;

namespace Pono.HideSeek.Core
{
    public readonly struct HintCue
    {
        internal HintCue(
            int sequenceNumber,
            int scheduleIndex,
            float delaySeconds,
            bool isRepeating)
        {
            SequenceNumber = sequenceNumber;
            ScheduleIndex = scheduleIndex;
            DelaySeconds = delaySeconds;
            IsRepeating = isRepeating;
        }

        public int SequenceNumber { get; }

        public int ScheduleIndex { get; }

        public float DelaySeconds { get; }

        public bool IsRepeating { get; }
    }

    public sealed class HintDueEventArgs : EventArgs
    {
        internal HintDueEventArgs(HintCue cue)
        {
            Cue = cue;
        }

        public HintCue Cue { get; }
    }

    /// <summary>
    /// Deterministic inactivity scheduler. Advance emits at most one cue so a stalled
    /// frame cannot burst several hints at a child.
    /// </summary>
    public sealed class HintScheduler
    {
        private readonly float[] _delaysSeconds;
        private readonly bool _repeatLastHint;
        private int _nextSequenceNumber;

        public HintScheduler(IEnumerable<float> delaysSeconds, bool repeatLastHint = true)
        {
            if (delaysSeconds == null)
            {
                throw new ArgumentNullException(nameof(delaysSeconds));
            }

            var delays = new List<float>();
            foreach (var delay in delaysSeconds)
            {
                if (float.IsNaN(delay) || float.IsInfinity(delay) || delay <= 0f)
                {
                    throw new ArgumentOutOfRangeException(nameof(delaysSeconds));
                }

                delays.Add(delay);
            }

            if (delays.Count == 0)
            {
                throw new ArgumentException("At least one hint delay is required.", nameof(delaysSeconds));
            }

            _delaysSeconds = delays.ToArray();
            _repeatLastHint = repeatLastHint;
        }

        public event EventHandler<HintDueEventArgs> HintDue;

        public float IdleSeconds { get; private set; }

        public bool IsPaused { get; private set; }

        public bool IsCompleted { get; private set; }

        public int EmittedCount => _nextSequenceNumber;

        public HintCue? Advance(float deltaSeconds)
        {
            if (float.IsNaN(deltaSeconds)
                || float.IsInfinity(deltaSeconds)
                || deltaSeconds < 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(deltaSeconds));
            }

            if (IsPaused || IsCompleted)
            {
                return null;
            }

            IdleSeconds += deltaSeconds;
            var scheduleIndex = Math.Min(_nextSequenceNumber, _delaysSeconds.Length - 1);
            var delay = _delaysSeconds[scheduleIndex];
            if (IdleSeconds < delay)
            {
                return null;
            }

            var isRepeating = _nextSequenceNumber >= _delaysSeconds.Length;
            var cue = new HintCue(
                _nextSequenceNumber,
                scheduleIndex,
                delay,
                isRepeating);

            _nextSequenceNumber++;
            IdleSeconds = 0f;

            if (!_repeatLastHint && _nextSequenceNumber >= _delaysSeconds.Length)
            {
                IsCompleted = true;
            }

            HintDue?.Invoke(this, new HintDueEventArgs(cue));
            return cue;
        }

        /// <summary>
        /// A touch or meaningful progress restarts inactivity and the hint escalation.
        /// Completion remains terminal until Reset is explicitly called.
        /// </summary>
        public void NotifyActivity(bool resetEscalation = true)
        {
            IdleSeconds = 0f;
            if (resetEscalation && !IsCompleted)
            {
                _nextSequenceNumber = 0;
            }
        }

        public void Pause()
        {
            IsPaused = true;
        }

        public void Resume(bool resetIdle = false)
        {
            IsPaused = false;
            if (resetIdle)
            {
                IdleSeconds = 0f;
            }
        }

        public void Complete()
        {
            IsCompleted = true;
            IdleSeconds = 0f;
        }

        public void Reset()
        {
            IdleSeconds = 0f;
            IsPaused = false;
            IsCompleted = false;
            _nextSequenceNumber = 0;
        }
    }
}
