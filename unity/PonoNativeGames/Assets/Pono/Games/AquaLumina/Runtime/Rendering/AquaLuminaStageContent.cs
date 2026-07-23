using System.Collections.Generic;
using UnityEngine;

namespace Pono.AquaLumina.Rendering
{
    /// <summary>
    /// Owns the lifecycle and per-frame animation of the procedural underwater
    /// stage built by <see cref="AquaLuminaStageBuilder"/>: kelp sway, fish
    /// drift/bob/wrap, and the sun's slow pulse. It also owns cleanup of every
    /// runtime-generated Texture2D/Sprite/Material the builder created (none of
    /// that content exists as a project asset, so nothing else will free it).
    ///
    /// This component has no public API surface beyond what the builder wires
    /// up via the internal Register*/Set* methods below — integration code is
    /// only meant to call <see cref="AquaLuminaStageBuilder.Build"/> and read
    /// the returned <see cref="AquaStageInfo"/>.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class AquaLuminaStageContent : MonoBehaviour
    {
        // Kept as small structs of raw animation parameters (not MonoBehaviours
        // per kelp blade/fish) so Update() below touches zero managed heap
        // allocations per frame — only list indexing over pre-sized arrays.
        private struct KelpEntry
        {
            public Transform Transform;
            public float BaseRotationDegrees;
            public float SwaySpeed;
            public float SwayPhase;
        }

        private struct FishEntry
        {
            public Transform Transform;
            public float Speed;
            public float Direction;
            public float BaseY;
            public float BobSpeed;
            public float BobPhase;
            public float BobAmplitude;
            public float HalfWidth;
        }

        private struct SunEntry
        {
            public Transform Transform;
            public Vector3 BaseScale;
            public float PulseSpeed;
            public float PulsePhase;
            public float PulseAmplitude;
        }

        private readonly List<UnityEngine.Object> _generatedAssets = new List<UnityEngine.Object>();
        private readonly List<KelpEntry> _kelp = new List<KelpEntry>();
        private readonly List<FishEntry> _fish = new List<FishEntry>();

        private bool _hasSun;
        private SunEntry _sun;
        private float _fishWrapMinX;
        private float _fishWrapMaxX;

        /// <summary>Tracks a runtime-only asset (Texture2D/Sprite/Mesh/Material) for destruction in OnDestroy.</summary>
        internal void RegisterGeneratedAsset(UnityEngine.Object asset)
        {
            if (asset != null)
            {
                _generatedAssets.Add(asset);
            }
        }

        /// <summary>World-space X bounds fish drift is wrapped against once they fully exit the visible rect.</summary>
        internal void SetFishWrapBounds(float minX, float maxX)
        {
            _fishWrapMinX = minX;
            _fishWrapMaxX = maxX;
        }

        internal void RegisterKelp(Transform kelpTransform, float baseRotationDegrees, float swaySpeed, float swayPhase)
        {
            _kelp.Add(new KelpEntry
            {
                Transform = kelpTransform,
                BaseRotationDegrees = baseRotationDegrees,
                SwaySpeed = swaySpeed,
                SwayPhase = swayPhase
            });
        }

        internal void RegisterFish(
            Transform fishTransform,
            float speed,
            float direction,
            float baseY,
            float bobSpeed,
            float bobPhase,
            float bobAmplitude,
            float halfWidth)
        {
            _fish.Add(new FishEntry
            {
                Transform = fishTransform,
                Speed = speed,
                Direction = direction,
                BaseY = baseY,
                BobSpeed = bobSpeed,
                BobPhase = bobPhase,
                BobAmplitude = bobAmplitude,
                HalfWidth = halfWidth
            });
        }

        internal void RegisterSun(Transform sunTransform, Vector3 baseScale, float pulseSpeed, float pulsePhase, float pulseAmplitude)
        {
            _sun = new SunEntry
            {
                Transform = sunTransform,
                BaseScale = baseScale,
                PulseSpeed = pulseSpeed,
                PulsePhase = pulsePhase,
                PulseAmplitude = pulseAmplitude
            };
            _hasSun = true;
        }

        private void Update()
        {
            var time = Time.time;
            var deltaTime = Time.deltaTime;
            AnimateKelp(time);
            AnimateFish(time, deltaTime);
            AnimateSun(time);
        }

        private void AnimateKelp(float time)
        {
            for (var i = 0; i < _kelp.Count; i++)
            {
                var entry = _kelp[i];
                // Sway is expressed as a local Z rotation around the blade's own
                // bottom pivot, so it reads independently of whatever transform
                // hierarchy/rotation the stage root itself is under.
                var sway = Mathf.Sin(time * entry.SwaySpeed + entry.SwayPhase) * 4f;
                var angles = entry.Transform.localEulerAngles;
                angles.z = entry.BaseRotationDegrees + sway;
                entry.Transform.localEulerAngles = angles;
            }
        }

        private void AnimateFish(float time, float deltaTime)
        {
            for (var i = 0; i < _fish.Count; i++)
            {
                var entry = _fish[i];
                var position = entry.Transform.position;
                position.x += entry.Direction * entry.Speed * deltaTime;

                // Fish drift in a fixed direction and simply wrap once fully off
                // the opposite edge, rather than turning around — simplest
                // behavior that matches "drifting... wrapping at rect edges".
                if (entry.Direction > 0f && position.x - entry.HalfWidth > _fishWrapMaxX)
                {
                    position.x = _fishWrapMinX - entry.HalfWidth;
                }
                else if (entry.Direction < 0f && position.x + entry.HalfWidth < _fishWrapMinX)
                {
                    position.x = _fishWrapMaxX + entry.HalfWidth;
                }

                position.y = entry.BaseY + Mathf.Sin(time * entry.BobSpeed + entry.BobPhase) * entry.BobAmplitude;
                entry.Transform.position = position;
            }
        }

        private void AnimateSun(float time)
        {
            if (!_hasSun)
            {
                return;
            }
            var pulse = 1f + Mathf.Sin(time * _sun.PulseSpeed + _sun.PulsePhase) * _sun.PulseAmplitude;
            _sun.Transform.localScale = _sun.BaseScale * pulse;
        }

        private void OnDestroy()
        {
            for (var i = 0; i < _generatedAssets.Count; i++)
            {
                DestroyGeneratedAsset(_generatedAssets[i]);
            }
            _generatedAssets.Clear();
        }

        private static void DestroyGeneratedAsset(UnityEngine.Object asset)
        {
            if (asset == null)
            {
                return;
            }
            // Runtime-generated Texture2D/Sprite/Material are not project
            // assets, so nothing else in the project frees them; mirrors the
            // Application.isEditor DestroyImmediate/Destroy split used
            // elsewhere in this project (e.g. CpuInkVisualBackend.Dispose).
            if (Application.isEditor)
            {
                UnityEngine.Object.DestroyImmediate(asset);
            }
            else
            {
                UnityEngine.Object.Destroy(asset);
            }
        }
    }
}
