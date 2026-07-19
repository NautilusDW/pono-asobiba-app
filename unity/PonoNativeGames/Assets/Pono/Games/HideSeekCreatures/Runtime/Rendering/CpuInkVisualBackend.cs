using System;
using UnityEngine;

namespace Pono.HideSeekCreatures.Rendering
{
    public sealed class CpuInkVisualBackend : IInkVisualBackend
    {
        private readonly int _width;
        private readonly int _height;
        private readonly Texture2D _texture;
        private readonly Color32[] _pixels;
        private float _fadeAccumulator;
        private bool _dirty;
        private int _activePixelCount;

        public CpuInkVisualBackend(int width = 256, int height = 144)
        {
            _width = Mathf.Max(32, width);
            _height = Mathf.Max(18, height);
            _pixels = new Color32[_width * _height];
            _texture = new Texture2D(_width, _height, TextureFormat.RGBA32, mipChain: false, linear: true)
            {
                name = "FluidInk CPU Fallback",
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.DontSave
            };
            _texture.SetPixels32(_pixels);
            _texture.Apply(updateMipmaps: false, makeNoLongerReadable: false);
        }

        public Texture OutputTexture => _texture;
        public Texture VelocityTexture => Texture2D.blackTexture;
        public string Label => $"CPU {_width}×{_height}";
        public bool IsReady => _texture != null;

        public void Inject(in InkSplat splat)
        {
            var centerX = Mathf.RoundToInt(splat.Uv.x * (_width - 1));
            var centerY = Mathf.RoundToInt(splat.Uv.y * (_height - 1));
            var radiusPixels = Mathf.Max(2, Mathf.RoundToInt(splat.Radius * _height));
            var radiusSquared = radiusPixels * radiusPixels;
            var strength = Mathf.Clamp01(splat.Color.a);
            var source = (Color32)new Color(
                splat.Color.r * strength,
                splat.Color.g * strength,
                splat.Color.b * strength,
                strength);

            var minX = Mathf.Max(0, centerX - radiusPixels);
            var maxX = Mathf.Min(_width - 1, centerX + radiusPixels);
            var minY = Mathf.Max(0, centerY - radiusPixels);
            var maxY = Mathf.Min(_height - 1, centerY + radiusPixels);
            for (var y = minY; y <= maxY; y++)
            {
                var dy = y - centerY;
                for (var x = minX; x <= maxX; x++)
                {
                    var dx = x - centerX;
                    var distanceSquared = dx * dx + dy * dy;
                    if (distanceSquared > radiusSquared)
                    {
                        continue;
                    }

                    var falloff = 1f - Mathf.Sqrt(distanceSquared / (float)radiusSquared);
                    falloff = falloff * falloff * (3f - 2f * falloff);
                    var index = x + y * _width;
                    var current = _pixels[index];
                    var alpha = Mathf.Clamp01(current.a / 255f + falloff * 0.42f * strength);
                    var mix = Mathf.Clamp01(falloff * 0.62f * strength);
                    var updated = new Color32(
                        (byte)Mathf.Lerp(current.r, source.r, mix),
                        (byte)Mathf.Lerp(current.g, source.g, mix),
                        (byte)Mathf.Lerp(current.b, source.b, mix),
                        (byte)Mathf.RoundToInt(alpha * 255f));
                    if (current.a == 0 && updated.a > 0)
                    {
                        _activePixelCount++;
                    }
                    _pixels[index] = updated;
                }
            }
            _dirty = true;
        }

        public void Tick(float unscaledDeltaTime)
        {
            _fadeAccumulator = _activePixelCount > 0
                ? _fadeAccumulator + Mathf.Max(0f, unscaledDeltaTime)
                : 0f;
            if (_activePixelCount > 0 && _fadeAccumulator >= 0.05f)
            {
                var steps = Mathf.Min(4, Mathf.FloorToInt(_fadeAccumulator / 0.05f));
                _fadeAccumulator -= steps * 0.05f;
                var fade = Mathf.Pow(0.992f, steps);
                for (var i = 0; i < _pixels.Length; i++)
                {
                    if (_pixels[i].a == 0)
                    {
                        continue;
                    }
                    var current = _pixels[i];
                    var nextAlpha = Mathf.FloorToInt(current.a * fade);
                    if (nextAlpha <= 2)
                    {
                        _pixels[i] = default;
                        _activePixelCount--;
                        continue;
                    }
                    var colorFade = nextAlpha / (float)current.a;
                    _pixels[i] = new Color32(
                        (byte)Mathf.RoundToInt(current.r * colorFade),
                        (byte)Mathf.RoundToInt(current.g * colorFade),
                        (byte)Mathf.RoundToInt(current.b * colorFade),
                        (byte)nextAlpha);
                }
                _dirty = true;
            }

            if (_dirty)
            {
                _texture.SetPixels32(_pixels);
                _texture.Apply(updateMipmaps: false, makeNoLongerReadable: false);
                _dirty = false;
            }
        }

        public void Reset()
        {
            Array.Clear(_pixels, 0, _pixels.Length);
            _fadeAccumulator = 0f;
            _activePixelCount = 0;
            _dirty = true;
            Tick(0f);
        }

        public void Dispose()
        {
            if (_texture == null)
            {
                return;
            }
            if (Application.isEditor)
            {
                UnityEngine.Object.DestroyImmediate(_texture);
            }
            else
            {
                UnityEngine.Object.Destroy(_texture);
            }
        }
    }
}
