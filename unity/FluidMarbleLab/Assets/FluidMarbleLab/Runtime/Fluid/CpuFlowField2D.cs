using System;
using UnityEngine;

namespace Pono.FluidMarbleLab
{
    /// <summary>
    /// Small deterministic flow field used by gameplay physics and as the visual fallback.
    /// It intentionally never reads data back from the GPU solver.
    /// </summary>
    public sealed class CpuFlowField2D : IDisposable
    {
        private readonly int width;
        private readonly int height;
        private Vector2[] velocity;
        private Vector2[] nextVelocity;
        private Color[] dye;
        private Color[] nextDye;
        private Texture2D displayTexture;
        private bool textureDirty;

        public int Width => width;
        public int Height => height;
        public Texture2D DisplayTexture => GetDisplayTexture();

        public CpuFlowField2D(int width = 48, int height = 27)
        {
            this.width = Mathf.Max(8, width);
            this.height = Mathf.Max(8, height);
            var count = this.width * this.height;
            velocity = new Vector2[count];
            nextVelocity = new Vector2[count];
            dye = new Color[count];
            nextDye = new Color[count];
            textureDirty = true;
        }

        public void Clear()
        {
            Array.Clear(velocity, 0, velocity.Length);
            Array.Clear(nextVelocity, 0, nextVelocity.Length);
            Array.Clear(dye, 0, dye.Length);
            Array.Clear(nextDye, 0, nextDye.Length);
            textureDirty = true;
        }

        public void Inject(Vector2 uv, Vector2 force, Color color, float radius)
        {
            uv.x = Mathf.Clamp01(uv.x);
            uv.y = Mathf.Clamp01(uv.y);
            radius = Mathf.Clamp(radius, 0.01f, 0.35f);
            force = Vector2.ClampMagnitude(force, 3.5f);

            var centerX = uv.x * (width - 1);
            var centerY = uv.y * (height - 1);
            var radiusX = Mathf.Max(1, Mathf.CeilToInt(radius * height));
            var radiusY = Mathf.Max(1, Mathf.CeilToInt(radius * height));
            var minX = Mathf.Max(0, Mathf.FloorToInt(centerX) - radiusX);
            var maxX = Mathf.Min(width - 1, Mathf.CeilToInt(centerX) + radiusX);
            var minY = Mathf.Max(0, Mathf.FloorToInt(centerY) - radiusY);
            var maxY = Mathf.Min(height - 1, Mathf.CeilToInt(centerY) + radiusY);
            var inverseRadiusSquared = 1f / Mathf.Max(radius * radius, 0.0001f);

            for (var y = minY; y <= maxY; y++)
            {
                for (var x = minX; x <= maxX; x++)
                {
                    var cellUv = new Vector2(
                        x / (float)(width - 1),
                        y / (float)(height - 1));
                    var offset = cellUv - uv;
                    offset.x *= width / (float)height;
                    var distanceSquared = offset.sqrMagnitude;
                    if (distanceSquared > radius * radius)
                    {
                        continue;
                    }

                    var weight = Mathf.Exp(-distanceSquared * inverseRadiusSquared * 3.2f);
                    var index = Index(x, y);
                    velocity[index] = Vector2.ClampMagnitude(velocity[index] + force * weight, 4f);
                    dye[index] = AddSaturated(dye[index], color * weight * 0.72f);
                }
            }

            textureDirty = true;
        }

        public void Step(float deltaTime)
        {
            deltaTime = Mathf.Clamp(deltaTime, 0f, 0.1f);
            if (deltaTime <= 0f)
            {
                return;
            }

            var velocityBlend = Mathf.Clamp01(deltaTime * 5.5f);
            var velocityDecay = Mathf.Exp(-deltaTime * 1.15f);
            var dyeDecay = Mathf.Exp(-deltaTime * 0.17f);

            for (var y = 0; y < height; y++)
            {
                var down = Mathf.Max(0, y - 1);
                var up = Mathf.Min(height - 1, y + 1);
                for (var x = 0; x < width; x++)
                {
                    var left = Mathf.Max(0, x - 1);
                    var right = Mathf.Min(width - 1, x + 1);
                    var index = Index(x, y);
                    var average = (
                        velocity[Index(left, y)]
                        + velocity[Index(right, y)]
                        + velocity[Index(x, down)]
                        + velocity[Index(x, up)]) * 0.25f;

                    var smoothed = Vector2.Lerp(velocity[index], average, velocityBlend) * velocityDecay;
                    if (x == 0 || x == width - 1)
                    {
                        smoothed.x = 0f;
                    }
                    if (y == 0 || y == height - 1)
                    {
                        smoothed.y = 0f;
                    }

                    nextVelocity[index] = smoothed;

                    var uv = new Vector2(
                        x / (float)(width - 1),
                        y / (float)(height - 1));
                    var previousUv = uv - smoothed * deltaTime * 0.34f;
                    var advected = SampleColor(dye, previousUv) * dyeDecay;
                    advected.a = Mathf.Clamp01(Mathf.Max(advected.a, MaxRgb(advected)));
                    nextDye[index] = ClampColor(advected);
                }
            }

            Swap(ref velocity, ref nextVelocity);
            Swap(ref dye, ref nextDye);
            textureDirty = true;
        }

