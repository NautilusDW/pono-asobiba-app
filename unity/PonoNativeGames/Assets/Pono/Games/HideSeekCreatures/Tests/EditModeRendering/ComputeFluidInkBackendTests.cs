using NUnit.Framework;
using Pono.HideSeekCreatures.Rendering;
using UnityEngine;

namespace Pono.HideSeek.Tests.EditModeRendering
{
    public sealed class ComputeFluidInkBackendTests
    {
        [Test]
        public void Inject_WhenComputeIsSupported_ProducesVisiblePigment()
        {
            if (!ComputeFluidInkBackend.IsSupported())
            {
                Assert.Ignore("Compute FluidInk is not supported by this graphics device.");
            }

            var shader = Resources.Load<ComputeShader>("HideSeekCreatures/Rendering/FluidInk");
            Assert.That(shader, Is.Not.Null);
            using var backend = new ComputeFluidInkBackend(shader, height: 144, pressureIterations: 6);
            backend.Inject(new InkSplat(
                new Vector2(0.5f, 0.5f),
                new Vector2(0.12f, 0.04f),
                new Color(0.9f, 0.2f, 0.5f, 1f),
                0.08f));
            backend.Tick(0.04f);

            var renderTexture = (RenderTexture)backend.OutputTexture;
            var readback = new Texture2D(1, 1, TextureFormat.RGBAFloat, false, true);
            var previous = RenderTexture.active;
            try
            {
                RenderTexture.active = renderTexture;
                readback.ReadPixels(
                    new Rect(renderTexture.width / 2f, renderTexture.height / 2f, 1f, 1f),
                    0,
                    0,
                    false);
                readback.Apply(false, false);
                var center = readback.GetPixel(0, 0);
                Assert.That(
                    Mathf.Max(center.r, center.g, center.b, center.a),
                    Is.GreaterThan(0.01f),
                    $"Center pigment was empty: {center}");
            }
            finally
            {
                RenderTexture.active = previous;
                Object.DestroyImmediate(readback);
            }
        }
    }
}
