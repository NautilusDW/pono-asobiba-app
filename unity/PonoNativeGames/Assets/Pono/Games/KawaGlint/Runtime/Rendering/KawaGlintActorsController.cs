using System.Collections.Generic;
using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Root of every wave-synced actor built by <see cref="KawaGlintActorsBuilder"/>:
    /// fish-shadow drift/bob/wrap, ripple-ring looping, and the fishing
    /// line's per-frame quadratic-bezier re-sampling to the bobber. Also owns
    /// the lifecycle of every runtime-generated Texture2D/Sprite/Material
    /// the builder created, since none of it exists as a project asset and
    /// nothing else in the project would otherwise free it.
    ///
    /// Exposes no public API beyond MonoBehaviour: QA/bootstrap code toggles
    /// this whole module on or off via <c>controller.gameObject.SetActive(bool)</c>,
    /// per the shared KawaGlint integration contract.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintActorsController : MonoBehaviour
    {
        // Pinned by DESIGN.md module 4 ("scale 0.3->1.1 world units / 2.2
        // seconds"). Exposed internally (not private) so
        // KawaGlintActorsBuilder can derive the two rings' phase offsets
        // from the same single value instead of duplicating it.
        internal const float RingLoopDurationSeconds = 2.2f;

        // Small structs of raw animation parameters (not per-actor
        // MonoBehaviours) so Update() below touches zero managed-heap
        // allocations per frame beyond simple indexing over pre-sized lists.
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

        private struct RingEntry
        {
            public Transform Transform;
            public SpriteRenderer Renderer;
            public float PhaseOffsetSeconds;
        }

        private const float RingMinScale = 0.3f;
        private const float RingMaxScale = 1.1f;
        private const float RingMaxAlpha = 0.35f;

        // Control point of the fishing line's quadratic bezier sags this far
        // below the straight rod-tip-to-bobber midpoint (DESIGN.md: "sagging
        // 0.35 units below the straight midpoint").
        private const float LineSagWorldUnits = 0.35f;

        private readonly List<Object> _generatedAssets = new List<Object>();
        private readonly List<FishEntry> _fish = new List<FishEntry>();
        private readonly List<RingEntry> _rings = new List<RingEntry>();

        private float _wrapMinX;
        private float _wrapMaxX;

        private KawaGlintBobber _bobber;
        private LineRenderer _fishingLine;
        private Vector3 _rodTipWorldPosition;
        private Vector3[] _lineBuffer;

        /// <summary>Tracks a runtime-only asset (Texture2D/Sprite/Mesh/Material) for destruction in OnDestroy.</summary>
        internal void RegisterGeneratedAsset(Object asset)
        {
            if (asset != null)
            {
                _generatedAssets.Add(asset);
            }
        }

        /// <summary>World-space X bounds fish drift wraps against once fully off the opposite edge.</summary>
        internal void SetWrapBounds(float minX, float maxX)
        {
            _wrapMinX = minX;
            _wrapMaxX = maxX;
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

        internal void RegisterRing(Transform ringTransform, SpriteRenderer ringRenderer, float phaseOffsetSeconds)
        {
            _rings.Add(new RingEntry
            {
                Transform = ringTransform,
                Renderer = ringRenderer,
                PhaseOffsetSeconds = phaseOffsetSeconds
            });
        }

        internal void SetBobber(KawaGlintBobber bobber)
        {
            _bobber = bobber;
        }

        /// <summary>
        /// Wires the fishing-line LineRenderer in and allocates its
        /// per-frame position buffer exactly once (never again -- Update
        /// below only ever overwrites this array's contents in place).
        /// </summary>
        internal void SetFishingLine(LineRenderer lineRenderer, Vector3 rodTipWorldPosition, int pointCount)
        {
            _fishingLine = lineRenderer;
            _rodTipWorldPosition = rodTipWorldPosition;
            _lineBuffer = new Vector3[pointCount];
        }

        private void Update()
        {
            var time = Time.time;
            var deltaTime = Time.deltaTime;
            AnimateFish(time, deltaTime);
            AnimateRings(time);
            AnimateFishingLine();
        }

        private void AnimateFish(float time, float deltaTime)
        {
            for (var i = 0; i < _fish.Count; i++)
            {
                var entry = _fish[i];
                var position = entry.Transform.position;
                position.x += entry.Direction * entry.Speed * deltaTime;

                // Fish drift in a fixed direction and simply wrap once fully
                // off the opposite edge, rather than turning around -- the
                // simplest behavior that matches "drifting... wrapping at
                // waterWorldRect edges" (DESIGN.md module 4, item 1).
                if (entry.Direction > 0f && position.x - entry.HalfWidth > _wrapMaxX)
                {
                    position.x = _wrapMinX - entry.HalfWidth;
                }
                else if (entry.Direction < 0f && position.x + entry.HalfWidth < _wrapMinX)
                {
                    position.x = _wrapMaxX + entry.HalfWidth;
                }

                position.y = entry.BaseY + Mathf.Sin(time * entry.BobSpeed + entry.BobPhase) * entry.BobAmplitude;
                entry.Transform.position = position;
            }
        }

        private void AnimateRings(float time)
        {
            if (_rings.Count == 0 || _bobber == null)
            {
                return;
            }

            // Rings sit ON the surface at the bobber's X; their Y stays
            // pinned to the waterline (set once at build time and never
            // touched here) rather than following the bobber's bob.
            var centerX = _bobber.CenterWorldX;
            for (var i = 0; i < _rings.Count; i++)
            {
                var entry = _rings[i];
                var loopT = Mathf.Repeat((time + entry.PhaseOffsetSeconds) / RingLoopDurationSeconds, 1f);
                var scale = Mathf.Lerp(RingMinScale, RingMaxScale, loopT);
                var alpha = Mathf.Lerp(RingMaxAlpha, 0f, loopT);

                var position = entry.Transform.position;
                position.x = centerX;
                entry.Transform.position = position;
                entry.Transform.localScale = new Vector3(scale, scale, 1f);

                var color = entry.Renderer.color;
                color.a = alpha;
                entry.Renderer.color = color;
            }
        }

        private void AnimateFishingLine()
        {
            if (_fishingLine == null || _bobber == null || _lineBuffer == null)
            {
                return;
            }

            var start = _rodTipWorldPosition;
            var end = new Vector3(_bobber.CenterWorldX, _bobber.TopWorldY, 0f);
            var midpoint = (start + end) * 0.5f;
            var control = midpoint - new Vector3(0f, LineSagWorldUnits, 0f);

            var segmentCount = _lineBuffer.Length - 1;
            for (var i = 0; i < _lineBuffer.Length; i++)
            {
                var t = segmentCount > 0 ? i / (float)segmentCount : 0f;
                var oneMinusT = 1f - t;

                // Quadratic bezier: (1-t)^2 * P0 + 2(1-t)t * C + t^2 * P2.
                _lineBuffer[i] = oneMinusT * oneMinusT * start
                    + 2f * oneMinusT * t * control
                    + t * t * end;
            }

            _fishingLine.SetPositions(_lineBuffer);
        }

        private void OnDestroy()
        {
            for (var i = 0; i < _generatedAssets.Count; i++)
            {
                DestroyGeneratedAsset(_generatedAssets[i]);
            }
            _generatedAssets.Clear();
        }

        private static void DestroyGeneratedAsset(Object asset)
        {
            if (asset == null)
            {
                return;
            }

            // Runtime-generated Texture2D/Sprite/Material are not project
            // assets, so nothing else in the project frees them -- mirrors
            // the Application.isEditor DestroyImmediate/Destroy split used
            // by AquaLuminaStageContent (this spike's sibling module).
            if (Application.isEditor)
            {
                DestroyImmediate(asset);
            }
            else
            {
                Destroy(asset);
            }
        }
    }
}
