using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Pono.NativeShell
{
    public sealed class BootSceneController : MonoBehaviour
    {
        [SerializeField] private string gameSceneName = "10_HideSeekCreatures";

        private IEnumerator Start()
        {
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            yield return null;
            if (SceneManager.GetActiveScene().name != gameSceneName)
            {
                yield return SceneManager.LoadSceneAsync(gameSceneName, LoadSceneMode.Single);
            }
        }
    }
}
