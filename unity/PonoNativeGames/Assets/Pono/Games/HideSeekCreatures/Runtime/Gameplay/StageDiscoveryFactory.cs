using System;
using System.Collections.Generic;
using Pono.HideSeek.Core;
using UnityEngine;

namespace Pono.HideSeekCreatures.Gameplay
{
    public static class StageDiscoveryFactory
    {
        public static CreatureDiscoveryDefinition[] CreateDefinitions()
        {
            return new[]
            {
                Create(
                    "rabbit",
                    new Vector2(0.24f, 0.35f), new Vector2(0.19f, 0.36f),
                    new Vector2(0.24f, 0.43f), new Vector2(0.14f, 0.16f),
                    new Vector2(0.24f, 0.31f), new Vector2(0.16f, 0.19f),
                    new Vector2(0.24f, 0.50f), new Vector2(0.11f, 0.15f),
                    requiredCoverage: 0.50f),
                Create(
                    "fawn",
                    new Vector2(0.50f, 0.45f), new Vector2(0.24f, 0.50f),
                    new Vector2(0.49f, 0.62f), new Vector2(0.14f, 0.14f),
                    new Vector2(0.51f, 0.47f), new Vector2(0.19f, 0.22f),
                    new Vector2(0.52f, 0.50f), new Vector2(0.14f, 0.13f),
                    requiredCoverage: 0.52f),
                Create(
                    "hedgehog",
                    new Vector2(0.78f, 0.25f), new Vector2(0.20f, 0.22f),
                    new Vector2(0.83f, 0.27f), new Vector2(0.08f, 0.10f),
                    new Vector2(0.76f, 0.24f), new Vector2(0.14f, 0.15f),
                    new Vector2(0.73f, 0.28f), new Vector2(0.10f, 0.12f),
                    requiredCoverage: 0.48f)
            };
        }

        private static CreatureDiscoveryDefinition Create(
            string id,
            Vector2 requiredCenter,
            Vector2 requiredSize,
            Vector2 faceCenter,
            Vector2 faceSize,
            Vector2 bodyCenter,
            Vector2 bodySize,
            Vector2 featureCenter,
            Vector2 featureSize,
            float requiredCoverage)
        {
            var required = EllipseCells(requiredCenter, requiredSize);
            var face = EllipseCells(faceCenter, faceSize);
            var body = EllipseCells(bodyCenter, bodySize);
            var feature = EllipseCells(featureCenter, featureSize);
            required.UnionWith(face);
            required.UnionWith(body);
            required.UnionWith(feature);
            var rules = new CreatureDiscoveryRules(
                requiredCoverage,
                anchorCoverageRatio: 0.42f,
                minimumAnchorRegions: 2,
                holdSeconds: 0.4f);
            return new CreatureDiscoveryDefinition(id, required, face, body, feature, rules);
        }

        private static HashSet<int> EllipseCells(Vector2 center, Vector2 size)
        {
            var cells = new HashSet<int>();
            var radiusX = Mathf.Max(size.x * 0.5f, 0.002f);
            var radiusY = Mathf.Max(size.y * 0.5f, 0.002f);
            var minX = Mathf.Max(0, Mathf.FloorToInt((center.x - radiusX) * (RevealMaskModel.Width - 1)));
            var maxX = Mathf.Min(RevealMaskModel.Width - 1, Mathf.CeilToInt((center.x + radiusX) * (RevealMaskModel.Width - 1)));
            var minY = Mathf.Max(0, Mathf.FloorToInt((center.y - radiusY) * (RevealMaskModel.Height - 1)));
            var maxY = Mathf.Min(RevealMaskModel.Height - 1, Mathf.CeilToInt((center.y + radiusY) * (RevealMaskModel.Height - 1)));

            for (var y = minY; y <= maxY; y++)
            {
                var uvY = y / (float)(RevealMaskModel.Height - 1);
                for (var x = minX; x <= maxX; x++)
                {
                    var uvX = x / (float)(RevealMaskModel.Width - 1);
                    var dx = (uvX - center.x) / radiusX;
                    var dy = (uvY - center.y) / radiusY;
                    if (dx * dx + dy * dy <= 1f)
                    {
                        cells.Add(RevealMaskModel.GetCellIndex(x, y));
                    }
                }
            }

            if (cells.Count == 0)
            {
                throw new InvalidOperationException($"Discovery region is empty at {center}.");
            }
            return cells;
        }
    }
}
