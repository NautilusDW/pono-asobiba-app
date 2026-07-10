using NUnit.Framework;
using UnityEngine;

namespace Pono.FluidMarbleLab.Tests
{
    public sealed class LabViewportTests
    {
        [Test]
        public void WorldUvRoundTripIsStable()
        {
            var cameraObject = new GameObject("TestCamera");
            var viewportObject = new GameObject("TestViewport");
            try
            {
                var camera = cameraObject.AddComponent<Camera>();
                camera.transform.position = new Vector3(0f, 0f, -10f);
                camera.orthographic = true;
                var viewport = viewportObject.AddComponent<LabViewport>();
                viewport.Configure(camera, 10f);
                var expected = new Vector2(0.23f, 0.78f);

                var actual = viewport.WorldToUv(viewport.UvToWorld(expected));

                Assert.That(actual.x, Is.EqualTo(expected.x).Within(0.0001f));
                Assert.That(actual.y, Is.EqualTo(expected.y).Within(0.0001f));
            }
            finally
            {
                Object.DestroyImmediate(viewportObject);
                Object.DestroyImmediate(cameraObject);
            }
        }
    }
}
