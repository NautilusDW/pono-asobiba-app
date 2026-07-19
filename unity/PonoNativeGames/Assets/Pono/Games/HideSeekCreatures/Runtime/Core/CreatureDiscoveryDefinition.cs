using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Pono.HideSeek.Core
{
    /// <summary>
    /// Immutable reveal regions for one creature. Anchor regions must be contained
    /// by RequiredCells; overlap between anchor regions is allowed.
    /// </summary>
    public sealed class CreatureDiscoveryDefinition
    {
        public CreatureDiscoveryDefinition(
            string id,
            IEnumerable<int> requiredCells,
            IEnumerable<int> faceCells,
            IEnumerable<int> bodyCells,
            IEnumerable<int> featureCells,
            CreatureDiscoveryRules rules)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                throw new ArgumentException("Creature id must not be empty.", nameof(id));
            }

            Id = id.Trim();
            if (rules.MinimumAnchorRegions < 1 || rules.MinimumAnchorRegions > 3)
            {
                throw new ArgumentException(
                    "Rules must be created with the CreatureDiscoveryRules constructor.",
                    nameof(rules));
            }

            var required = CopyAndValidate(requiredCells, nameof(requiredCells));
            var face = CopyAndValidate(faceCells, nameof(faceCells));
            var body = CopyAndValidate(bodyCells, nameof(bodyCells));
            var feature = CopyAndValidate(featureCells, nameof(featureCells));

            EnsureSubset(face, required, nameof(faceCells));
            EnsureSubset(body, required, nameof(bodyCells));
            EnsureSubset(feature, required, nameof(featureCells));

            RequiredCells = new ReadOnlyCollection<int>(required);
            FaceCells = new ReadOnlyCollection<int>(face);
            BodyCells = new ReadOnlyCollection<int>(body);
            FeatureCells = new ReadOnlyCollection<int>(feature);
            Rules = rules;
        }

        public string Id { get; }

        public IReadOnlyList<int> RequiredCells { get; }

        public IReadOnlyList<int> FaceCells { get; }

        public IReadOnlyList<int> BodyCells { get; }

        public IReadOnlyList<int> FeatureCells { get; }

        public CreatureDiscoveryRules Rules { get; }

        private static int[] CopyAndValidate(IEnumerable<int> source, string parameterName)
        {
            if (source == null)
            {
                throw new ArgumentNullException(parameterName);
            }

            var values = new List<int>();
            var uniqueValues = new HashSet<int>();

            foreach (var cellIndex in source)
            {
                if (cellIndex < 0 || cellIndex >= RevealMaskModel.CellCount)
                {
                    throw new ArgumentOutOfRangeException(parameterName);
                }

                if (!uniqueValues.Add(cellIndex))
                {
                    throw new ArgumentException("A region must not contain duplicate cells.", parameterName);
                }

                values.Add(cellIndex);
            }

            if (values.Count == 0)
            {
                throw new ArgumentException("A region must contain at least one cell.", parameterName);
            }

            var result = values.ToArray();
            Array.Sort(result);
            return result;
        }

        private static void EnsureSubset(int[] candidate, int[] required, string parameterName)
        {
            var requiredSet = new HashSet<int>(required);
            for (var index = 0; index < candidate.Length; index++)
            {
                if (!requiredSet.Contains(candidate[index]))
                {
                    throw new ArgumentException(
                        "Every anchor cell must also be part of the required region.",
                        parameterName);
                }
            }
        }
    }
}
