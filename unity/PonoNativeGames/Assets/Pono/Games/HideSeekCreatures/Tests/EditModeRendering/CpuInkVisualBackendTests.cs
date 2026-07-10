using NUnit.Framework;
using Pono.HideSeekCreatures.Rendering;
using UnityEngine;

namespace Pono.HideSeek.Tests.EditModeRendering
{
    public sealed class CpuInkVisualBackendTests
    {
        private CpuInkVisualBackend _backend;

        [TearDown]
        public void TearDown()
        {
            _backend?.Dispose();
            _backend = null;
        }

        [Test]
        public void Constructor_InitializesReadableFallbackTexture()
        {
            _backend = new CpuInkVisualBackend(width: 8, height: 8);

            var texture = _backend.OutputTexture as Texture2D;
            Assert.That(texture, Is.Not.Null);
            Assert.That(texture.width, Is.EqualTo(32));
            Assert.That(texture.height, Is.EqualTo(18));
            Assert.That(texture.filterMode, Is.EqualTo(FilterMode.Bilinear));
            Assert.That(texture.wrapMode, Is.EqualTo(TextureWrapMode.Clamp));
            Assert.That(_backend.VelocityTexture, Is.SameAs(Texture2D.blackTexture));
            Assert.That(_backend.Label, Does.StartWith("CPU 32"));
            Assert.That(_backend.IsReady, Is.True);

            var pixels = texture.GetPixels32();
            Assert.That(pixels, Has.Length.EqualTo(32 * 18));
            Assert.That(CountVisiblePixels(pixels), Is.Zero);
        }

        [Test]
        public void InjectAndTick_UploadVisiblePigmentIntoTexture()
        {
            _backend = new CpuInkVisualBackend(width: 32, height: 18);
            var splat = new InkSplat(
                new Vector2(0.5f, 0.5f),
                new Vector2(0.4f, -0.2f),
                new Color(0.9f, 0.2f, 0.1f, 1f),
                radius: 0.12f);

            _backend.Inject(in splat);
            _backend.Tick(0f);

            var texture = (Texture2D)_backend.OutputTexture;
            var pixels = texture.GetPixels32();
            var center = pixels[16 + 9 * texture.width];
            Assert.That(CountVisiblePixels(pixels), Is.GreaterThan(0));
            Assert.That(center.a, Is.GreaterThan(0));
            Assert.That(center.r, Is.GreaterThan(center.g));
            Assert.That(center.g, Is.GreaterThanOrEqualTo(center.b));
        }

        [Test]
        public void Reset_ClearsUploadedAndPendingPigment()
        {
            _backend = new CpuInkVisualBackend(width: 32, height: 18);
            var splat = new InkSplat(
                new Vector2(0.5f, 0.5f),
                Vector2.zero,
                Color.cyan,
                radius: 0.2f);
            _backend.Inject(in splat);
            _backend.Tick(0f);
            Assert.That(
                CountVisiblePixels(((Texture2D)_backend.OutputTexture).GetPixels32()),
                Is.GreaterThan(0));

            _backend.Reset();

            Assert.That(
                CountVisiblePixels(((Texture2D)_backend.OutputTexture).GetPixels32()),
                Is.Zero);
            Assert.That(_backend.IsReady, Is.True);
        }

        [Test]
        public void Dispose_ReleasesOwnedTextureAndIsIdempotent()
        {
            _backend = new CpuInkVisualBackend(width: 32, height: 18);
            var ownedTexture = _backend.OutputTexture;

            Assert.DoesNotThrow(() => _backend.Dispose());
            Assert.That(ownedTexture == null, Is.True);
            Assert.That(_backend.IsReady, Is.False);
            Assert.DoesNotThrow(() => _backend.Dispose());

            _backend = null;
        }

        private static int CountVisiblePixels(Color32[] pixels)
        {
            var count = 0;
            for (var index = 0; index < pixels.Length; index++)
            {
                if (pixels[index].a > 0)
                {
                    count++;
                }
            }

            return count;
        }
    }
}
