using UnityEngine;

namespace Pono.HideSeekCreatures.UI
{
    [DisallowMultipleComponent]
    public sealed class AccessibleLabel : MonoBehaviour
    {
        [SerializeField] private string label;

        public string Label => label;

        public void Configure(string value)
        {
            label = value ?? string.Empty;
        }
    }
}
