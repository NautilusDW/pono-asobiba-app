using UnityEngine;

namespace Pono.HideSeekCreatures.Gameplay
{
    public readonly struct CreatureVisualSpec
    {
        public readonly string Id;
        public readonly string DisplayName;
        public readonly string ResourcePath;
        public readonly Vector2 CenterUv;
        public readonly Vector2 SizeUv;
        public readonly Vector2 HintUv;
        public readonly Color InkColor;

        public CreatureVisualSpec(
            string id,
            string displayName,
            string resourcePath,
            Vector2 centerUv,
            Vector2 sizeUv,
            Vector2 hintUv,
            Color inkColor)
        {
            Id = id;
            DisplayName = displayName;
            ResourcePath = resourcePath;
            CenterUv = centerUv;
            SizeUv = sizeUv;
            HintUv = hintUv;
            InkColor = inkColor;
        }

        public Rect NormalizedRect => new Rect(CenterUv - SizeUv * 0.5f, SizeUv);
    }

    public static class HideSeekStageCatalog
    {
        public const string StageId = "km01_sunlit_forest";
        public const string StageName = "こもれびの もり";

        public static readonly CreatureVisualSpec[] Creatures =
        {
            new CreatureVisualSpec(
                "rabbit",
                "ウサギ",
                "HideSeekCreatures/km01/rabbit",
                new Vector2(0.24f, 0.35f),
                new Vector2(0.19f, 0.36f),
                new Vector2(0.24f, 0.49f),
                new Color(0.18f, 0.86f, 0.70f, 1f)),
            new CreatureVisualSpec(
                "fawn",
                "こじか",
                "HideSeekCreatures/km01/fawn",
                new Vector2(0.50f, 0.45f),
                new Vector2(0.24f, 0.50f),
                new Vector2(0.49f, 0.64f),
                new Color(0.27f, 0.56f, 0.96f, 1f)),
            new CreatureVisualSpec(
                "hedgehog",
                "ハリネズミ",
                "HideSeekCreatures/km01/hedgehog",
                new Vector2(0.78f, 0.25f),
                new Vector2(0.20f, 0.22f),
                new Vector2(0.82f, 0.28f),
                new Color(0.98f, 0.52f, 0.20f, 1f))
        };
    }
}
