using System;
using UnityEngine;

namespace Pono.NativeShell
{
    public static class NativeGameBridge
    {
        public static event Action ExitRequested;

        public static void RequestExit()
        {
            var handler = ExitRequested;
            if (handler != null)
            {
                handler.Invoke();
                return;
            }
#if UNITY_EDITOR
            Debug.Log("Native game exit requested.");
#else
            Application.Quit();
#endif
        }
    }
}
