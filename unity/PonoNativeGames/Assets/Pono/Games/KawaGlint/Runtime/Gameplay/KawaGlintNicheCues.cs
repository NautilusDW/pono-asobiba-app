// ── Pono.KawaGlint.Gameplay / KawaGlintNicheCues.cs ──
// niche別の前あたりナレーション文言。 KawaGlint 海拡張 実装契約 v1.0 (C) §C-1
// 「niche 演出配線(最小)」。 asase は全 Spawns エントリが Midwater (契約§0-2/A-1台帳)
// なので PreBiteNarration(Midwater) は既存 NarrationPreBite 文字列と完全一致し、挙動不変。
using Pono.KawaGlint.Core;

namespace Pono.KawaGlint.Gameplay
{
    /// <summary>
    /// TsuriNiche → 前あたり(ちょんちょん)ナレーション文言の対応表。 演出専用 --
    /// tuning(窓・連打・待ち時間・WeightMul)には一切接続しない(TsuriNiche 自体の
    /// 不変条件を参照配線側でも維持する)。
    /// </summary>
    internal static class KawaGlintNicheCues
    {
        private const string NarrationPreBiteSurface = "みなもが きらきら ゆれてるよ…";
        private const string NarrationPreBiteBottomSand = "すなが もこもこ うごいてるよ…";
        private const string NarrationPreBiteRockCover = "いわの かげで なにか うごいたよ…";
        private const string NarrationPreBiteDeepOpen = "おおきな ひきなみが きてるよ…";

        /// <summary>
        /// Midwater (既定値)は <see cref="KawaGlintGameController.NarrationPreBite"/> を
        /// そのまま参照する(契約「定数を参照共有すること」-- 文字列リテラルを二重管理しない)。
        /// </summary>
        public static string PreBiteNarration(TsuriNiche niche)
        {
            switch (niche)
            {
                case TsuriNiche.Surface:
                    return NarrationPreBiteSurface;
                case TsuriNiche.BottomSand:
                    return NarrationPreBiteBottomSand;
                case TsuriNiche.RockCover:
                    return NarrationPreBiteRockCover;
                case TsuriNiche.DeepOpen:
                    return NarrationPreBiteDeepOpen;
                default:
                    return KawaGlintGameController.NarrationPreBite;
            }
        }
    }
}
