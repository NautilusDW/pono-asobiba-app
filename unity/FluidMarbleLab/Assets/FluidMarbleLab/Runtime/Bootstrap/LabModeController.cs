using System;
using UnityEngine;

namespace Pono.FluidMarbleLab
{
    public enum LabMode
    {
        Build,
        Flow
    }

    [DisallowMultipleComponent]
    public sealed class LabModeController : MonoBehaviour
    {
        [SerializeField] private LabMode mode = LabMode.Flow;

        public LabMode Mode => mode;
        public event Action<LabMode> ModeChanged;

        public void SetMode(LabMode nextMode)
        {
            if (mode == nextMode)
            {
                return;
            }
            mode = nextMode;
            ModeChanged?.Invoke(mode);
        }

        public void ToggleMode()
        {
            SetMode(mode == LabMode.Flow ? LabMode.Build : LabMode.Flow);
        }

        public void NotifyInitialMode()
        {
            ModeChanged?.Invoke(mode);
        }
    }
}
