using System;
using UnityEngine;

namespace Pono.ColorWaterDelivery.Rendering
{
    public enum ColorWaterSource
    {
        Blue = 0,
        Yellow = 1
    }

    public enum FluidGoalShape
    {
        Circle = 0,
        Box = 1
    }

    /// <summary>
    /// A circular or capsule-shaped solid in normalized simulation coordinates.
    /// Radius is measured relative to the simulation height, so circles stay round.
    /// A leaf gate is represented by a capsule whose endpoints rotate with the leaf.
    /// </summary>
    public readonly struct FluidObstacle
    {
        private FluidObstacle(Vector2 start, Vector2 end, float radius, float solidity)
        {
            Start = ClampUv(start);
            End = ClampUv(end);
            Radius = Mathf.Clamp(radius, 0.002f, 0.3f);
            Solidity = Mathf.Clamp01(solidity);
        }

        public Vector2 Start { get; }
        public Vector2 End { get; }
        public float Radius { get; }
        public float Solidity { get; }

        public static FluidObstacle Circle(Vector2 center, float radius, float solidity = 1f)
        {
            return new FluidObstacle(center, center, radius, solidity);
        }

        public static FluidObstacle Capsule(
            Vector2 start,
            Vector2 end,
            float radius,
            float solidity = 1f)
        {
            return new FluidObstacle(start, end, radius, solidity);
        }

        public static FluidObstacle LeafGate(
            Vector2 center,
            float length,
            float radius,
            float angleDegrees,
            float permeability = 0f)
        {
            var radians = angleDegrees * Mathf.Deg2Rad;
            // The simulation is fixed to 16:9. Convert a physical direction
            // back to UV so gate length does not stretch when it points sideways.
            var direction = new Vector2(
                Mathf.Cos(radians) / (16f / 9f),
                Mathf.Sin(radians));
            var halfOffset = direction * (Mathf.Clamp(length, 0.01f, 0.8f) * 0.5f);
            return new FluidObstacle(
                center - halfOffset,
                center + halfOffset,
                radius,
                1f - Mathf.Clamp01(permeability));
        }

        private static Vector2 ClampUv(Vector2 uv)
        {
            return new Vector2(Mathf.Clamp01(uv.x), Mathf.Clamp01(uv.y));
        }
    }

    /// <summary>
    /// Region sampled by the tiny goal-metrics buffer. Circle radius is measured
    /// relative to screen height; box extents are normalized UV extents.
    /// </summary>
    public readonly struct FluidGoalRegion
    {
        private FluidGoalRegion(
            FluidGoalShape shape,
            Vector2 center,
            Vector2 size)
        {
            Shape = shape;
            Center = new Vector2(Mathf.Clamp01(center.x), Mathf.Clamp01(center.y));
            Size = new Vector2(
                Mathf.Clamp(size.x, 0.005f, 0.5f),
                Mathf.Clamp(size.y, 0.005f, 0.5f));
        }

        public FluidGoalShape Shape { get; }
        public Vector2 Center { get; }
        public Vector2 Size { get; }

        public static FluidGoalRegion Circle(Vector2 center, float radius)
        {
            var clampedRadius = Mathf.Clamp(radius, 0.005f, 0.5f);
            return new FluidGoalRegion(
                FluidGoalShape.Circle,
                center,
                new Vector2(clampedRadius, clampedRadius));
        }

        public static FluidGoalRegion Box(Vector2 center, Vector2 halfExtents)
        {
            return new FluidGoalRegion(FluidGoalShape.Box, center, halfExtents);
        }

        public bool Contains(Vector2 uv, float aspect)
        {
            var offset = uv - Center;
            if (Shape == FluidGoalShape.Circle)
            {
                offset.x *= Mathf.Max(0.001f, aspect);
                return offset.sqrMagnitude <= Size.x * Size.x;
            }

            return Mathf.Abs(offset.x) <= Size.x && Mathf.Abs(offset.y) <= Size.y;
        }
    }

    /// <summary>
    /// Pigment volume absorbed since the previous metrics request, normalized by
    /// goal area, plus balanced-green coverage during that interval. Green is
    /// 2 * min(blue, yellow). The sink removes measured water, so a pooled sample
    /// cannot be counted again as if it were a new delivery.
    /// </summary>
    public readonly struct GoalFluidMetrics
    {
        public GoalFluidMetrics(
            float blue,
            float yellow,
            float green,
            float greenCoverage,
            int sampleCount,
            uint sequence,
            bool isValid)
        {
            Blue = Mathf.Clamp01(blue);
            Yellow = Mathf.Clamp01(yellow);
            Green = Mathf.Clamp01(green);
            GreenCoverage = Mathf.Clamp01(greenCoverage);
            SampleCount = Mathf.Max(0, sampleCount);
            Sequence = sequence;
            IsValid = isValid;
        }

        public float Blue { get; }
        public float Yellow { get; }
        public float Green { get; }
        public float GreenCoverage { get; }
        public int SampleCount { get; }
        public uint Sequence { get; }
        public bool IsValid { get; }

        public bool MeetsGreenGoal(float minimumGreen, float minimumCoverage)
        {
            return IsValid
                && Green >= Mathf.Clamp01(minimumGreen)
                && GreenCoverage >= Mathf.Clamp01(minimumCoverage);
        }

        public static GoalFluidMetrics Invalid(uint sequence = 0)
        {
            return new GoalFluidMetrics(0f, 0f, 0f, 0f, 0, sequence, false);
        }
    }
}
