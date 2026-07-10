using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using Pono.HideSeek.Core;
using Pono.HideSeekCreatures.Bootstrap;
using Pono.HideSeekCreatures.Gameplay;
using Pono.HideSeekCreatures.Input;
using Pono.HideSeekCreatures.UI;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Pono.HideSeek.Tests.PlayMode
{
    public sealed class HideSeekRuntimePlayModeTests
    {
        private const string GameSceneName = "10_HideSeekCreatures";
        private const string TutorialSeenPref = "pono_hide_seek_tutorial_seen";
        private const string SoundPref = "pono_hide_seek_sound";
        private const string ReduceMotionPref = "pono_hide_seek_reduce_motion";
        private const string StageCompletePref = "pono_hide_seek_km01_complete";

        private static readonly string[] PreferenceKeys =
        {
            TutorialSeenPref,
            SoundPref,
            ReduceMotionPref,
            StageCompletePref
        };

        private readonly Dictionary<string, PreferenceSnapshot> _savedPreferences =
            new Dictionary<string, PreferenceSnapshot>();

        private HideSeekGameController _controller;
        private int _savedTargetFrameRate;
        private int _savedVSyncCount;
        private int _savedSleepTimeout;

        [SetUp]
        public void SetUp()
        {
            _savedPreferences.Clear();
            foreach (var key in PreferenceKeys)
            {
                _savedPreferences.Add(
                    key,
                    new PreferenceSnapshot(PlayerPrefs.HasKey(key), PlayerPrefs.GetInt(key)));
            }

            _savedTargetFrameRate = Application.targetFrameRate;
            _savedVSyncCount = QualitySettings.vSyncCount;
            _savedSleepTimeout = Screen.sleepTimeout;

            PlayerPrefs.SetInt(TutorialSeenPref, 1);
            PlayerPrefs.SetInt(SoundPref, 0);
            PlayerPrefs.SetInt(ReduceMotionPref, 1);
            PlayerPrefs.DeleteKey(StageCompletePref);
            PlayerPrefs.Save();
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            var gameScene = SceneManager.GetSceneByName(GameSceneName);
            if (gameScene.IsValid() && gameScene.isLoaded)
            {
                foreach (var root in gameScene.GetRootGameObjects())
                {
                    UnityEngine.Object.Destroy(root);
                }
                yield return null;
            }

            foreach (var pair in _savedPreferences)
            {
                if (pair.Value.Existed)
                {
                    PlayerPrefs.SetInt(pair.Key, pair.Value.Value);
                }
                else
                {
                    PlayerPrefs.DeleteKey(pair.Key);
                }
            }
            PlayerPrefs.Save();

            Application.targetFrameRate = _savedTargetFrameRate;
            QualitySettings.vSyncCount = _savedVSyncCount;
            Screen.sleepTimeout = _savedSleepTimeout;
            _controller = null;
        }

        [UnityTest]
        public IEnumerator GameScene_BootstrapsRuntime_AndChildFacingCopyIsKanaFriendly()
        {
            PlayerPrefs.SetInt(TutorialSeenPref, 0);
            PlayerPrefs.Save();

            yield return LoadGameScene();

            Assert.That(_controller.GetComponent<HideSeekRuntimeBootstrap>(), Is.Not.Null);
            Assert.That(
                UnityEngine.Object.FindObjectsByType<HideSeekGameController>(FindObjectsSortMode.None),
                Has.Length.EqualTo(1));
            Assert.That(_controller.RevealMask, Is.Not.Null);
            Assert.That(_controller.FoundCount, Is.Zero);
            Assert.That(_controller.GetComponentsInChildren<CreatureView>(true), Has.Length.EqualTo(3));
            Assert.That(_controller.GetComponentInChildren<InkInputSurface>(true), Is.Not.Null);
            Assert.That(_controller.GetComponentInChildren<Canvas>(true), Is.Not.Null);
            Assert.That(EventSystem.current, Is.Not.Null);
            Assert.That(Application.targetFrameRate, Is.EqualTo(60));
            Assert.That(QualitySettings.vSyncCount, Is.Zero);
            Assert.That(
                _controller.InkBackendLabel.StartsWith("CPU ", StringComparison.Ordinal)
                || _controller.InkBackendLabel.StartsWith("GPU ", StringComparison.Ordinal),
                Is.True,
                $"Unexpected ink backend label: {_controller.InkBackendLabel}");

            var tutorialInstruction = FindText("Tutorial Instruction");
            yield return WaitUntilOrFail(
                () => tutorialInstruction.text == "インクを ゆびで ながしてみよう",
                3f,
                "The first-run tutorial copy was not populated.");

            foreach (var text in _controller.GetComponentsInChildren<Text>(true))
            {
                var validation = ChildFacingTextValidator.ValidateKanaFriendly(
                    text.text,
                    allowEmpty: true);
                Assert.That(
                    validation.IsValid,
                    Is.True,
                    $"{text.name} contains non-kana child-facing copy: '{text.text}' "
                    + $"({validation.Issue}, U+{validation.InvalidCodePoint:X}).");
            }

            foreach (var accessibleLabel in _controller.GetComponentsInChildren<AccessibleLabel>(true))
            {
                Assert.That(accessibleLabel.Label, Is.Not.Empty, accessibleLabel.name);
                Assert.That(
                    ChildFacingTextValidator.IsKanaFriendly(accessibleLabel.Label),
                    Is.True,
                    $"{accessibleLabel.name} has an invalid accessible label: '{accessibleLabel.Label}'.");
            }

            Assert.That(HideSeekStageCatalog.StageName, Is.EqualTo("こもれびの もり"));
            foreach (var creature in HideSeekStageCatalog.Creatures)
            {
                Assert.That(
                    ChildFacingTextValidator.IsKanaFriendly(creature.DisplayName),
                    Is.True,
                    creature.Id);
                Assert.That(
                    ChildFacingTextValidator.IsKanaFriendly($"{creature.DisplayName}が みつかったよ"),
                    Is.True,
                    creature.Id);
            }

            var allCopy = _controller.GetComponentsInChildren<Text>(true)
                .Select(text => text.text)
                .ToArray();
            CollectionAssert.Contains(allCopy, "こもれびの もり");
            CollectionAssert.Contains(allCopy, "みんな みつけた！");
            CollectionAssert.Contains(allCopy, "もういちど");
            CollectionAssert.Contains(allCopy, "あそびを おわる？");
            CollectionAssert.Contains(allCopy, "まだ あそぶ");
        }

        [UnityTest]
        public IEnumerator ThreeCreatures_CanCompleteInNonCatalogOrder_AndFoundIsTerminal()
        {
            yield return LoadGameScene();
            _controller.RestartGame();
            yield return null;

            Assert.That(_controller.State, Is.EqualTo(HideSeekStageState.Exploring));

            var definitions = StageDiscoveryFactory.CreateDefinitions()
                .ToDictionary(definition => definition.Id);
            var views = _controller.GetComponentsInChildren<CreatureView>(true)
                .ToDictionary(view => view.Id);
            var nonCatalogOrder = new[] { "fawn", "hedgehog", "rabbit" };
            CreatureView firstFound = null;

            for (var index = 0; index < nonCatalogOrder.Length; index++)
            {
                var id = nonCatalogOrder[index];
                RevealDefinition(_controller.RevealMask, definitions[id]);

                yield return WaitUntilOrFail(
                    () => _controller.FoundCount >= index + 1,
                    2f,
                    $"The discovery model did not count {id}.");
                yield return WaitUntilOrFail(
                    () => views[id].IsFound,
                    4f,
                    $"The runtime view never entered Found for {id}.");
                Assert.That(views[id].transform.parent.name, Is.EqualTo("Found Creatures"));

                var banner = FindText("Found Banner");
                Assert.That(banner.gameObject.activeSelf, Is.True);
                Assert.That(banner.text, Is.EqualTo($"{views[id].DisplayName}が みつかったよ"));

                if (index == 0)
                {
                    firstFound = views[id];
                }
                Assert.That(firstFound.IsFound, Is.True, "Found must remain terminal.");

                if (index < nonCatalogOrder.Length - 1)
                {
                    yield return WaitUntilOrFail(
                        () => _controller.State == HideSeekStageState.Exploring,
                        4f,
                        $"The stage did not return to Exploring after {id}.");
                    Assert.That(firstFound.IsFound, Is.True, "Found was lost after the reveal animation.");
                }
            }

            yield return WaitUntilOrFail(
                () => _controller.State == HideSeekStageState.Complete,
                7f,
                "The stage did not enter Complete after all three creatures were found.");

            Assert.That(_controller.FoundCount, Is.EqualTo(3));
            Assert.That(views.Values.All(view => view.IsFound), Is.True);
            Assert.That(firstFound.IsFound, Is.True, "The first creature lost its terminal Found state.");
            Assert.That(FindObject("Complete Panel").activeSelf, Is.True);
            Assert.That(FindText("Complete Title").text, Is.EqualTo("みんな みつけた！"));
            Assert.That(PlayerPrefs.GetInt(StageCompletePref, 0), Is.EqualTo(1));
        }

        [UnityTest]
        public IEnumerator RestartGame_WhileFoundRevealIsRunning_ResetsTheWholeSession()
        {
            yield return LoadGameScene();
            _controller.RestartGame();
            yield return null;

            var rabbitDefinition = StageDiscoveryFactory.CreateDefinitions()
                .Single(definition => definition.Id == "rabbit");
            var rabbitView = _controller.GetComponentsInChildren<CreatureView>(true)
                .Single(view => view.Id == "rabbit");
            var previousMask = _controller.RevealMask;

            RevealDefinition(previousMask, rabbitDefinition);
            yield return WaitUntilOrFail(
                () => rabbitView.IsFound,
                4f,
                "Rabbit never entered Found before retry.");

            Assert.That(_controller.State, Is.EqualTo(HideSeekStageState.FoundReveal));
            Assert.That(_controller.FoundCount, Is.EqualTo(1));

            _controller.RestartGame();
            yield return null;

            Assert.That(_controller.State, Is.EqualTo(HideSeekStageState.Exploring));
            Assert.That(_controller.FoundCount, Is.Zero);
            Assert.That(_controller.RevealMask, Is.Not.SameAs(previousMask));
            Assert.That(
                _controller.GetComponentsInChildren<CreatureView>(true).All(view => !view.IsFound),
                Is.True);
            Assert.That(
                _controller.GetComponentsInChildren<CreatureView>(true)
                    .All(view => view.transform.parent.name == "Creatures"),
                Is.True);
            Assert.That(FindText("Found Banner").gameObject.activeSelf, Is.False);
            Assert.That(FindObject("Complete Panel").activeSelf, Is.False);
            Assert.That(_controller.GetComponentInChildren<InkInputSurface>(true).InputEnabled, Is.True);

            var revealValues = new byte[RevealMaskModel.CellCount];
            _controller.RevealMask.CopyValuesTo(revealValues);
            Assert.That(
                revealValues.Max(),
                Is.LessThan(RevealMaskModel.DefaultRevealThreshold),
                "Retry retained a discoverable reveal from the previous session.");
        }

        private IEnumerator LoadGameScene()
        {
            var operation = SceneManager.LoadSceneAsync(GameSceneName, LoadSceneMode.Single);
            Assert.That(operation, Is.Not.Null, $"Scene '{GameSceneName}' is missing from build settings.");
            while (!operation.isDone)
            {
                yield return null;
            }
            yield return null;

            var controllers = UnityEngine.Object.FindObjectsByType<HideSeekGameController>(
                FindObjectsSortMode.None);
            Assert.That(controllers, Has.Length.EqualTo(1));
            _controller = controllers[0];
        }

        private Text FindText(string objectName)
        {
            return _controller.GetComponentsInChildren<Text>(true)
                .Single(text => text.name == objectName);
        }

        private GameObject FindObject(string objectName)
        {
            return _controller.GetComponentsInChildren<Transform>(true)
                .Single(transform => transform.name == objectName)
                .gameObject;
        }

        private static void RevealDefinition(
            RevealMaskModel mask,
            CreatureDiscoveryDefinition definition)
        {
            var rows = new Dictionary<int, RowExtent>();
            foreach (var cellIndex in definition.RequiredCells)
            {
                var x = RevealMaskModel.GetCellX(cellIndex);
                var y = RevealMaskModel.GetCellY(cellIndex);
                if (rows.TryGetValue(y, out var extent))
                {
                    rows[y] = new RowExtent(Math.Min(extent.MinX, x), Math.Max(extent.MaxX, x));
                }
                else
                {
                    rows.Add(y, new RowExtent(x, x));
                }
            }

            var brush = new RevealBrush(0, 255);
            foreach (var row in rows)
            {
                var normalizedY = row.Key / (float)(RevealMaskModel.Height - 1);
                mask.ApplyStroke(
                    new NormalizedPoint(
                        row.Value.MinX / (float)(RevealMaskModel.Width - 1),
                        normalizedY),
                    new NormalizedPoint(
                        row.Value.MaxX / (float)(RevealMaskModel.Width - 1),
                        normalizedY),
                    brush);
            }
        }

        private static IEnumerator WaitUntilOrFail(
            Func<bool> condition,
            float timeoutSeconds,
            string failureMessage)
        {
            var deadline = Time.realtimeSinceStartup + timeoutSeconds;
            while (!condition() && Time.realtimeSinceStartup < deadline)
            {
                yield return null;
            }
            Assert.That(condition(), Is.True, failureMessage);
        }

        private readonly struct RowExtent
        {
            public RowExtent(int minX, int maxX)
            {
                MinX = minX;
                MaxX = maxX;
            }

            public int MinX { get; }
            public int MaxX { get; }
        }

        private readonly struct PreferenceSnapshot
        {
            public PreferenceSnapshot(bool existed, int value)
            {
                Existed = existed;
                Value = value;
            }

            public bool Existed { get; }
            public int Value { get; }
        }
    }
}
