using System.Collections;
using System.Linq;
using NUnit.Framework;
using Pono.MarbleRun3D.Gameplay;
using Pono.MarbleRun3D.UI;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Pono.MarbleRun3D.Tests.PlayMode
{
    public sealed class PieceThumbnailPalettePlayModeTests
    {
        private GameObject _cameraObject;
        private GameObject _root;
        private MarbleRunGameController _controller;

        [UnitySetUp]
        public IEnumerator SetUp()
        {
            Time.timeScale = 1f;
            _cameraObject = new GameObject("PictureTestCamera", typeof(Camera), typeof(AudioListener));
            _cameraObject.tag = "MainCamera";
            _root = new GameObject("PicturePaletteTest");
            _controller = _root.AddComponent<MarbleRunGameController>();
            yield return null;
            yield return null;
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (_root != null) Object.Destroy(_root);
            if (_cameraObject != null) Object.Destroy(_cameraObject);
            yield return null;
            LogAssert.NoUnexpectedReceived();
        }

        [UnityTest]
        public IEnumerator PaletteShowsNineteenLargeNonBlockingPiecePictures()
        {
            _controller.StartMode("sandbox");
            Canvas.ForceUpdateCanvases();
            yield return null;
            Canvas.ForceUpdateCanvases();

            var icons = _controller.Ui.GetComponentsInChildren<PieceThumbnailIcon>(true);
            Assert.That(icons.Length, Is.EqualTo(19));
            Assert.That(icons.All(icon => icon.Image.sprite != null), Is.True);
            Assert.That(icons.Select(icon => icon.Image.sprite).Distinct().Count(), Is.EqualTo(19));
            Assert.That(icons.All(icon => !icon.Image.raycastTarget), Is.True);
            Assert.That(icons.All(icon => icon.Image.preserveAspect), Is.True);
            Assert.That(icons.All(icon => icon.GetComponentInParent<PaletteDragItem>() != null), Is.True);
            Assert.That(icons.All(icon => icon.GetComponentInParent<Button>() != null), Is.True);
            Assert.That(icons.All(icon => icon.GetComponent<RectTransform>().rect.width >= 64f), Is.True);
            Assert.That(icons.All(icon => icon.GetComponent<RectTransform>().rect.height >= 64f), Is.True);
            Assert.That(icons.All(icon => icon.GetComponentInParent<Camera>() == null), Is.True);

            var labels = icons.Select(icon => icon.GetComponentInParent<Button>().transform.Find("Label")
                    .GetComponent<Text>())
                .ToArray();
            Assert.That(labels.All(label => label.fontSize <= 14), Is.True);
            Assert.That(labels.All(label => label.text.Contains("\n")), Is.True);
        }
    }
}
