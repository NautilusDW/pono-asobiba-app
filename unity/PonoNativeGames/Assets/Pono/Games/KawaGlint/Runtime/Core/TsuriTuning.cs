// ── Pono.KawaGlint.Core / TsuriTuning.cs ──
// common/tsuri/core.js の TUNING / GEAR_MODS_NEUTRAL / RARITY_BASE_WEIGHT /
// SESSION_DEDUPE_WEIGHT_MUL / TUG_CONFIG の純C#移植。 数値・意味は一切変えない
// (企画書の「変更禁止」契約)。
// v2 (2026-07-24): 実機フィードバックにより連打バランス3定数
// (GaugeDecayPerSec / RendaGainMul / RendaHelpAfterSec) のみ Unity 版で
// 意図的に乖離。 web core.js は不変 (batch:1455-kawaglint-bite-feel-and-renda-balance)。
namespace Pono.KawaGlint.Core
{
    /// <summary>
    /// core.js の TUNING 表に対応する定数群。 フィールド名・数値は原典どおり。
    /// </summary>
    public static class TsuriTuning
    {
        // windowSec: 本あたり後のフッキング猶予(基本値)。
        private const float WindowSecRelaxed = 1.5f;
        private const float WindowSecExpert = 0.8f;

        // windowGraceSec: relaxed は実効2.0秒(猶予込み)。
        private const float WindowGraceSecRelaxed = 0.5f;
        private const float WindowGraceSecExpert = 0f;

        /// <summary>連打ゲージが0まで落ちない床。</summary>
        public const float GaugeFloorPct = 30f;

        /// <summary>
        /// 放置時のゲージ減衰(gearMods.decayMulで補正、Phase0は1固定)。
        /// v2 (2026-07-24): 実機フィードバック(連打が簡単すぎる)により 4→9 に
        /// 意図的に引き上げ(Unity版のみ、web core.jsは不変)。
        /// </summary>
        public const float GaugeDecayPerSec = 9f;

        /// <summary>
        /// v2 (2026-07-24) 新設: TapRenda の per-tap gain に一律で掛ける倍率。
        /// 0.7 = 全種の gain を 70% に減衰させ、キャッチまでの必要タップ数を
        /// 増やす(種間の相対難度は不変)。 web core.js には存在しない Unity 版
        /// 専用の乖離定数。
        /// </summary>
        public const float RendaGainMul = 0.7f;

        /// <summary>
        /// v2 (2026-07-24) 新設: Renda 突入から合計この秒数(relaxedのみ)経過したら
        /// 床未到達でもおたすけを発動する第2の安全網。 GaugeDecayPerSec を
        /// 9 に引き上げたことで、1tap/s 程度の遅いタップの子は毎タップ後に
        /// ゲージが床の上に浮き FloorHeldSec が毎回リセットされ続け、既存の
        /// 床おたすけ(HelpAfterFloorSec=10s 連続滞在)が永久に発動しない新しい
        /// 詰みが生まれるため、滞在合計時間ベースでこれを塞ぐ。
        /// web core.js には存在しない Unity 版専用の乖離定数。
        /// </summary>
        public const float RendaHelpAfterSec = 18f;

        /// <summary>2連続逃し→3回目は窓2倍。</summary>
        public const int AssistDoubleWindowAfterMisses = 2;

        /// <summary>3連続逃し→4回目は自動フッキング(連打から開始)。</summary>
        public const int AutoHookAfterMisses = 3;

        /// <summary>床到達から10秒でおたすけ発動(relaxedのみ)。</summary>
        public const float HelpAfterFloorSec = 10f;

        /// <summary>同一speciesを逃すたび窓+20%累積(super等の救済)。</summary>
        public const float PityWindowBonusPctPerEscape = 20f;

        // ═══ batch:1470 抽選モデル (実装契約 §A-2) ═══════════════════════════
        // 旧 SessionDedupeWeightMul (=0.30、セッション内で釣った種を 30% まで減衰) は
        // 廃止した。 あれが「順番に釣れる」体感の主因 -- 釣った種が実質退場するため、
        // プールが1周するまで同じ魚が二度と出ない = 抽選が「順番」に見えていた。
        // 代わりに「直近1件だけを 0.80 倍」という、独立抽選を壊さない弱い味付けにする。

