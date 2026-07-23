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
        /// <paramref name="worldRect"/> at z = 0. Returns null when the caustics
        /// shader is unavailable (e.g. stripped from a build, or unsupported on
        /// the running graphics API) — this is a graceful no-op path, callers
        /// must tolerate a null return and simply render without caustics.
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
            surface.Initialize(shader, worldRect, sortingOrder, intensity);
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

        private void Initialize(Shader shader, Rect worldRect, int sortingOrder, float intensity)
        {
            _mesh = BuildQuadMesh(worldRect, out var rectExtent);

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
            // _RectExtent is a deliberate small addition beyond the fade tuple:
            // it carries the quad's own UV extents (uMax = aspect, vMax = 1) so
            // the shader's box-edge soft mask can stay proportionally even on
            // all four sides regardless of worldRect's aspect ratio, without
            // needing a per-frame CPU parameter (set once here, static for the
            // lifetime of the surface).
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
        private static Mesh BuildQuadMesh(Rect worldRect, out Vector4 rectExtent)
        {
            var height = Mathf.Max(worldRect.height, 0.0001f);
            var aspect = worldRect.width / height;

            var vertices = new Vector3[4];
            vertices[0] = new Vector3(worldRect.xMin, worldRect.yMin, 0f);
            vertices[1] = new Vector3(worldRect.xMax, worldRect.yMin, 0f);
            vertices[2] = new Vector3(worldRect.xMax, worldRect.yMax, 0f);
            vertices[3] = new Vector3(worldRect.xMin, worldRect.yMax, 0f);

            var uvs = new Vector2[4];
            for (var i = 0; i < 4; i++)
            {
                var local = (Vector2)vertices[i] - worldRect.min;
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
