using UnityEngine;
using UnityEngine.UI;

namespace Pono.NativeShell
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RectTransform), typeof(Image))]
    public sealed class AspectFitFitter : MonoBehaviour
    {
        private RectTransform _rectTransform;
        private RectTransform _parent;
        private Image _image;
        private Vector2 _lastParentSize;
        private Vector2 _lastTextureSize;

        private void Awake()
        {
            _rectTransform = (RectTransform)transform;
            _parent = transform.parent as RectTransform;
            _image = GetComponent<Image>();
            Apply(force: true);
        }

        private void LateUpdate()
        {
            Apply(force: false);
        }

        private void Apply(bool force)
        {
            if (_parent == null || _image == null || _image.sprite == null)
            {
                return;
            }

            var parentSize = _parent.rect.size;
            var textureSize = _image.sprite.rect.size;
            if (!force && parentSize == _lastParentSize && textureSize == _lastTextureSize)
            {
                return;
            }

            _lastParentSize = parentSize;
            _lastTextureSize = textureSize;
            if (parentSize.x <= 0f || parentSize.y <= 0f || textureSize.x <= 0f || textureSize.y <= 0f)
            {
                return;
            }

            var scale = Mathf.Min(parentSize.x / textureSize.x, parentSize.y / textureSize.y);
            _rectTransform.anchorMin = _rectTransform.anchorMax = new Vector2(0.5f, 0.5f);
            _rectTransform.pivot = new Vector2(0.5f, 0.5f);
            _rectTransform.anchoredPosition = Vector2.zero;
            _rectTransform.sizeDelta = textureSize * scale;
        }
    }
}
