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
        //
        // v2 (2026-07-24, batch:kawaglint-multi-chance-prebite) 延長: 前あたりが
        // 「ちょんちょん(浅い)を何回か → グイン(深い)を複数回チャンス」という
        // 複数イベント構成に再設計されたため、2〜5秒では物理的に全イベントが
        // 収まらない。 6〜10秒へ延長して「浅い揺れ数回 → 深い引き0〜2回」の
        // 体験がちゃんと展開できる尺を確保する。 web tsuri-kawa/js/logic.js の
        // waitSecRange とは意図的に乖離させる (Unity 川専用チューニング、
        // TsuriCore.cs/TsuriTuning.cs 等の共通 Core は無変更)。
        public static readonly float[] WaitSecRange = { 6f, 10f };

        // 2連続以上逃した直後の再キャストは、企画書§2.3「待ち時間半減で即・次のあたりへ」
        // を「次にキャストした時の待ちを短くする」という形で実現する。
        //
        // v2 (2026-07-24, batch:kawaglint-multi-chance-prebite): WaitSecRange の
        // 延長 (2/5 -> 6/10) に合わせ、「半減」の比率関係 (min: 2->1 は50%、
        // max: 5->2.5 は50%) を保ったまま 3/5 へスケール。
        public static readonly float[] WaitSecRangeAfterMiss = { 3f, 5f };

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
