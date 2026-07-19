using NUnit.Framework;
using Pono.HideSeekCreatures.Rendering;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.HideSeek.Tests.EditModeRendering
{
    public sealed class FluidInkPresenterTests
    {
        private GameObject _gameObject;
        private Texture2D _revealTexture;

        [TearDown]
        public void TearDown()
        {
            if (_gameObject != null)
            {
                Object.DestroyImmediate(_gameObject);
                _gameObject = null;
            }

            if (_revealTexture != null)
            {
                Object.DestroyImmediate(_revealTexture);
                _revealTexture = null;
            }
        }

        [Test]
        public void Initialize_WithComputeDisabledPolicy_UsesSafeCpuFallback()
        {
            var presenter = CreatePresenter(out var image);

            Assert.DoesNotThrow(() => presenter.Initialize(_revealTexture, forceFallback: true));

            Assert.That(presenter.enabled, Is.True);
            Assert.That(presenter.IsGpuActive, Is.False);
            Assert.That(presenter.BackendLabel, Does.StartWith("CPU "));
            Assert.That(image.material, Is.Not.Null);
            Assert.That(image.texture, Is.SameAs(Texture2D.whiteTexture));
            Assert.That(image.material.GetTexture("_RevealTex"), Is.SameAs(_revealTexture));
            Assert.That(image.material.GetTexture("_PigmentTex"), Is.TypeOf<Texture2D>());
            Assert.That(image.material.GetTexture("_VelocityTex"), Is.SameAs(Texture2D.blackTexture));
        }

        [Test]
        public void CpuFallback_InjectResetAndReduceMotionRemainSafe()
        {
            var presenter = CreatePresenter(out var image);
            presenter.Initialize(_revealTexture, forceFallback: true);

            Assert.DoesNotThrow(() => presenter.Inject(
                new Vector2(0.4f, 0.6f),
                new Vector2(2f, -1f),
                Color.magenta,
                radius: 0.08f));
            Assert.DoesNotThrow(() => presenter.ResetInk());

            presenter.SetReduceMotion(true);
            Assert.That(image.material.GetFloat("_MotionAmount"), Is.EqualTo(0.45f).Within(0.0001f));

            presenter.SetFogAmount(0.34f);
            Assert.That(image.material.GetFloat("_FogAmount"), Is.EqualTo(0.34f).Within(0.0001f));
            presenter.SetFogAmount(2f);
            Assert.That(image.material.GetFloat("_FogAmount"), Is.EqualTo(1f).Within(0.0001f));

            presenter.SetRevealTexture(null);
            Assert.That(image.material.GetTexture("_RevealTex"), Is.SameAs(Texture2D.blackTexture));
        }

        [Test]
        public void Destroy_ReleasesCpuTextureAndRuntimeMaterial()
        {
            var presenter = CreatePresenter(out var image);
            presenter.Initialize(_revealTexture, forceFallback: true);
            var ownedTexture = image.material.GetTexture("_PigmentTex");
            var ownedMaterial = image.material;

            presenter.ReleaseResources();
            Object.DestroyImmediate(_gameObject);
            _gameObject = null;

            Assert.That(ownedTexture == null, Is.True);
            Assert.That(ownedMaterial == null, Is.True);
        }

        private FluidInkPresenter CreatePresenter(out RawImage image)
        {
            _gameObject = new GameObject(
                "FluidInkPresenter Test",
                typeof(RectTransform),
                typeof(CanvasRenderer),
                typeof(RawImage),
                typeof(FluidInkPresenter));
            _revealTexture = new Texture2D(
                4,
                4,
                TextureFormat.RGBA32,
                mipChain: false,
                linear: true)
            {
                hideFlags = HideFlags.DontSave
            };
            image = _gameObject.GetComponent<RawImage>();
            return _gameObject.GetComponent<FluidInkPresenter>();
        }
    }
}
