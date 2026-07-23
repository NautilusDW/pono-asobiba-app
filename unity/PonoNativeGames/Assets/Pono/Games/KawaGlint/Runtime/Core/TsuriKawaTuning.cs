// ── Pono.KawaGlint.Core / TsuriKawaTuning.cs ──
// tsuri-kawa/js/logic.js の川づり固有チューニングのうち、waitSecRange 系のみを
// 移植する。 セーブ形状 (SAVE_KEY/normalizeSave/buildCatchEvent/どんぐり) は
// 今回のスコープ外 (Unity版はセッション内バケツ表示のみ。将来 PlayerPrefs +
// NativeShell 連携で別タスク)。
namespace Pono.KawaGlint.Core
{
    public static class TsuriKawaTuning
    {
        // 川は海より短くテンポよく釣れる、という企画書§2.1の方針。
        // 数値は「初期目安値」(実装者判断で微調整可、フィールド名は変更しないこと)。
        public static readonly float[] WaitSecRange = { 2f, 5f };

        // 2連続以上逃した直後の再キャストは、企画書§2.3「待ち時間半減で即・次のあたりへ」
        // を「次にキャストした時の待ちを短くする」という形で実現する。
        public static readonly float[] WaitSecRangeAfterMiss = { 1f, 2.5f };

        /// <summary>次にキャストする際の waitSecRange。連続逃し中は短めにして「すぐ次のあたり」を作る。</summary>
        public static void NextWaitSecRange(int misses, out float min, out float max)
        {
            if (misses > 0)
            {
                min = WaitSecRangeAfterMiss[0];
                max = WaitSecRangeAfterMiss[1];
            }
            else
            {
                min = WaitSecRange[0];
                max = WaitSecRange[1];
            }
        }
    }
}
