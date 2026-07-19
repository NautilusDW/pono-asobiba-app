using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pono.ColorWaterDelivery.Rendering
{
    /// <summary>
    /// Independent two-pigment fluid API used by the delivery game. Blue and
    /// yellow are transported separately and become green only where they mix.
    /// </summary>
    public interface IColorWaterFluidBackend : IDisposable
    {
        Texture PigmentTexture { get; }
        Texture VelocityTexture { get; }
        Texture ObstacleTexture { get; }
        string Label { get; }
        bool IsGpu { get; }
        bool IsReady { get; }
        bool GoalMetricReadbackPending { get; }
        GoalFluidMetrics LatestGoalMetrics { get; }

        /// <param name="uv">Normalized simulation position.</param>
        /// <param name="velocityUvPerSecond">Source velocity in normalized UV units per second.</param>
        /// <param name="radius">Radius relative to simulation height.</param>
        /// <param name="amount">Pigment deposited by this splat.</param>
        void InjectSource(
            ColorWaterSource source,
            Vector2 uv,
            Vector2 velocityUvPerSecond,
            float radius,
            float amount = 1f);

        void SetObstacles(IReadOnlyList<FluidObstacle> obstacles);
        void SetGoal(in FluidGoalRegion goal);
        void Tick(float unscaledDeltaTime);

        /// <summary>
        /// Starts a non-blocking GPU readback, or immediately samples the CPU
        /// fallback. Returns false while a previous GPU request is still pending.
        /// </summary>
        bool RequestGoalMetrics(Action<GoalFluidMetrics> completed = null);

        /// <summary>Clears fluid and metrics while preserving obstacles and goal.</summary>
        void Reset();
    }
}
