using UnityEngine;
using UnityEngine.UI;

namespace Pono.HideSeekCreatures.Rendering
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RawImage))]
    public sealed class FluidInkPresenter : MonoBehaviour
    {
        private static readonly int PigmentTexId = Shader.PropertyToID("_PigmentTex");
        private static readonly int VelocityTexId = Shader.PropertyToID("_VelocityTex");
        private static readonly int RevealTexId = Shader.PropertyToID("_RevealTex");
        private static readonly int MotionAmountId = Shader.PropertyToID("_MotionAmount");

        private RawImage _image;
        private Material _material;
        private IInkVisualBackend _backend;
        private Texture _revealTexture;
        private bool _reduceMotion;

        public bool IsGpuActive => _backend is ComputeFluidInkBackend;
        public string BackendLabel => _backend?.Label ?? "なし";
        public bool Paused { get; set; }

        public void Initialize(Texture revealTexture, bool forceFallback = false)
        {
            _image = GetComponent<RawImage>();
            _revealTexture = revealTexture;
            var shader = Resources.Load<Shader>("HideSeekCreatures/Rendering/InkComposite");
            if (shader == null)
            {
                shader = Shader.Find("Pono/HideSeekCreatures/InkComposite");
            }
            if (shader == null)
            {
                Debug.LogError("InkComposite shader was not found.");
                enabled = false;
                return;
            }

            _material = new Material(shader)
            {
                name = "Ink Composite (Runtime)",
                hideFlags = HideFlags.DontSave
            };
            _image.material = _material;
            _image.texture = Texture2D.whiteTexture;
            CreateBackend(forceFallback);
            UpdateMaterial();
        }

        public void SetRevealTexture(Texture texture)
        {
            _revealTexture = texture;
            UpdateMaterial();
        }

        public void SetReduceMotion(bool reduceMotion)
        {
            _reduceMotion = reduceMotion;
            UpdateMaterial();
        }

        public void Inject(Vector2 uv, Vector2 velocity, Color color, float radius)
        {
            if (_backend == null)
            {
                return;
            }
            if (_reduceMotion)
            {
                velocity *= 0.5f;
            }
            _backend.Inject(new InkSplat(uv, velocity, color, radius));
        }

        public void ResetInk()
        {
            _backend?.Reset();
            UpdateMaterial();
        }

        private void Update()
        {
            if (Paused)
            {
                return;
            }
            _backend?.Tick(Time.unscaledDeltaTime);
            UpdateMaterial();
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (hasFocus && _backend != null && !_backend.IsReady)
            {
                CreateBackend(forceFallback: false);
            }
        }

        private void OnDestroy()
        {
            _backend?.Dispose();
            _backend = null;
            if (_material != null)
            {
                if (Application.isPlaying)
                {
                    Destroy(_material);
                }
                else
                {
                    DestroyImmediate(_material);
                }
            }
        }

        private void CreateBackend(bool forceFallback)
        {
            _backend?.Dispose();
            _backend = null;
            if (!forceFallback && ComputeFluidInkBackend.IsSupported())
            {
                var compute = Resources.Load<ComputeShader>("HideSeekCreatures/Rendering/FluidInk");
                if (compute != null)
                {
                    try
                    {
                        _backend = new ComputeFluidInkBackend(compute);
                    }
                    catch (System.Exception exception)
                    {
                        Debug.LogWarning($"FluidInk compute fallback: {exception.Message}");
                    }
                }
            }
            _backend ??= new CpuInkVisualBackend();
        }

        private void UpdateMaterial()
        {
            if (_material == null)
            {
                return;
            }
            _material.SetTexture(PigmentTexId, _backend?.OutputTexture ?? Texture2D.blackTexture);
            _material.SetTexture(VelocityTexId, _backend?.VelocityTexture ?? Texture2D.blackTexture);
            _material.SetTexture(RevealTexId, _revealTexture != null ? _revealTexture : Texture2D.blackTexture);
            _material.SetFloat(MotionAmountId, _reduceMotion ? 0.45f : 1f);
        }
    }
}
