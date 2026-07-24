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
        /// batch:1470 実装契約 §A-5 新設: 現在のロケーションの Spawns 台帳
        /// (SpeciesId → ロケーション WeightMul / Niche / MinProbability)。
        /// 旧 <c>SpeciesWeightMulById</c> (辞書に潰した WeightMul のみ) を置き換える --
        /// 新しい1段絶対重みモデルは MinProbability の floor も必要とするため、
        /// エントリそのものを保持する。 null/空 = 全種 WeightMul 1.0 / floor なし。
        /// </summary>
        public List<TsuriSpawnEntry> SpawnEntries = null;

        /// <summary>
        /// batch:1470 実装契約 §A-5 新設: 直近に**捕獲した** speciesId
        /// (新しいものが先頭、最大 <see cref="TsuriTuning.RecentCatchMemory"/> 件)。
        /// 抽選時に <see cref="TsuriTuning.RecentCatchWeightMul"/> を掛けるだけの
        /// 弱いペナルティで、旧 SessionSeenIds×0.30 の「実質退場」とは別物。
        /// </summary>
        public List<string> RecentCatchIds = new List<string>();

        /// <summary>
        /// batch:1470 実装契約 §A-5 新設: 最後に rare 以上を**捕獲**してからの
        /// キャスト数。 Cast() のたびに +1、rare+ の landed で 0 にリセットする
        /// (逃した場合は伸び続ける)。 <see cref="TsuriTuning.RarityPityMul"/> の入力。
        /// </summary>
        public int DryCastsSinceRarity = 0;

        /// <summary>
        /// batch:1470 実装契約 §A-5 新設: 図鑑に既に載っている speciesId の集合。
        /// **null = はじめて出会うボーナスを無効化** (既定 -- fishdex 未配線のテスト等)。
        /// 非 null なら、ここに含まれない種に FirstEncounterWeightMul が掛かる。
        /// </summary>
        public HashSet<string> KnownSpeciesIds = null;

        /// <summary>
        /// core.js の cloneSession() と同じ深い複製。 リスト/辞書は新インスタンスを
        /// 生成する (呼び出し側の state を絶対に mutate しないため)。 TsuriSpecies
        /// 参照そのものは共有してよい (魚マスターデータは不変)。
        /// </summary>
        public TsuriSession Clone()
        {
            // Spawns エントリ自体は静的な台帳 (TsuriWorldData.Locations) の不変オブジェクト
            // なので、リストだけ新規生成して要素参照は共有してよい (SpeciesPool と同じ扱い)。
            var spawnsClone = SpawnEntries != null ? new List<TsuriSpawnEntry>(SpawnEntries) : null;
            var knownClone = KnownSpeciesIds != null ? new HashSet<string>(KnownSpeciesIds) : null;

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
                RendaElapsedSec = RendaElapsedSec,
                SpawnEntries = spawnsClone,
                RecentCatchIds = new List<string>(RecentCatchIds),
                DryCastsSinceRarity = DryCastsSinceRarity,
                KnownSpeciesIds = knownClone
            };
            return clone;
        }
    }
}
