using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.HideSeekCreatures.Input;
using Pono.HideSeekCreatures.Rendering;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Pono.HideSeek.Tests.PlayMode
{
    public sealed class HideSeekRuntimeSmokeTests
    {
        [UnityTest]
        public IEnumerator CpuFallback_InjectsResets_AndPresenterCanForceIt()
        {
            var backend = new CpuInkVisualBackend(32, 18);
            try
            {
                Assert.That(backend.IsReady, Is.True);
                Assert.That(backend.Label, Is.EqualTo("CPU 32×18"));
                Assert.That(backend.OutputTexture, Is.TypeOf<Texture2D>());

                backend.Inject(new InkSplat(
                    new Vector2(0.5f, 0.5f),
                    new Vector2(0.3f, -0.2f),
                    new Color(0.3f, 0.8f, 0.6f, 1f),
                    0.25f));
                backend.Tick(0f);

                var texture = (Texture2D)backend.OutputTexture;
                Assert.That(texture.GetPixel(texture.width / 2, texture.height / 2).a, Is.GreaterThan(0f));

                backend.Reset();
                Assert.That(
                    texture.GetPixel(texture.width / 2, texture.height / 2).a,
                    Is.EqualTo(0f).Within(0.001f));
            }
            finally
            {
                backend.Dispose();
            }

            yield return null;

            var presenterObject = new GameObject(
                "Forced CPU Ink Presenter",
                typeof(RectTransform),
                typeof(CanvasRenderer),
                typeof(RawImage),
                typeof(FluidInkPresenter));
            var presenter = presenterObject.GetComponent<FluidInkPresenter>();
            presenter.Initialize(Texture2D.blackTexture, forceFallback: true);

            Assert.That(presenter.IsGpuActive, Is.False);
            Assert.That(presenter.BackendLabel, Does.StartWith("CPU "));
            presenter.Inject(
                new Vector2(0.4f, 0.6f),
                new Vector2(0.2f, 0.1f),
                Color.cyan,
                0.08f);
            yield return null;
            presenter.ResetInk();

            UnityEngine.Object.Destroy(presenterObject);
            yield return null;
        }

        [UnityTest]
        public IEnumerator InputSurface_AcceptsTwoPointers_AndReusesAReleasedSlot()
        {
            var createdEventSystem = false;
            var eventSystem = EventSystem.current;
            if (eventSystem == null)
            {
                eventSystem = new GameObject("Test EventSystem", typeof(EventSystem))
                    .GetComponent<EventSystem>();
                createdEventSystem = true;
            }

            var surfaceObject = new GameObject(
                "Input Surface Under Test",
                typeof(RectTransform),
                typeof(InkInputSurface));
            var rect = (RectTransform)surfaceObject.transform;
            rect.sizeDelta = new Vector2(100f, 100f);
            var surface = surfaceObject.GetComponent<InkInputSurface>();
            var pressedIds = new List<int>();
            var releasedIds = new List<int>();
            surface.Pressed += (id, _) => pressedIds.Add(id);
            surface.Released += (id, _) => releasedIds.Add(id);

            var first = Pointer(eventSystem, 11);
            var second = Pointer(eventSystem, 22);
            var third = Pointer(eventSystem, 33);
            surface.OnPointerDown(first);
            surface.OnPointerDown(second);
            surface.OnPointerDown(third);

            CollectionAssert.AreEqual(new[] { 11, 22 }, pressedIds);

            surface.OnPointerUp(first);
            surface.OnPointerDown(third);

            CollectionAssert.AreEqual(new[] { 11, 22, 33 }, pressedIds);
            CollectionAssert.AreEqual(new[] { 11 }, releasedIds);

            surface.CancelAll();
            surface.OnPointerUp(second);
            surface.OnPointerUp(third);
            CollectionAssert.AreEqual(new[] { 11 }, releasedIds);

            surface.InputEnabled = false;
            surface.OnPointerDown(Pointer(eventSystem, 44));
            CollectionAssert.AreEqual(new[] { 11, 22, 33 }, pressedIds);

            UnityEngine.Object.Destroy(surfaceObject);
            if (createdEventSystem)
            {
                UnityEngine.Object.Destroy(eventSystem.gameObject);
            }
            yield return null;
        }

        private static PointerEventData Pointer(EventSystem eventSystem, int pointerId)
        {
            return new PointerEventData(eventSystem)
            {
                pointerId = pointerId,
                position = new Vector2(50f, 50f)
            };
        }
    }
}
