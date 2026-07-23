using UnityEngine;
using UnityEngine.Rendering;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// In-scene, world-space quad that draws the undulating waterline crest,
    /// horizontally-stretched sparkle glints and shoreline foam for the
    /// KawaGlint river-surface spike. It is drawn by the URP 2D Renderer's own
    /// transparency sort (via the SRPDefaultUnlit pass, see KawaSurface.shader)
    /// at sorting order 30 (contract: fish shadows 14, bobber 34) so it sits
    /// between the underwater actors and the bobber/fishing line.
    ///
    /// Unlike AquaCausticsSurface (whose UV carries a rect-normalized local
    /// coordinate), this quad's primary UV channel carries *raw world-space
    /// XY* directly (uv.x = world x, uv.y = world y) -- see the pinned wave
    /// contract in DESIGN.md: the fragment shader evaluates
    /// WaveHeight(worldX, _KawaTime) with zero per-vertex math, and the same
    /// world-space x is what module 4's KawaWave.cs uses for the bobber, so
    /// the crest line and the bobber are guaranteed to agree by construction.
    /// A second UV channel carries a purely local (0..1) horizontal coordinate
    /// used only for the quad's own left/right edge fade -- deliberately kept
    /// out of the shared uniform contract (Intensity/WaterlineY/ShoreEdgeX/
    /// SparkleTint/FoamTint) since it is baked once at mesh-build time and
    /// never needs to be a material property.
    ///
    /// Fully procedural: the quad Mesh and its Material are both built in code
    /// here, there is no .mat/.prefab asset backing this component.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaSurfaceBand : MonoBehaviour
    {
        // Vertical extent of the band around the waterline, in world units.
        // Pinned by DESIGN.md: y in [waterlineWorldY - 0.55, waterlineWorldY + 0.35].
        private const float BandBelowWaterline = 0.55f;
        private const float BandAboveWaterline = 0.35f;

        private static readonly int KawaTimeId = Shader.PropertyToID("_KawaTime");
        private static readonly int IntensityId = Shader.PropertyToID("_Intensity");
        private static readonly int WaterlineYId = Shader.PropertyToID("_WaterlineY");
        private static readonly int ShoreEdgeXId = Shader.PropertyToID("_ShoreEdgeX");
        private static readonly int SparkleTintId = Shader.PropertyToID("_SparkleTint");
        private static readonly int FoamTintId = Shader.PropertyToID("_FoamTint");

        // Logged at most once per process so a missing/unsupported shader on a
        // given platform doesn't spam the console every time a caller retries.
        private static bool _missingShaderWarningLogged;

        private Mesh _mesh;
        private Material _material;

        /// <summary>Current band brightness multiplier, as last set via SetIntensity (or Create's initial value).</summary>
        public float Intensity { get; private set; }

        /// <summary>
        /// Builds the surface band quad under <paramref name="parent"/>. The
        /// quad spans the full horizontal extent of <paramref name="worldRect"/>
        /// (world-space XY at world z = 0) and a fixed vertical band around
        /// <paramref name="waterlineWorldY"/> (see BandBelowWaterline/
        /// BandAboveWaterline) -- independent of worldRect's own vertical
        /// extent, per DESIGN.md. Returns null when the surface shader is
        /// unavailable (e.g. stripped from a build, or unsupported on the
        /// running graphics API) -- this is a graceful no-op path, callers
        /// must tolerate a null return and simply render without the band.
        ///
        /// The quad is honored in true world space regardless of
        /// <paramref name="parent"/>'s own position/rotation/scale: vertices
        /// are baked via <see cref="Transform.InverseTransformPoint"/> against
        /// <paramref name="parent"/> (see BuildQuadMesh), not by copying world
        /// XY values as local vertex coordinates directly.
        /// </summary>
        public static KawaSurfaceBand Create(Transform parent, Rect worldRect, float waterlineWorldY,
            float shoreRightEdgeWorldX, int sortingOrder, float intensity)
        {
            var shader = Resources.Load<Shader>("KawaGlint/Rendering/KawaSurface");
            if (shader == null)
            {
                shader = Shader.Find("Pono/KawaGlint/Surface");
            }
            if (shader == null || !shader.isSupported)
            {
                if (!_missingShaderWarningLogged)
                {
                    Debug.LogWarning("KawaSurfaceBand: KawaSurface shader is missing or unsupported on this platform; the waterline band will be skipped.");
                    _missingShaderWarningLogged = true;
                }
                return null;
            }

            var go = new GameObject("KawaSurfaceBand");
            go.transform.SetParent(parent, worldPositionStays: false);

            var band = go.AddComponent<KawaSurfaceBand>();
            band.Initialize(shader, parent, worldRect, waterlineWorldY, shoreRightEdgeWorldX, sortingOrder, intensity);
            return band;
        }

        /// <summary>Updates the band's overall brightness multiplier.</summary>
        public void SetIntensity(float value)
        {
            Intensity = value;
            if (_material != null)
            {
                _material.SetFloat(IntensityId, value);
            }
        }

        private void Initialize(Shader shader, Transform parent, Rect worldRect, float waterlineWorldY,
            float shoreRightEdgeWorldX, int sortingOrder, float intensity)
        {
            _mesh = BuildQuadMesh(parent, worldRect, waterlineWorldY);

            // new Material(shader) + sharedMaterial (never .material) so we never
            // silently spawn a second per-instance clone behind our own backs;
            // this component owns exactly one Mesh and one Material instance.
            _material = new Material(shader)
            {
                name = "KawaSurface (Runtime)",
                hideFlags = HideFlags.DontSave
            };
            _material.SetFloat(WaterlineYId, waterlineWorldY);
            _material.SetFloat(ShoreEdgeXId, shoreRightEdgeWorldX);
            _material.SetColor(SparkleTintId, new Color(1.0f, 0.98f, 0.90f, 1f));
            _material.SetColor(FoamTintId, new Color(1f, 1f, 1f, 1f));

            var meshFilter = gameObject.AddComponent<MeshFilter>();
            meshFilter.sharedMesh = _mesh;

            var meshRenderer = gameObject.AddComponent<MeshRenderer>();
            meshRenderer.sharedMaterial = _material;
            meshRenderer.sortingOrder = sortingOrder;
            meshRenderer.shadowCastingMode = ShadowCastingMode.Off;
            meshRenderer.receiveShadows = false;
            meshRenderer.lightProbeUsage = LightProbeUsage.Off;

            SetIntensity(intensity);
        }

        // UV channel 0 carries raw world-space XY directly (pinned contract --
        // see the class doc comment): the fragment shader evaluates the pinned
        // wave formula in world space with zero per-vertex transform math.
        //
        // UV channel 1 carries a local (0..1) horizontal coordinate purely for
        // this quad's own left/right edge fade, baked once here rather than
        // recomputed per-fragment from world bounds via an extra uniform.
        //
        // Vertices are baked via parent.InverseTransformPoint rather than by
        // copying world XY values as local vertex coordinates. The GameObject
        // this mesh is attached to always has an identity local transform at
        // construction time (see Create: it is a freshly created GameObject,
        // parented with worldPositionStays: false before any local transform
        // is touched), so its world matrix is exactly parent's world matrix --
        // meaning InverseTransformPoint(worldCorner) against parent is
        // precisely the local-space vertex value that reproduces worldCorner
        // in world space once the mesh is drawn.
        private static Mesh BuildQuadMesh(Transform parent, Rect worldRect, float waterlineWorldY)
        {
            var yMin = waterlineWorldY - BandBelowWaterline;
            var yMax = waterlineWorldY + BandAboveWaterline;
            var xMin = worldRect.xMin;
            var xMax = worldRect.xMax;

            var worldCorners = new Vector3[4];
            worldCorners[0] = new Vector3(xMin, yMin, 0f);
            worldCorners[1] = new Vector3(xMax, yMin, 0f);
            worldCorners[2] = new Vector3(xMax, yMax, 0f);
            worldCorners[3] = new Vector3(xMin, yMax, 0f);

            var localEdgeU = new[] { 0f, 1f, 1f, 0f };

            var vertices = new Vector3[4];
            var worldUvs = new Vector2[4];
            var edgeUvs = new Vector2[4];
            for (var i = 0; i < 4; i++)
            {
                vertices[i] = parent != null ? parent.InverseTransformPoint(worldCorners[i]) : worldCorners[i];
                worldUvs[i] = new Vector2(worldCorners[i].x, worldCorners[i].y);
                edgeUvs[i] = new Vector2(localEdgeU[i], 0f);
            }

            var mesh = new Mesh
            {
                name = "KawaSurfaceBandQuad",
                hideFlags = HideFlags.DontSave
            };
            mesh.SetVertices(vertices);
            mesh.SetUVs(0, worldUvs);
            mesh.SetUVs(1, edgeUvs);
            mesh.SetTriangles(new[] { 0, 1, 2, 0, 2, 3 }, 0);
            mesh.RecalculateBounds();

            return mesh;
        }

        // The only per-frame call for this component -- one cached-ID SetFloat,
        // zero allocations, matching the shared time-base contract (_KawaTime
        // = Time.time, never the engine-global level-load-relative _Time.y,
        // which would desync the crest line from module 4's bobber).
        private void Update()
        {
            if (_material != null)
            {
                _material.SetFloat(KawaTimeId, Time.time);
            }
        }

        private void OnDestroy()
        {
            if (_mesh != null)
            {
                if (Application.isEditor)
                {
                    DestroyImmediate(_mesh);
                }
                else
                {
                    Destroy(_mesh);
                }
                _mesh = null;
            }

            if (_material != null)
            {
                if (Application.isEditor)
                {
                    DestroyImmediate(_material);
                }
                else
                {
                    Destroy(_material);
                }
                _material = null;
            }
        }
    }
}
