// ── Pono.KawaGlint.Core / TsuriSession.cs ──
// common/tsuri/core.js の session 形状 + cloneSession() の純C#移植。
using System.Collections.Generic;

namespace Pono.KawaGlint.Core
{
    /// <summary>
    /// つりゲームの1セッション状態。 core.js の cloneSession() が返す形状に対応する。
    /// TsuriCore の各操作関数はこのインスタンスを直接 mutate せず、必ず
    /// <see cref="Clone"/> した新しいインスタンスを返す (Web版の純関数契約と同じ)。
    /// </summary>
    public sealed class TsuriSession
    {
        public List<TsuriSpecies> SpeciesPool = new List<TsuriSpecies>();
        public TsuriMode Mode = TsuriMode.Relaxed;
        public TsuriPhase Phase = TsuriPhase.Idle;
        public string SpeciesId = null;
        public float WaitRemainingSec = 0f;
        public float BiteWindowRemainingSec = 0f;
        public float GaugePct = 0f;
        public int ConsecutiveMisses = 0;
        public Dictionary<string, float> PityBySpecies = new Dictionary<string, float>();
        public List<string> SessionSeenIds = new List<string>();
        public float FloorHeldSec = 0f;
        public List<TsuriCaughtEntry> CaughtLog = new List<TsuriCaughtEntry>();

        /// <summary>
        /// v2 (2026-07-24) 新設: Renda フェーズに入ってからの経過秒数の累積
        /// (タップの有無に関わらず加算、TapHook/自動フッキング/Cast で 0 に
        /// リセット)。 TsuriTuning.RendaHelpAfterSec ベースの時間おたすけ判定に使う。
        /// </summary>
        public float RendaElapsedSec = 0f;

        /// <summary>
        /// core.js の cloneSession() と同じ深い複製。 リスト/辞書は新インスタンスを
        /// 生成する (呼び出し側の state を絶対に mutate しないため)。 TsuriSpecies
        /// 参照そのものは共有してよい (魚マスターデータは不変)。
        /// </summary>
        public TsuriSession Clone()
        {
            var clone = new TsuriSession
            {
                SpeciesPool = new List<TsuriSpecies>(SpeciesPool),
                Mode = Mode,
                Phase = Phase,
                SpeciesId = SpeciesId,
                WaitRemainingSec = WaitRemainingSec,
                BiteWindowRemainingSec = BiteWindowRemainingSec,
                GaugePct = GaugePct,
                ConsecutiveMisses = ConsecutiveMisses,
                PityBySpecies = new Dictionary<string, float>(PityBySpecies),
                SessionSeenIds = new List<string>(SessionSeenIds),
                FloorHeldSec = FloorHeldSec,
                CaughtLog = new List<TsuriCaughtEntry>(CaughtLog),
                RendaElapsedSec = RendaElapsedSec
            };
            return clone;
        }
    }
}
