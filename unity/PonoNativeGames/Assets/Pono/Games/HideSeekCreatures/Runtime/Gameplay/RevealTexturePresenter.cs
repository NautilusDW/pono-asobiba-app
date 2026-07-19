using Pono.HideSeek.Core;
using UnityEngine;

namespace Pono.HideSeekCreatures.Gameplay
{
    [DisallowMultipleComponent]
    public sealed class RevealTexturePresenter : MonoBehaviour
    {
        private readonly byte[] _uploadBuffer = new byte[RevealMaskModel.CellCount];
        private RevealMaskModel _model;
        private Texture2D _texture;
        private float _uploadAccumulator;
        private bool _forceUpload;

        public Texture2D Texture => _texture;

        public void Initialize(RevealMaskModel model)
        {
            if (_texture == null)
            {
                _texture = new Texture2D(
                    RevealMaskModel.Width,
                    RevealMaskModel.Height,
                    TextureFormat.R8,
                    mipChain: false,
                    linear: true)
                {
                    name = "Hide Seek Reveal Mask",
                    filterMode = FilterMode.Bilinear,
                    wrapMode = TextureWrapMode.Clamp,
                    hideFlags = HideFlags.DontSave
                };
            }
            Bind(model);
        }

        public void Bind(RevealMaskModel model)
        {
            _model = model;
            _uploadAccumulator = 0f;
            _forceUpload = true;
            UploadIfNeeded(force: true);
        }

        private void Update()
        {
            _uploadAccumulator += Time.unscaledDeltaTime;
            if (_uploadAccumulator < 1f / 30f)
            {
                return;
            }
            _uploadAccumulator = 0f;
            UploadIfNeeded(force: false);
        }

        public void UploadNow()
        {
            UploadIfNeeded(force: true);
        }

        private void UploadIfNeeded(bool force)
        {
            if (_model == null || _texture == null || (!force && !_forceUpload && !_model.IsDirty))
            {
                return;
            }
            _model.CopyValuesTo(_uploadBuffer);
            _texture.LoadRawTextureData(_uploadBuffer);
            _texture.Apply(updateMipmaps: false, makeNoLongerReadable: false);
            _model.MarkClean();
            _forceUpload = false;
        }

        private void OnDestroy()
        {
            if (_texture == null)
            {
                return;
            }
            if (Application.isEditor)
            {
                DestroyImmediate(_texture);
            }
            else
            {
                Destroy(_texture);
            }
        }
    }
}
