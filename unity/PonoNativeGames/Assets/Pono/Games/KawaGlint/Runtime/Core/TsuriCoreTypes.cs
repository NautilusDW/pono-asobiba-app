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

    /// <summary>レアリティ。 川の5種は Normal / Rare のみ使用 (Super は未使用)。</summary>
    public enum TsuriRarity
    {
        Normal,
        Rare,
        Super
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
        public float Weight;
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
