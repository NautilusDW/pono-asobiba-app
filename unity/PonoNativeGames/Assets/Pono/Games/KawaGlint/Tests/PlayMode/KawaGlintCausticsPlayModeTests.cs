using System.Collections;
using NUnit.Framework;
using Pono.KawaGlint.Bootstrap;
using Pono.KawaGlint.Rendering;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;

namespace Pono.KawaGlint.Tests.PlayMode
{
    /// <summary>
    /// Proves module D's caustics overlay (<see cref="KawaCausticsSurface"/>)
    /// is actually wired up by <see cref="KawaGlintBootstrap"/>: built at the
    /// documented sorting order with the documented shader, discoverable via
    /// the same <c>IsEffectAvailable</c>/<c>SetEffectEnabled</c> contract the
    /// QA capture harness uses, and positioned so its quad's top edge lines
    /// up with the stage's waterline. Mirrors
    /// KawaGlintSplashPlayModeTests's SetUp/TearDown pattern (91_KawaGlint.unity
    /// is intentionally not registered in EditorBuildSettings, so this suite
    /// builds the scene by hand).
    /// </summary>
    public sealed class KawaGlintCausticsPlayModeTests
    {
        private const int ExpectedCausticsSortingOrder = 16;
        private const string ExpectedShaderName = "Pono/KawaGlint/Caustics";
        private const float WaterlineToleranceWorldUnits = 0.05f;

        private GameObject _cameraGo;
        private GameObject _root;
        private KawaGlintBootstrap _bootstrap;

        [UnitySetUp]
        public IEnumerator SetUp()
        {
            _cameraGo = new GameObject("MainCamera", typeof(Camera));
            _cameraGo.tag = "MainCamera";
            var camera = _cameraGo.GetComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 5f;
            camera.transform.position = new Vector3(0f, 0f, -10f);

            _root = new GameObject("KawaGlint Caustics Test Root", typeof(KawaGlintBootstrap));
            yield return null;
            yield return null;

            _bootstrap = _root.GetComponent<KawaGlintBootstrap>();
            Assert.That(_bootstrap, Is.Not.Null);
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (_root != null)
            {
                UnityEngine.Object.Destroy(_root);
            }
            if (_cameraGo != null)
            {
                UnityEngine.Object.Destroy(_cameraGo);
            }
            var eventSystem = UnityEngine.Object.FindFirstObjectByType<EventSystem>();
            if (eventSystem != null)
            {
                UnityEngine.Object.Destroy(eventSystem.gameObject);
            }
            yield return null;

            _bootstrap = null;
            _root = null;
            _cameraGo = null;
        }

        [UnityTest]
        public IEnumerator CausticsSurface_ExistencePresenceMatchesIsEffectAvailable()
        {
            var caustics = _root.GetComponentInChildren<KawaCausticsSurface>(true);
            var available = _bootstrap.IsEffectAvailable(KawaGlintBootstrap.KawaEffect.Caustics);

            Assert.That(caustics != null, Is.EqualTo(available),
                "KawaCausticsSurface's presence in the scene must match IsEffectAvailable(Caustics).");

            // The rest of this suite requires the shader to actually be available on this
            // platform/build - if it isn't (e.g. a stripped test player), the graceful no-op
            // path is already proven above and there is nothing further to assert.
            if (caustics == null)
            {
                yield break;
            }

            yield return null;
        }

        [UnityTest]
        public IEnumerator CausticsSurface_UsesExpectedSortingOrderAndShader()
        {
            var caustics = _root.GetComponentInChildren<KawaCausticsSurface>(true);
            if (caustics == null)
            {
                Assert.Ignore("KawaCaustics shader unavailable on this platform; nothing to verify.");
                yield break;
            }

            var meshRenderer = caustics.GetComponent<MeshRenderer>();
            Assert.That(meshRenderer, Is.Not.Null);
            Assert.That(meshRenderer.sortingOrder, Is.EqualTo(ExpectedCausticsSortingOrder));
            Assert.That(meshRenderer.sharedMaterial, Is.Not.Null);
            Assert.That(meshRenderer.sharedMaterial.shader, Is.Not.Null);
            Assert.That(meshRenderer.sharedMaterial.shader.name, Is.EqualTo(ExpectedShaderName));

            yield return null;
        }

        [UnityTest]
        public IEnumerator SetEffectEnabled_Caustics_TogglesGameObjectActive()
        {
            var caustics = _root.GetComponentInChildren<KawaCausticsSurface>(true);
            if (caustics == null)
            {
                Assert.Ignore("KawaCaustics shader unavailable on this platform; nothing to verify.");
                yield break;
            }

            Assert.That(caustics.gameObject.activeSelf, Is.True, "The caustics surface should start active.");

            _bootstrap.SetEffectEnabled(KawaGlintBootstrap.KawaEffect.Caustics, false);
            Assert.That(caustics.gameObject.activeSelf, Is.False);

            _bootstrap.SetEffectEnabled(KawaGlintBootstrap.KawaEffect.Caustics, true);
            Assert.That(caustics.gameObject.activeSelf, Is.True);

            yield return null;
        }

        [UnityTest]
        public IEnumerator CausticsSurface_QuadTopEdge_AlignsWithWaterline()
        {
            var caustics = _root.GetComponentInChildren<KawaCausticsSurface>(true);
            if (caustics == null)
            {
                Assert.Ignore("KawaCaustics shader unavailable on this platform; nothing to verify.");
                yield break;
            }

            var meshFilter = caustics.GetComponent<MeshFilter>();
            Assert.That(meshFilter, Is.Not.Null);
            Assert.That(meshFilter.sharedMesh, Is.Not.Null);

            var localVertices = meshFilter.sharedMesh.vertices;
            Assert.That(localVertices, Is.Not.Empty);

            var maxWorldY = float.NegativeInfinity;
            foreach (var localVertex in localVertices)
            {
                var worldY = caustics.transform.TransformPoint(localVertex).y;
                if (worldY > maxWorldY)
                {
                    maxWorldY = worldY;
                }
            }

            Assert.That(maxWorldY, Is.EqualTo(KawaGlintStageBuilder.WaterlineWorldY).Within(WaterlineToleranceWorldUnits),
                "The caustics quad's top edge should be clamped to the stage's waterline, not the taller (5%-expanded) WaterWorldRect.");

            yield return null;
        }
    }
}
