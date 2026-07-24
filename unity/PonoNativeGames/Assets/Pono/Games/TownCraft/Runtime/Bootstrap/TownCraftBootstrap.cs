using UnityEngine;

namespace Pono.TownCraft
{
    public sealed class TownCraftBootstrap : MonoBehaviour
    {
        private void Awake()
        {
            if (FindFirstObjectByType<TownCraftGameController>() != null) return;
            var controllerObject = new GameObject("TownCraftGameController");
            controllerObject.AddComponent<TownCraftGameController>();
            controllerObject.AddComponent<TownCraftQaCapture>();
        }
    }
}