        /// <summary>
        /// 直近 <see cref="RecentCatchMemory"/> 件の捕獲 id に掛ける重み倍率。
        /// 0.80 = 「ほんの少し出にくい」だけ。 **同じ種が2連続で出ることは普通に起きる**
        /// (独立抽選の担保)。 EditMode テスト A5 が連続同種率 6〜24% を機械的に固定する。
        /// </summary>
        public const float RecentCatchWeightMul = 0.80f;

        /// <summary>直近捕獲メモリの長さ (件)。 1 = 「ひとつ前に釣った魚」だけ。</summary>
        public const int RecentCatchMemory = 1;

        /// <summary>レアリティ pity が効き始めるまでの空キャスト数。</summary>
        public const int RarityPityStartCasts = 8;

        /// <summary>空キャスト1回あたりの rare+ 重み加算量。</summary>
        public const float RarityPityStepPerCast = 0.25f;

        /// <summary>レアリティ pity の上限倍率 (DryCasts = 8+20 = 28 で到達)。</summary>
        public const float RarityPityCapMul = 6.0f;

        /// <summary>図鑑未登録種 (はじめて出会う種) に掛ける重み倍率。</summary>
        public const float FirstEncounterWeightMul = 1.6f;

        /// <summary>
        /// レシピ必須魚 (あゆ/さけ@あさせ、えび/あじ@すなはま) の最低出現確率。
        /// TsuriSpawnEntry.MinProbability の既定値として使う。
        /// </summary>
        public const float RecipeMinProbability = 0.05f;

        /// <summary>TUG_CONFIG.enabledDefault。 Phase 0 は常に false。</summary>
        public const bool TugEnabledDefault = false;

        /// <summary>
        /// レアリティ pity 倍率。 rare/super/legendary の**全種に一律**で掛ける
        /// (層別に別倍率を掛けてはならない -- レアリティ間の相対比は不変、レア層全体の
        /// 総量だけが膨らむ)。 リセットは「捕獲 (landed)」であって「遭遇」ではない
        /// (逃した場合は伸び続ける = 既存の窓 pity と哲学一致)。
        /// </summary>
        public static float RarityPityMul(int dryCastsSinceRarity)
        {
            int dry = dryCastsSinceRarity - RarityPityStartCasts;
            if (dry <= 0)
            {
                return 1f;
            }

            float mul = 1f + (RarityPityStepPerCast * dry);
            return mul > RarityPityCapMul ? RarityPityCapMul : mul;
        }

        /// <summary>TUNING.windowSec[mode] に対応。</summary>
        public static float WindowSec(TsuriMode mode)
        {
            return mode == TsuriMode.Expert ? WindowSecExpert : WindowSecRelaxed;
        }

        /// <summary>TUNING.windowGraceSec[mode] に対応。</summary>
        public static float WindowGraceSec(TsuriMode mode)
        {
            return mode == TsuriMode.Expert ? WindowGraceSecExpert : WindowGraceSecRelaxed;
        }

        /// <summary>
        /// レアリティ基準重み。 batch:1470 実装契約 §A-2 で 70/25/5 の「2段正規化用
        /// シェア値」から **1段絶対重み** へ作り直した (旧モデルは同一レアリティに何種
        /// 居ても層シェアが 25/95 で固定されるため、rare 1種のロケーションで
        /// salmon@asase 26.3% / kakou 40.0% という「レアが常連」状態を生んでいた)。
        ///
        /// 新モデルでは種を足すほど自然にその層内で薄まる。 実測 (pity OFF):
        /// normal 89〜94% / rare 6.3〜9.6% / super 0〜0.93% / legendary 0%。
        /// </summary>
        public static float RarityBaseWeight(TsuriRarity rarity)
        {
            switch (rarity)
            {
                case TsuriRarity.Normal: return 100f;
                case TsuriRarity.Rare: return 13f;
                case TsuriRarity.Super: return 2.0f;
                case TsuriRarity.Legendary: return 0.55f; // 今回は在籍種ゼロ。定義のみ (§X-7)
                default: return 1f;
            }
        }
    }
}
