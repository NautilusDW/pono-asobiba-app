using System.Collections;
using System.IO;
using UnityEngine;

namespace Pono.TownCraft
{
    public sealed class TownCraftQaCapture : MonoBehaviour
    {
        private IEnumerator Start()
        {
            var args = System.Environment.GetCommandLineArgs();
            var index = System.Array.IndexOf(args, "-towncraftQaCapture");
            if (index < 0 || index + 1 >= args.Length) yield break;

            var outputPath = args[index + 1];
            yield return new WaitForSecondsRealtime(2f);
            Directory.CreateDirectory(Path.GetDirectoryName(outputPath) ?? ".");
            ScreenCapture.CaptureScreenshot(outputPath);
            yield return new WaitForSecondsRealtime(1f);
            Application.Quit();
        }
    }
}
