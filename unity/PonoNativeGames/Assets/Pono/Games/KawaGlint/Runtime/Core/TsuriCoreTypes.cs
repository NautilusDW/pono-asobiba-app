// ── Pono.KawaGlint.Core / TsuriCoreTypes.cs ──
// common/tsuri/core.js の状態機械が扱う型群の純C#移植 (UnityEngine非依存)。
// フィールド名・数値・挙動は Web 版 core.js / fish-data.js に忠実に合わせる
// (企画書どおり「変更禁止」契約)。 MonoBehaviour は一切登場しない。
using System.Collections.Generic;

namespace Pono.KawaGlint.Core
{
    /// <summary>
    /// つりゲームのフェーズ。 core.js の
    /// 'idle'|'wait'|'bite'|'renda'|'tug'|'landed'|'escaped' に対応する。
    /// Tug は企画書§3.7 のスタブで、Phase 0 (TsuriGearMods.TugEnabled=false かつ
    /// TsuriTuning.TugEnabledDefault=false) では実際には遷移しない。
    /// </summary>
    public enum TsuriPhase
    {
        Idle,
        Wait,
        Bite,
        Renda,
        Tug,
        Landed,
        Escaped
    }

    /// <summary>のんびり / めいじん モード。 Phase 0 は Relaxed のみ実際に使用する。</summary>
    public enum TsuriMode
    {
        Relaxed,
        Expert
    }

    /// <summary>
    /// レアリティ。 batch:1470 実装契約 §A-1 / §X-7 で <see cref="Legendary"/> を
    /// **末尾に追加**した (今回は在籍種ゼロ、段だけ用意する)。
    ///
    /// ★永久契約★ この enum の宣言順 = Rendering 層の rarity tier index である。
    /// (int)Normal==0 / Rare==1 / Super==2 / Legendary==3 が
    /// KawaGlintRarityMotion / KawaGlintRarityPalette / KawaGlintHud.RarityDotColor の
    /// 添字そのものなので、**途中への挿入は永久禁止**(追加は必ず末尾)。
    /// EditMode テスト TsuriDrawModelEditModeTests.TsuriRarityEnumOrder_IsStable が固定する。
    /// </summary>
    public enum TsuriRarity
    {
        Normal,
        Rare,
        Super,
        Legendary
    }

    /// <summary>
    /// batch:1470 実装契約 §A-1 / §X-8 新設。 生物の「動きの型」。
    ///
    /// 仕事は意図的に2つだけに限定されている:
    /// (1) 非遊泳生物のゲート -- <see cref="Shell"/> / <see cref="Crawler"/> は
    ///     尾を振らず、水底から出現し、浮上しない。
    /// (2) Rendering 側 archetype (シルエット形状) の **既定フォールバック**。
    ///     種→archetype の明示表は Rendering 層 (KawaGlintFishSilhouettes) が正本で、
    ///     こちらは登録漏れの保険。
    ///
    /// 不変条件 (§3.5-7 改訂): tuning (窓・連打・待ち時間・確率) には一切接続しない。
    /// **Rendering への接続は明示的に許可**する (archetype 解決は tuning ではない)。
    /// </summary>
    public enum TsuriMotionClass
    {
        Standard,
        Slim,
        Flat,
        Crawler,
        Shell,
        Drifter,
        Heavy
    }

    /// <summary>
    /// fish-data.js の challengeProfile に対応。 Runs は今回すべて 0 (Web版と同じ)。
    /// </summary>
    public sealed class TsuriChallengeProfile
    {
        public float WindowMul;
        public int TapsBase;
        public int Runs;
    }

    /// <summary>fish-data.js の魚種エントリに対応する純データ型。</summary>
    public sealed class TsuriSpecies
    {
        public string Id;
        public string Name;
        public TsuriRarity Rarity;
        public string Size;
        public bool Edible;
        public string InventoryKey;

        /// <summary>
        /// batch:1470 実装契約 §A-1 **破壊的変更**: 旧 <c>Weight</c> (同レアリティ内の
        /// 絶対重み 4〜22) を廃止し、**同レアリティ内の相対倍率** (基準 1.0、範囲
        /// 0.20〜1.50) に置き換えた。 ★意図的な「改名」★ -- 同名のまま意味だけ変えると
        /// 全呼び出し箇所が静かに壊れるため、コンパイルエラーで気付けるようにしている。
        ///
        /// 新しい抽選式 (TsuriCore.ComputeSpeciesProbabilities):
        ///   W = RarityBaseWeight(rarity) × SpeciesWeightMul × ロケーション WeightMul
        ///       × RecentPenalty × RarityPity × FirstEncounterBonus
        /// </summary>
        public float SpeciesWeightMul = 1.0f;

        /// <summary>
        /// batch:1470 実装契約 §A-1 / §X-8 新設。 非遊泳生物のゲートと Rendering 側
        /// archetype 既定フォールバックにのみ使う (tuning には接続しない)。
        /// </summary>
        public TsuriMotionClass MotionClass = TsuriMotionClass.Standard;

        public bool HasSizeRange;
        public float SizeMinCm;
        public float SizeMaxCm;
        public TsuriChallengeProfile ChallengeProfile;

        /// <summary>
        /// 海拡張 (KawaGlint 海拡張 実装契約 v1.0 §A-2) で追加した純加算フィールド。
        /// この種が出現しうる水域。 既存5種にも設定するが tuning には接続しない。
        /// </summary>
        public TsuriWaterZone[] Zones = null;

        /// <summary>
        /// 図鑑表示用の代表 niche (§3.4)。 演出駆動しない (静的検査レベルで tuning 接続禁止)。
        /// </summary>
        public TsuriNiche RepresentativeNiche = TsuriNiche.Midwater;
    }

    /// <summary>core.js の caughtLog エントリ ({ speciesId, at }) に対応。</summary>
    public sealed class TsuriCaughtEntry
    {
        public string SpeciesId;
        public long AtMs;
    }

    /// <summary>
    /// core.js の GEAR_MODS_NEUTRAL に対応。 装備未実装 (Phase 0) の間は常に
    /// <see cref="Neutral"/> を渡す契約。 TugEnabled は Phase 0 の
    /// GEAR_MODS_NEUTRAL には存在しない gearMods.tugEnabled 相当で、常に false。
    /// </summary>
    public sealed class TsuriGearMods
    {
        public float WindowMul = 1f;
        public float GainMul = 1f;
        public float DecayMul = 1f;
        public bool TugEnabled = false;

        public static readonly TsuriGearMods Neutral = new TsuriGearMods();
    }
}
