using Pono.MarbleRun3D.Gameplay;
using UnityEngine;

namespace Pono.MarbleRun3D.Bootstrap
{
    [DisallowMultipleComponent]
    public sealed class MarbleRunBootstrap : MonoBehaviour
    {
        private void Awake()
        {
            var controller = GetComponent<MarbleRunGameController>();
            if (controller == null) controller = gameObject.AddComponent<MarbleRunGameController>();
            RuntimeQaDriver.AttachIfRequested(gameObject, controller);
        }
    }
}
