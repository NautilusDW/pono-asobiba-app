using System;
using UnityEngine;

namespace Pono.HideSeekCreatures.Rendering
{
    public readonly struct InkSplat
    {
        public readonly Vector2 Uv;
        public readonly Vector2 Velocity;
        public readonly Color Color;
        public readonly float Radius;

        public InkSplat(Vector2 uv, Vector2 velocity, Color color, float radius)
        {
            Uv = new Vector2(Mathf.Clamp01(uv.x), Mathf.Clamp01(uv.y));
            Velocity = Vector2.ClampMagnitude(velocity, 3f);
            Color = color;
            Radius = Mathf.Clamp(radius, 0.012f, 0.2f);
        }
    }

    public interface IInkVisualBackend : IDisposable
    {
        Texture OutputTexture { get; }
        Texture VelocityTexture { get; }
        string Label { get; }
        bool IsReady { get; }
        void Inject(in InkSplat splat);
        void Tick(float unscaledDeltaTime);
        void Reset();
    }
}
