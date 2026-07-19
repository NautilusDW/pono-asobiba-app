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
        private static readonly int FogAmountId = Shader.PropertyToID("_FogAmount");

        private RawImage _image;
        private Material _material;
        private IInkVisualBackend _backend;
        private Texture _revealTexture;
        private bool _reduceMotion;
        private bool _computeFailedForSession;
        private float _fogAmount = 0.92f;

        public bool IsGpuActive => _backend is ComputeFluidInkBackend;
        public string BackendLabel => _backend?.Label ?? "なし";
        public bool Paused { get; set; }

        public void Initialize(Texture revealTexture, bool forceFallback = false)
        {
            ReleaseResources();
            enabled = true;
            _computeFailedForSession = forceFallback;
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

        public void SetFogAmount(float amount)
        {
            _fogAmount = Mathf.Clamp01(amount);
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
            try
            {
                _backend?.Reset();
            }
            catch (System.Exception exception)
            {
                DemoteToCpu(exception);
            }
            UpdateMaterial();
        }

        private void Update()
        {
            if (Paused)
            {
                return;
            }
            try
            {
                _backend?.Tick(Time.unscaledDeltaTime);
            }
            catch (System.Exception exception)
            {
                DemoteToCpu(exception);
            }
            UpdateMaterial();
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (hasFocus && _backend != null && !_backend.IsReady)
            {
                DemoteToCpu(new System.InvalidOperationException("FluidInk render targets were lost."));
            }
        }

        private void OnDestroy()
        {
            ReleaseResources();
        }

        public void ReleaseResources()
        {
            if (_image != null)
            {
                _image.material = null;
            }
            _backend?.Dispose();
            _backend = null;
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

        private void CreateBackend(bool forceFallback)
        {
            _backend?.Dispose();
            _backend = null;
            if (!forceFallback && !_computeFailedForSession && ComputeFluidInkBackend.IsSupported())
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
                        _computeFailedForSession = true;
                        Debug.LogWarning($"FluidInk compute fallback: {exception.Message}");
                    }
                }
            }
            _backend ??= new CpuInkVisualBackend();
        }

        private void DemoteToCpu(System.Exception exception)
        {
            if (_backend is ComputeFluidInkBackend && !_computeFailedForSession)
            {
                Debug.LogWarning($"FluidInk switched to CPU fallback: {exception.Message}");
            }
            _computeFailedForSession = true;
            CreateBackend(forceFallback: true);
            UpdateMaterial();
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
            _material.SetFloat(FogAmountId, _fogAmount);
        }
    }
}
