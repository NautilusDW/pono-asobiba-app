// ── Pono.KawaGlint.Core / TsuriTuning.cs ──
// common/tsuri/core.js の TUNING / GEAR_MODS_NEUTRAL / RARITY_BASE_WEIGHT /
// SESSION_DEDUPE_WEIGHT_MUL / TUG_CONFIG の純C#移植。 数値・意味は一切変えない
// (企画書の「変更禁止」契約)。
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

        /// <summary>放置時のゲージ減衰(gearMods.decayMulで補正、Phase0は1固定)。</summary>
        public const float GaugeDecayPerSec = 4f;

        /// <summary>2連続逃し→3回目は窓2倍。</summary>
        public const int AssistDoubleWindowAfterMisses = 2;

        /// <summary>3連続逃し→4回目は自動フッキング(連打から開始)。</summary>
        public const int AutoHookAfterMisses = 3;

        /// <summary>床到達から10秒でおたすけ発動(relaxedのみ)。</summary>
        public const float HelpAfterFloorSec = 10f;

        /// <summary>同一speciesを逃すたび窓+20%累積(super等の救済)。</summary>
        public const float PityWindowBonusPctPerEscape = 20f;

        /// <summary>
        /// セッション内で既に釣った(landedした) speciesId は、再抽選時にこの倍率で
        /// 重み減衰する(完全排除はしない=図鑑コンプ待ちの子が同じ魚しか出ない詰みを作らない)。
        /// </summary>
        public const float SessionDedupeWeightMul = 0.3f;

        /// <summary>TUG_CONFIG.enabledDefault。 Phase 0 は常に false。</summary>
        public const bool TugEnabledDefault = false;

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
        /// RARITY_BASE_WEIGHT に対応。 未知のレアリティは core.js 側で
        /// hasOwnProperty チェックにより 1 になる (呼び出し側で処理)ため、
        /// ここでは既定3種のみを返す。
        /// </summary>
        public static float RarityBaseWeight(TsuriRarity rarity)
        {
            switch (rarity)
            {
                case TsuriRarity.Normal: return 70f;
                case TsuriRarity.Rare: return 25f;
                case TsuriRarity.Super: return 5f;
                default: return 1f;
            }
        }
    }
}
