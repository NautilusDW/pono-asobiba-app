using System.Collections;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Pono.FluidMarbleLab.Tests
{
    public sealed class FluidMarbleLabPlayModeTests
    {
        private static readonly Regex Kanji = new Regex("[\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF]", RegexOptions.Compiled);
        private FluidMarbleLabBootstrap bootstrap;

        [UnitySetUp]
        public IEnumerator LoadLab()
        {
            SceneManager.LoadScene("FluidMarbleLab", LoadSceneMode.Single);
            yield return null;
            yield return null;
            bootstrap = Object.FindFirstObjectByType<FluidMarbleLabBootstrap>();
            Assert.That(bootstrap, Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator BootstrapCreatesPlayableLab()
        {
            Assert.That(bootstrap.Simulation.CpuField, Is.Not.Null);
            Assert.That(bootstrap.TrackEditor.Pieces.Count, Is.EqualTo(5));
            Assert.That(bootstrap.MarbleSpawner.Marbles.Count, Is.EqualTo(6));
            Assert.That(Object.FindObjectsByType<AudioSource>(FindObjectsSortMode.None), Is.Empty);
            yield return null;
        }

        [UnityTest]
        public IEnumerator BuildModeStopsAndFlowModeRestartsMarbles()
        {
            var body = bootstrap.MarbleSpawner.Marbles[0].Body;
            bootstrap.ModeController.SetMode(LabMode.Build);
            yield return null;
            Assert.That(body.simulated, Is.False);

            bootstrap.ModeController.SetMode(LabMode.Flow);
            yield return null;
            Assert.That(body.simulated, Is.True);
        }

        [UnityTest]
        public IEnumerator GoalAndMarblesStartOutsideHudInsets()
        {
            var gameplay = bootstrap.Viewport.GameplayRect;
            var goalCollider = bootstrap.Goal.GetComponent<CircleCollider2D>();
            var goalPosition = (Vector2)bootstrap.Goal.transform.position;
            Assert.That(goalPosition.y - goalCollider.radius, Is.GreaterThanOrEqualTo(gameplay.yMin));

            foreach (var marble in bootstrap.MarbleSpawner.Marbles)
            {
                Assert.That(gameplay.Contains(marble.Body.position), Is.True);
            }
            yield return null;
        }

        [UnityTest]
        public IEnumerator ActualVisibleCopyUsesBundledJapaneseFontAndNoKanji()
        {
            var labels = Object.FindObjectsByType<Text>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            Assert.That(labels.Length, Is.GreaterThan(0));
            foreach (var label in labels)
            {
                Assert.That(Kanji.IsMatch(label.text), Is.False, label.text);
                Assert.That(label.font, Is.Not.Null, label.text);
                foreach (var character in label.text)
                {
                    if (character <= 0x7f || char.IsWhiteSpace(character))
                    {
                        continue;
                    }
                    Assert.That(label.font.HasCharacter(character), Is.True, $"{label.text}: {character}");
                }
            }
            yield return null;
        }
    }
}
