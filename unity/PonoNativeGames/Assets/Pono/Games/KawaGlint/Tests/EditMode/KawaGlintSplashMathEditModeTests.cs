using NUnit.Framework;
using Pono.KawaGlint.Rendering;
using UnityEngine;

namespace Pono.KawaGlint.Tests.EditMode
{
    /// <summary>
    /// Pure-function tests for <see cref="KawaGlintSplashMath"/> -- the
    /// landing-splash curves used by <see cref="KawaGlintSplashEffect"/>.
    /// No MonoBehaviour, no scene: every function here is a plain
    /// float/Vector2 formula.
    /// </summary>
    public sealed class KawaGlintSplashMathEditModeTests
    {
        [Test]
        public void DropletPosition_AtZeroElapsed_IsOriginRelativeZero()
        {
            for (var i = 0; i < KawaGlintSplashMath.DropletCount; i++)
            {
                var position = KawaGlintSplashMath.DropletPosition(i, 0f);
                Assert.That(position, Is.EqualTo(Vector2.zero), $"Droplet {i} should start exactly at the origin.");
            }
        }

        [Test]
        public void DropletPosition_AtLifeEnd_HasFallenBelowItsPeak()
        {
            for (var i = 0; i < KawaGlintSplashMath.DropletCount; i++)
            {
                // Sample the whole arc finely and find the peak height, then
                // confirm the droplet has fallen (gravity) below that peak
                // by the time its life ends.
                var peakY = float.NegativeInfinity;
                const int samples = 50;
                for (var s = 0; s <= samples; s++)
                {
                    var t = KawaGlintSplashMath.DropletLifeSeconds * s / samples;
                    var y = KawaGlintSplashMath.DropletPosition(i, t).y;
                    peakY = Mathf.Max(peakY, y);
                }

                var endY = KawaGlintSplashMath.DropletPosition(i, KawaGlintSplashMath.DropletLifeSeconds).y;
                Assert.That(endY, Is.LessThan(peakY), $"Droplet {i} should have fallen from its peak height by the end of its life.");
            }
        }

        [Test]
        public void DropletAlpha01_AtLifeEnd_IsFullyTransparent()
        {
            Assert.That(KawaGlintSplashMath.DropletAlpha01(1f), Is.EqualTo(0f).Within(1e-5f));
        }

        [Test]
        public void DropletAlpha01_AtBirth_IsNotFullyOpaque()
        {
            // DESIGN.md: alpha = 0.9 * (1 - t01)^2 -- 0.9 at birth, not 1.0.
            Assert.That(KawaGlintSplashMath.DropletAlpha01(0f), Is.EqualTo(0.9f).Within(1e-5f));
        }

        [Test]
        public void DropletScale01_ShrinksFromFullToPartial()
        {
            Assert.That(KawaGlintSplashMath.DropletScale01(0f), Is.EqualTo(1f).Within(1e-5f));
            Assert.That(KawaGlintSplashMath.DropletScale01(1f), Is.EqualTo(0.55f).Within(1e-5f));
        }

        [Test]
        public void RingScale_ExpandsFromQuarterToOneAndAHalf()
        {
            Assert.That(KawaGlintSplashMath.RingScale(0f), Is.EqualTo(0.25f).Within(1e-5f));
            Assert.That(KawaGlintSplashMath.RingScale(1f), Is.EqualTo(1.5f).Within(1e-5f));
        }

        [Test]
        public void RingAlpha_FadesToZero()
        {
            Assert.That(KawaGlintSplashMath.RingAlpha(0f), Is.EqualTo(0.55f).Within(1e-5f));
            Assert.That(KawaGlintSplashMath.RingAlpha(1f), Is.EqualTo(0f).Within(1e-5f));
        }
    }
}
