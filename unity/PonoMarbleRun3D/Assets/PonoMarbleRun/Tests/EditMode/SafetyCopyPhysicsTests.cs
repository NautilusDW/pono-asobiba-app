using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using NUnit.Framework;
using Pono.MarbleRun3D.Core;
using Pono.MarbleRun3D.Gameplay;
using UnityEditor;
using UnityEngine;

namespace Pono.MarbleRun3D.Tests.EditMode
{
    public sealed class SafetyCopyPhysicsTests
    {
        [Test]
        public void StallRequiresSustainedLowMotionAndRaisesOnce()
        {
            var model = new MarbleSafetyModel { StallDelay = 1f };
            Assert.That(model.Tick(Vector3.zero, Vector3.one, Vector3.zero, 0.8f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(Vector3.zero, Vector3.zero, Vector3.zero, 0.6f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(Vector3.zero, Vector3.zero, Vector3.zero, 0.5f), Is.EqualTo(MarbleSafetyEvent.Stalled));
            Assert.That(model.Tick(Vector3.zero, Vector3.zero, Vector3.zero, 1f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(Vector3.zero, Vector3.one, Vector3.zero, 0.1f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(Vector3.zero, Vector3.zero, Vector3.zero, 1.1f), Is.EqualTo(MarbleSafetyEvent.Stalled));
        }

        [Test]
        public void OutOfBoundsWinsImmediately()
        {
            var model = new MarbleSafetyModel();
            Assert.That(model.Tick(new Vector3(0f, -3f, 0f), Vector3.zero, Vector3.zero, 0.01f),
                Is.EqualTo(MarbleSafetyEvent.OutOfBounds));
            Assert.That(model.Tick(new Vector3(80f, 1f, 0f), Vector3.zero, Vector3.zero, 0.01f),
                Is.EqualTo(MarbleSafetyEvent.OutOfBounds));
        }

        [Test]
        public void KanaValidatorAcceptsUiCopyAndRejectsKanjiLatinAndIterationMark()
        {
            var labels = new List<string>(MarbleRunCopy.All);
            foreach (var part in PartCatalog.All) labels.Add(part.DisplayName);
            labels.Add(ChallengeCatalog.Tutorial.DisplayName);
            labels.Add(ChallengeCatalog.Tutorial.GuideText);
            labels.Add(ChallengeCatalog.Sandbox.DisplayName);
            labels.Add(ChallengeCatalog.Sandbox.GuideText);
            foreach (var challenge in ChallengeCatalog.Challenges)
            {
                labels.Add(challenge.DisplayName);
                labels.Add(challenge.GuideText);
            }
            foreach (var label in labels)
            {
                Assert.That(ChildFacingTextValidator.IsKanaSafe(label, out var invalid), Is.True,
                    label + " invalid=" + invalid);
            }
            Assert.That(ChildFacingTextValidator.IsKanaSafe("保存", out _), Is.False);
            Assert.That(ChildFacingTextValidator.IsKanaSafe("SAVE", out _), Is.False);
            Assert.That(ChildFacingTextValidator.IsKanaSafe("いろ々", out _), Is.False);
        }

        [Test]
        public void EveryJapaneseRuntimeStringLiteralIsKanaSafe()
        {
            var stringLiteral = new Regex("\"((?:\\\\.|[^\"\\\\])*)\"");
            var hasJapanese = new Regex("[ぁ-んァ-ヶ一-龯]");
            var scripts = AssetDatabase.FindAssets("t:MonoScript", new[] { "Assets/PonoMarbleRun/Runtime" });
            foreach (var guid in scripts)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var source = File.ReadAllText(path);
                foreach (Match match in stringLiteral.Matches(source))
                {
                    var value = Regex.Unescape(match.Groups[1].Value);
                    if (!hasJapanese.IsMatch(value)) continue;
                    Assert.That(ChildFacingTextValidator.IsKanaSafe(value, out var invalid), Is.True,
                        path + " value=" + value + " invalid=" + invalid);
                }
            }
        }

        [Test]
        public void PhysicsProfileIsExplicitAndMobileReasonable()
        {
            Assert.That(MarbleRunPhysicsProfile.FixedTimestep, Is.EqualTo(1f / 60f).Within(0.000001f));
            Assert.That(MarbleRunPhysicsProfile.MaximumTimestep, Is.LessThanOrEqualTo(1f / 15f + 0.00001f));
            Assert.That(MarbleRunPhysicsProfile.SolverIterations, Is.GreaterThanOrEqualTo(8));
            Assert.That(MarbleRunPhysicsProfile.SolverVelocityIterations, Is.GreaterThanOrEqualTo(3));
            Assert.That(MarbleRunPhysicsProfile.MarbleMaximumSpeed, Is.InRange(10f, 18f));
            Assert.That(MarbleRunPhysicsProfile.MarbleBounciness, Is.LessThan(0.1f));
            Assert.That(MarbleRunPhysicsProfile.SlopeDegrees, Is.InRange(15f, 20f));
            Assert.That(
                Mathf.Tan(MarbleRunPhysicsProfile.SlopeDegrees * Mathf.Deg2Rad) * WoodenPieceFactory.CellSize,
                Is.EqualTo(WoodenPieceFactory.LevelHeight).Within(0.01f));
        }
    }
}