        public Vector2 SampleVelocity(Vector2 uv)
        {
            uv.x = Mathf.Clamp01(uv.x);
            uv.y = Mathf.Clamp01(uv.y);
            var px = uv.x * (width - 1);
            var py = uv.y * (height - 1);
            var x0 = Mathf.FloorToInt(px);
            var y0 = Mathf.FloorToInt(py);
            var x1 = Mathf.Min(width - 1, x0 + 1);
            var y1 = Mathf.Min(height - 1, y0 + 1);
            var tx = px - x0;
            var ty = py - y0;
            var bottom = Vector2.Lerp(velocity[Index(x0, y0)], velocity[Index(x1, y0)], tx);
            var top = Vector2.Lerp(velocity[Index(x0, y1)], velocity[Index(x1, y1)], tx);
            return Vector2.Lerp(bottom, top, ty);
        }

        public float AverageSpeed()
        {
            var sum = 0f;
            for (var i = 0; i < velocity.Length; i++)
            {
                sum += velocity[i].magnitude;
            }
            return sum / velocity.Length;
        }

        public bool HasFiniteValues()
        {
            for (var i = 0; i < velocity.Length; i++)
            {
                if (!float.IsFinite(velocity[i].x) || !float.IsFinite(velocity[i].y)
                    || !float.IsFinite(dye[i].r) || !float.IsFinite(dye[i].g)
                    || !float.IsFinite(dye[i].b) || !float.IsFinite(dye[i].a))
                {
                    return false;
                }
            }
            return true;
        }

        public void Dispose()
        {
            if (displayTexture == null)
            {
                return;
            }

            if (Application.isPlaying)
            {
                UnityEngine.Object.Destroy(displayTexture);
            }
            else
            {
                UnityEngine.Object.DestroyImmediate(displayTexture);
            }
            displayTexture = null;
        }

        private Texture2D GetDisplayTexture()
        {
            if (displayTexture == null)
            {
                displayTexture = new Texture2D(width, height, TextureFormat.RGBA32, false, true)
                {
                    name = "CPU Ink Fallback",
                    filterMode = FilterMode.Bilinear,
                    wrapMode = TextureWrapMode.Clamp
                };
                textureDirty = true;
            }

            if (textureDirty)
            {
                displayTexture.SetPixels(dye);
                displayTexture.Apply(false, false);
                textureDirty = false;
            }

            return displayTexture;
        }

        private Color SampleColor(Color[] source, Vector2 uv)
        {
            uv.x = Mathf.Clamp01(uv.x);
            uv.y = Mathf.Clamp01(uv.y);
            var px = uv.x * (width - 1);
            var py = uv.y * (height - 1);
            var x0 = Mathf.FloorToInt(px);
            var y0 = Mathf.FloorToInt(py);
            var x1 = Mathf.Min(width - 1, x0 + 1);
            var y1 = Mathf.Min(height - 1, y0 + 1);
            var tx = px - x0;
            var ty = py - y0;
            var bottom = Color.LerpUnclamped(source[Index(x0, y0)], source[Index(x1, y0)], tx);
            var top = Color.LerpUnclamped(source[Index(x0, y1)], source[Index(x1, y1)], tx);
            return Color.LerpUnclamped(bottom, top, ty);
        }

        private int Index(int x, int y)
        {
            return y * width + x;
        }

        private static Color AddSaturated(Color left, Color right)
        {
            return new Color(
                Mathf.Clamp01(left.r + right.r),
                Mathf.Clamp01(left.g + right.g),
                Mathf.Clamp01(left.b + right.b),
                Mathf.Clamp01(Mathf.Max(left.a, right.a)));
        }

        private static Color ClampColor(Color color)
        {
            color.r = Mathf.Clamp01(color.r);
            color.g = Mathf.Clamp01(color.g);
            color.b = Mathf.Clamp01(color.b);
            color.a = Mathf.Clamp01(color.a);
            return color;
        }

        private static float MaxRgb(Color color)
        {
            return Mathf.Max(color.r, Mathf.Max(color.g, color.b));
        }

        private static void Swap<T>(ref T left, ref T right)
        {
            (left, right) = (right, left);
        }
    }
}
