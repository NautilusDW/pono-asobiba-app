using UnityEngine;
using UnityEngine.Rendering;

namespace Pono.AquaLumina.Rendering
{
    /// <summary>
    /// World-space additive quad that renders animated Voronoi-filament caustics.
    /// It is drawn by the URP 2D Renderer's own transparency sort (via the
    /// SRPDefaultUnlit pass, see AquaCaustics.shader) at a sorting order that
    /// places it above the background/rock sprites and below the later
    /// refraction post-pass, so light appears to pass through water before it
    /// distorts the scene — the physically plausible layering order.
    ///
    /// Fully procedural: the quad Mesh and its Material are both built in code
    /// here, there is no .mat/.prefab asset backing this component.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class AquaCausticsSurface : MonoBehaviour
    {
        private static readonly int IntensityId = Shader.PropertyToID("_Intensity");
        private static readonly int TintId = Shader.PropertyToID("_Tint");
        private static readonly int ScaleId = Shader.PropertyToID("_Scale");
        private static readonly int SpeedId = Shader.PropertyToID("_Speed");
        private static readonly int FadeParamsId = Shader.PropertyToID("_FadeParams");
        private static readonly int RectExtentId = Shader.PropertyToID("_RectExtent");

        // Logged at most once per process so a missing/unsupported shader on a
        // given platform doesn't spam the console every time a caller retries.
        private static bool _missingShaderWarningLogged;

        private Mesh _mesh;
        private Material _material;

        /// <summary>Current caustics brightness multiplier, as last set via SetIntensity (or Create's initial value).</summary>
        public float Intensity { get; private set; }

        /// <summary>
        /// Builds the caustics quad under <paramref name="parent"/>, covering
        /// <paramref name="worldRect"/> (expressed in world-space XY at world
        /// z = 0). Returns null when the caustics shader is unavailable
        /// (e.g. stripped from a build, or unsupported on the running graphics
        /// API) — this is a graceful no-op path, callers must tolerate a null
        /// return and simply render without caustics.
        ///
        /// <paramref name="worldRect"/> is always honored in true world space
        /// regardless of <paramref name="parent"/>'s own position/rotation/scale:
        /// the mesh vertices are baked via <see cref="Transform.InverseTransformPoint"/>
        /// against <paramref name="parent"/> (see BuildQuadMesh), not by copying
        /// worldRect's raw XY values as local vertex coordinates. This makes the
        /// method safe to call with a parent that is not sitting at the world
        /// origin with an identity transform (e.g. a camera-shake rig, a scaled
        /// UI-scaling root, a parallax layer) — the quad still lands at the
        /// intended world-space rect either way.
        /// </summary>
        public static AquaCausticsSurface Create(Transform parent, Rect worldRect, int sortingOrder, float intensity)
        {
            var shader = Resources.Load<Shader>("AquaLumina/Rendering/AquaCaustics");
            if (shader == null)
            {
                shader = Shader.Find("Pono/AquaLumina/Caustics");
            }
            if (shader == null || !shader.isSupported)
            {
                if (!_missingShaderWarningLogged)
                {
                    Debug.LogWarning("AquaCausticsSurface: AquaCaustics shader is missing or unsupported on this platform; caustics will be skipped.");
                    _missingShaderWarningLogged = true;
                }
                return null;
            }

            var go = new GameObject("AquaCausticsSurface");
            go.transform.SetParent(parent, worldPositionStays: false);

            var surface = go.AddComponent<AquaCausticsSurface>();
            surface.Initialize(shader, parent, worldRect, sortingOrder, intensity);
            return surface;
        }

        /// <summary>Updates the caustics brightness multiplier (e.g. driven by a depth/day-night parameter upstream).</summary>
        public void SetIntensity(float value)
        {
            Intensity = value;
            if (_material != null)
            {
                _material.SetFloat(IntensityId, value);
            }
        }

        private void Initialize(Shader shader, Transform parent, Rect worldRect, int sortingOrder, float intensity)
        {
            _mesh = BuildQuadMesh(parent, worldRect, out var rectExtent);

            // new Material(shader) + sharedMaterial (never .material) so we never
            // silently spawn a second per-instance clone behind our own backs;
            // this component owns exactly one Mesh and one Material instance.
            _material = new Material(shader)
            {
                name = "AquaCaustics (Runtime)",
                hideFlags = HideFlags.DontSave
            };
            _material.SetColor(TintId, new Color(0.68f, 0.93f, 1.0f, 1f));
            _material.SetFloat(ScaleId, 2.6f);
            _material.SetFloat(SpeedId, 0.6f);
            _material.SetVector(FadeParamsId, new Vector4(0.05f, 0.75f, 0.35f, 0f));
            // _RectExtent is part of this material's documented uniform contract
            // (Intensity/Tint/Scale/Speed/FadeParams/RectExtent — six total, see
            // AquaCaustics.shader's Properties block for the full pinned list):
            // it carries the quad's own UV extents (uMax = aspect, vMax = 1) so
            // the shader's box-edge soft mask can stay proportionally even on
            // all four sides regardless of worldRect's aspect ratio, without
            // needing a per-frame CPU parameter (set once here, static for the
            // lifetime of the surface). Required precisely because the box-edge
            // soft mask is itself a requirement (no additive quad may show a
            // hard rectangle silhouette against the background) — any future
            // reader enumerating "the caustics parameters" must treat this as
            // the sixth, non-optional entry, not an implementation-private extra.
            _material.SetVector(RectExtentId, rectExtent);

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

        // UV convention is pinned so caustic cells stay isotropic no matter the
        // rect's aspect ratio: BOTH axes are divided by the rect's height, so v
        // spans exactly 0..1 while u spans 0..aspect. This lets the shader's
        // Voronoi lattice use one uniform "_Scale" without stretching cells.
        //
        // Vertices are baked via parent.InverseTransformPoint rather than by
        // copying worldRect's raw XY values as local vertex coordinates. The
        // GameObject this mesh is attached to always has an identity local
        // transform at construction time (see Create: it is a freshly created
        // GameObject, parented with worldPositionStays: false before any local
        // transform is touched), so its world matrix is exactly parent's world
        // matrix — meaning InverseTransformPoint(worldCorner) against parent is
        // precisely the local-space vertex value that reproduces worldCorner in
        // world space once the mesh is drawn. This keeps worldRect honored in
        // true world space even when parent is not at the world origin with an
        // identity rotation/scale (camera-shake rigs, scaled UI roots, parallax
        // layers, etc.) — the corner points are still computed in world space
        // first (worldRect is authoritative), only their frame of reference is
        // converted before being stored as mesh data.
        private static Mesh BuildQuadMesh(Transform parent, Rect worldRect, out Vector4 rectExtent)
        {
            var height = Mathf.Max(worldRect.height, 0.0001f);
            var aspect = worldRect.width / height;

            var worldCorners = new Vector3[4];
            worldCorners[0] = new Vector3(worldRect.xMin, worldRect.yMin, 0f);
            worldCorners[1] = new Vector3(worldRect.xMax, worldRect.yMin, 0f);
            worldCorners[2] = new Vector3(worldRect.xMax, worldRect.yMax, 0f);
            worldCorners[3] = new Vector3(worldRect.xMin, worldRect.yMax, 0f);

            var vertices = new Vector3[4];
            var uvs = new Vector2[4];
            for (var i = 0; i < 4; i++)
            {
                vertices[i] = parent != null ? parent.InverseTransformPoint(worldCorners[i]) : worldCorners[i];

                var local = (Vector2)worldCorners[i] - worldRect.min;
                uvs[i] = new Vector2(local.x / height, local.y / height);
            }

            var mesh = new Mesh
            {
                name = "AquaCausticsQuad",
                hideFlags = HideFlags.DontSave
            };
            mesh.SetVertices(vertices);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(new[] { 0, 1, 2, 0, 2, 3 }, 0);
            mesh.RecalculateBounds();

            rectExtent = new Vector4(aspect, 1f, 0f, 0f);
            return mesh;
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
