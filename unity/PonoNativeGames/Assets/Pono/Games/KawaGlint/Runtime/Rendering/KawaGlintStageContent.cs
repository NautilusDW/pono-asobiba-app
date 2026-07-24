using System.Collections.Generic;
using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Owns the lifecycle and per-frame animation of the procedural riverside
    /// stage built by <see cref="KawaGlintStageBuilder"/>: plant sway, cloud
    /// drift/wrap, and the sun glow's slow pulse. It also owns cleanup of
    /// every runtime-generated Texture2D/Sprite/Material the builder created
    /// (none of that content exists as a project asset, so nothing else will
    /// free it).
    ///
    /// This component has no public API surface beyond what the builder
    /// wires up via the internal Register*/Set* methods below — integration
    /// code is only meant to call <see cref="KawaGlintStageBuilder.Build"/>
    /// and read the returned <see cref="KawaStageInfo"/>. It has no
    /// dependency on any other KawaGlint module's types (surface band,
    /// refraction, actors) by design.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintStageContent : MonoBehaviour
    {
        // Kept as small structs of raw animation parameters (not
        // MonoBehaviours per plant/cloud) so Update() below touches zero
        // managed heap allocations per frame — only list indexing over
        // pre-sized lists.
        private struct PlantEntry
        {
            public Transform Transform;
            public float BaseRotationDegrees;
            public float SwaySpeed;
            public float SwayPhase;
        }

        private struct CloudEntry
        {
            public Transform Transform;
            public float Speed;
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
        private readonly List<PlantEntry> _plants = new List<PlantEntry>();
        private readonly List<CloudEntry> _clouds = new List<CloudEntry>();
        private readonly Dictionary<string, GameObject> _decorContainers = new Dictionary<string, GameObject>();

        private bool _hasSun;
        private SunEntry _sun;
        private float _cloudWrapMinX;
        private float _cloudWrapMaxX;

        /// <summary>
        /// The background art SpriteRenderer built by <c>KawaGlintStageBuilder.BuildBackgroundArt</c>
        /// (null when the stage was built on the procedural-placeholder path,
        /// i.e. no art has been imported at all). Exposed so
        /// <c>KawaGlintStageBuilder.SetBackground</c> can swap it live on a
        /// location change without rebuilding the whole stage.
        /// </summary>
        internal SpriteRenderer BackgroundArtRenderer { get; private set; }

        /// <summary>The visible-world Rect the background art was originally cover-fit against (see <c>SetBackgroundArtRenderer</c>); reused by every later <c>SetBackground</c> swap so the cover-fit math is always computed against the same frame.</summary>
        internal Rect BackgroundVisibleRect { get; private set; }

        /// <summary>Records the background art renderer + the visible-world Rect it was built against (called once, from <c>KawaGlintStageBuilder.Build</c>). <paramref name="renderer"/> may be null (procedural-placeholder path).</summary>
        internal void SetBackgroundArtRenderer(SpriteRenderer renderer, Rect visibleRect)
        {
            BackgroundArtRenderer = renderer;
            BackgroundVisibleRect = visibleRect;
        }

        /// <summary>
        /// The illustrated-Pono SpriteRenderer built by
        /// <c>KawaGlintStageBuilder.BuildAnglerArt</c> (null when the stage
        /// was built on the procedural-placeholder path, i.e. no art has
        /// been imported at all). Exposed so
        /// <c>KawaGlintStageBuilder.SetAnglerPosition</c> can reposition it
        /// live on a location change without rebuilding the whole stage --
        /// same role as <see cref="BackgroundArtRenderer"/>.
        /// </summary>
        internal SpriteRenderer AnglerRenderer { get; private set; }

        /// <summary>The illustrated Pono sprite's own world-space width at its fixed <c>AnglerArtWorldHeight</c> scale (never reassigned per location); reused by every later <c>SetAnglerPosition</c> call to recompute the rod-tip offset.</summary>
        internal float AnglerWorldWidth { get; private set; }

        /// <summary>Records the angler renderer + its world width (called once, from <c>KawaGlintStageBuilder.Build</c>).</summary>
        internal void SetAnglerRenderer(SpriteRenderer renderer, float worldWidth)
        {
            AnglerRenderer = renderer;
            AnglerWorldWidth = worldWidth;
        }

        /// <summary>Tracks a runtime-only asset (Texture2D/Sprite/Mesh/Material) for destruction in OnDestroy.</summary>
        internal void RegisterGeneratedAsset(UnityEngine.Object asset)
        {
            if (asset != null)
            {
                _generatedAssets.Add(asset);
            }
        }

        /// <summary>World-space X bounds clouds drift is wrapped against once they fully exit the sky rect.</summary>
        internal void SetCloudWrapBounds(float minX, float maxX)
        {
            _cloudWrapMinX = minX;
            _cloudWrapMaxX = maxX;
        }

        internal void RegisterPlant(Transform plantTransform, float baseRotationDegrees, float swaySpeed, float swayPhase)
        {
            _plants.Add(new PlantEntry
            {
                Transform = plantTransform,
                BaseRotationDegrees = baseRotationDegrees,
                SwaySpeed = swaySpeed,
                SwayPhase = swayPhase
            });
        }

        /// <summary>
        /// Records one location's decor container (§D-4, batch 1467
        /// seaweed/hiding-prop art), keyed exactly like
        /// <c>KawaGlintStageBuilder.DecorPlacementsByBackgroundKey</c>.
        /// <c>KawaGlintStageBuilder.BuildDecor</c> builds EVERY location's
        /// container up front (not just the initial one), so a later
        /// <c>SetDecor</c> location switch only has to toggle
        /// <c>GameObject.SetActive</c> on the already-built containers
        /// rather than destroy/rebuild anything -- the per-instance sway
        /// registered via <see cref="RegisterPlant"/> keeps animating
        /// harmlessly on an inactive container too (a Transform property
        /// write doesn't require its GameObject to be active), so nothing
        /// needs to be un-registered on a switch either.
        /// </summary>
        internal void RegisterDecorContainer(string backgroundKey, GameObject container)
        {
            _decorContainers[backgroundKey] = container;
        }

        /// <summary>The decor container previously registered for <paramref name="backgroundKey"/> via <see cref="RegisterDecorContainer"/>, or null if that key was never registered.</summary>
        internal GameObject GetDecorContainer(string backgroundKey)
        {
            return _decorContainers.TryGetValue(backgroundKey, out var container) ? container : null;
        }

        internal void RegisterCloud(Transform cloudTransform, float speed, float halfWidth)
        {
            _clouds.Add(new CloudEntry
            {
                Transform = cloudTransform,
                Speed = speed,
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
            AnimatePlants(time);
            AnimateClouds(deltaTime);
            AnimateSun(time);
        }

        private void AnimatePlants(float time)
        {
            for (var i = 0; i < _plants.Count; i++)
            {
                var entry = _plants[i];
                // Sway is expressed as a local Z rotation around the blade's
                // own bottom pivot, so it reads independently of whatever
                // transform hierarchy/rotation the stage root itself is under.
                var sway = Mathf.Sin(time * entry.SwaySpeed + entry.SwayPhase) * 4f;
                var angles = entry.Transform.localEulerAngles;
                angles.z = entry.BaseRotationDegrees + sway;
                entry.Transform.localEulerAngles = angles;
            }
        }

        private void AnimateClouds(float deltaTime)
        {
            for (var i = 0; i < _clouds.Count; i++)
            {
                var entry = _clouds[i];
                var position = entry.Transform.position;
                position.x += entry.Speed * deltaTime;

                // Clouds only ever drift +x and simply wrap once fully off
                // the right edge, rather than turning around — matches
                // "drifting +x... wrapping at the sky rect edges".
                if (position.x - entry.HalfWidth > _cloudWrapMaxX)
                {
                    position.x = _cloudWrapMinX - entry.HalfWidth;
                }

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
            // elsewhere in this project.
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
