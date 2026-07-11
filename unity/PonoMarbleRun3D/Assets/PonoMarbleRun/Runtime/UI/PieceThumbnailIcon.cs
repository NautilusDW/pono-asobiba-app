using Pono.MarbleRun3D.Core;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.MarbleRun3D.UI
{
    /// <summary>
    /// Displays a pre-rendered view of the real wooden piece geometry. The PNGs are
    /// generated in the Editor, so the Player needs no thumbnail cameras or render
    /// textures and remains inexpensive on Android.
    /// </summary>
    [DisallowMultipleComponent]
    [RequireComponent(typeof(Image))]
    public sealed class PieceThumbnailIcon : MonoBehaviour
    {
        public const string ResourceFolder = "PieceThumbnails/";

        [SerializeField] private MarblePieceKind _kind;
        private Image _image;

        public MarblePieceKind Kind => _kind;
        public Image Image => _image != null ? _image : (_image = GetComponent<Image>());

        public void Configure(MarblePieceKind kind)
        {
            _kind = kind;
            var image = Image;
            image.sprite = LoadSprite(kind);
            image.color = Color.white;
            image.preserveAspect = true;
            image.raycastTarget = false;

            if (image.sprite == null)
                Debug.LogWarning("ぶひんの えが みつかりません " + ResourcePath(kind));
        }

        public static Sprite LoadSprite(MarblePieceKind kind)
        {
            return Resources.Load<Sprite>(ResourcePath(kind));
        }

        public static string ResourcePath(MarblePieceKind kind)
        {
            return ResourceFolder + kind;
        }
    }
}
