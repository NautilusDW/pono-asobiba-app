using System;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.HideSeek.Core;

namespace Pono.HideSeek.Tests.EditMode
{
    public sealed class HintSchedulerTests
    {
        [Test]
        public void Advance_EmitsOnlyAfterConfiguredIdleDelay()
        {
            var scheduler = new HintScheduler(new[] { 2f, 4f });
            var eventCount = 0;
            scheduler.HintDue += (_, __) => eventCount++;

            var before = scheduler.Advance(1.9f);
            var due = scheduler.Advance(0.1f);

            Assert.That(before.HasValue, Is.False);
            Assert.That(due.HasValue, Is.True);
            Assert.That(due.Value.SequenceNumber, Is.Zero);
            Assert.That(due.Value.ScheduleIndex, Is.Zero);
            Assert.That(due.Value.DelaySeconds, Is.EqualTo(2f));
            Assert.That(eventCount, Is.EqualTo(1));
            Assert.That(scheduler.IdleSeconds, Is.Zero);
        }

        [Test]
        public void Schedule_EscalatesThenRepeatsLastHint()
        {
            var scheduler = new HintScheduler(new[] { 1f, 2f }, repeatLastHint: true);

            var first = scheduler.Advance(1f).Value;
            var second = scheduler.Advance(2f).Value;
            var repeated = scheduler.Advance(2f).Value;

            Assert.That(first.ScheduleIndex, Is.Zero);
            Assert.That(first.IsRepeating, Is.False);
            Assert.That(second.ScheduleIndex, Is.EqualTo(1));
            Assert.That(second.IsRepeating, Is.False);
            Assert.That(repeated.ScheduleIndex, Is.EqualTo(1));
            Assert.That(repeated.IsRepeating, Is.True);
            Assert.That(scheduler.IsCompleted, Is.False);
        }

        [Test]
        public void LargeFrameDelta_EmitsAtMostOneHint()
        {
            var scheduler = new HintScheduler(new[] { 1f, 1f, 1f });
            var cues = new List<HintCue>();
            scheduler.HintDue += (_, eventArgs) => cues.Add(eventArgs.Cue);

            var due = scheduler.Advance(100f);

            Assert.That(due.HasValue, Is.True);
            Assert.That(cues, Has.Count.EqualTo(1));
            Assert.That(scheduler.EmittedCount, Is.EqualTo(1));
            Assert.That(scheduler.IdleSeconds, Is.Zero);
        }

        [Test]
        public void NotifyActivity_ResetsIdleAndEscalation()
        {
            var scheduler = new HintScheduler(new[] { 1f, 3f });
            scheduler.Advance(1f);
            scheduler.Advance(2f);

            scheduler.NotifyActivity();
            var tooEarly = scheduler.Advance(0.9f);
            var firstAgain = scheduler.Advance(0.1f);

            Assert.That(tooEarly.HasValue, Is.False);
            Assert.That(firstAgain.Value.SequenceNumber, Is.Zero);
            Assert.That(firstAgain.Value.ScheduleIndex, Is.Zero);
        }

        [Test]
        public void Pause_FreezesIdleUntilResumed()
        {
            var scheduler = new HintScheduler(new[] { 2f });
            scheduler.Advance(1f);
            scheduler.Pause();

            var paused = scheduler.Advance(100f);
            scheduler.Resume();
            var resumed = scheduler.Advance(1f);

            Assert.That(paused.HasValue, Is.False);
            Assert.That(resumed.HasValue, Is.True);
        }

        [Test]
        public void NonRepeatingSchedule_CompletesAfterLastHint()
        {
            var scheduler = new HintScheduler(new[] { 1f, 1f }, repeatLastHint: false);
            scheduler.Advance(1f);
            scheduler.Advance(1f);

            var afterCompletion = scheduler.Advance(100f);

            Assert.That(scheduler.IsCompleted, Is.True);
            Assert.That(afterCompletion.HasValue, Is.False);
            Assert.That(scheduler.EmittedCount, Is.EqualTo(2));
        }

        [Test]
        public void Complete_IsTerminalUntilExplicitReset()
        {
            var scheduler = new HintScheduler(new[] { 1f });
            scheduler.Complete();

            Assert.That(scheduler.Advance(10f).HasValue, Is.False);
            scheduler.NotifyActivity();
            Assert.That(scheduler.Advance(10f).HasValue, Is.False);

            scheduler.Reset();

            Assert.That(scheduler.Advance(1f).HasValue, Is.True);
        }

        [Test]
        public void InvalidSchedulesAndTimes_AreRejected()
        {
            Assert.Throws<ArgumentNullException>(() => new HintScheduler(null));
            Assert.Throws<ArgumentException>(() => new HintScheduler(Array.Empty<float>()));
            Assert.Throws<ArgumentOutOfRangeException>(() => new HintScheduler(new[] { 0f }));
            Assert.Throws<ArgumentOutOfRangeException>(() => new HintScheduler(new[] { float.NaN }));

            var scheduler = new HintScheduler(new[] { 1f });
            Assert.Throws<ArgumentOutOfRangeException>(() => scheduler.Advance(-1f));
            Assert.Throws<ArgumentOutOfRangeException>(() => scheduler.Advance(float.PositiveInfinity));
        }
    }
}
