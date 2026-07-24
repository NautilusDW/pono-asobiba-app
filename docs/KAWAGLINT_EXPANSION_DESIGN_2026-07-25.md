# KawaGlint 拡張設計(batch:1470)— 設計フェーズ成果物(生ログ保存版)

> **ステータス: 設計完了・統合フェーズ中断・実装未着手。**
> Opus5 による 5 領域の並列設計と 6 件のクロスレビューは完了したが、それらを 1 本にまとめる
> 統合フェーズの実行中にセッションが終了したため、**ここには統合前の生の設計テキストをそのまま**
> 保存してある。矛盾はクロスレビュー(§6以降)で指摘されているので、実装着手前に必ず全文を読み、
> 指摘を反映しながら進めること。
>
> 経緯・引き継ぎ手順は AGENTS_CLAIMS.md の batch:1470 エントリと HANDOFF.md を参照。

## ユーザーからの元フィードバック(2026-07-25、実プレイ後)

1. 生き物の種類を倍ぐらいに増やしたい(現在15種)
2. 「順番に釣れる感じ」ではなく、同じのが連続で釣れたりもする / レアはなかなか出ない確率調整
3. レア種は動きやシルエットが違って一目で分かるようにしたい(魚影は何種類かでよい)
4. 背景が「最低限」。サンゴ・岩・海藻をちゃんと作ってほしい(全体的に)
5. 沖の船で鮭が釣れたが生態的に正しいか(補足: 実際には海でも釣れる。北海道のアキアジ等)
6. 背景を静止画っぽくしたくない。雲が流れる・木々が揺れる・レイヤーを増やして凝った感じに
7. 水面が二重に見える(背景の焼き込み水面線とエフェクトの線がズレている)/ ウキがしょぼい /
   食いついたら引っ張られてる描写を追加

---

## 1. レア種の視認性(シルエット・動きの差別化)設計

以下、実装者にそのまま渡せる設計仕様です。

---

# KawaGlint レア種 視認性設計仕様 (2026-07-25)

## 0. 実コード調査で確定した現状 (前提)

| 項目 | 実測 |
|---|---|
| 魚影アート実体 | `Sprites/` に shadow PNG は **6点のみ** (`fish_ayu` / `fish_nijimasu` / `fish_zarigani` / `fish_sake` / `fish_nagagutsu` / `fish_unagi`)。1024px幅・単色 **#0F2C56** ベタ・頭=左(u=0)/尾=右(u=1)・四辺 38px (=約4%) 透明パッド |
| 残り9種 | `KawaGlintSpriteCatalog.LoadFishShadow` → `KawaGlintProceduralFishArt.GetSilhouette` にフォールバック。**tai / ika / maguro (=レア・スーパー) は全部ただの色違い涙型** |
| 魚影の動き | 全魚が**単一マテリアル** `KawaFishWag` を共有。per-instance は `_WagPhase` のみ MPB 経由。`_WagStartU`(0.55) / `_WagWave`(4.0) はマテリアル定数 = **全魚同一の尾振りプロファイル** |
| ターゲット魚の wag | `KawaGlintActorsController` が mode 別 `_WagAmp`/`_WagSpeed` を MPB で切替 (Approach 0.03/8.2, Thrash 0.05/16, Flee 0.055/18)。**rarity は一切見ていない** |
| 接近軌道 | `SetTargetFishApproach` = `Vector3.LerpUnclamped(appear(-1.5), anchor(0.6), progress)` の**直線1本のみ**。rarity 非依存 |
| サイズ | `SpeciesWorldLength` は `size` s/m/l → 1.2/1.8/2.5 のみ。rarity 非依存 |
| sortingOrder 契約 | Sky0/Water1/BgArt2/SunGlow6/Clouds8/Riverbed10/DecorBack11/Plants12/**Fish14**/Caustics16/Motes18/DecorFront20/Surface30/Ring32/Line33/Bobber34/Droplet35/Shore40/Angler42。**13 と 15 と 19 が空き** |

**結論: 現状 rarity は視覚に一切出ていない。** ユーザーの「レア感がない」は主観ではなく実装事実。

---

## 1. 設計原則: 3チャンネル冗長化

3〜7歳は1つの手がかりを見落とす。**シルエット / 動き / オーラ の3チャンネルを独立に成立させ、どれか1つ拾えば「レアだ」と分かる**構成にする。同時に**時間差**をつけて演出のドラマを作る:

| タイミング | チャンネル | 読み |
|---|---|---|
| 出現直後 (progress 0〜) | **シルエット** + サイズ | 「あれ、かたちが ちがう…おおきい」 |
| 接近中 (progress 0〜1) | **動き** (ゆっくり・下から・ゆらり) | 「なんか ゆっくり あがってくる」 |
| progress ≥ 0.45 | **オーラ** (きらきら) | 「わ! ひかってる!」← 確定の瞬間 |
| 前あたり〜連打 | 引きの強さ | 「ぐいって ひっぱるちから つよい!」 |

**キャスト直後にオーラを出さないこと** (重要)。9割の通常キャストで即「今回はハズレ」と分かってしまい、待ち時間の緊張が死ぬ。

---

## 2. rarity tier の抽象化 (並走タスク耐性)

魚種倍増・確率調整タスクが **新 rarity 段 (legend 等) を足す可能性がある**ため、全テーブルを int tier で引き、**必ず Clamp する**。

```
tier: 0 = Normal, 1 = Rare, 2 = Super, 3+ = 未来の上位段 → Clamp(tier, 0, Table.Length-1)
```

- Rendering 層は `Pono.KawaGlint.Core` を参照しない契約 (`KawaGlintSpriteCatalog` クラスdoc) を維持するため、**Gameplay 層が plain struct に詰めて渡す**。

```csharp
// Runtime/Rendering/KawaGlintFishPresentation.cs (新規, Rendering, Core非参照)
public readonly struct KawaGlintFishPresentation
{
    public readonly string SpeciesId;
    public readonly int RarityTier;   // 0/1/2/(3+)
    public readonly float WorldLength; // rarity倍率適用後の最終値
}
```

`KawaGlintActorsController.ShowTargetFish(string, float)` は残し (tier=0 委譲) 、`ShowTargetFish(in KawaGlintFishPresentation)` を新設。GameController 側 `_actors.ShowTargetFish(new KawaGlintFishPresentation(id, (int)species.Rarity, SpeciesWorldLength(species) * RarityLengthMul(tier)))`。

---

## 3. シルエット差別化

### 3.1 方式判断: **アーキタイプ・ライブラリ方式 (実アート) + 手続き型はフォールバック専用に降格**

- ユーザー「魚影は何種類かでいい」= **種ごとの個別アートは不要**。体型カテゴリ単位の共有ライブラリが正解。
- 手続き型の拡張だけでは不可。ベタ塗り楕円+三角尾では「一目でレア」に届かない (背景アート品質にも負けている)。
- ただし手続き型は**削除しない**。未知IDの最終保険として残す。現在の「9種が事実上手続き型を正としている」状態を**異常事態として解消**するのが本設計の主眼。

### 3.2 アーキタイプ一覧 (11キー)

| archetype key | 見た目 | 割当 (現15種) | 既存アート流用 | 新規発注 |
|---|---|---|---|---|
| `slim_small` | 細身の小魚・浅い二又尾 | ayu, iwashi, aji | `fish_ayu_shadow` | — |
| `standard_mid` | 標準紡錘形 (**tier0 既定**) | nijimasu | `fish_nijimasu_shadow` | — |
| `flat_disc` | ひらべったい菱形・縁ひらひら | karei | — | **P1** |
| `crawler` | ハサミ+脚 | zarigani, ebi | `fish_zarigani_shadow` | — |
| `object_boot` | 長靴 | treasure_boot | `fish_nagagutsu_shadow` | — |
| `object_shell` | 扇形の貝 | treasure_kaigara | (手続き型 Fan) | P2 |
| `star5` | 五芒星 | hitode | (手続き型 Star) | P2 |
| `broad_fancy` | **体高が高く・ヒレが大きい・優雅な深い二又尾** (**tier1 既定**) | tai | — | **P1** |
| `salmon_rare` | 既存さけ形 | salmon | `fish_sake_shadow` | — |
| `tentacle` | 丸い胴 + ひらひら足5〜6本 | ika | — | **P1** |
| `serpentine` | 長いくねくねS字 | unagi | `fish_unagi_shadow` | — |
| `torpedo_giant` | **太い紡錘 + 三日月尾 + 高い背びれ** (**tier2 既定**) | maguro | — | **P1** |

**tier 既定フォールバックが最重要**: 並走タスクが新種を足してテーブル未登録でも、rarity から自動で「それっぽい」魚影が付く。0 → `standard_mid` / 1 → `broad_fancy` / 2+ → `torpedo_giant`。

### 3.3 解決順序 (`KawaGlintSpriteCatalog.LoadFishShadow` 改修)

```
1. ShadowPaths[speciesId] の PNG        ← 種専用の手描きが最優先 (既存6種)
2. Shadows/sil_<archetype>_shadow.png   ← アーキタイプ共有ライブラリ (新設)
3. KawaGlintProceduralFishArt           ← 最終保険 (通常到達しない)
```

種→アーキタイプ表は **Rendering 層**に置く (`Runtime/Rendering/KawaGlintFishSilhouettes.cs`)。アートのメタデータであってゲームデータではないため、Core/Rendering 分離契約に抵触しない。

> **絶対禁止**: カタログ経由で得た Sprite/Texture を `KawaGlintActorsController.RegisterGeneratedAsset` に渡さないこと。static キャッシュ + Resources 実体なので OnDestroy で破壊するとアプリ寿命の間ずっと壊れる (既存クラスdocの警告どおり)。新規に手続き生成するオーラ用テクスチャ **だけ** 登録する。

### 3.4 サイズによる補強

`RarityLengthMul`: tier0 **1.00** / tier1 **1.15** / tier2 **1.35** を `SpeciesWorldLength` に乗算。
`maguro` は size=l (2.5) × 1.35 = **3.38 world units** となり画面内で圧倒的。`_wrapMaxX + len*0.5` の出現位置計算はそのまま成立するので追加対応不要。

---

## 4. 動き差別化 (最重要チャンネル)

`Runtime/Rendering/KawaGlintRarityMotion.cs` を新設。MonoBehaviour を持たない純データ+純関数 (既存 `KawaGlintSplashMath` / `KawaGlintPreBitePlan` と同じ規約) にして EditMode からテスト可能にする。

### 4.1 パラメータ表 (確定値)

| パラメータ | tier0 Normal | tier1 Rare | tier2 Super | 効果 |
|---|---|---|---|---|
| `LengthMul` | 1.00 | 1.15 | 1.35 | 大きさ |
| `AppearY` | −1.5 (現行) | −2.2 | −3.0 | 深いところから出る |
| `DepthHoldFrac` | 0.0 | 0.25 | 0.50 | 深度を保ってから浮上 |
| `ApproachExp` | 1.0 (線形/現行) | 1.15 | 1.35 | ゆっくり近づく (後半失速) |
| `WeaveAmpY` (world) | 0.0 | 0.22 | 0.34 | 上下にゆらり蛇行 |
| `WeaveHz` | — | 0.32 | 0.22 | 蛇行の周期 (ゆったり) |
| `WagStartU` | 0.55 (現行) | 0.45 | **0.30** | 体の後ろ半分がうねる |
| `WagWave` | 4.0 (現行) | 4.6 | 6.0 | 尾へ伝わる波の遅れ |
| `WagSpeed` Approach/Thrash/Flee | 8.2/16/18 (現行) | 5.6/12.5/16 | **4.2/10/14** | ゆっくり大きく |
| `WagAmp` Approach/Thrash/Flee | .030/.050/.055 (現行) | .036/.052/.058 | .042/.055/.060 | 振幅 (パッド4%以内) |
| `ThrashAmpX` | 0.15 (現行) | 0.20 | 0.26 | 連打中の暴れ幅 |
| `ThrashFreq` (rad/s) | 20 (現行) | 16 | 13 | 重い魚ほど遅く大きく |
| `PreBiteLungeMul` | 1.00 | 1.25 | 1.50 | 前あたりの突っ込みが強い |
| `TwitchIntensityMul` | 1.00 | 1.15 | 1.30 | ウキのちょんちょんが強い |
| `BiteSinkMul` | 1.00 | 1.15 | 1.30 | ウキが深く沈む |
| `FleeSpeed` | 8.0 (現行) | 7.0 | 6.0 | 逃げも悠然 |

**設計思想**: レアほど「速い/激しい」ではなく **「遅い・大きい・重い」**。子供が怖がらず、かつ「おおものだ」が直感で伝わる。高速化は不気味さと事故 (光過敏) の両方のリスク。

### 4.2 `SetTargetFishApproach` の拡張式

```
pClamped = Clamp01(progress)                       // 前あたりの overshoot は Y に効かせない
xT       = progress                                 // X は現行どおり LerpUnclamped (overshoot 保持)
yBase    = SmoothStep(DepthHoldFrac, 1, pClamped)   // 深度ホールド → 浮上
yT       = Pow(yBase, ApproachExp)
window   = Sin(PI * pClamped)                       // 両端で 0 → アンカー到達時に必ず静止
weaveY   = WeaveAmpY * window * Sin(2*PI*WeaveHz*Time.time + WagPhaseSeed)

pos.x = LerpUnclamped(appear.x, anchor.x, xT)
pos.y = Lerp(AppearY, AnchorY, yT) + weaveY
```

- `window` により **progress=1 (=前あたり/バイト位置) で weave が厳密に 0**。糸のテンション端点や thrash アンカーにノイズが乗らない。
- `DepthHoldFrac=0` / `ApproachExp=1` / `WeaveAmpY=0` を入れると **現行挙動とビット同値** → tier0 の回帰リスクゼロ。

### 4.3 wag の per-instance 化

現状 `_WagStartU` / `_WagWave` はマテリアル定数。**MPB に追加**する (プレーンな float プロパティなので MPB で上書き可能・追加シェーダ改修不要)。

```csharp
private static readonly int WagStartUId = Shader.PropertyToID("_WagStartU");
private static readonly int WagWaveId   = Shader.PropertyToID("_WagWave");
```

`ApplyTargetFishWag(mode)` を `ApplyTargetFishWag(mode, tier)` に拡張し、4値 (`_WagAmp`,`_WagSpeed`,`_WagStartU`,`_WagWave`) を同一 MPB で設定。既存の「モード遷移時のみ適用」最適化はそのまま維持し、**tier 変化も遷移条件に含める** (`_targetFishWagAppliedTier` を追加)。

- シェーダ欠落時は無害 no-op (既存契約どおり)。
- 安全確認: 最大 `WagSpeed` = 18 rad/s ≈ **2.9 Hz** < 3 Hz (シェーダ自身のコメントの制約を維持)。

### 4.4 前あたり (`KawaGlintPreBitePlan`) — **ファイル自体は 1 文字も触らない**

`KawaGlintPreBitePlan` は EditMode テストが定数を固定しているため改変禁止。代わりに **合成地点で倍率を掛ける**:

```csharp
// KawaGlintGameController.UpdateWaitSteadyState (現 L428)
var progress = _preBitePlan.ApproachDisplayProgress(elapsed)
             + _preBitePlan.MotionOffset(elapsed) * _rarityLungeMul;   // ← 追加
```

`MotionOffset` は QuietTail で 0 にフェードするため、倍率をかけても連続性が保たれる。

同様に:
```csharp
// 現 L483
_actors.Bobber.SetTwitchIntensity(_preBitePlan.EventIntensity01(idx) * _rarityTwitchMul);
```
`SetTwitchIntensity` は内部で 0.5〜1.5 にクランプ済みなので上限は自動で安全。

`KawaGlintBobber` に `SetSinkIntensity(float)` を追加 (clamp 1.0〜1.4)、`BiteSinkOffsetWorld` に乗算。

---

## 5. オーラ / エフェクト

### 5.1 判断: **足す。ただし tier ≥ 1 のターゲット魚のみ、かつ progress ≥ 0.45 で遅延出現**

理由:
- シルエットは遠景の小さい影では読みづらい。動きは「いつもと違う」の比較対象を子供が持っていない初回プレイでは効かない。**きらきらだけは初回から無条件で「特別」と読める**。
- ただし常時表示は「今回ハズレ」の即バレになる → 待ちの緊張が消える。**接近して正体が見えてくる瞬間に灯る**設計にすることで、逆に演出の山になる。
- 環境魚 (ambient) には**付けない**。乱発すると「特別」の意味が消える。

### 5.2 コンポーネント

**(a) `RareHalo`** — SpriteRenderer、TargetFishShadow の子、**sortingOrder 13** (空きスロット・魚14の直下)

- スプライト: 手続き生成の**楕円ソフトグロー 192×96px** (`CreateSoftDiscTexture` のレシピを楕円化)。PPU=192 → native 1×0.5 world unit。
  - **AR 厳守**: 正円テクスチャを非等倍スケールで潰す実装は禁止 (プロジェクト絶対ルール)。最初から楕円で焼く。`localScale` は等倍のみ。
- スケール: `fishWorldLength * 1.30` (等倍)
- 色/α: tier1 `#FFD93D` peak α **0.30** / tier2 `#FF7FD1` peak α **0.34**
- 呼吸: `α = peak * (0.85 + 0.15 * Sin(2π * 0.35 * t))` → **0.35 Hz** (3Hz 制限の 1/8)
- 出現: reveal 到達で 0.4s フェードイン / `HideTargetFish` で 0.25s フェードアウト
- マテリアルは `KawaGlintActorsBuilder` の既存 `spriteMaterial` を共有 (wag シェーダは使わない)

**(b) `RareSparkles`** — ParticleSystem、TargetFishShadow の子、**sortingOrder 15** (空きスロット・魚14 の上/Caustics16 の下)

| 設定 | 値 |
|---|---|
| shape | Box, scale = (len*0.9, len*0.35, 1), simulationSpace **World** |
| rateOverTime | tier1 **4** / tier2 **7** |
| startLifetime | 0.9〜1.5s |
| startSize | 0.035〜0.08 |
| startSpeed | 0 |
| velocityOverLifetime | x: −0.05〜0.05, y: 0.10〜0.22 (ゆっくり上昇), z: 0 |
| colorOverLifetime | `BuildFadeInOutGradient()` を流用 (in 15% / out 100%) |
| startColor | tier1 `#FFF2B8` / tier2 `#FFD8F0` |
| maxParticles | 24 |

> **必ず踏むべき既知の地雷**: `VelocityOverLifetimeModule` は全カーブが同一モードを共有する。x/y/z だけ TwoConstants にすると `orbitalX/Y/Z`, `orbitalOffsetX/Y/Z`, `radial`, `speedModifier` が Constant のまま残り、**毎フレーム "Particle Velocity curves must all be in the same mode" が出続ける**。`KawaGlintStageBuilder.cs` L1526-1548 に実際の事故記録とコメントがあるので、**同じく全カーブを two-constant で明示的にゼロ埋めすること**。

粒ごとの α エンベロープは 0.9s 以上で 1 山 = 実効 **≤1.1 Hz**、かつ粒は独立位相なので画面全体としての明滅は発生しない。

**(c) ウキ側の波紋ティント** (低コスト・高効果)

待ち時間中に子供が実際に見つめているのはウキ。`KawaGlintActorsController.AnimateRings` で tier≥1 のとき:
- リング色をレアリティ色へ **35% ミックス**
- `RingMaxAlpha` 0.35 → **0.45**
- (任意) `RingLoopDurationSeconds` 2.2 → 2.8。ただしこれは `internal const` を builder が位相オフセット算出に使っているため、変数化は小リファクタになる。**色+αのみで十分効果があるので period 変更は任意扱い**

### 5.3 reveal 制御

```csharp
// SetTargetFishApproach 内
_aura.SetReveal01(Mathf.InverseLerp(0.45f, 0.70f, Mathf.Clamp01(progress)));
```
progress 0.45 で灯り始め 0.70 で全開。実時間では待ち 3〜10s のうち **キャスト後 0.5〜1.6 秒** で灯り、以降アンカーで待機し続けるので気づく時間は十分。

### 5.4 禁止事項 (子供向け絶対要件)

- 赤/黒/紫の暗色オーラ、トゲ・牙・目の光り、実体のない影の巨大化 → **全部禁止**
- 3Hz 以上の輝度/α 振動、画面フラッシュ、画面揺れ、急ズーム → 禁止
- レア逃走時のネガ演出禁止。`NarrationEscaped` は tier≥1 でも肯定形のまま (例: 「おおきいのが いたね! またこよう」)。企画の「失敗しても失わない」原則を維持

---

## 6. 発見したバグ (本設計と不可分・要修正)

| # | 内容 | 場所 |
|---|---|---|
| **B1** | **super が normal と同じ色で表示される**。`species.Rarity == TsuriRarity.Rare ? RarityRareColor : RarityNormalColor` の2分岐なので、うなぎ/まぐろ (ともに super) の rarity ドットが **あゆと同じ水色**になる | `KawaGlintGameController.cs:803`, `KawaGlintFishdexPanel.cs:509` |
| **B2** | 環境魚の魚種が川5種に固定 (`AmbientFishSpeciesIds = ayu/nijimasu/salmon/zarigani`) かつ `Build()` 一回きり。ロケーション切替は背景/ポノ/竿先しか更新しない (`KawaGlintBootstrap.cs:193-207`) ため、**すなはま・いわば・おきの背景であゆとざりがにの影が泳いでいる** | `KawaGlintActorsBuilder.cs:56`, `KawaGlintBootstrap.cs:121` |
| **B3** | 15種中9種に shadow アートがなく手続き型涙型が正になっている (tai/ika/maguro を含む) | `KawaGlintSpriteCatalog.cs:62-76` |
| **B4** | `_WagStartU`/`_WagWave` がマテリアル定数のため全魚が同一の尾振りプロファイル | `KawaFishWag.shader` + `KawaGlintActorsBuilder.cs:151-166` |

**B1 の修正**: `KawaGlintHud` に `RaritySuperColor = #FF7FD1` を追加し、3分岐 (または tier インデックス配列 + Clamp) に。オーラ色と統一するため **normal `#7FD0E8` / rare `#FFD93D` / super `#FF7FD1`** で確定。

**B2 の修正 (本設計の一部として実施推奨)**: `KawaGlintActorsController.SetAmbientSpecies(string[] ids)` を追加し、`TrySetLocation` から現ロケの Spawns 上位4種を渡して SpriteRenderer.sprite を差し替える。**シード済み乱数ループには一切触らない** (配置・速度・位相は固定のまま、sprite と nativeWidth 由来の scale だけ再計算)。

---

## 7. 実装ファイルマップ

**新規**
- `Runtime/Rendering/KawaGlintFishPresentation.cs` — 受け渡し struct
- `Runtime/Rendering/KawaGlintFishSilhouettes.cs` — speciesId→archetype 表 + tier 既定 + Resources パス生成
- `Runtime/Rendering/KawaGlintRarityMotion.cs` — tier 別プロファイル表 + 純関数 (`ApproachY`, `WeaveY`, `WagFor(mode,tier)`)。MonoBehaviour 禁止
- `Runtime/Rendering/KawaGlintRareAura.cs` — halo + sparkles 所有 MonoBehaviour。`Configure(tier, worldLength)` / `SetReveal01(float)` / `Hide()`

**改修**
- `KawaGlintSpriteCatalog.cs` — 3段フォールバック化 + `LoadArchetypeShadow(string key)` 追加
- `KawaGlintActorsBuilder.cs` — TargetFishShadow 配下に halo/sparkles を構築 (シード乱数の**全ドロー後**に構築すること。`BuildTargetFish`/`BuildSplash` と同じ規約)。halo テクスチャのみ `RegisterGeneratedAsset`
- `KawaGlintActorsController.cs` — `ShowTargetFish(in KawaGlintFishPresentation)`, `SetAmbientSpecies`, weave/深度ホールド, tier 別 thrash/flee, wag MPB 4値化, リングティント
- `KawaGlintGameController.cs` — presentation 生成, `_rarityLungeMul`/`_rarityTwitchMul` 適用, B1 修正
- `KawaGlintHud.cs` — `RaritySuperColor` 追加 + tier 配列化
- `KawaGlintFishdexPanel.cs` — B1 修正
- `KawaGlintBobber.cs` — `SetSinkIntensity(float)` (clamp 1.0〜1.4)

**絶対に触らない**
`TsuriCore.cs` / `TsuriSession.cs` / `TsuriFishData.cs` (魚種倍増・確率調整の並走タスク所有) / `KawaGlintPreBitePlan.cs` (EditMode テストが定数を固定) / `KawaGlintActorsBuilder.CreateFishShadowTexture` (既存契約)

**追加テスト (EditMode、既存 `Tests/EditMode/` 規約準拠)**
1. tier 単調性: `LengthMul` と `ThrashAmpX` は非減少、`WagSpeed` は非増加
2. tier クランプ: tier=3/99 が tier2 プロファイルを返し例外を出さない
3. `TsuriFishData.AllSpecies` の全 id が非 null な archetype キーに解決する (**並走の種倍増タスクへの防壁**)
4. weave 窓が progress=0 と 1 で厳密に 0
5. tier0 プロファイルが現行定数とビット一致 (回帰固定)
6. 全 α 振動定数 < 3 Hz のアサート

---

## 8. アート発注リスト (別エージェント実行)

**共通仕様 (全点必須)**
- GPT Image 2 / `quality:"high"` / `resolution:"2k"` → **1024px 幅にリサイズ**
- PNG 透過、**単色ベタ塗り #0F2C56 のみ** (グラデ・輪郭線・目・模様・影は一切なし)
- **真横視点**、**頭が左 (u=0) / 尾が右 (u=1)** ← `KawaFishWag` の必須契約
- 四辺に **38px の透明マージン** (1024px 幅基準 = 既存パイプラインの4%パッド。wag の UV オーバーシュート吸収域)
- 丸みのある子供向けプロポーション。トゲ・牙・鋭角を作らない

**P1 (4点 / 28クレジット) — 本設計の必須分**

| ファイル名 | 内容 | 目安AR |
|---|---|---|
| `Shadows/sil_torpedo_giant_shadow.png` | まぐろ級の大物。太い紡錘形の胴、高く立った背びれ、**くっきりした三日月形の尾**。堂々と大きい印象 | 1024×420 前後 |
| `Shadows/sil_broad_fancy_shadow.png` | たい級。**体高が高い菱形寄りの胴**、大きく広がる背びれと腹びれ、深い二又尾。優雅で豪華 | 1024×620 前後 |
| `Shadows/sil_tentacle_shadow.png` | いか。**丸みのある胴 + 左右のひれ**、後方に **5〜6本のやわらかい足**がひらひら。触手は太めで丸い先端 (細く尖らせない=不気味回避) | 1024×480 前後 |
| `Shadows/sil_flat_disc_shadow.png` | かれい。**ひらべったい楕円**、縁が細かく波打つひれ。厚みのない平べったさ | 1024×640 前後 |

**P2 (2点 / 14クレジット) — 手続き型の置換、任意**

| ファイル名 | 内容 |
|---|---|
| `Shadows/sil_star5_shadow.png` | ひとで。5本腕、腕の先が丸い |
| `Shadows/sil_object_shell_shadow.png` | 二枚貝。扇形、放射状の筋は入れず輪郭のみ |

**将来 (上位 rarity 段が追加された場合のみ)**
`Shadows/sil_regal_longfin_shadow.png` — 長い体 + たなびく長大なひれ (リュウグウノツカイをかわいく丸めた形)。tier3 既定用。

配置先: `unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/Content/Resources/KawaGlint/Sprites/Shadows/`
Resources パス: `KawaGlint/Sprites/Shadows/sil_<key>_shadow`

> **納品後の目視確認必須** (プロジェクトの画像レビュー必須ルール): Read tool で実 PNG を開き、(a) 頭が左を向いているか (b) 単色ベタか (c) 四辺パッドがあるか の3点を確認してから統合すること。

---

## 9. 段階投入 (アート待ちでブロックしない)

| フェーズ | 内容 | アート依存 |
|---|---|---|
| **Phase 1** | rarity tier 抽象化 + 動き差別化 (§4 全部) + B1 修正 | **なし。即着手可** |
| **Phase 2** | オーラ (§5) | なし (全て手続き生成) |
| **Phase 3** | アーキタイプ解決 + P1アート統合 (§3) + B2/B3 | P1 4点 |
| **Phase 4** | P2アート、ambient レアカメオ (任意) | P2 2点 |

Phase 1+2 だけで「動きが違う + きらきらしてる」の 2 チャンネルが立ち、アート納品前でもユーザー要望の大半を満たせる。

---

## 10. 任意提案: 環境魚のレアカメオ (Tier 2、既定 OFF 推奨)

レア種を含むロケーションで、5匹目の環境魚として**深い位置 (y ≤ −3.2)・速度 0.55倍・α 0.55** のレアアーキタイプ影を1体だけ流す。「あそこに大きいのがいる」という動機づけになる一方、3〜7歳は必ずタップするため「タップしても釣れない」フラストレーションのリスクがある。**まず Phase 1〜3 をユーザー実機確認に出し、反応を見てから判断する**ことを推奨。実装する場合はシード乱数の全ドロー後に固定パラメータで構築し (`BuildTargetFish` と同規約)、既存4体の再現性を壊さないこと。

---

## QA チェックリスト (実機 Android 必須 / AGENTS.md §7.4)

1. asase で通常種を10回釣る → 現行と見た目が変わっていないこと (tier0 回帰)
2. kakou でうなぎ (super) を `DebugForceDeepWindow` 等で強制 → 深部からゆっくり浮上・全身うねり・ピンクのきらきらを確認
3. oki でたい (rare) → 金色オーラが progress 0.45 付近で灯ること (キャスト直後ではないこと)
4. Console に "Particle Velocity curves must all be in the same mode" が出ていないこと
5. ロケーション5箇所を往復切替 → 魚影/オーラのリークやマテリアル破壊 (ピンク化) がないこと
6. 図鑑・キャッチバナーで normal/rare/super の3色が区別できること (B1)

---

## 2. ウキ改善 + 食いつき牽引描写 設計

# KawaGlint ウキ改善 + 食いつき牽引描写 設計仕様 v1.0

対象: `unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/`
実装者へそのまま渡せる粒度で記述。実コード読解済み(下記「現状確認」の行番号は実測)。

---

## 0. 現状確認(読んだ結果)

| 要素 | 実装 | ファイル |
|---|---|---|
| ウキ形状 | **完全手続き型**。64×96 px テクスチャを `CreateBobberTexture()` で毎回生成。上46%を赤 `#E94B4B` ドーム / 下を白 `#FFFFFF` テーパー / 境目に3pxの `#333333` 帯。`SmoothStep01(0.85,1.05)` のエッジのみ。ハイライト・陰影・アンテナ・質感すべて無し | `KawaGlintActorsBuilder.cs` L402-459 |
| ウキサイズ | `BobberWorldHeight = 0.55`。可視高10wu → **画面高の5.5%(1080p換算 約59px)** | 同 L86 |
| pivot | `(0.5, 0.5)` 中心。「中心をwaterlineに置けば半没に見える」前提 | 同 L377 / `KawaGlintBobber.cs` クラスdoc L28-33 |
| 状態機械 | `Hidden/Flying/Floating/Twitch/BiteSink/EscapePop` | `KawaGlintBobber.cs` L12-20 |
| BiteSink | **Y方向に `-0.55` 沈むだけ**。X固定、傾きは波スロープ由来±8°のみ、ジッタ無し | 同 L324-331, L94 |
| 釣り糸 | `LineRenderer` 12分割・二次ベジェ。緩み時 sag 0.35 / renda時 sag 0.06・幅×1.5・tremble 46rad/s×0.015 | `KawaGlintActorsController.cs` L68-85, L539-616 |
| `SetFishingLineTension` | **renda でしか呼ばれない**。BiteSink 中の糸は緩んだまま = 「食いついた」感ゼロ | `KawaGlintGameController.cs` L751 |
| 竿 | `pono_angler_side.png`(1497×1536)に**竹竿が焼き込み済み**。竿先は `PonoRodTipU=0.9606 / PonoRodTipV=0.7214` の実測UV。独立回転は不可 | `KawaGlintStageBuilder.cs` L203-204, L1213 |
| renda中のウキ | `SetVisualState(Hidden)` で消える。画面上の「引っ張り合い」表現は糸+魚+HUDのみ | `KawaGlintGameController.cs` L748 |
| 波 | `KawaWave.Height/Slope`(3sine, 最大±0.082wu)。同式が `KawaSurface.shader` にHLSL複製 | `KawaWave.cs` |
| sorting order | 0 Sky / 2 BgArt / 11 DecorBack / 14 Fish / 16 Caustics / 20 DecorFront / **30 SurfaceBand** / 32 RippleRing+SplashRing / 33 Line / 34 Bobber / 35 SplashDroplet / 40 Shore / 42 Angler。**31 が空き** | 各builder |
| 屈折 | `KawaRefractionFeature` は `RenderPassEvent.BeforeRenderingPostProcessing` = **全transparent描画後のスクリーン空間**。ウキの水中部も自動的に揺らぐ | `KawaRefractionFeature.cs` L55 |

**カメラは断面(cutaway)構図** — `bg_tsuri_sea_sunahama.png` を実見して確認。水面は水平線で、水上/水中を同時に見せる。**V字航跡(俯瞰現象)はこの構図では原理的に描けない** → 後述 §3.2 で代替案を採用。

---

## 1. ウキ見た目改善 — 判断: **実アート発注(推奨どおり)+ 手続き型はフォールバックとして温存**

### 1.1 判断理由

- 背景・魚影・catch絵・Decor 13点・ポノ、**画面上の他要素は全て色鉛筆調イラスト**。ウキだけがフラットベクタ調で、ユーザーの「しょぼい」は正しい指摘。手続き型を高品質化しても、色鉛筆の紙目・柔らかい陰影・にじみは C# の `Color32` ループでは再現不能。
- 一方 `KawaGlintActorsBuilder` のモジュール契約は「**シェーダ/リソース有無に関わらず常に成功**」(クラスdoc L11-14)。`CreateBobberTexture()` は削除せず、`KawaGlintSpriteCatalog.LoadBobber()` が null を返したら現行の手続き型に落ちる、という `LoadDecor` と同じ形にする。

### 1.2 発注アート一覧(必須2点 = 14クレジット / 残高892)

すべて Higgsfield MCP `generate_image`, `model:"gpt_image_2"`, `quality:"high"`, `resolution:"2k"`。
納品先 `Content/Resources/KawaGlint/Sprites/`。命名は既存規則(全小文字スネークケース、用途接頭辞)に従う。

---

#### ① `bobber_float.png` 【必須】

- **AR: 2:3 縦(トリム+パディング後 1024×1536 想定)**
- 生成背景: **フラット純白 `#FFFFFF`**(白い胴体と分離できるよう、白背景でも輪郭の陰影で切り抜ける形状にする。難があれば ② と同じ中間グレーに切替)
- プロンプト:

> Children's picture-book illustration, soft colored-pencil and light watercolor texture on paper, warm and gentle, no ink outline, no photo-realism. A single classic fishing float (bobber) standing perfectly upright, viewed exactly from the side, centered. The top half is a rounded dome in warm vermilion red with a soft highlight on the upper-left; the bottom half is a smooth cream-white teardrop tapering to a rounded point; a thin charcoal-gray ring separates them at the widest point. A slim ivory antenna stem rises from the top of the red dome and ends in a small rounded warm-yellow bead. Even soft studio lighting from the upper left, gentle soft shading, no cast shadow, no water, no background scenery, no text. Plain flat pure-white background. The object occupies the central 60% of the frame with generous empty margin on all sides.

- **レイアウト要件(実装が数値に依存するので厳守)**
  - くびれ(チャコール帯)中心 = トリム後高さの **下から 38% ±3%**
  - アンテナ玉の頂点 = 100%(=トリム上端)
  - 胴体最大幅 ≤ トリム後高さの 42%
- **後処理**: 背景除去 → トリム → **透明4%パディング**(batch:1458 の既存規約。`KawaFishWag.shader` L38-41 が同じパッドを前提にしている)
- **計測物の納品(必須)**: `bobber_metrics.json`
  ```json
  { "waterline_from_bottom01": <くびれ帯中心の実測値>, "tip_from_bottom01": 1.0 }
  ```
  既存の `bg_metrics.json` / `pono_anchor.json` と同じ役割。実測値を `KawaGlintActorsBuilder.BobberWaterlineFromBottom01` に貼る。**目測で決めないこと。**

#### ② `bobber_wake_foam.png` 【必須】

- **AR: 4:1 横(2048×512)**
- 生成背景: **フラット中間グレー `#808080`**(白い泡を切り抜くため。純白背景は不可)
- プロンプト:

> Children's picture-book illustration, soft colored-pencil and light watercolor on paper, no ink outline. A single small crescent of white water foam on a calm water surface, seen from the side at eye level: a soft low ridge of pale white and pale-cyan foam, thick and bright at the LEFT end, thinning smoothly to nothing toward the RIGHT, with a few tiny scattered foam speckles above it. Nothing else in the image — no fish, no float, no sky, no horizon, no shoreline, no text. Plain flat mid-gray background.

- **明るい端が必ず左**。実装は `flipX` で牽引方向を反転する。
- 後処理は ① と同じ(背景除去→トリム→4%パッド)。

#### ③ `bobber_splash_crown.png` 【任意 / Phase 2】

- AR 1:1 (1024×1024)。色鉛筆調の小さな水柱クラウン。現行の手続き型5ドット飛沫が①②導入後もまだ安っぽく見える場合のみ発注。**先に①②を入れて実機確認してから判断すること。**

### 1.3 表示側スペック

```
BobberWorldHeight        0.72   // 0.55 から拡大。1080p換算 78px、3-7歳の視認性優先
                                // QA調整域 0.62〜0.82。ここを触ったら実機確認必須
BobberWaterlineFromBottom01 0.38 // ← bobber_metrics.json の実測値で置換
BobberRestX              1.8    // 現状維持
sorting order            34     // 現状維持
```

- **pivot を `(0.5, BobberWaterlineFromBottom01)` にする**(`KawaGlintSpriteCatalog.LoadSprite` は既に pivot 引数を取る)。
  これで `transform.position.y == 水面Y` を代入するだけで「くびれが水面に一致」が保証され、現行の「中心pivot=半没に見える」という**暗黙の近似が消える**。
- **スケールは単一スカラー厳守**: `scale = BobberWorldHeight / sprite.bounds.size.y` を x/y 両方に。アートのARが2:3から多少ずれても歪まない(プロジェクトのAR絶対遵守ルール)。
- `KawaGlintBobber.Initialize` の第3引数 `halfHeightWorld` → **`topOffsetWorld` に改名**し `(1 - BobberWaterlineFromBottom01) * BobberWorldHeight` を渡す。`TopWorldY = _renderY + topOffsetWorld` = アンテナ玉の位置 = 釣り糸の接続点。

### 1.4 「水に浸かっている部分」の表現

新規シェーダ `Content/Resources/KawaGlint/Rendering/KawaBobberSubmerge.shader`
(`Shader "Pono/KawaGlint/BobberSubmerge"`, `Fallback "Sprites/Default"`)

**`KawaFishWag.shader` と同じ CGPROGRAM スプライトパスの形をそのまま踏襲すること**(HLSLPROGRAM/Core.hlsl は使わない。理由も同じ: URP 2D Renderer の素の sprite path で動き、ストリップ時に無事に劣化する)。

| プロパティ | 型 | 既定値 | 意味 |
|---|---|---|---|
| `_MainTex` / `_Color` | | | 既存慣例 |
| `_SurfaceWorldY` | float | 0 | **その瞬間のウキ位置での水面ワールドY** |
| `_UnderTint` | Color | `#7FD0E8` | 水中側の乗算色。`WaterDepthColor` の 0%(水面)ストップと同一値 |
| `_UnderTintStrength` | float | 0.55 | |
| `_UnderAlpha` | float | 0.88 | 水中側の透過 |
| `_MeniscusWorld` | float | 0.03 | 境界のぼかし幅(wu)。ハードな切断線を作らない |
| `_MeniscusTint` | Color | `#FFFFFF` | 水面際の濡れ線ハイライト |
| `_KawaTime` | float | | `Time.time`。既存 `KawaSurfaceBand` と同じ時間基底契約 |
| `_UnderWobbleAmp` | float | 0.004 | 水中側のUV横揺れ(UV単位)。**極小に留める** — 全画面 `KawaRefraction` が既に掛かっているので二重揺れになる |
| `_UnderWobbleFreq` | float | 9.0 | rad/s ≈ 1.43Hz |

**vert**: `float3 wp = mul(unity_ObjectToWorld, IN.vertex).xyz;` を TEXCOORD1 で渡す。
**frag**:
```
float below = smoothstep(_SurfaceWorldY + _MeniscusWorld,
                         _SurfaceWorldY - _MeniscusWorld, IN.worldXY.y); // 上0 / 下1
float2 uv = IN.texcoord;
uv.x += below * _UnderWobbleAmp * sin(_KawaTime * _UnderWobbleFreq + IN.worldXY.y * 6.0);
fixed4 c = tex2D(_MainTex, uv);
c.rgb = lerp(c.rgb, c.rgb * _UnderTint.rgb, below * _UnderTintStrength);
c.a  *= lerp(1.0, _UnderAlpha, below);
float band = 1.0 - saturate(abs(IN.worldXY.y - _SurfaceWorldY) / _MeniscusWorld);
c.rgb += _MeniscusTint.rgb * band * band * 0.35 * c.a;   // 濡れ線
return c * IN.color;
```

> ### 🔴 設計上の必須判断: シェーダ内で波を評価しないこと
> `KawaWave` のクラスdoc は「C#とHLSLの2つの複製が絶対に乖離してはならない」と明記している。ここで3つ目の複製を作るのは事故の種。
> **代わりに `KawaGlintBobber` が毎フレーム `_SurfaceWorldY = _waterlineY + KawaWave.Height(_x, Time.time)` を MaterialPropertyBlock で書き込む。** ウキの幅は約0.4wuで、その範囲では水面は局所的にほぼ平坦。しかもこれは**ウキ自身が乗っている数値そのもの**なので、絵として絶対にズレない。式の複製はゼロになる。
> MPB 経由なので material インスタンス増殖も無い。

- シェーダ欠落/非対応時は `fishWagShader` と同じ形で warn 1回 + `Sprite-Unlit-Default` に落として不透明描画(クラッシュ厳禁)。
- **`Flying` 中は特別扱い不要** — スプライト全体が `_SurfaceWorldY` より上にあるので `below` が自動的に0になる。
- ⚠️ **ユーザー指摘の「水面が2つある」問題に第3の線を足さないこと**: 切断線は必ず `KawaGlintStageBuilder.WaterlineWorldY + KawaWave.Height()` から導出する。独自の水面定数を作らない。

---

## 2. 食いつき牽引描写(BiteSink 強化)

### 2.0 互換性制約(実装前に必読)

| 制約 | 理由 |
|---|---|
| **`KawaGlintBobberState.BiteSink` を改名しない** | `KawaGlintPreBitePlayModeTests.cs` L134/197/227 が直接参照。挙動だけ拡張する |
| **`SetFishingLineTension(bool)` / `IsFishingLineTense` の意味を変えない** | `KawaGlintLineTensionPlayModeTests.cs` L94/127/141 が Renda=true / Landed=false を検証。新 `SetLineMode` を追加し、`SetFishingLineTension(t) => SetLineMode(t ? Renda : Slack)`、`IsFishingLineTense => _lineMode == Renda` とする。**BiteSink中の新モードは `IsFishingLineTense` を true にしない** |
| **`KawaGlintSplashMath` の曲線定数を触らない** | `KawaGlintSplashMathEditModeTests.cs` がピン留め。スケール倍率は `KawaGlintSplashEffect` 側だけで掛ける |
| **Angler の回転は常に ≤ 0°(お辞儀方向)を基本とする** | `KawaGlintAnglerPlacementEditModeTests` の「スプライト上端が画面上端を超えない」不変条件を再破壊しないため(§2.5 で +4° の例外を厳密に検証済み) |

### 2.1 ウキ本体: 「沈む」→「斜めに引き込まれる」

`KawaGlintBobber` に追加。

```csharp
// 牽引方向。魚は右(+X)側から寄ってきて targetX+0.4 に定位するので通常 +1。
// KawaGlintActorsController が Sign(targetFishX - bobberX) を渡す。既定 +1。
private float _pullDirX = 1f;
public void SetPullDirection(float dirX);   // 呼ぶのは EnterDeepEventVisual / EnterBiteUi
private float _restX;                        // BeginCast 着水時に _flightTargetX を保存
```

| パラメータ | 値 | 根拠 |
|---|---|---|
| `BitePullSinkWorld` | **0.55**(現状維持) | 沈み量は変えない。既存の「深さで前あたり/本あたりを区別」が壊れる |
| `BitePullLateralWorld` | **0.28** | 魚側へ横滑り。0.28wuは1080p換算 約30px。キャストのクランプ余白(1.2/0.8wu)を絶対に超えない |
| `BitePullLateralSmoothTime` | 0.10 | 入りは速い |
| `BitePullLateralReleaseSmoothTime` | 0.22 | 戻りはゆっくり(ホッとする感じ) |
| `BitePullTiltDegrees` | **-26 × pullDirX** | ★最重要。アンテナが牽引方向へ倒れる。これが「引っ張られてる」の主表現 |
| `BitePullTiltRampSec` | 0.18 | `Mathf.SmoothStep` でランプ。**瞬間スナップ禁止**(3-7歳を驚かせない) |
| `MaxPullTiltDegrees` | **32** | この状態専用のクランプ。`MaxTiltDegrees=8` は Floating/Twitch 用にそのまま残す |
| 波スロープ寄与 | ×0.3 | 傾き合成時、波由来分は減衰させて牽引傾きを主役に |
| `BitePullJitterFreq` | **11 rad/s (1.75Hz)** | 2.2秒間固まって見えないための「魚がつついている」揺れ |
| `BitePullJitterY` | 0.05 | |
| `BitePullJitterTiltDeg` | 4 | |

**実装注意(既存バグの再発防止)**: ジッタは `Twitch` と同様に **SmoothDamp の後に `_renderY` へ加算**すること。SmoothDamp のターゲットに畳み込むと減衰に食われて振幅が半減する(`KawaGlintBobber.cs` L72-78 に既知の事故として明記されている)。傾きジッタも同様に、ランプ済み角度に**後から**足す。

**X の計算**:
```
_x = _restX + BitePullLateralWorld * _pullDirX * lateralEase   // SmoothDamp で 0→1 / 1→0
```
`CenterWorldX` を毎フレーム読んでいる利用者(波紋リング・釣り糸・`ComputeRingViewport` のタイミングリング)は**全部自動追従する**ので追加配線不要。

### 2.2 解放時の「ぷかっ」(Deep窓を逃した / Bite→Escaped)

`BiteSink → Floating` 遷移の瞬間に `_velocity = +1.2f` を代入するだけ。既存の `Mathf.SmoothDamp(SmoothTime=0.08)` が正の初速を受けて水面をわずかにオーバーシュートし、自然に落ち着く。**コード1行、追加アセット0、逃した瞬間が明確に読める。**

### 2.3 釣り糸: 3モード化(★食いつき描写の本命)

`KawaGlintActorsController` に `enum LineMode { Slack, PullTaut, Renda }` を追加。

| | Slack(現行既定) | **PullTaut(新規)** | Renda(現行tense) |
|---|---|---|---|
| 終端 | ウキ上端 | **ウキ上端** | 魚の口 |
| sag | 0.35 | **0.35 → 0.12(0.18s で lerp)** | 0.06 |
| 幅倍率 | ×1.0 | **×1.3** | ×1.5 |
| tremble | 無し | **34 rad/s × 0.010** | 46 rad/s × 0.015 |
| 発火 | 上記以外 | **`BiteSink` 開始〜終了** | `EnterRendaUi` |

**緩んでいた糸がピンと張る** — これが釣りにおける「食いついた」の万国共通シグナル。現状これが完全に欠落しているので、単体で最も費用対効果が高い。tremble の窓関数(`sin(πt)`)は現行と同じで、竿先と終端は震えない。

### 2.4 水面の引き波 — **V字航跡は採用しない**

> **却下理由**: この画面は断面構図(§0)。V字航跡は俯瞰/斜め後方視点でしか成立しない現象で、水平な水面線しか無い本構図では描けない。無理に描くと「水面に浮いた謎の三角形」になり、ユーザーが既に指摘している「水面が二重」問題を悪化させる。

**採用: 横視点として正しい 2 要素**

**(a) 引き波リッジ `BobberWake`**(新規アクタ、`KawaGlintBobberWake.cs`)
- `bobber_wake_foam.png` の SpriteRenderer 1枚、**sorting order 31**(SurfaceBand 30 と RippleRing 32 の間の空き。既存と z-fight しない)
- 位置 `(bobberX + 0.10*pullDirX, waterlineY + KawaWave.Height(x,t))`、`flipX = pullDirX < 0`
- 幅 `WakeWorldWidth = 0.85`、高さは**スプライト自身のARから導出**(単一スカラー、AR厳守)
- α: 0.15s で 0→**0.70**、以後 ±0.12 を **1.6Hz** で呼吸、退出時 0.25s でフェードアウト
- 拡縮パルス: **x/y 均等に ±5%**(1.6Hz)
  - ⚠️ **x のみの横伸縮は禁止**(プロジェクトのAR絶対遵守ルール違反)。均等スケール+αで泡の脈動を表現する
- 表示条件: `BiteSink` 中 と `Renda` 中のみ

**(b) 波紋リングのモード化**(既存 `RegisterRing` を再利用、テクスチャ追加なし)
`KawaGlintActorsController` に `enum RingMode { Ambient, Pull, Renda }`。

| | Ambient(現行) | Pull(BiteSink中) | Renda |
|---|---|---|---|
| ループ | 2.2s | **0.9s** | **0.8s** |
| scale | 0.3→1.1 | 0.25→1.4 | 0.3→1.6 |
| α | 0.35→0 | 0.5→0 | 0.55→0 |
| 中心 | `Bobber.CenterWorldX` | 同左 + **`pullDirX * 0.12 * loopT`**(牽引方向に流れる=非対称=「何かが水を動かしている」) | **糸の水面貫入点**(§3.1) |

`RingLoopDurationSeconds = 2.2f` は Ambient 定数としてそのまま残す(`KawaGlintActorsBuilder` が位相オフセット算出に使っている)。

**点滅安全**: リング2本が半周期オフセットなので体感周波数はループの2倍 → Pull 2.22Hz / Renda 2.50Hz。**いずれも3Hz未満**。Renda を 0.7s にすると 2.86Hz で余裕が無くなるため 0.8s を採用。

### 2.5 竿のしなり = **ポノ全身のリーン**(新規アート不要)

**現実**: 竿は `pono_angler_side.png` に完全に焼き込まれている(実画像で確認済み)。単独回転は不可能。

**案B(却下)**: `pono_angler_side_norod.png` + `rod_bamboo.png` に分割発注して竿だけ回す
→ **却下**。手/竿の接合部のシームをこの画質で無縫合に保つのは極めて難しく、アート費2倍で「継ぎ目が見える」という古典的な事故を招く。

**案A(採用)**: スプライト全体を**座面(bottom-center pivot = `LoadAngler` の既定 pivot、= ポノが座っている丸太の位置)** 中心に回転させる。

新規 `Runtime/Rendering/KawaGlintAnglerRig.cs`:
```csharp
public void SetRodLoad(float load01);            // 0=平常 1=全力で引かれている
public void PulseRodLoad(float amount, float sec); // renda連打の瞬間スパイク
```
- 角度 = `Mathf.Lerp(0f, RodBendMaxDegrees, load01)` を `SmoothDamp(RodLoadSmoothTime = 0.12f)`
- `RodBendMaxDegrees = -9f`(**負 = 時計回り = 竿先が水面へお辞儀 = 「魚に引かれている」**)
- `RodHaulDegrees = +4f`(renda タップ時の一瞬の引き戻し。**正 = 「ポノが引き上げている」**)
  → 引かれる/引き戻すの綱引きが画面上で成立する
- `RodJitterDegrees = 0.9f` @ **2.4Hz**(renda 中のみ)

**🔴 必須の副作用処理**: 傾けた瞬間に**竿先ワールド座標を毎フレーム再計算して `_actors.SetRodTipWorldPosition()` に流す**。やらないと釣り糸が描かれた竿から離れる。
```
localOffset = new Vector3((PonoRodTipU - 0.5f) * anglerWorldWidth,
                          PonoRodTipV * AnglerArtWorldHeight, 0f);   // 既存の BuildAnglerArt/SetAnglerPosition と同じベクトル。両者から共有ヘルパに切り出すこと
rodTip = anchor + Quaternion.Euler(0, 0, leanDeg) * localOffset;
```
`KawaGlintActorsController.SetRodTipWorldPosition` は既に public(ロケーション切替用)なので新規配線は不要。

**移動量の実測(river_asase, anchor=(-7.2,1.95), h=2.6, w=2.534)**
`localOffset = (1.167, 1.876)`

| 角度 | 竿先Δ | 1080p換算 |
|---|---|---|
| -6° | (+0.190, -0.132) | 約 20px右 / 14px下 |
| **-9°** | **(+0.279, -0.206)** | **約 30px右 / 22px下** ← 採用 |
| -12° | (+0.364, -0.284) | 39px / 31px(座り姿勢が「倒れかけ」に見えるため不採用) |

**画面上端の安全確認(`KawaGlintAnglerPlacementEditModeTests` の不変条件)**
- 負回転はスプライト上端を**下げる**方向なので常に安全。
- 正回転 +4° の最悪ケース: スプライト右上角(local `(1.267, 2.6)`, |r|=2.892, 64.0°)が 68.0° へ → y = 2.892·sin68° = **2.681**(+0.081)。最も余裕が無い sunahama(anchor.y=2.20, 上限5.0, 現行余裕0.20)でも **2.20+2.68 = 4.88 ≤ 5.0**。安全。
- **EditMode テストを1本追加**: rig の角度域が `[-9, +4]` に収まること、および全ロケーションで `anchor.y + 回転後スプライト最上点 ≤ カメラ上端` であること。

**負荷スケジュール**

| フェーズ | load01 | 備考 |
|---|---|---|
| Idle / Cast / Wait(Floating) | 0 | |
| Twitch(前あたり) | 0.15 | 小さく頷く程度 |
| **BiteSink(グイン / 本あたり)** | **0.75 ± 0.12 @1.75Hz** | 竿が水面へ弓なりに沈む |
| Renda ベース | `Lerp(0.6, 0.85, gauge01)` | ゲージが上がるほど踏ん張る |
| Renda 1タップごと | `PulseRodLoad(+0.4→RodHaulDegrees側, 0.25s)` | 連打すると竿が鋸のように上下 |
| Escaped(EscapePop) | 0.75 → 0 を **0.30s** | ★竿がビョンと真っ直ぐに戻る = 最も分かりやすい「逃げられた」 |
| Landed | → 0 を 0.40s | |

### 2.6 グインの瞬間の水しぶき

`KawaGlintSplashEffect.Play(Vector3 origin, float scale = 1f)` に倍率を追加(既定1で現行完全互換)。
- `EnterDeepEventVisual()` / `EnterBiteUi()` 冒頭で `Play(bobberSurfacePos, 0.55f)` を1回
- フック成功時の既存 `Play(...)`(`EnterRendaUi` L745-746)は `scale = 1.0` のまま
- 倍率は droplet オフセット・直径・ring scale に掛けるだけ。`KawaGlintSplashMath` の曲線は**一切触らない**(EditModeテスト保護)
- 1キャストで最大3回(Deep×2 + 終端Bite)発火するが、各「グイン」に打点が付くのは意図どおり。`Play` は先頭から再スタートするので重複も安全

---

## 3. renda(引き寄せ)中の「引っ張り合い」

renda 中ウキは Hidden のまま(水中に引き込まれた、が正しい)。代わりに**糸が水に入る一点**を綱引きのアンカーにする。

### 3.1 糸の水面貫入点(新規、コスト実質ゼロ)

`AnimateFishingLine` が毎フレーム計算済みの `_lineBuffer`(12分割)を先頭から走査し、`y` が `waterlineWorldY` を跨ぐ最初の区間で線形補間するだけ。追加計算量ほぼ0。
この点に **(a) `BobberWake` を移設(α 0.75)** と **(b) `RingMode.Renda` のリング中心** を置く。

### 3.2 タップごとの綱引き

`KawaGlintActorsController.PulseLineTug()` を追加。`_rendaTug` を1にセットし `exp(-t/0.18)` で減衰。3箇所に効かせる:

1. **糸**: tense sag を `×(1 - 0.5*tug)`、制御点を `-pullDirX * 0.10 * tug` だけ竿側へ
2. **魚**: `TargetFishMode.Thrash` の位置式に `+ (-pullDirX * 0.08 * tug)` を加算
   → **タップするたび魚がポノ側へわずかに引き寄せられる。「自分が勝っている」の最も直接的なフィードバック**
   ※ 既存式 `_targetFishTargetAnchorX + jitterX` に項を足すだけ。thrash の周波数(20rad/s)には触らない
3. **竿**: `PulseRodLoad`(§2.5)

### 3.3 進捗の可視化

`SetRendaProgress01(gauge/100f)` を追加:
- 魚の thrash 振幅 `×Lerp(1.0, 0.6, p)` — 疲れてくる
- 竿の base load `Lerp(0.6, 0.85, p)` — 寄ってくるほど重い

ゲージバー以外の場所でも進捗が読めるので、数字が読めない3〜4歳にも伝わる。

---

## 4. 3〜7歳向け安全性チェック

| 新規振動 | 周波数 | 判定 |
|---|---|---|
| Wake α 呼吸 | 1.6 Hz | ✅ |
| ウキ牽引ジッタ | 1.75 Hz | ✅ |
| リング Pull(2本合成) | 2.22 Hz | ✅ |
| リング Renda(2本合成) | 2.50 Hz | ✅ |
| 竿ジャダー | 2.4 Hz | ✅ |
| 糸 tremble | 5.4 / 7.3 Hz | ✅ **輝度点滅ではなく1画素未満の位置振動**。3Hz制約は輝度フリッカに対するもので、これは該当しない |
| (既存)Twitch | 2.86 Hz | 変更なし |

- **新規の輝度フラッシュはゼロ**
- 最大傾斜 32°(傾きであって回転ではない)、竿リーン -9°〜+4°
- 牽引は必ず 0.18s のスローイン。**瞬間スナップを一切作らない**(驚かせない契約)
- 画面シェイク・赤フラッシュ・全画面輝度変化なし

---

## 5. 既存エフェクトとの競合確認

| 既存 | 競合 | 対処 |
|---|---|---|
| `KawaSplashEffect`(ring 32 / droplet 35) | 無し | 倍率引数追加のみ。sorting order 不変 |
| `RippleRing`(32) | Wake が同レイヤに来ると z-fight | **Wake は 31**(空き番)に分離 |
| `KawaSurfaceBand`(30) | ウキ(34)が上に描かれるので隠れない | 変更なし |
| `KawaRefraction`(全画面, post前) | ウキ水中部が二重に揺れる | シェーダ側 `_UnderWobbleAmp` を 0.004 と極小に |
| `KawaCausticsSurface`(16) | 無し | |
| タイミングリング HUD | ウキが横に0.28ずれるとリングが追従するか | `ComputeRingViewport` が毎フレーム `Bobber.CenterWorldX` を読むので**自動追従。修正不要** |

---

## 6. 変更ファイル一覧

**新規**
- `Content/Resources/KawaGlint/Rendering/KawaBobberSubmerge.shader`
- `Runtime/Rendering/KawaGlintBobberWake.cs`
- `Runtime/Rendering/KawaGlintAnglerRig.cs`
- `Runtime/Rendering/KawaGlintPullMath.cs` — **牽引カーブ(横滑りイージング / 傾きランプ / 竿負荷 / 糸の水面交差解)を純静的関数に切り出す**。`KawaGlintSplashMath` / `KawaGlintPreBitePlan` と同じ「MonoBehaviour非依存 = シーン無しで EditMode テスト可能」という既存アーキテクチャに合わせる
- アート2点(§1.2)+ `bobber_metrics.json`

**変更**
- `KawaGlintSpriteCatalog.cs` — `LoadBobber()` / `LoadBobberWake()` 追加(null 返し=呼び側フォールバック、`LoadDecor` と同じ規約)
- `KawaGlintActorsBuilder.cs` — BuildBobber(アート優先 + カスタム pivot + 新サイズ + submerge material)、BuildBobberWake 追加。`CreateBobberTexture()` は**削除せずフォールバックとして残す**
- `KawaGlintBobber.cs` — `_restX` / `_pullDirX` / 横滑り / 牽引傾き / ジッタ / 解放初速 / `_SurfaceWorldY` の MPB 書き込み / `TopWorldY` 意味変更
- `KawaGlintActorsController.cs` — `LineMode` / `RingMode` / Wake駆動 / 水面貫入点 / `PulseLineTug` / `SetRendaProgress01`
- `KawaGlintSplashEffect.cs` — `Play(origin, scale)`
- `KawaGlintStageBuilder.cs` — 竿先ローカルオフセット算出を共有ヘルパへ切り出し + `KawaGlintAnglerRig` 生成
- `KawaGlintGameController.cs` — フェーズ→新API配線(`EnterDeepEventVisual` / `EnterBiteUi` / `EnterRendaUi` / `HandleRendaTap` / `EnterEscapedUi` / `OnLanded` / Deep窓クローズ時の Floating 復帰)
- `KawaGlintBootstrap.cs` — AnglerRig ↔ Actors の竿先パイプ配線

**テスト(既存習慣に合わせて必須)**
- EditMode: `KawaGlintPullMath` の各カーブ、糸の水面交差解、AnglerRig 角度域 `[-9,+4]` + 全ロケーションの上端不変条件
- PlayMode: BiteSink 突入で `LineMode.PullTaut` かつ Wake 有効 / 離脱で復帰、renda タップで竿負荷スパイク、Escaped で竿負荷0、**既存の `IsFishingLineTense` テスト3本がグリーンのまま**

---

## 7. 実装順序(各段で実機確認)

1. **§1.3+§1.4(ウキのアート差し替え + 水没表現)** — 単独で「しょぼい」が解消する。アート①のみで先行可
2. **§2.3(糸3モード)** — コード量最小・体感効果最大。ここで「食いついた」が伝わり始める
3. **§2.1+§2.2(斜め牽引 + ぷかっ)**
4. **§2.5(竿リーン)** — 竿先座標の再計算漏れに注意。ここだけ配線ミスで糸が外れる
5. **§2.4(Wake + リングモード)** — アート② 必要
6. **§3(renda 綱引き)**
7. §2.6(小飛沫)、必要なら アート③

---

## 8. 実装者への確認事項(着手前にユーザー判断が要るもの)

1. `BobberWorldHeight` を 0.55 → **0.72** に拡大してよいか(魚1.2〜2.5wu との相対サイズが変わる)
2. アート③ `bobber_splash_crown.png` を今回発注するか、①②の実機確認後に判断するか
3. renda 中にウキを Hidden のままにするか、水中に引き込まれた状態で見せ続けるか(本設計は **Hidden 維持** を採用)

---

## 3. 環境オブジェクト(サンゴ/岩/海藻)拡充 アートディレクション + 発注書

実コードと全アート素材を実測・目視確認しました。以下が発注書です。

---

# KawaGlint 環境オブジェクト拡充 アートディレクション + 発注書
2026-07-25 / 対象: `unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/`

---

## 1. 現状分析 (実測)

### 1.1 舞台の実寸 (コード実測値)
| 項目 | 値 | 出典 |
|---|---|---|
| カメラ | orthographicSize=5, 16:9 | `KawaGlintStageBuilder.cs` L526 / PlayModeTests |
| 可視ワールド | x ∈ [-8.89, +8.89] (幅17.78) / y ∈ [-5.0, +5.0] | 同上 |
| 水面 | y = **+1.6** | `WaterlineWorldY` L94 |
| **水中エリア** | **17.78 × 6.6 ワールド単位** | 導出 |
| 魚の遊泳帯 | y ∈ [-4.2, +0.8] | `KawaGlintActorsBuilder.cs` L62-63 |
| ウキ位置 | x = **+1.8** (回廊 x∈[0.5,3.1]) | `KawaGlintActorsBuilder.cs` L87 + 設計書(B) |
| デコアの根元 | **全て y = -4.95 固定** | `BuildDecorInstance` L1403 |
| デコアの高さ | **0.5 〜 1.6 のみ** | `DecorPlacementsByBackgroundKey` L343-404 |

### 1.2 「最低限に見える」原因 — 5つ複合、点数不足は3番目でしかない

**原因① 背景アートの水中部分がそもそも空っぽ (最大要因)**
背景アートがある場合、`BuildRiverbed`/`BuildStones`/`BuildPlants` の手続き型床は**一切描かれない** (`Build()` L470-491 の if/else)。つまり水中にあるのは「背景の絵 + デコア2〜4点 + モート粒子」だけ。5背景を実測目視した結果:

| 背景 | 水中部分の中身 | 判定 |
|---|---|---|
| `bg_river_crosssection` | 玉石床 + 水草 + 光条。**唯一まとも** | 良 |
| `bg_tsuri_river_kakou` | 巨大な暗いティール空白 + 最下部に砂利。**画面の約55%が無地グラデ** | 空 |
| `bg_tsuri_sea_sunahama` | 砂紋のみ + 桟橋杭2本。岩ゼロ・海藻ゼロ | 空 |
| `bg_tsuri_sea_iwaba` | 右端の崖 + 平坦な砂利ヘイズ。**"岩場"なのに礁がゼロ** | 致命 |
| `bg_tsuri_sea_oki` | 意図的に空 (DeepOpen) | 設計通り |

**原因② 全プロップが最下辺 y=-4.95 に一列並び**
高さ0.5〜1.6なので最も高いものでも頂点 y=-3.35。**水柱の上75% (y -3.35〜+1.6) が完全に空**。魚は y=-4.2〜+0.8 を泳ぐので、大半の魚が「何もない空間」を泳いでいる。

**原因③ 密度: 水中17.78幅に2〜4点** (asase 4 / kakou 3 / sunahama 3 / iwaba 3 / oki 2)。配置x範囲は -4.6〜+4.3 のみで、**左右の各4.3ワールド単位が完全に手つかず**。しかも21:9等の広い端末では `WorldX` が絶対値のため端がさらに剥き出しになる。

**原因④ サイズ階層が1段しかない**。全部が「中くらいの物体」。奥行きは大小のヒエラルキー(遠=小&霞、近=大&切れる)でしか出ない。

**原因⑤ 既存13点は全て「単体オブジェクトのシール」**。群れ・帯・カーペットが1点もないので、何点置いても「点在するステッカー」にしかならない。加えて画風が3系統に割れている (下記1.3)。

### 1.3 既存13点の画風監査 (目視)
背景のDNAは **色鉛筆 + 水彩紙の目 (paper tooth) + 低彩度パステル + 黒輪郭なし + 水中の空気遠近**。これに対し:

- **岩系4点** (`kawa_rock_01`, `umi_rock_01` 等): フェルト/エアブラシ質感。**紙の目がなく明度が重い**ため、淡い背景の上で「貼り付け」に見える。特に `kawa_rock_01` は乾いた陸の岩の色温度。
- **サンゴ2点** (`umi_coral_01/02`): **硬い輪郭線 + 高彩度のベクタークリップアート調**。色鉛筆の背景と最も衝突。加えて熱帯サンゴ礁の意匠で、温帯日本の磯 (iwaba) の絵と生態的にも合わない。`umi_coral_02` (脳サンゴ) を沖 (oki) の水中に浮かべているのは「偽の海底」そのもの。
- **海藻/水草7点**: 概ね良好。ただし `umi_kelp_01/02` は幅352-357pxの**単葉1本**で、単独配置だと必ず貧相に見える。`kawa_weed_02` は丸葉の茂みで**陸生の低木**に見える。
- **`kawa_log_01`**: 製材された木口 (年輪断面) が見え、自然の倒木でなく薪に見える。彩度も高い。

---

## 2. 既存13点の処遇 (流用 / 降格 / 引退)

**ファイル削除はしない** (SpriteCatalog登録を壊さない)。配置テーブルでの扱いを変えるだけ。

| ファイル | 判定 | 理由・新しい使い方 |
|---|---|---|
| `kawa_weed_01` | **流用** | 背景の水草と同系統。ただし必ず3本以上まとめて、FAR/MID帯の埋め草に |
| `kawa_weed_03` | **流用** | 良好。MID帯 |
| `kawa_rock_02` | **流用** | 玉石トリオ。背景の川床と同質。FAR/MID |
| `umi_kelp_01` | **流用** | 必ず3株以上クラスタ配置 |
| `umi_kelp_02` | **流用** | 同上。褐色アクセント |
| `umi_kelp_03` | **流用** | やや高彩度 → tint (0.92,0.96,0.95) で少し落とす |
| `umi_rock_02` | **流用** | フジツボ付き玉石。良好 |
| `kawa_weed_02` | **降格** | 陸生に見える。FAR帯で小さく + ヘイズtint のみ。`kawa_weed_clump_02` で置換 |
| `kawa_rock_01` | **降格** | 単一巨大フェルト岩。FARで小さく + ヘイズtintのみ。NEAR用途は `kawa_rock_mossy_01` へ |
| `kawa_log_01` | **降格** | kakou のNEARで彩度を落として当面残置。`kawa_branch_01` で段階置換 |
| `umi_rock_01` | **降格** | 同 `kawa_rock_01`。NEARは `umi_rock_boulder_01` へ |
| `umi_coral_01` | **引退** | 画風非互換 (硬輪郭・高彩度) + 熱帯意匠。`umi_coral_soft_01` で置換 |
| `umi_coral_02` | **引退** | 同上 + 沖の「偽海底」問題。oki は `umi_pinnacle_far_01` / `umi_drift_weed_01` へ置換 |

→ **流用7 / 降格4 / 引退2 / 新規27点** = 語彙34点。

---

## 3. 拡充方針: 4プレーン + ドリフト の奥行き設計

「点数を増やす」のではなく、**面 (plane) を作る**。この背景群は断面図パースなので、**画面上で高い位置 = 遠い**。それを利用する。

| プレーン | sortingOrder | 根元 rootY | ワールド高 | tint (乗算) | 揺れ | 役割 |
|---|---|---|---|---|---|---|
| **FAR** (奥景) | 11 | -3.4 〜 -2.6 | 0.35 〜 1.0 | (0.80, 0.87, 0.94, 0.88) | 5°/速/小 | 霞んだ小物。床の"奥行きの続き" |
| **MIDBACK** (中景奥) | 12 | -4.3 〜 -3.5 | 0.8 〜 1.6 | (0.92, 0.96, 1.00, 0.96) | 4.5° | 主要な群生。魚の背後 |
| **MIDFRONT** (中景手前) | **13** (新設) | -4.9 〜 -4.4 | 1.4 〜 2.6 | white | 4° | 水柱を上へ埋める主力。まだ魚(14)の後ろ |
| **NEAR** (前景) | 20 | -5.4 〜 -5.0 (画面下で切れる) | 2.0 〜 3.4 | (0.88, 0.92, 0.98, 1.0) | 2.5°/遅 | **魚が裏に隠れる**マス。隠れ演出の主役 |
| **EDGE** (額縁) | 21 | -5.6 | 3.5 〜 4.5 | (0.80, 0.86, 0.94, 1.0) | なし | 左右端に半分フレームアウトさせる額縁 |
| **DRIFT** (浮遊) | 15 | y ∈ [-3.5, -0.5] 自由 | 0.4 〜 1.4 | white | 上昇/漂い | 泡柱・流れ藻。中層の孤独を消す |

**サイズバリエーション規約**: 同一ファイルは必ず**最低3段階のスケール**で使い回すこと (例 `umi_kelp_forest_01` を FAR 0.7 / MIDBACK 1.4 / MIDFRONT 2.6)。`FlipX` と ±5° の傾きジッタも併用すれば、27ファイルで67インスタンスが「全部違う物」に見える。

**絶対規約 (AGENTS.md AR厳守)**: 拡大縮小は必ず**uniform scale (scale.x == scale.y)**。現行 `BuildDecorInstance` L1395-1408 は正しく実装済みなので、この規約は維持すること。

---

## 4. 配置密度の設計 (ロケーション別)

X座標は **U (0〜1, waterRect幅に対する正規化)** で指定。16:9換算は `worldX = -8.89 + U × 17.78`。
禁止帯: **ウキ回廊 U ∈ [0.528, 0.674]** には NEAR/EDGE を置かない (前あたり演出を隠さないため)。

### river_asase (`bg_river_crosssection`) — 4点 → **12インスタンス**
背景が唯一リッチなので「盛る」のではなく「繋ぐ」。
| プレーン | 内容 | 数 |
|---|---|---|
| FAR | `kawa_weed_01`×2 (U .30/.72, h .55) / `kawa_rock_02`×1 (U .55, h .40) / `kawa_bed_cobble_02`×1 (U .45, h .45) | 4 |
| MIDBACK | `kawa_weed_clump_01`×2 (U .24/.66, h 1.3) / `kawa_rock_cluster_01`×1 (U .80, h 1.1) / `kawa_grass_carpet_01`×1 (U .42, h .70) | 4 |
| MIDFRONT | `kawa_weed_clump_02`×1 (U .14, h 1.8) / `kawa_rock_mossy_01`×1 (U .86, h 1.5) / `kawa_bed_cobble_01`×1 (U .60, h .90) | 3 |
| NEAR | `kawa_branch_01`×1 (U .90, h 1.2) | 1 |

> ⚠ **要決裁**: コード内コメント (L279-282, L346-350) は asase を「回帰基準ゆえ back-layer only、既存描画を一切変えない」と固定している。今回のユーザー要望 (「全体的にちゃんと作って」) と**正面から矛盾**する。この制約を解除し、QAスクショを再ベースライン化する前提で発注している。

### river_kakou (`bg_tsuri_river_kakou`) — 3点 → **17インスタンス**
夕焼け河口。空白の暗いティールを落葉と玉石で埋める。
| プレーン | 内容 | 数 |
|---|---|---|
| FAR | `kawa_bed_cobble_02`×2 (U .30/.70, h .50) / `kawa_weed_01`×2 (U .40/.62, h .50) / `kawa_rock_02`×1 (U .20, h .35) | 5 |
| MIDBACK | `kawa_weed_clump_01`×2 (U .22/.78, h 1.2) / `kawa_leaflitter_01`×1 (U .50, h .50) / `kawa_rock_cluster_01`×1 (U .85, h 1.3) / `kawa_grass_carpet_01`×1 (U .35, h .70) | 5 |
| MIDFRONT | `kawa_bed_cobble_01`×2 (U .30/.72, h .85) / `kawa_leaflitter_01`×1 (U .62, h .60) / `kawa_weed_clump_02`×1 (U .12, h 1.9) | 4 |
| NEAR | `kawa_rock_mossy_01`×1 (U .82, h 2.4) / `kawa_branch_01`×1 (U .24, h 1.5) | 2 |
| EDGE | `kawa_front_edge_01`×1 (U .00, h 4.0) | 1 |
| DRIFT | `umi_bubble_column_01`×1 (U .84, y -3.2, h 1.2) ← **ウナギの岩穴**演出と接続 | 1 |

### sea_sunahama (`bg_tsuri_sea_sunahama`) — 3点 → **15インスタンス**
桟橋杭 (画面 U≈0.62 / 0.78) を隠さない。ポノは U≈0.55 の桟橋上。
| プレーン | 内容 | 数 |
|---|---|---|
| FAR | `umi_bed_sand_ripple_01`×1 (U .50, h .45) / `umi_kelp_01`×2 (U .28/.70, h .50) / `umi_rock_02`×1 (U .18, h .35) | 4 |
| MIDBACK | `umi_seagrass_meadow_01`×2 (U .25/.72, h .80) / `umi_kelp_forest_01`×1 (U .38, h 1.4) / `umi_anemone_01`×1 (U .84, h .70) | 4 |
| MIDFRONT | `umi_bed_sand_ripple_01`×2 (U .30/.70, h .90) / `umi_seagrass_meadow_01`×1 (U .48, h 1.1) / `umi_sponge_01`×1 (U .14, h 1.0) | 4 |
| NEAR | `umi_rock_boulder_01`×1 (U .88, h 2.2) / `umi_kelp_forest_01`×1 (U .10, h 2.8) | 2 |
| EDGE | `umi_front_edge_01`×1 (U 1.00, h 3.8, FlipX) | 1 |

### sea_iwaba (`bg_tsuri_sea_iwaba`) — 3点 → **18インスタンス (最優先)**
**RockCoverニッチの本拠地なのに礁がゼロ**という現状の最大の破綻。背景の崖は右端 (U .78〜1.0) にあるので、礁は左〜中央に置いて構図の重心を取る。ポノは U≈.646 の低い岩棚上。
| プレーン | 内容 | 数 |
|---|---|---|
| FAR | `umi_bed_gravel_01`×2 (U .35/.68, h .45) / `umi_kelp_02`×2 (U .25/.55, h .55) / `umi_coral_soft_01`×1 (U .78, h .40) | 5 |
| MIDBACK | `umi_reef_cluster_01`×2 (U .18/.60, h 1.4) / `umi_coral_soft_01`×1 (U .44, h .90) / `umi_coral_table_01`×1 (U .72, h .70) / `umi_anemone_01`×1 (U .30, h .60) | 5 |
| MIDFRONT | `umi_kelp_forest_02`×2 (U .12/.52, h 2.0) / `umi_coral_soft_02`×1 (U .38, h 1.6) / `umi_bed_gravel_01`×1 (U .62, h .85) / `umi_sponge_01`×1 (U .26, h 1.1) | 5 |
| NEAR | `umi_reef_cluster_02`×1 (U .86, h 3.2) ← **魚が隠れるアーチ** / `umi_rock_boulder_01`×1 (U .16, h 2.4) | 2 |
| DRIFT | `umi_bubble_column_01`×1 (U .84, y -3.6, h 1.4) ← 世界観企画書の**「岩間の泡」**演出と直結 | 1 |

### sea_oki (`bg_tsuri_sea_oki`) — 2点 → **6インスタンス**
**"床を作らない"設計は正しいので維持**。ただし2点は寂しすぎる。浮遊物と超遠景で解決。
| プレーン | 内容 | 数 |
|---|---|---|
| FAR (超遠景) | `umi_pinnacle_far_01`×2 (U .22/.74, y -4.6, h 1.6 / 1.1, tint (0.72,0.82,0.92,0.65)) | 2 |
| DRIFT | `umi_drift_weed_01`×2 (U .16 y -1.2 h .9 / U .82 y -2.4 h .7) / `umi_bubble_column_01`×1 (U .40, y -4.8, h 2.2, 画面下から立ち上る) / `umi_kelp_forest_02`×1 (U .90, y -4.9, h 1.0, 強ヘイズ) | 4 |

**合計 68インスタンス** (現行15インスタンスの4.5倍)、使用ファイル34点、平均再利用2.0回。

---

## 5. アート発注書

### 5.1 全点共通の設定
```
tool  : mcp__claude_ai_higgsfield_game__generate_image
model : "gpt_image_2"      ← AGENTS.md Hard Rule 7 (他モデル絶対禁止)
quality: "high"
resolution: "2k"
count : 1
```
出力先: `tmp/alpha_pending/<batch-id>/props/` → クロマキー除去 → `Content/Resources/KawaGlint/Sprites/Decor/`
命名: 既存踏襲 `kawa_*` (川) / `umi_*` (海)、末尾に連番。

### 5.2 STYLE BLOCK (全プロンプトの先頭に必ず連結)
```
Children's picture-book illustration in soft colored pencil on textured watercolor
paper. Visible paper tooth and gentle directional pencil hatching. Pastel,
low-saturation palette. No black outlines, no ink linework. Soft rounded shapes,
gentle even lighting, no harsh shadows. Flat side-on elevation view as if seen
through clear shallow water, no perspective distortion. Underwater subject: colors
slightly cooled and softened as if seen through pale turquoise water. Single subject
isolated on a solid flat {KEY} chroma-key background filling the entire background
edge to edge. Generous even margin around the subject. No ground plane, no cast
shadow, no vignette, no gradient in the background.
```

### 5.3 NEGATIVE BLOCK (全プロンプトの末尾に必ず連結)
```
No text, no letters, no numbers, no logo, no watermark, no signature, no UI elements,
no frame, no border. No characters, no people, no animals, no fish, no crab, no shrimp,
no squid, no starfish, no seashell, no sea urchin. Not photorealistic, not a 3D render,
not CGI, no glossy plastic look, no heavy black outlines, no dark or scary mood,
no horror, no neon or fluorescent colors, no glitter, no sparkles.
```
> 禁則の根拠: **ヒトデ (`hitode`) と貝がら (`treasure_kaigara`) は捕獲対象種**。装飾として描くと図鑑と衝突し、子供が「釣れるはずのものが釣れない」と混乱する。ポノ・ふくろう博士等のキャラも装飾に描かない。

### 5.4 発注一覧

#### Wave 1 — 必須 17点 / 119クレジット
これだけで「ちゃんと作った」に到達する最小セット。iwaba の礁と各床の帯が最優先。

| # | ファイル名 | AR | クロマ | 想定プレーン / 高さ | プロンプト本体 (STYLE/NEGATIVEに挟む) |
|---|---|---|---|---|---|
| 1 | `kawa_bed_cobble_01` | 16:9 | `#00ff00` | MIDFRONT/FAR, h .45-.90 | A wide horizontal bed of smooth river cobbles: dozens of rounded pebbles and stones in warm ochre, sand-beige, pale olive-grey and soft blue-grey, packed together and overlapping, larger stones along the bottom row and progressively smaller pebbles toward the top so the bed reads as receding away from the viewer. The stone bed spans the full width of the frame edge to edge and occupies the lower 55% of the frame; its top edge is irregular and softly feathered. The upper 45% of the frame is pure flat chroma background. |
| 2 | `kawa_rock_cluster_01` | 1:1 | `#ff00ff` | MIDBACK, h 1.1-1.4 | A cluster of five river boulders of different sizes leaning against each other to form one compact rocky mass, with a soft dark rounded crevice between two of the stones. Warm grey-brown and pale ochre stone with mottled pencil shading; the top surfaces carry a thin film of pale olive-green river algae and a few tiny tufts of short water grass. Small pebbles gather at the base. Wider than tall, stable readable silhouette. |
| 3 | `kawa_rock_mossy_01` | 1:1 | `#ff00ff` | MIDFRONT/NEAR, h 1.5-2.4 | A single large rounded river boulder seen from the side, slightly asymmetric with a flatter shoulder on one side. Its top third is covered in soft moss-green river algae with a few short strands trailing down; the lower body is warm grey-tan with gentle mottled pencil shading. Three or four small pebbles rest against its base. |
| 4 | `kawa_weed_clump_01` | 9:16 | `#ff00ff` | MIDBACK, h 1.2-1.3 | A dense clump of about ten tall freshwater ribbon-grass blades growing from one root base at the very bottom center of the frame. Blades of slightly different heights and widths curve gently to one side as if in a slow current; fresh yellow-green to soft grass-green with pale highlights along each blade; a few short blades at the base. |
| 5 | `kawa_grass_carpet_01` | 16:9 | `#ff00ff` | MIDBACK, h .70 | A low wide carpet of short water grass growing across a riverbed: many small tufts of short soft green blades of varying heights spanning the full width of the frame, all leaning gently in the same direction, denser in the center and thinning to a few isolated tufts at the left and right edges. Occupies only the lower 40% of the frame. |
| 6 | `kawa_front_edge_01` | 16:9 | `#ff00ff` | EDGE, h 4.0 | A near-foreground riverbank rock ledge for the corner of a scene: a mass of overlapping river boulders rising from the bottom-left corner of the frame diagonally to about two-thirds of the frame height, cropped by the left and bottom edges. Deeper, cooler and slightly darker than a distant rock — muted blue-grey and deep olive with mossy green tops — but still soft colored pencil, never black and never a flat silhouette. The right side ends in an irregular rocky outline against the chroma background. |
| 7 | `umi_bed_sand_ripple_01` | 16:9 | `#00ff00` | MIDFRONT/FAR, h .45-.90 | A wide strip of rippled sea-floor sand: gentle parallel wave ripples in pale cream, warm sand-beige and soft shell-pink, ripple crests catching soft light, with a scattering of tiny pale gravel grains. Spans the full width of the frame edge to edge and occupies the lower 55% of the frame, with a softly feathered irregular top edge. |
| 8 | `umi_bed_gravel_01` | 16:9 | `#00ff00` | MIDFRONT/FAR, h .45-.85 | A wide strip of coastal shingle: densely packed flat rounded pebbles in cool grey, slate blue, pale ochre and soft mauve, mixed sizes, larger toward the bottom and finer toward the top edge. Spans the full width of the frame and occupies the lower 55%, with a softly feathered irregular top edge. |
| 9 | `umi_reef_cluster_01` | 1:1 | `#ff00ff` | MIDBACK, h 1.4 | A rocky reef mound rising from the sea floor: overlapping weathered rocks forming one solid mass in muted slate-blue and grey-green stone with warm ochre patches. Surfaces are crusted with tiny pale barnacles and patches of soft olive and dusty rust-red seaweed film; two or three short soft corals and a few small green algae tufts grow from its ledges; a soft dark rounded crevice opens near the base. Wider than tall. |
| 10 | `umi_reef_cluster_02` | 1:1 | `#ff00ff` | **NEAR**, h 3.2 | A reef rock formation with an arch: a tall rocky outcrop whose upper part leans over to form an overhanging ledge with a wide open gap underneath, big enough for a fish to swim through. Muted grey-blue and sandy stone, barnacle crust, patches of soft olive and pale pink coralline algae, a few short seaweed strands trailing from the overhang. Taller than wide, distinctive readable silhouette. |
| 11 | `umi_coral_soft_01` | 1:1 | `#00ff00` | MIDBACK, h .40-.90 | A soft fan coral growing on a small rock base: a broad rounded fan of fine lace-like branches in muted coral-pink fading to warm cream at the tips, gentle pencil shading, slightly asymmetric and softly rounded. Muted and dusty, never bright or neon pink; no hard outlines. |
| 12 | `umi_kelp_forest_01` | 9:16 | `#ff00ff` | MIDBACK/NEAR, h 1.4-2.8 | A tall clump of about seven kelp fronds growing from one holdfast at the bottom center of the frame: long ribbon blades with gently rippled wavy edges, different heights, all curving in the same direction as if in a slow current. Deep sea-green to fresh olive-green with pale highlights along the midribs, denser near the base. |
| 13 | `umi_kelp_forest_02` | 9:16 | `#ff00ff` | MIDFRONT, h 1.0-2.0 | A tall clump of about six arame brown-kelp fronds growing from one holdfast at the bottom center: narrower strap-like blades with wavy frilled edges, warm golden-brown to deep amber with olive-green undertones and pale honey highlights, curving gently in a slow current. |
| 14 | `umi_seagrass_meadow_01` | 16:9 | `#ff00ff` | MIDBACK, h .80-1.1 | A low wide eelgrass meadow: many slender flat grass blades of varying heights growing in loose tufts across the full width of the frame, all leaning gently in the same direction, soft grass-green to pale sea-green, denser in the center and thinning to a few isolated blades at the left and right edges. Occupies the lower 45% of the frame. |
| 15 | `umi_rock_boulder_01` | 1:1 | `#ff00ff` | NEAR, h 2.2-2.4 | A single large sea boulder seen from the side: rounded but irregular, cool slate-blue-grey stone with warm sand-ochre patches and soft mottled pencil shading. A crust of tiny pale barnacles covers its upper half; a few short olive-green and dusty rust-red seaweed strands trail from its shoulders; small pebbles rest at its base. |
| 16 | `umi_front_edge_01` | 16:9 | `#ff00ff` | EDGE, h 3.8 | A near-foreground reef ledge for the corner of a scene: a mass of overlapping barnacle-crusted sea rocks rising from the bottom-right corner of the frame diagonally to about two-thirds of the frame height, cropped by the right and bottom edges. Deep muted blue-grey and dark olive with a few trailing seaweed strands. Cooler, deeper and slightly darker than a distant rock, but still soft colored pencil, never black and never a flat silhouette. |
| 17 | `umi_bubble_column_01` | 9:16 | `#ff00ff` | DRIFT, h 1.2-2.2 | A rising column of underwater air bubbles: about twenty round bubbles of different sizes drifting upward in a loose winding stream from the bottom center of the frame, the stream widening and thinning as it rises. Each bubble is drawn as a crisp **opaque** pale blue-white sphere with a clean cream-white rim and one small white highlight — fully opaque, never transparent. No rocks, no plants, no water wash, nothing else in the frame. |

#### Wave 2 — 推奨 10点 / 70クレジット
バリエーション疲れ対策と kakou / oki の個性づけ。

| # | ファイル名 | AR | クロマ | 想定プレーン / 高さ | プロンプト本体 |
|---|---|---|---|---|---|
| 18 | `kawa_bed_cobble_02` | 16:9 | `#00ff00` | FAR, h .45-.50 | A wide horizontal bed of coarse river stones: fewer but larger flat rounded rocks in cool grey-green, pale slate and soft ochre, with patches of pale sand and fine gravel filling the gaps between them, spanning the full width of the frame and occupying the lower 50% with a softly feathered irregular top edge. Cooler and greyer than a warm ochre pebble bed. |
| 19 | `kawa_weed_clump_02` | 9:16 | `#ff00ff` | MIDFRONT, h 1.8-1.9 | A short bushy tuft of feathery freshwater pondweed: many fine soft fronds fanning outward from a single base at the bottom center of the frame, deep sage green to soft olive with pale yellow-green tips, gently curving, fuller and wider in its upper half. |
| 20 | `kawa_branch_01` | 16:9 | `#00ff00` | NEAR, h 1.2-1.5 | A bare fallen tree branch lying submerged on a riverbed: weathered driftwood in pale grey-brown with soft woodgrain, several thinner side twigs forking upward and sideways, one end thicker and slightly split. Natural broken ends only — no sawn flat cut end, no visible tree rings, no leaves, no bark peeling into sharp shapes. |
| 21 | `kawa_leaflitter_01` | 16:9 | `#ff00ff` | MIDBACK/MIDFRONT, h .50-.60 | A scattered drift of sunken fallen leaves resting on a riverbed: about twenty maple and oak leaves in soft amber, rust-orange, pale gold and faded brown, overlapping loosely and lying flat at various angles, denser in the center and scattering thinner toward the left and right edges. Occupies the lower 40% of the frame. Autumn colors only, no green leaves. |
| 22 | `umi_coral_soft_02` | 9:16 | `#00ff00` | MIDFRONT, h 1.6 | A tall slender branching coral: several upright finger-like branches of different heights rising from a small rock base at the bottom center, pale lavender-mauve at the base fading to warm cream at the softly rounded tips, soft velvety pencil texture, gentle asymmetry. |
| 23 | `umi_coral_table_01` | 16:9 | `#00ff00` | MIDBACK, h .70 | A low wide table coral: a broad flat plate-like coral shelf with a softly scalloped rim and fine radiating surface texture, supported by a short thick stem. Muted sandy ochre with dusty rose edges. Distinctly wider than tall. |
| 24 | `umi_anemone_01` | 1:1 | `#00ff00` | MIDBACK, h .60-.70 | A cluster of three sea anemones of different sizes attached to a small pale rock: soft rounded columns in warm cream and pale peach, each crowned with many short soft rounded tentacles in pale rose-pink and cream tipped with soft lilac, gently swaying. Friendly and soft like little flowers — never spiky, never menacing. |
| 25 | `umi_sponge_01` | 1:1 | `#00ff00` | MIDFRONT, h 1.0-1.1 | A cluster of four barrel sponges of different heights on a small rock base: thick hollow tube shapes with softly rounded open tops and gently pitted textured surfaces, in muted ochre-yellow, warm terracotta and dusty cream. |
| 26 | `umi_drift_weed_01` | 16:9 | `#ff00ff` | DRIFT (oki), h .70-.90 | A floating raft of drifting sargassum seaweed suspended in open water: a loose horizontal mass of golden-brown branching fronds with many small round air-bladders and fine olive-green leaflets, with wispy strands trailing down from the underside. Wider than tall, softly irregular silhouette on all four sides, nothing anchoring it to anything. |
| 27 | `umi_pinnacle_far_01` | 16:9 | `#00ff00` | FAR (oki), h 1.1-1.6 | A distant undersea rock pinnacle seen far away through clear water: a tall pointed rock spire with a smaller companion spire beside it, rendered very pale and hazy in soft blue-grey and pale teal with almost no internal detail, as if fading into the water. Its base fades out softly into nothing rather than sitting on a floor. Very low contrast, atmospheric, ghostly but gentle. |

---

## 6. 予算

| 項目 | 枚数 | 単価 | 小計 |
|---|---|---|---|
| Wave 1 (必須) | 17 | 7cr | **119cr** |
| Wave 2 (推奨) | 10 | 7cr | **70cr** |
| **合計** | **27** | | **189cr** |
| リテイク見込み (経験則15%、要承認) | +4 | 7cr | +28cr |

残高892cr → 本領域確定枠 **189cr (21%)**、リテイク込みでも217cr (24%)。他領域 (新種catch 15枚≈105cr、レア魚影≈42cr、ウキ≈14cr、パララックス層≈84cr = 約245cr) を足しても計 **約460cr**、残 **430cr** のバッファ。目安30枚以内に収まっている。

**削るならここ**: 予算が逼迫した場合、Wave 2 のうち #22 `umi_coral_soft_02` / #23 `umi_coral_table_01` / #25 `umi_sponge_01` の3点は Wave 1 の #11 と #9 の使い回し (スケール/FlipX違い) で代替可能。−21cr。

---

## 7. 実装側に必要なフック (これが無いと発注アートが活きない)

配置テーブルの拡充だけでは今回の設計は成立しない。`KawaGlintStageBuilder.cs` に以下が必要:

| # | 変更 | 現状 | 必要な理由 |
|---|---|---|---|
| H1 | `DecorPlacement.RootY` 追加 | `waterRect.yMin + 0.05f` 固定 (L1403) | **最重要**。FAR/MID/NEAR の高さ帯分けが不可能 |
| H2 | `bool Foreground` → `enum DecorPlane {Far=11, MidBack=12, MidFront=13, Drift=15, Near=20, Edge=21}` | 2値 (11 / 20) のみ | 中間層13が無いと水柱が埋まらない |
| H3 | `WorldX` → **正規化U** (`waterRect.xMin + U * waterRect.width`) | 絶対ワールドX (L353-401) | 20:9等の広い端末で左右各2.2単位が空白のまま露出する現行バグの解消 |
| H4 | `FlipX` 追加 | なし | 27ファイルの見かけ上のバリエーションが倍になる (コスト0) |
| H5 | 揺れをプレーン依存に (FAR 5°/速、MID 4.5°、NEAR 2.5°/遅)、サンゴ・イソギンチャクにも微揺れ1.5°を許可 | 揺れは水草のみ・一律4° (L1414-1433) | 「静止画っぽくしたくない」要望への直接回答。奥行き手がかりにもなる |
| H6 | プレーン別 tint 定数化 | `OkiHazeTint` 1個のみ (L341) | 空気遠近が出せない |
| H7 | **asase の "back-layer only 回帰基準" 制約の解除 + QAスクショ再ベースライン** | L279-282 で固定 | ユーザー要望と正面から矛盾。要ユーザー決裁 |
| H8 | テクスチャ予算: `BuildDecor` は**全5ロケーション分のコンテナを同時に生成** (L1352-1370)。34ファイルに増えるので、(a) 1:1/9:16は `maxTextureSize 1024`、16:9帯物のみ2048、(b) ASTC/ETC2圧縮 (現行 textureCompression:2 は維持)、(c) mipmap off、または (d) アクティブロケーションのみ遅延ロードに変更 | 現行13点・maxTextureSize 2048 | モバイル実機のVRAM。34×2048²だと非圧縮換算で数百MB |

**パララックス担当エージェントへの申し送り**: 本設計の FAR / MIDBACK / MIDFRONT / NEAR は、そのままパララックスのスクロール層として使える。推奨係数は FAR 0.15 / MIDBACK 0.35 / MIDFRONT 0.6 / NEAR 1.0 / EDGE 1.15。層を二重に定義しないこと。

---

## 8. 検収基準 (QA)

1. 各ロケーションのスクショで、水中エリア (y -5.0〜+1.6) の**空白グラデ領域が全幅の30%未満**になっていること (現状は約75%)。
2. 魚影が遊泳中に**必ず1回以上どこかのNEARプロップの裏に消える**こと (特に iwaba の `umi_reef_cluster_02` のアーチ)。
3. 全プロップが `scale.x == scale.y` であること (AR厳守ルール、自動テスト化推奨)。
4. ウキ回廊 U∈[0.528, 0.674] に NEAR/EDGE が1つも無いこと。
5. 生成物受け入れ時に **Read tool で全点を目視**し、(a) 紙の目テクスチャがあるか、(b) 硬い輪郭線が出ていないか、(c) 禁則物 (ヒトデ・貝・文字・キャラ) が混入していないか、(d) クロマキー残滓 (緑/マゼンタのフリンジ) が無いかを確認。既存 `umi_coral_01` が画風から外れた原因は、この (a)(b) チェックの欠落。

---

**関連ファイル (絶対パス)**
- `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/Runtime/Rendering/KawaGlintStageBuilder.cs` (L285-413 配置テーブル、L1343-1434 BuildDecor)
- `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/Runtime/Rendering/KawaGlintSpriteCatalog.cs` (L120-129 DecorKeys、新規27キーの追加先)
- `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/Content/Resources/KawaGlint/Sprites/Decor/` (納品先)
- `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/docs/TSURI_SEA_WORLDMAP_PLAN_2026-07-24.md` (L150/L158/L194 ニッチ演出「岩間の泡」の根拠)

---

## 4. 背景多層化 + 水面二重解消 設計

I have everything I need. Here is the design spec.

---

# KawaGlint 背景多層化 + 水面二重解消 設計仕様 (2026-07-25)

実コードとPNG実測に基づく。測定スクリプトは `/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/de0785e7-002d-4c22-81bf-6f909a0ea203/scratchpad/{measure_waterline,measure_foam,analyze2,analyze3,final_numbers}.py` に残置。

---

## 1. 水面が二重に見える問題 — 原因特定(数値)

### 1.1 前提の実測値(カメラ契約)

`KawaGlintProjectSetup.cs:640-641` = orthographic, size 5 → 可視ワールド高 10 (y ∈ [-5, +5])、16:9 で幅 17.7778 (x ∈ ±8.8889)。`WaterlineWorldY = 1.6` (StageBuilder L93)。背景PNGは全5点とも **2688×1520**、PPU=100 → 素の world size 26.88 × 15.20。

`ApplyBackgroundArt` (L681-708) の cover-fit:
```
s = max( 17.7778/26.88 , 3.4/(15.20*wl) , 6.6/(15.20*(1-wl)) ) * 1.02
centerY = 1.6 - (0.5 - wl) * 15.20 * s
```
つまり **wl (BackgroundWaterlineFromTop01) はスケール s そのものを決める**。ここが後述の波及範囲の根源。

### 1.2 原因A(最大・実バグ): `bg_tsuri_sea_sunahama` の wl が「水平線」であって「カットアウェイ水面」ではない

PNG を列ごとに走査して塗り込まれた白いフォーム稜線の行を実測(65列サンプル):

| 背景 | コード値 wl | 実測 塗り水面 01 | Δpx | **Δワールド単位** | 判定 |
|---|---|---|---|---|---|
| bg_river_crosssection | 0.41382 | 0.4068 | −11 | **−0.081** | 軽微だがズレ有 |
| bg_tsuri_river_kakou | 0.3862 | 0.3813 | −7 | **−0.054** | ほぼ一致 |
| **bg_tsuri_sea_sunahama** | **0.3961** | **0.4452** | **+75** | **+0.548** | **破綻** |
| bg_tsuri_sea_iwaba | 0.3941 | 0.3985 | +7 | **+0.048** | ほぼ一致 |
| bg_tsuri_sea_oki | 0.3763 | 0.3771 | +1 | **+0.009** | 一致 |

sunahama の 0.3961 は **遠景の水平線(空と遠い海の境界)** の行。実際のカットアウェイ面(近景の白波稜線、桟橋の杭が水中に入る高さ)は row 677前後 = 0.4452。差 **0.548 ワールド単位 = 可視高の 5.5% ≒ 1080p レンダで約 59px**。KawaSurfaceBand の crest は y=1.6 固定、塗りの水面は y≒1.05 → **59px 離れた白線が2本**。ユーザーが「砂浜の桟橋」を名指ししたのはこれ。

目視確認済み(`tight_bg_tsuri_sea_sunahama.png`): 赤線(=コードの水面)の下に「きらめく上向き海面」の帯が続き、さらにその下に白い波頭 → その下が水中。赤線は水平線に乗っている。

### 1.3 原因B(構造的・全ロケーションに効く): シェーダーが独立した波位相を上描きしている

塗り水面の波の振幅(IQR半幅)実測 vs `KawaWave.Height` の最大振幅 0.082:

| 背景 | 塗り波 半振幅 | シェーダー波 最大 |
|---|---|---|
| asase | 0.038 | 0.082 |
| kakou | 0.040 | 0.082 |
| sunahama | 0.059 | 0.082 |
| iwaba | 0.080 | 0.082 |
| oki | 0.092 | 0.082 |

塗りの波形は固定、シェーダーの波形は解析式で **位相が無相関**。最悪の食い違いは 0.082+0.092 ≒ **0.17 ワールド単位**。一方 crest のガウシアン幅は σ=0.03(1080p で約3.2px) — つまり **wl を完璧に合わせても、位相がずれた区間では線が2本に分離する**。「他のところもそう」の正体。

さらに crest の輝度は `_SparkleTint.rgb * 1.6 * crest`(KawaSurface.shader L155)でハード。塗りの柔らかいフォームの上に細い硬い線が乗る → 別物として読める。

### 1.4 原因C: `_ShoreEdgeX` が全ロケーション −5.4 固定

`ShoreRightEdgeWorldX = -5.4f`(StageBuilder L98)は**手続き型の土手**の位置。アート背景時に土手は存在しないのに、Bootstrap L104 が同じ値を渡し、shader L178 が `exp(-((x+5.4)/1.2)^2)` で泡を描く → x∈[-7.8,-3.0] に常時フォームパッチ。

実測した各背景の実際の岸の位置(ワールドX、補正後トランスフォーム基準):

| 背景 | 岸の位置 | 現在のフォーム位置 | 妥当性 |
|---|---|---|---|
| asase | 岸なし(横断面が全幅) | −5.4 | ✗ 何もない水面に泡 |
| kakou | 左 ≒ −5.35 / 右 ≒ +4.05 | −5.4 | △ 左のみ偶然近い |
| sunahama | 左の砂浜 ≒ −6.3(桟橋は右 +0.7〜) | −5.4 | △ ズレ |
| iwaba | **右の岩場 ≒ +2.6〜+8.3** | −5.4 | ✗ 逆側 |
| oki | 岸なし | −5.4 | ✗ 外洋に泡 |

### 1.5 原因D: sparkle 帯が「水上」に描かれている(sunahama)

band の縦範囲は `[wl-0.55, wl+0.35]`、sparkle は crest の下 0.45 まで。sunahama では塗り水面が 0.548 下なので、sparkle の描画域がまるごと**塗りの水上海面**に乗る → 3本目の明部。

---

## 2. 採用する解決策: **(d) = (a) + (b)**

### 2.1 判断理由

- **(c)背景を水面なしで再生成 → 却下(主案としては)**。5点とも水面込みで美しく完成しており、Pono/デコの座標が全部これに紐付いている。GPT Image 2 に「水面線を描くな」を確実に守らせるのは困難で、カットアウェイ表現そのものが成立しなくなる。
- **(a)単独 → 不十分**。1.3 の位相問題が残るので sunahama を直しても線は分離する。
- **(b)単独 → 不十分**。sunahama の 0.548 ズレは「エフェクトを弱める」では消えない(塗りの水面と bobber/魚/caustics の水面が半ユニット離れたまま = ウキが空中に浮く)。
- **(a)+(b) を採用**。さらに sunahama だけ副作用が大きいので、後追いで **(c) を sunahama 1枚だけ** に限定適用する二段構えを推奨(§2.5)。

**却下した代替案(記録)**: `WaterlineWorldY` をロケーション別にする案。アートを一切動かさずに済む(sunahama を 1.03 にすれば Pono 再調整不要)が、SurfaceBand/Caustics のメッシュ再構築、Actors の水面再設定、Refraction/GodRay の viewportY 再設定が**ロケーション切替のたび**に必要になり、5モジュールに live-update API を新設することになる。デシンクのリスクが「1ロケーションの数値再調整」より高いので不採用。**ただし QA で sunahama のズーム(§2.3)が許容できない場合の唯一の逃げ道なので、この判断理由ごと DESIGN.md に残すこと。**

### 2.2 変更(a): waterline 実測値の是正

`Runtime/Rendering/KawaGlintStageBuilder.cs`

```csharp
// L153
private const float BgWaterlineFromTop01 = 0.4068f;   // was 0.4138157894736842f

// L163-169
private static readonly Dictionary<string, float> BackgroundWaterlineFromTop01 = new Dictionary<string, float>
{
    { "bg_tsuri_river_kakou",  0.3813f },  // was 0.3862f
    { "bg_tsuri_sea_sunahama", 0.4452f },  // was 0.3961f  ★水平線を誤測していた
    { "bg_tsuri_sea_iwaba",    0.3985f },  // was 0.3941f
    { "bg_tsuri_sea_oki",      0.3771f },  // was 0.3763f
};
```

補正後の実効トランスフォーム(実装者の検算用):

| 背景 | s(旧→新) | drawnW | drawnH | centerY | 横クロップ率 |
|---|---|---|---|---|---|
| bg_river_crosssection | 0.75556→**0.74662** (−1.2%) | 20.069 | 11.349 | 0.5423 | 11% |
| bg_tsuri_river_kakou | 0.72156→**0.71585** (−0.8%) | 19.242 | 10.881 | 0.3084 | 8% |
| bg_tsuri_sea_sunahama | 0.73339→**0.79830** (+8.9%) | 21.458 | 12.134 | 0.9351 | 17% |
| bg_tsuri_sea_iwaba | 0.73097→**0.73632** (+0.7%) | 19.792 | 11.192 | 0.4640 | 10% |
| bg_tsuri_sea_oki | 0.71011→**0.71102** (+0.1%) | 19.112 | 10.808 | 0.2718 | 7% |

px→world 変換(レイヤー配置の実測に使う): `x = (px/2688 − 0.5) * drawnW`, `y = centerY + (0.5 − py/1520) * drawnH`

**asase/kakou/iwaba/oki は再調整不要**: スケール変化が ≤1.2% で、Pono アンカーやデコの下にあるアート特徴の移動量は最大 **0.09 ワールド単位**(実測)。ただし asase は「回帰基準」なので、QA スクショの基準画像を撮り直すこと(意図的なベースライン更新として記録)。

### 2.3 変更(a)の波及: sunahama のみ再調整が必須

s が +8.9% になるためアートが拡大・上方シフトする。旧アンカー (0.90, 2.20) が指していたアート上の点は px(1467, 520) → 新トランスフォームで **world (0.98, 2.85)**。

```csharp
// L255
{ "bg_tsuri_sea_sunahama", new Vector3(0.98f, 2.85f, 0f) },  // was (0.90f, 2.20f)
```

**しかし `AnglerArtWorldHeight = 2.6` のままだとスプライト上端 = 2.85+2.6 = 5.45 > カメラ上端 5.0 で `KawaGlintAnglerPlacementEditModeTests` が落ちる。** 桟橋のデッキは補正後 world y 2.85〜3.9(実測、手前ほど高い)なので、2.6 が収まる低い板は存在しない。→ **Pono の身長をロケーション別にする**:

```csharp
// AnglerArtWorldHeight を定数から辞書引きへ
private const float DefaultAnglerWorldHeight = 2.6f;
private static readonly Dictionary<string, float> AnglerWorldHeightByBackgroundKey = new()
{
    { "bg_tsuri_sea_sunahama", 1.95f },   // 桟橋は遠景 → 上端 2.85+1.95 = 4.80 (<= 4.9 推奨上限)
};
private static float ResolveAnglerWorldHeight(string key) => ...;
```
使用箇所は3つ: `BuildAnglerArt` (L1185, L1213)、`SetAnglerPosition` (L1254)、EditMode テスト。
派生値(検算用): sunahama H=1.95 → worldWidth 1.900、rodTip offset (+0.875, +1.407) → **rodTip world (1.855, 4.257)**。

デコの X も同じ倍率(21.458/19.714 = **1.0885**)で追従させる:
```csharp
// L374-379 sea_sunahama
new DecorPlacement("umi_rock_01", -1.63f, 1.1f, false, false),   // was -1.5f
new DecorPlacement("umi_kelp_03",  1.31f, 1.0f, false, true),    // was  1.2f
new DecorPlacement("umi_kelp_01", -4.68f, 1.3f, false, true),    // was -4.3f
```
(デコの Y は `waterRect.yMin + 0.05` = −4.95 でカメラ基準なので変更不要。補正後の砂底は world y −1.38 以下なので問題なし。)

### 2.4 変更(b): SurfaceBand を「アートに従属させる」

`Content/Resources/KawaGlint/Rendering/KawaSurface.shader` — ハードコード定数をプロパティ化:

| 新プロパティ | 既定値(手続き型パス互換) | 置換対象 |
|---|---|---|
| `_WaveFollow` | 1.0 | L153 `wave` に乗算 → `worldY - (_WaterlineY + wave * _WaveFollow)` |
| `_CrestGain` | 1.6 | L155 のハードコード `1.6` |
| `_CrestSigma` | 0.03 | L154 の `0.03` 2箇所 |
| `_SparkleGain` | 2.0 | L171 の `2.0` |
| `_SparkleDepth` | 0.45 | L164 の `0.45` |
| `_FoamGain` | 0.85 | L183 の `0.85` |
| `_FoamCenterA` / `_FoamCenterB` | −5.4 / 9999 | L178 の `_ShoreEdgeX` を2アンカーの max に |
| `_FoamHalfWidth` | 1.2 | L178 の `1.2` |

```hlsl
float foamZone = max(exp(-pow((worldX - _FoamCenterA)/_FoamHalfWidth, 2.0)),
                     exp(-pow((worldX - _FoamCenterB)/_FoamHalfWidth, 2.0)));
```

ロケーション別スタイル表(新規 `Runtime/Rendering/KawaGlintSurfaceStyle.cs`、`ResolveSurfaceStyle(backgroundKey)` を StageBuilder に追加):

| key | WaveFollow | CrestGain | CrestSigma | SparkleGain | FoamGain | FoamCenterA | FoamCenterB | FoamHalfWidth |
|---|---|---|---|---|---|---|---|---|
| (手続き型フォールバック) | 1.00 | 1.60 | 0.030 | 2.00 | 0.85 | −5.40 | 9999 | 1.20 |
| bg_river_crosssection | 0.35 | 0.45 | 0.055 | 1.60 | **0.00** | — | — | — |
| bg_tsuri_river_kakou | 0.35 | 0.40 | 0.055 | 1.80 | 0.55 | **−5.35** | **+4.05** | 1.10 |
| bg_tsuri_sea_sunahama | 0.30 | 0.35 | 0.065 | 1.70 | 0.60 | **−6.30** | 9999 | 1.40 |
| bg_tsuri_sea_iwaba | 0.30 | 0.40 | 0.060 | 1.70 | 0.65 | **+2.60** | 9999 | 1.60 |
| bg_tsuri_sea_oki | 0.30 | 0.30 | 0.065 | 1.90 | **0.00** | — | — | — |

**数値の根拠:**
- `WaveFollow ≤ 0.35` → 動く稜線の振れ幅が **±0.029** に収まる。これは各ロケーションの塗りフォーム半厚(実測 0.038〜0.092)より小さいので、**シェーダーの光沢は必ず塗りのフォームの内側で動く = 絶対に分離しない**。これが 1.3(位相問題)への構造的回答。
- `CrestGain` 1.6→0.30〜0.45 かつ `CrestSigma` 0.03→0.055〜0.065 で、輝度 1/4・幅 2倍 → 「2本目の線」から「塗り波の上を走る光沢」になる。
- sparkle は据え置き〜微減。ユーザーが求めている「動き」はここが担う。
- FoamGain=0 は asase(横断面が全幅で近景の岸がない)と oki(外洋)。

**API 変更:**
- `KawaSurfaceBand.Create(..., in KawaSurfaceStyle style)` / 新規 `SetStyle(in KawaSurfaceStyle)`。
- `KawaGlintBootstrap.Awake` L100-106 でスタイルを渡す。`OnLocationBackgroundChanged` (L191) に `_surface?.SetStyle(KawaGlintStageBuilder.ResolveSurfaceStyle(backgroundKey));` を追加。
- `KawaStageInfo.ShoreRightEdgeWorldX` は手続き型パス専用として残す(スタイル表が優先)。

**意図的に残す差分(将来「修正」されないよう明記すること)**: ウキは `KawaGlintBobber` が `KawaWave.Height` を **フル振幅** で使い続ける(L300/315/326)。稜線光沢は 0.30〜0.35 倍なので最大 0.057 ワールド単位(1080p で約6px)の差が出るが、これは「ウキは平均水面より細かい波に揺れる」表現として正しく、知覚閾値以下。

---

## 3. 背景の多層化・アニメーション化

### 3.1 現状診断: アートパスでは空が完全に死んでいる

`Build()` L470-492 で、アートが読めた場合は **`BuildSky`/`BuildWater`/`BuildSunGlow`/`BuildClouds`/`BuildRiverbed`/`BuildPlants`/`BuildShoreBank` が全部 else 側に入って一度も呼ばれない**。

したがって:
- **`Clouds`(order 8)は「実装済みだが本番では一度も走っていない」**。`RegisterCloud`/`AnimateClouds`(ドリフト+ラップ)機構はそのまま流用可。
- `RegisterSun`(パルス)も同様に未使用。
- `RegisterPlant`(揺れ)はデコの海藻 2〜3枚だけが使っている。
- 結果、アートパスで動いているのは「デコ海藻の揺れ・motes パーティクル・caustics/surface シェーダー・post(屈折/god ray)・魚/ウキ」だけ。**水上は完全静止**。

**先に潰すバグ**: `content.SetCloudWrapBounds(...)` は `BuildClouds` 内(L817)でしか呼ばれない。アートパスでは `_cloudWrapMinX/_cloudWrapMaxX` が 0/0 のままなので、**このまま `RegisterCloud` を使うと全部即ラップして動かない**。→ `Build()` 内で `content.SetCloudWrapBounds(visibleRect.xMin, visibleRect.xMax);` を無条件に呼ぶよう移動すること。

### 3.2 sortingOrder 契約(実コードから確認済み・新規分を追記)

既存(変更禁止): `0 Sky(手続き型)` / `1 Water(手続き型)` / `2 BackgroundArt` / `6 SunGlow(手続き型)` / `8 Clouds(手続き型)` / `10 Riverbed+Stones(手続き型)` / `11 DecorBack` / `12 Plants(手続き型)` / `14 Fish` / `16 Caustics` / `18 Motes` / `20 DecorFront` / `30 SurfaceBand` / `32 RippleRing・SplashRing` / `33 FishingLine` / `34 Bobber` / `35 SplashDroplet` / `40 ShoreBank` / `42 Angler`。UI は別 Canvas(100/110/111)。

新規レイヤー(アートパス専用。手続き型パスとは同時に存在しない):

| order | レイヤー名 | 内容 | アニメ方式 |
|---|---|---|---|
| 3 | `HorizonHaze` | 塗り水平線に薄い大気ヘイズ帯 | 透明度サイン(手続き生成、アート不要) |
| 4 | `CloudsFar` | 巻雲シート(全幅) | シェーダー UV スクロール |
| 5 | `CloudsMid` | 積雲スプライト 1〜2枚 | transform ドリフト+ラップ(`RegisterCloud`) |
| **6** | `SunGlowArt` | 太陽グロー(手続き型と同じスロット再利用) | `RegisterSun` パルス |
| 7 | `SkyLife` | 鳥/とんぼシルエット 2〜3体 | transform ドリフト+ラップ + 上下微小サイン |
| 9 | `BankFoliage` | 揺れる木・葦・浜草(水面より上) | **新規 `KawaFoliageSway` シェーダー** |
| 13 | `SubsurfaceHaze` | 水面直下の柔らかい横縞帯 | UV スクロール |
| 15 | `DriftFar` | 遠景のぼやけた浮遊物シート | UV スクロール |
| 17 | (予約: `GodRaySheet`) | **v1 未使用** — 塗りアートに既に光条があり、既存 post の KawaGodRay と合わせて三重になる(水面二重と同じ罠) | — |
| 19 | `BubbleRise` | 立ち昇る気泡 | ParticleSystem(`BuildMotes` レシピ流用) |
| 21 | `ForegroundSilhouette` | 手前の暗い岩の縁/大きな海藻 | 揺れシェーダー + 微小ドリフト |
| 22 | `SurfaceDebris` | 水面に浮かぶ落ち葉/花びら | X ドリフト + `y = 1.6 + KawaWave.Height*WaveFollow`、回転 = `atan(Slope)` |

`SurfaceDebris` は **意図的に稜線光沢と同じ `WaveFollow` を使う**。これで「浮遊物が水面の波に乗る」ことが水面の単一性を逆に補強する。

### 3.3 アニメーション実装方式と具体値

**(1) transform ドリフト(既存機構を流用)** — `KawaGlintStageContent.RegisterCloud(t, speed, halfWidth)` + `AnimateClouds`。
- 拡張が必要: `CloudEntry` に `MinX/MaxX` を追加し `RegisterCloud(t, speed, halfWidth, minX, maxX)` オーバーロードを作る(既定は共有バウンズ)。レイヤーごとにラップ範囲を変えたいため。
- 速度: `CloudsMid` 0.05〜0.10 u/s、`SkyLife` 0.35〜0.55 u/s(17.8ユニット横断に 32〜50秒)、`SurfaceDebris` 0.12〜0.20 u/s。
- カメラは静止なので **パララックスは「レイヤーごとの自走速度差」で表現する**。比率目安 `HorizonHaze 1 : CloudsFar 2 : CloudsMid 6 : SurfaceDebris 12 : SkyLife 35`。

**(2) シェーダー UV スクロール(新規 `KawaScrollSheet.shader`)** — `KawaFishWag.shader` と同じ CGPROGRAM + `Fallback "Sprites/Default"` 構造。プロパティ `_ScrollSpeed(xy)` `_Tint` `_Alpha`。`_Time.y` 駆動で `uv += _ScrollSpeed * _Time.y`。テクスチャは wrapMode **Repeat** 必須。
- `CloudsFar` 0.006〜0.012 uv/s(全幅横断 2〜3分)、`SubsurfaceHaze` 0.010 / 0、`DriftFar` 0.014 / +0.004。
- 透明度: CloudsFar α 0.45〜0.65、SubsurfaceHaze α 0.10〜0.18、DriftFar α 0.08〜0.14。

**(3) 揺れシェーダー(新規 `KawaFoliageSway.shader`)** — `KawaFishWag` の U 方向シアーを **V 依存の U シアー** に置き換えたもの。
```hlsl
float v = IN.texcoord.y;
float w = smoothstep(_SwayRootV, 1.0, v);            // 根元は固定、上ほど揺れる
float off = _SwayAmp * w * sin(_Time.y*_SwaySpeed + _SwayPhase + v*_SwayWave);
float2 uv = float2(clamp(IN.texcoord.x + off, 0.001, 0.999), v);
```
値: `_SwayAmp` 0.010〜0.020(UV)、`_SwaySpeed` 1.2〜2.0 rad/s(0.19〜0.32Hz)、`_SwayRootV` 0.25、`_SwayWave` 2.5、`_SwayPhase` はインスタンスごとに MaterialPropertyBlock で 0〜2π 乱数(FishWag の `_WagPhase` と同じ手法)。
**なぜ既存 `RegisterPlant`(根元回転)を使わないか**: 幹のある木を根元で回すと木全体が傾いて不自然。葦・浜草のような幹なしの束だけ `RegisterPlant`(既存 ±4°、0.5〜1.3 rad/s)を流用する。

**(4) 太陽パルス** — 既存 `RegisterSun(transform, baseScale, 2π/5, phase, 0.03)` をそのまま。グローのテクスチャは既存 `BuildSunGlow` の手続き生成関数を切り出して再利用(**アート発注不要**)。

**(5) パーティクル** — `BuildMotes` の設定手順(Stop→設定→Play、`useAutoRandomSeed=false`、VelocityOverLifetime の全カーブを TwoConstants で明示ゼロ埋め ← L1524-1547 のコメント参照、これを守らないと毎フレーム警告が出る)をそのまま踏襲。`BubbleRise`: rate 1.5/s、lifetime 4〜7s、startSpeed 0.25〜0.45 上向き、size 0.03〜0.09、maxParticles **40**。

**子供向け安全**: 全レイヤーの周期 ≥ 2秒(≤0.5Hz)。既存 KawaSurface の「2.5Hz 上限」より十分低い。輝度の振れ幅は α で ±0.06 以内。

### 3.4 コード変更箇所まとめ

| ファイル | 変更 |
|---|---|
| `Runtime/Rendering/KawaGlintStageBuilder.cs` | waterline 4値+定数、sunahama アンカー/身長/デコX、`SetCloudWrapBounds` を `Build()` へ移動、`BuildBackdropLayers()` 新設(`BuildDecor` と同じ「全ロケ事前構築 + SetActive 切替」パターン)、`SetBackdrop(stage,key)` 新設、`ResolveSurfaceStyle(key)` 新設 |
| `Runtime/Rendering/KawaGlintStageContent.cs` | `RegisterCloud` オーバーロード(min/max X)、`RegisterScroller(Material, Vector2)`、`RegisterSurfaceDebris(...)`、`RegisterBackdropContainer/GetBackdropContainer` |
| `Runtime/Rendering/KawaSurfaceBand.cs` | `Create(..., in KawaSurfaceStyle)`、`SetStyle()`、PropertyID 追加 |
| `Runtime/Rendering/KawaGlintSurfaceStyle.cs` | **新規** struct + 表 |
| `Runtime/Rendering/KawaGlintSpriteCatalog.cs` | `LayerKeys` HashSet + `LoadLayer(key, pivot)`(prefix `KawaGlint/Sprites/Layers/`、Decor と同じ null 許容契約) |
| `Runtime/Bootstrap/KawaGlintBootstrap.cs` | スタイル受け渡し、`OnLocationBackgroundChanged` に `SetBackdrop` + `SetStyle` 追加 |
| `Content/Resources/KawaGlint/Rendering/KawaSurface.shader` | プロパティ化 |
| `Content/Resources/KawaGlint/Rendering/KawaScrollSheet.shader` | **新規** |
| `Content/Resources/KawaGlint/Rendering/KawaFoliageSway.shader` | **新規** |

---

## 4. ロケーション別レイヤー配置テーブル

数値は「枚数(インスタンス数)」。0 は非配置。

| order / レイヤー | river_asase | river_kakou | sea_sunahama | sea_iwaba | sea_oki |
|---|---|---|---|---|---|
| 3 HorizonHaze | 1 | 1(暖色) | 1 | 1 | 1 |
| 4 CloudsFar(巻雲) | 1 | 1(夕焼けtint) | 1 | 1 | 1 |
| 5 CloudsMid(積雲) | 2 | 2(夕焼けtint) | **1** | 2 | **1** |
| 6 SunGlowArt | 1 | 1(大・暖色) | 1 | 1 | 1 |
| 7 SkyLife | 2(とんぼ) | 2(鳥シルエット) | 2(かもめ) | 2(かもめ) | **3**(かもめ) |
| 9 BankFoliage | **3**(木2+葦1) | 3(浜草3) | 2(浜草2) | 0 | 0 |
| 13 SubsurfaceHaze | 1 | 1 | 1 | 1 | 1 |
| 15 DriftFar | 1 | 1 | 1 | 1 | 1 |
| 19 BubbleRise | 1 PS | 1 PS | 1 PS | 1 PS | 1 PS |
| 21 ForegroundSilhouette | 1(岩の縁) | 1(葦の茂み) | 1(海藻) | **2**(岩の縁+珊瑚) | **0** |
| 22 SurfaceDebris | 3(落ち葉) | 3(花びら) | 2(小さな泡) | 2(海藻片) | **0** |
| **描画コール(レイヤー種数)** | **10** | **10** | **10** | **9** | **7** |

**川と海・浅場と沖の作り分け根拠:**
- **asase(川の浅瀬・昼)**: 唯一 `BankFoliage` に「木」を置く(両岸に木が塗ってある)。`SurfaceDebris` は落ち葉。手前シルエットは岩の縁で浅瀬感。
- **kakou(河口・夕焼け)**: 雲・グローを暖色 tint。木はなく砂丘の草 → 浜草3。フォームアンカーが2つ(左右両岸)ある唯一のロケーション。
- **sunahama(砂浜・桟橋)**: 塗りアートの積雲が既に大きく目立つので `CloudsMid` を **1 に減らす**(でないと雲が二重に見える=水面二重と同じ失敗)。木なし・浜草のみ。
- **iwaba(岩場)**: 陸は岩なので `BankFoliage` **0**。代わりに手前シルエットを 2 枚にして岩の重なりで奥行きを出す(RockCover ニッチの「いわの かげで なにか うごいたよ」演出と整合)。
- **oki(沖・外洋)**: 「床なし・何もない」が設計意図(`AnglerAnchorByBackgroundKey` の既存コメント)なので手前シルエットと水面浮遊物は **0**。空だけをかもめ 3 体で賑やかにする。塗りの積雲が大きいので `CloudsMid` は 1。

**ウキ回廊の保護**: 既存設計(depth doc §B)どおり **x ∈ [0.5, 3.1] には order 21 の手前シルエットを置かない**。前あたり演出が隠れる。sunahama は Pono/竿先が x 0.98〜1.86 にあるので、この回廊は x ∈ [0.5, 3.5] に拡張すること。

---

## 5. パフォーマンス上限(明記して守らせる)

想定端末: 中位 Android タブレット、1600×720〜2000×1200、URP 2D Renderer、60fps 目標 / 30fps 下限。

| 項目 | 上限 | 現状 → 変更後 |
|---|---|---|
| 背景レイヤーの描画コール | **≤ 12 種/ロケーション** | 0 → 最大 10 |
| シーン全体の描画コール(UI 除く) | **≤ 45** | 約 15〜20 → 25〜32 |
| SetPass コール | **≤ 20** | — |
| 全画面サイズの半透明レイヤー同時数 | **≤ 3**(CloudsFar / SubsurfaceHaze / DriftFar) | — |
| それ以外のレイヤーの画面占有率 | 各 **< 35%** | — |
| 平均オーバードロー | **≤ 3.0×** | 約 1.7× → 約 2.9×(post 3枚込みで約 6×) |
| 新規テクスチャ合計(圧縮後) | **≤ 12 MB** | — |
| ParticleSystem 合計 maxParticles | **≤ 200** | 150(Motes) → 190 |

**必須の実装制約:**
- **1レイヤー内の複数インスタンスは同一 Sprite + 同一 Material + 同一 sortingOrder を共有すること**。そうすればスプライトバッチングで 1 描画コールにまとまる(だから上の表は「枚数」ではなく「レイヤー種数」で予算を切っている)。
- 全ロケーション分を事前構築して `SetActive` 切替(`BuildDecor`/`SetDecor` と同じパターン)。テクスチャは §6 のとおり**ロケーション間で共有 + tint** なので、5ロケ分事前構築してもテクスチャは増えない。
- 新規テクスチャの import 設定: `enableMipMap: 0`、`maxTextureSize: 2048`、`textureCompression: 2`(ASTC/ETC2)、`alphaIsTransparency: 1`、`spritePixelsToUnits: 100`。**タイル用シート(巻雲/ヘイズ/浮遊物)は `wrapU/wrapV: 0`(Repeat)**、それ以外は Clamp(既存背景 .meta は Clamp なので要変更)。
- 手続き生成テクスチャ(HorizonHaze, SunGlowArt, BubbleRise)は必ず `content.RegisterGeneratedAsset` に登録すること。逆に `KawaGlintSpriteCatalog` 経由で読んだものは**絶対に登録しない**(Resources 破壊、カタログ冒頭の警告参照)。

---

## 6. アート発注リスト

生成: Higgsfield MCP `generate_image`、**model: "gpt_image_2"**、quality:"high"、resolution:"2k"。1枚7クレジット、残高892。
**透過が必要な素材は GPT Image 2 が真のアルファを出せないため、純マゼンタ(#FF00FF)背景で生成 → 既存 batch:1467 と同じクロマキー除去パイプラインで処理すること。**
納品先: `Content/Resources/KawaGlint/Sprites/Layers/`(新設)。既存背景アートと同じ色鉛筆/水彩タッチに揃えること。

### 6.1 共有素材(全/多ロケーションで tint 流用) — 10点

| # | ファイル名 | サイズ | pivot | wrap | 内容 | 使用 |
|---|---|---|---|---|---|---|
| 1 | `layer_clouds_cirrus.png` | 2048×512 | center | **Repeat** | 横方向にシームレスタイルする薄い巻雲。白〜極薄グレー、密度は疎 | CloudsFar 全5 |
| 2 | `layer_cloud_cumulus_a.png` | 1024×512 | center | Clamp | ふんわりした積雲 1個、輪郭やわらか | CloudsMid 全5 |
| 3 | `layer_cloud_cumulus_b.png` | 1024×512 | center | Clamp | 別シルエットの積雲 1個 | CloudsMid(asase/kakou/iwaba) |
| 4 | `layer_bird_gull.png` | 256×128 | center | Clamp | かもめの横シルエット(翼を広げた形、単色に近い) | SkyLife(海3) |
| 5 | `layer_bird_small.png` | 256×128 | center | Clamp | 小鳥/とんぼの小さいシルエット | SkyLife(川2) |
| 6 | `layer_haze_subsurface.png` | 1024×256 | center | **Repeat** | 水面直下の淡い横縞ハイライト、白→透明 | SubsurfaceHaze 全5 |
| 7 | `layer_drift_plankton.png` | 1024×1024 | center | **Repeat** | まばらな微粒子/プランクトンの白い点、シームレス | DriftFar 全5 |
| 8 | `layer_debris_leaf.png` | 256×256 | center | Clamp | 小さな落ち葉 1枚(上から見た形) | SurfaceDebris(川2、海は tint 流用) |
| 9 | `layer_fg_silhouette_rock.png` | 1024×640 | bottom-center | Clamp | 手前の岩の縁、暗く沈んだシルエット寄り | ForegroundSilhouette(asase/iwaba) |
| 10 | `layer_fg_silhouette_kelp.png` | 640×1024 | bottom-center | Clamp | 手前の大きな海藻の葉、暗め | ForegroundSilhouette(kakou/sunahama/iwaba) |

### 6.2 植生素材(「木々が揺れる」要件) — 5点

| # | ファイル名 | サイズ | pivot | 内容 | 使用 |
|---|---|---|---|---|---|
| 11 | `layer_tree_riverbank_a.png` | 640×896 | bottom-center | 川岸の広葉樹 1本、幹あり・枝葉ふさふさ | asase |
| 12 | `layer_tree_riverbank_b.png` | 640×896 | bottom-center | 別シルエットの木 1本 | asase |
| 13 | `layer_reed_cluster.png` | 512×512 | bottom-center | 葦の束(幹なし、細長い葉が数本) | asase / kakou |
| 14 | `layer_dunegrass_cluster.png` | 640×448 | bottom-center | 砂丘の草の茂み | kakou / sunahama |
| 15 | `layer_palmgrass_tuft.png` | 512×512 | bottom-center | 浜辺の草の小さい房 | sunahama |

**合計 15点 ≒ 105クレジット。**

### 6.3 手続き生成で済ませる(発注不要)

`HorizonHaze`(縦グラデ帯)、`SunGlowArt`(既存 `BuildSunGlow` のテクスチャ生成を関数として切り出して再利用)、`BubbleRise` の粒(既存 `CreateSoftCircleTexture`)。

### 6.4 任意・第2段(§2.5 相当、QA 判断後)

| # | ファイル名 | 内容 |
|---|---|---|
| 16 | `bg_tsuri_sea_sunahama_v2.png` | 2688×1520。**近景の白波稜線を上から 40%(±1%)の位置に**、かつ **桟橋のデッキを水面から低く(桟橋の板が水面のすぐ上、いわゆる低い桟橋)**、近景の波の振幅は小さめ。これが入れば sunahama を他4ロケと同じスケール(s≒0.73)に戻せて `AnglerWorldHeight` も 2.6 に戻せる。7クレジット |

（この1枚を撮り直すのが「桟橋がおかしい」への最終回答。ただし §2.2〜2.3 のコード修正だけで**アート追加なしに二重線は解消できる**ので、こちらは後追いでよい。）

---

## 7. テスト / QA

**追加すべき EditMode テスト:**
1. `ResolveWaterlineFromTop01` が5キーとも §2.2 の実測値を返す(実測値を JSON でチェックインして突き合わせ)。
2. `ResolveSurfaceStyle` が全アートキーで `WaveFollow ≤ 0.40` を返す — **二重線の再発防止ガード**。asase/oki は `FoamGain == 0`。
3. `KawaGlintAnglerPlacementEditModeTests` を拡張: 全ロケーションで `anchor.y + ResolveAnglerWorldHeight(key) ≤ 4.9`。
4. 背景レイヤーの sortingOrder が予約セット {0,1,2,8,10,11,12,14,16,18,20,30,32,33,34,35,40,42} と衝突しない、かつ1ロケあたりのレイヤー種数 ≤ 12。

**QA 手順(既存 `KawaGlintQaCapture` / `SetEffectEnabled(KawaEffect.Surface, ...)` を使う):**
- 5ロケーション × {Surface OFF, Surface ON} = 10枚キャプチャ。ON/OFF の差分が **「塗りの波頭の上に乗った光沢」** であること。差分の中に **独立した1本の線が現れたら不合格**。
- 各ロケーションで 10秒間の連続キャプチャ(0.5秒間隔)を取り、光沢の縦位置の分散が塗りフォーム厚(§1.3の表)以内に収まることを確認。
- 実機(Android物理端末)で 60秒プレイし、Profiler で描画コール/SetPass/オーバードローが §5 の上限内であることを確認。**AGENTS.md §7.4 の実機確認 MUST 対象**(Unity なので Playwright では代替不可)。

---

## 8. 実装順序(推奨)

1. **§2.2 waterline 4値是正 + §2.3 sunahama 波及** → この時点で sunahama の 59px ズレが消える(アート不要)。
2. **§3.1 の `SetCloudWrapBounds` バグ修正** → 以降のレイヤー機構の前提。
3. **§2.4 SurfaceBand のスタイル化** → 残る位相由来の二重線とフォーム誤配置が消える(アート不要)。**ここまでで「水面二重」は完了、ユーザー確認可能。**
4. **§3.3 の新規シェーダー2本 + StageContent の Register* 拡張**(アート不要、手続き生成レイヤー HorizonHaze / SunGlowArt だけ先に入れて動作確認)。
5. **§6.1〜6.2 のアート発注 → 統合 → §4 の配置テーブル適用**。
6. QA(§7)→ 必要なら §6.4 の sunahama 撮り直し。

ステップ 1〜3 は**新規アート ゼロで完結し、ユーザーが最も強く指摘した不具合を解消する**ので、アート生成の待ちに入る前にここまで先に出すこと。

---

## 5. 生物種倍増・抽選確率再設計・生態整合性 設計

I have everything needed. Here is the design specification.

---

# KawaGlint 生物種倍増・抽選確率再設計・生態整合性点検 設計仕様 v1.0

対象: `unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/`
正本参照: `docs/TSURI_SEA_WORLDMAP_PLAN_2026-07-24.md` (v1.1) §3.1–3.5

---

## 0. 現状調査サマリ (実コード読解 + 数値シミュレーションで確定)

### 0.1 「順番に釣れる」の真因は **デデュープではなく抽選アルゴリズムの構造** だった

`TsuriCore.ComputeSpeciesProbabilities` (TsuriCore.cs:82-140) は **2段正規化** を行っている:

1. プールに**存在するレアリティだけ**で `RarityBaseWeight` を相対比較 → `rarityShare = rarityWeights[idx] / rarityTotal`
2. 同一レアリティ内で `species.Weight` の比率に配分

現行値を代入した実測 (シミュレーションで確認済み):

| ロケーション | 実際の出現率 | 連続同種率 | 上位3種占有 |
| --- | --- | --- | --- |
| river_asase | ayu 31.8% / nijimasu 28.9% / **salmon(rare) 26.3%** / zarigani 7.2% / boot 5.8% | 23.6% | **84.0%** |
| river_kakou | **salmon(rare) 40.0%** / ayu 26.8% / nijimasu 24.4% / boot 4.9% / unagi(super) 4.0% | 28.0% | **89.5%** |
| sea_sunahama | iwashi 24.5 / aji 22.3 / ebi 20.1 / karei 17.9 / kaigara 7.8 / hitode 6.7 / maguro(super) 0.71% | 16.6% | 64.6% |
| sea_iwaba | ebi 35.8 / aji 30.6 / tai 13.1 / ika 10.9 / hitode 9.2 / maguro 0.48% | 23.7% | 77.7% |
| sea_oki | iwashi 34.9 / aji 31.8 / tai 14.3 / ika 7.9 / salmon 6.4 / **maguro(super) 4.76%** | 24.3% | 79.9% |

**確定した4つの欠陥:**

- **RC-1 (最重要): レアリティ配分がプール構成で暴れる。** そのレアリティ層に1種しかいないと、その1種が層の予算を丸ごと取る。**asase のさけ(rare) が 26.3%、かこうでは 40.0%**。super も 0.48%〜4.76% と10倍レンジで無制御。「レアなものはなかなか出てこない」が構造的に成立していない。
- **RC-2: 種を増やすほどレアが相対的に濃くなる。** normal 層に1種足すと normal 全員が薄まるが層の合計70は不変。つまり**「種の倍増」をそのままやると、レア率が上がる方向に暴走する**。現行構造のまま30種にするのは不可。
- **RC-3: プールが小さく(5〜7種)、上位3種が78〜90%を占める。** 5キャストで実質すべてを見てしまう → これが「順番に釣れる」体感の主因。
- **RC-4: `SessionDedupeWeightMul = 0.3` (TsuriTuning.cs:68) が異常な非対称性を持つ。** セッション中永続・減衰なし・ロケーション切替でも保持 (`WithSpeciesPool` が `SessionSeenIds` を維持)。さらに**「その層に1種しかいない種にはデデュープが一切効かない」**(層内正規化で定数が相殺されるため) — asase のさけは何匹釣っても 26.3% のまま、normal 勢だけがローテーションする。

### 0.2 その他の確認事項

- pity は現状 **窓を広げる方向のみ** (`PityWindowBonusPctPerEscape=20%/逃し`)。抽選確率には一切介入しない (TsuriCore.cs:194-208 のコメントで明示)。企画書 §7 のレビューでも「super2種がボーナス極低確率のみ = 図鑑コンプ不能感への手当(遭遇pity)がない」と自己指摘済み。
- ボーナス種機構 (`BonusSpeciesId` / `IncludeZoneBonus` / `BonusNonHomeWeightMul=0.1`) が **砂浜・磯にマグロを 0.48〜0.71% で漏らしている**。これは生態的破綻の直接原因。
- `TsuriSpecies.Weight` の現行値レンジは 4〜22 (絶対値)。

---

## 1. データ構造の変更案

### 1.1 `TsuriCoreTypes.cs`

```csharp
public enum TsuriRarity { Normal, Rare, Super, Legendary }   // ← Legendary 追加
```

**`TsuriRarity.Legendary` を新設する。** 30種規模では3段では足りない。理由:
- 現状 super は「うなぎ・まぐろ」=「珍しいけど図鑑に必ず載せたい魚」。ここに「いとう(幻の魚)」「リュウグウノツカイ」を同居させると、両者が同じ確率になり「まぼろし」の格が出ない。
- ユーザー要求「一目であ、ちょっとこれレアだなってわかる」に対して、演出強度の段階が3つ(normal除く)あると魚影/動き/エフェクトの差を作りやすい。
- legendary は **1ゾーン1種のみ** に限定 (川=いとう / 海=リュウグウノツカイ)。乱発しない。

```csharp
public sealed class TsuriSpecies
{
    // …既存…
    // ★ 破壊的変更: Weight を廃止し SpeciesWeightMul に改名する。
    //   旧: 同レアリティ内の絶対重み (4〜22)
    //   新: 同レアリティ内の相対倍率 (基準 1.0、範囲 0.3〜1.5)
    //   ★ 意図的に「改名」する。同名のまま意味だけ変えると全呼び出し箇所が
    //     静かに壊れるため、コンパイルエラーで全箇所を洗い出させること。
    public float SpeciesWeightMul = 1.0f;

    // ★ 新設 (演出層への contract、tuning には接続しない)
    public TsuriMotionClass MotionClass = TsuriMotionClass.Standard;
}

/// 魚影の形状/動きのクラス分け。演出専用。
/// TsuriNiche と同じ「tuning に一切接続しない」不変条件を適用する (§3.5-7 と同格)。
public enum TsuriMotionClass
{
    Standard,   // 一般的な紡錘形・等速接近
    Slim,       // 細長 (どじょう・うなぎ・さんま・リュウグウノツカイ)
    Flat,       // 平たい (かれい・ひらめ)
    Crawler,    // 底這い (ざりがに・さわがに・かに・ひとで)
    Shell,      // 貝・移動しない (あさり・しじみ・さざえ・かいがら)
    Drifter,    // ふわふわ漂う (いか・たこ・まんぼう)
    Heavy       // 大物・ゆっくり大きく揺れる (さけ・まぐろ・なまず・いとう)
}
```

### 1.2 `TsuriWorldData.cs`

```csharp
public sealed class TsuriSpawnEntry
{
    public string SpeciesId;
    public float WeightMul = 1f;
    public TsuriNiche Niche = TsuriNiche.Midwater;

    // ★ 新設: レシピ供給保証。正規化後の最終確率がこの値を下回ったら
    //   この値まで引き上げて残りを再正規化する。既定 0 = 無効。
    //   「主役ブースト」ではない (不変条件§3.5-8 の主役枠には数えない)。
    public float MinProbability = 0f;
}
```

**廃止するもの** (ボーナス種機構ごと退役):
- `TsuriLocationData.IsBonusHome`
- `TsuriLocationData.IncludeZoneBonus`
- `TsuriWorldData.BonusNonHomeWeightMul`
- `TsuriWorldData.BonusSpeciesId(zone)`
- `BuildEffectivePool` / `BuildWeightMulMap` 内のボーナス注入分岐

理由: 新しい絶対重みモデルでは rarity 自体が「極低確率」を担保するため、別機構が不要になった。さらにこの機構こそが「砂浜・磯にマグロが出る」生態破綻の発生源 (§3 A-4)。うなぎ/まぐろは通常の Spawns エントリに降格する。

### 1.3 `TsuriSession.cs`

```csharp
// ★ 廃止
// public List<string> SessionSeenIds;      → 抽選からは外す
//                                            (MarkLanded の記録用途としては残してよいが、
//                                             ComputeSpeciesProbabilities は参照しない)

// ★ 新設
public List<string> RecentCatchIds = new List<string>();  // 直近 landed の種 (最大1件のリングバッファ)
public int DryCastsSinceRarity = 0;      // rare 以上を landed していない連続キャスト数
public int CastsSinceLegendary = 0;      // legendary を landed していない累計キャスト数 (dex から復元)
public HashSet<string> KnownSpeciesIds;  // 図鑑に count>0 で登録済みの種 (dex から注入、null 可)
```

### 1.4 抽選 API のシグネチャ

引数が増えすぎるので、**オーバーロード追加ではなく `TsuriDrawContext` 構造体を導入**する (現在すでに 2/3/4/5 引数のオーバーロードが乱立しており、これ以上は保守不能)。

```csharp
public sealed class TsuriDrawContext
{
    public IReadOnlyList<string> RecentCatchIds;
    public int DryCastsSinceRarity;
    public int CastsSinceLegendary;
    public IReadOnlyCollection<string> KnownSpeciesIds;   // null = 全種未登録扱いにしない (ボーナス無効)
    public static readonly TsuriDrawContext Neutral = new TsuriDrawContext();
}

public static Dictionary<string, double> ComputeSpeciesProbabilities(
    IReadOnlyList<TsuriSpecies> pool,
    IReadOnlyList<TsuriSpawnEntry> spawns,      // WeightMul + MinProbability の供給元
    TsuriDrawContext ctx);

public static string PickSpecies(
    IReadOnlyList<TsuriSpecies> pool,
    IReadOnlyList<TsuriSpawnEntry> spawns,
    TsuriDrawContext ctx,
    Random random);
```

旧オーバーロード群 (2/3/4/5引数) は **削除する**。`weightMulBySpeciesId` の `Dictionary` 経由も廃止し、`TsuriSpawnEntry` を直接渡す (MinProbability を運ぶ必要があるため)。

### 1.5 `TsuriDex.cs`

```csharp
public sealed class TsuriDexDocument
{
    public int version = 2;                  // ★ 1 → 2
    public Dictionary<string, TsuriDexRecord> species;
    public Dictionary<string, long> appliedOps;

    // ★ 新設: pity の永続カウンタ (アプリ再起動を跨いで legendary に必ず到達させるため)
    public Dictionary<string, long> counters = new Dictionary<string, long>();
    //   "castsTotal"            : 累計キャスト数
    //   "castsSinceLegendary"   : legendary を landed してからの累計キャスト数
}
```

- `Merge` の可換性 (不変条件 §3.5-10) を保つため、**counters のマージは `Math.Max`** とする (count と同じ規則)。
- `TsuriCatchOp.rarity` の語彙 `"normal"|"rare"|"super"` に `"legendary"` を追加。**Web 側 consumer が未知 rarity で落ちないことを必ず確認すること** (フォールバックが無ければ Web 側に `default → normal` を先に入れてから出荷)。
- `version 1 → 2` のマイグレーション: `counters` が無ければ空辞書で初期化するだけ。破壊的変更なし。

---

## 2. 新種リスト (17種追加 → 合計 32種)

「倍ぐらい」= 15 → 32 (2.13x)。全種**日本の川・海に実在**し、3〜7歳が名前を知っているか、知って嬉しいものに限定。既存15種の設計思想 (白身魚中心・お弁当食材・非食用のたからもの枠) を踏襲。

### 2.1 新種マスター (17種)

| speciesId | 和名 | rarity | 食用 | inventoryKey | zones | 出現ロケ | サイズ(cm) | 代表niche | MotionClass | SpeciesWeightMul | 採用理由 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fish_yamame` | やまべ (やまめ) | normal | ○ | **null** | river | asase | 18–30 | midwater | Standard | 1.10 | 渓流の白身魚。あゆ/にじますと並ぶ清流の主力。塩焼き |
| `fish_dojou` | どじょう | normal | ○ | **null** | river | asase, kakou | 10–20 | bottom_sand | Slim | 0.80 | 童謡で名前を知っている。細長シルエットで魚影の見分けが付く |
| `fish_haze` | はぜ | normal | ○ | **null** | river | kakou | 8–18 | bottom_sand | Standard | 1.15 | 河口の砂泥。**子供の初釣りの定番**。天ぷら |
| `sawagani` | さわがに | normal | × | null | river | asase | 2–4 | rock_cover | Crawler | 0.60 | ユーザー要望の「カニ」枠(川)。上流の石の下 |
| `fish_shijimi` | しじみ | normal | ○ | **null** | river | kakou | 2–4 | bottom_sand | Shell | 0.75 | 汽水の貝。お味噌汁で名前を知っている。「貝」枠(川) |
| `fish_iwana` | いわな | **rare** | ○ | **null** | river | asase | 25–40 | rock_cover | Standard | 1.10 | 渓流最上流の白身。やまめの一段上という関係が学べる |
| `fish_namazu` | なまず | **super** | ○ | **null** | river | kakou | 50–100 | rock_cover | Heavy | 1.00 | ひげ・大きい・子供が必ず知っている。下流の泥底 |
| `fish_itou` | いとう | **legendary** | × | null | river | kakou | 80–130 | deep_open | Heavy | 1.00 | **日本最大の淡水魚・「まぼろしの さかな」**。川の伝説枠 |
| `fish_kisu` | きす | normal | ○ | **null** | sea | sunahama | 15–25 | bottom_sand | Standard | 1.20 | **砂浜の最正解魚**。白身・天ぷら/フライ。投げ釣りの主役 |
| `fish_asari` | あさり | normal | ○ | **null** | sea | sunahama | 3–5 | bottom_sand | Shell | 0.90 | 潮干狩り。ユーザー要望の「貝」枠(海) |
| `fish_saba` | さば | normal | ○ | **null** | sea | sunahama, oki | 30–45 | midwater | Standard | 1.15 | 桟橋・沖の定番。塩焼き/みそ煮 |
| `fish_sanma` | さんま | normal | ○ | **null** | sea | oki | 25–35 | surface | Slim | 1.10 | 沖の表層の群れ。秋の味覚として名前を知っている |
| `fish_kani` | わたりがに | normal | ○ | **null** | sea | sunahama, iwaba | 10–25 | bottom_sand | Crawler | 0.85 | ユーザー要望の「カニ」枠(海) |
| `fish_sazae` | さざえ | normal | ○ | **null** | sea | iwaba | 5–10 | rock_cover | Shell | 0.80 | 磯の巻貝。つぼ焼き。「さざえさん」で名前を知っている |
| `fish_tako` | たこ | **rare** | ○ | **null** | sea | iwaba | 30–60 | rock_cover | Drifter | 1.20 | ユーザー要望の「タコ」枠。子供の人気度が非常に高い |
| `fish_hirame` | ひらめ | **rare** | ○ | **null** | sea | sunahama, oki | 30–60 | bottom_sand | Flat | 1.00 | **白身の王様**。かれいとの「左右の違い」が知育ネタになる |
| `fish_ryuuguunotsukai` | リュウグウノツカイ | **legendary** | × | null | sea | oki | 300–500 | deep_open | Slim | 1.00 | **深海の幻**。名前が「竜宮」で子供の物語感に接続。海の伝説枠 |

### 2.2 `inventoryKey` を全て `null` にする判断 (重要)

**新種17種すべての `inventoryKey` を `null` にする。** `edible` は実態どおり true/false を付ける (図鑑バッジ「たべられる おさかな だよ」の正直表示のため)。

理由:
- 企画書 §3.6「レシピ接続は v1 で salmon/ebi/ayu/aji の4本のみ (不変)」を守る。
- 未知の `inventoryKey` を `common/food-inventory.js` 側に無断で流すと在庫インポータが壊れうる。**まぐろ裁定 (`edible:true` + `inventoryKey:null` → 既存規則 `!edible || !inventoryKey` で在庫 op が自動的に発生しない)** と同じパターンに全て寄せることで、スキーマ変更ゼロ・クロスプロジェクト依存ゼロで出荷できる。
- 将来在庫連携したい候補 (W-2 で inventory 側にキーを追加してから有効化): `fish_kisu`, `fish_hirame`, `fish_saba`, `fish_tako`, `fish_kani`, `fish_asari`, `fish_yamame`。

### 2.3 `ChallengeProfile` (全種 `Runs = 0`。「ドラッグ必須の魚は存在しない」不変条件を維持)

| speciesId | WindowMul | TapsBase |
| --- | --- | --- |
| `fish_shijimi`, `fish_asari` | 1.30 | 4 |
| `sawagani`, `fish_sazae` | 1.25 | 5 |
| `fish_dojou`, `fish_kani` | 1.15–1.20 | 6–7 |
| `fish_haze` | 1.15 | 6 |
| `fish_kisu`, `fish_sanma` | 1.05 | 8 |
| `fish_yamame`, `fish_saba` | 1.00 | 10 |
| `fish_iwana`, `fish_hirame` | 0.95 | 12 |
| `fish_tako` | 0.90 | 13 |
| `fish_namazu` | 0.85 | 15 |
| `fish_itou`, `fish_ryuuguunotsukai` | 0.80 | **16** (まぐろと同値。これ以上は上げない) |

### 2.4 既存15種の `Weight` → `SpeciesWeightMul` 移行表 (必須・全件)

| speciesId | 旧 Weight | 新 SpeciesWeightMul | rarity (変更なし) |
| --- | --- | --- | --- |
| `fish_ayu` | 22 | **1.30** | normal |
| `fish_nijimasu` | 20 | **1.15** | normal |
| `zarigani` | 5 | **0.70** | normal |
| `fish_salmon` | 8 | **1.40** | rare |
| `treasure_boot` | 4 | **0.35** | normal |
| `fish_unagi` | 8 | **1.20** | super |
| `fish_aji` | 20 | **1.25** | normal |
| `fish_ebi` | 18 | **1.10** | normal |
| `fish_karei` | 16 | **1.00** | normal |
| `hitode` | 6 | **0.50** | normal |
| `treasure_kaigara` | 7 | **0.45** | normal |
| `fish_iwashi` | 22 | **1.35** | normal |
| `fish_tai` | 12 | **1.20** | rare |
| `fish_ika` | 10 | **1.10** | rare |
| `fish_maguro` | 8 | **1.00** | super |

> ⚠️ これは `TsuriFishData.cs` ヘッダの「RiverSpecies の既存5エントリの値・順序は不変」契約の**意図的な破棄**である。ユーザー実プレイフィードバック起点の確率モデル全面改訂に伴うもので、ヘッダコメントも同時に書き換えること。

### 2.5 W-2 送り (今回は実装しない、記録のみ)

`fish_koi` (こい/rare/kakou)、`fish_fugu` (ふぐ/rare/iwaba — 「どくがあるから にがしてあげよう」の安全教育枠)、`fish_manbou` (まんぼう/super/oki)、`fish_katsuo` (かつお/rare/oki)、`treasure_akikan` (あきかん — 川をきれいにの環境教育枠)、`treasure_biidama`、`fish_wakasagi` (企画書 W-L のまま)。

---

## 3. 生態的整合性の全点検 (全ロケーション・全 Spawns エントリ 1件ずつ)

### 3.1 監査結果表

| # | ロケ | 種 | 判定 | 根拠 |
| --- | --- | --- | --- | --- |
| 1 | river_asase | fish_ayu | ✅ 正 | あゆは清流の浅瀬・石の苔を食む。最も正しい配置 |
| 2 | river_asase | fish_nijimasu | ✅ 正 | 冷水の渓流・管理釣り場 |
| 3 | river_asase | zarigani | ✅ 正 | 川の浅瀬・用水路 |
| 4 | river_asase | fish_salmon | ⚠️ **niche のみ誤** | 成魚のさけが浅瀬にいるのは**遡上そのもの**であり、テレビで最も有名なさけの絵。配置は正。ただし現行 `Niche = Midwater` は誤り → **Surface** (背びれが水面に出る遡上の姿) |
| 5 | river_asase | treasure_boot | ✅ 対象外 | たからもの枠 |
| 6 | river_kakou | fish_salmon (x2.0) | ✅ 正・主役維持 | 河口は遡上さけの本場。アキアジ釣りの中心 |
| 7 | river_kakou | fish_ayu | ✅ 正 | 稚魚期に河口を通り、落ちあゆも下る |
| 8 | river_kakou | **fish_nijimasu** | ❌ **誤り・削除** | にじますは冷水の上流域の魚。**汽水の河口にはまずいない**。子供に誤った生息地を教える |
| 9 | river_kakou | treasure_boot | ✅ 対象外 | |
| 10 | river_kakou | fish_unagi (bonus home) | ✅ 正 | うなぎは河口の泥底・岩陰。生態的に完璧 |
| 11 | sea_sunahama | fish_iwashi | ✅ 正 | サーフ・堤防のいわし |
| 12 | sea_sunahama | fish_aji | ✅ 正 | サビキのあじ |
| 13 | sea_sunahama | fish_ebi | ⚠️ 許容 | 「えび」が砂浜のシバエビか磯のイセエビか曖昧。ただしレシピ供給の不変条件対象であり、`Niche=BottomSand` 自体は正。**図鑑説明文をロケ別に書き分けること**で解消 |
| 14 | sea_sunahama | fish_karei | ✅ 正 | 砂底・投げ釣りの定番 |
| 15 | sea_sunahama | hitode | ✅ 正 | 投げ釣りでよく釣れる「釣り人あるある」 |
| 16 | sea_sunahama | treasure_kaigara | ✅ 対象外 | |
| 17 | sea_sunahama | **fish_maguro (bonus 0.71%)** | ❌ **誤り・削除** | **砂浜の桟橋でまぐろは釣れない。** ゾーン全域ボーナス機構の副作用。子供でも違和感を持つ |
| 18 | sea_iwaba | fish_ebi (x1.3) | ✅ 正・主役維持 | イセエビは磯の岩の隙間 |
| 19 | sea_iwaba | fish_ika | ✅ 正 | エギングのアオリイカは磯 |
| 20 | sea_iwaba | fish_tai | ✅ 正 | まだいは岩礁 |
| 21 | sea_iwaba | fish_aji | ✅ 正 | 磯のあじ |
| 22 | sea_iwaba | hitode | ✅ 正 | |
| 23 | sea_iwaba | **fish_maguro (bonus 0.48%)** | ❌ **誤り・削除** | #17 と同じ。磯からまぐろは釣れない |
| 24 | sea_oki | fish_tai (x1.5) | ✅ 正・主役維持 | 沖の根のまだい |
| 25 | sea_oki | **fish_salmon** | ⚠️ **生態は正・体験は誤り → 削除して砂浜へ移設** | §3.2 参照 (ユーザー指摘箇所) |
| 26 | sea_oki | fish_iwashi | ✅ 正 | 沖のいわしの群れ |
| 27 | sea_oki | **fish_ika (Niche=Surface)** | ❌ **niche 誤り** | あおりいか/するめいかは中層〜底層。表層に固定するのは誤り → **Midwater** |
| 28 | sea_oki | fish_aji | ✅ 正 | |
| 29 | sea_oki | fish_maguro (home) | ✅ 正 | 沖の船でまぐろ。完璧 |

### 3.2 「沖の船で鮭」問題の設計判断 (ユーザー指摘への回答)

**事実確認:** さけは海でも釣れる。北海道のアキアジ釣りは (a) 砂浜・サーフからのウキルアー/ぶっこみ、(b) 船からの沖釣り、(c) 河口規制内、が主戦場であり、**むしろ河川での鮭釣りは原則禁漁**。つまり生態的な正しさだけで言えば、現行配置 (asase/kakou/oki) の方が現実から外れている。

**しかし、生態的正しさを 3〜7歳にそのまま渡すのは誤り。** 理由:
- 子供の「さけ = かわを のぼる さかな」というスキーマは、絵本・図鑑・給食で強化された正しい中核知識であり、ゲームがこれを最初に壊すべきではない。
- Unity 側にナレーション pipeline が存在しない (企画書 §7 で自己指摘済み)。**説明できない正しさは、子供には「バグ」として届く**。ユーザー自身がまさにそう感じている。

**決定 (理由付き):**

| 変更 | 内容 | 理由 |
| --- | --- | --- |
| **削除** | `sea_oki` から `fish_salmon` を削除 | 「沖の船」= 岸から最も遠く、川との連続性が絵から完全に消える場所。ここが最も「川の魚がいるはずがない」と感じる。ユーザーの違和感の発生源そのもの |
| **新設** | `sea_sunahama` に `fish_salmon` を `WeightMul = 0.6` / `Niche = Surface` で追加 | (1) **生態的に最も正しい** — アキアジのサーフ釣りは実在し、砂浜こそ本場。(2) **子供の納得感が最も高い** — 砂浜は「川の河口のとなり」として絵で理解できる。(3) 「川で生まれて海で育ち、川へ帰る」という物語の橋と図鑑の海側分母を維持できる |
| **維持** | `Zones = { River, Sea }` を維持 | 図鑑進捗分母の裁定 (§3.4「複数 zones を持つ種は全 zone の分母に計上」) を変更せずに済む |
| **図鑑追記** | `fish_salmon` の funFact に「うみで おおきく なって、うまれた かわへ かえる とちゅうだよ」 | 読み聞かせで親が補完できる。ナレーション実装後は前あたり文言にも流用 |

これは企画書 §3.5-3「salmon の海側 (oki 1ロケのみ) は不変条件1・2の対象外——承認済み構成」の**承認済み構成を意図的に差し替える**ものである。差し替え後も条件1・2 は river にのみ適用されるため不変条件は無傷。

### 3.3 修正リスト (実装者向けチェックリスト)

| ID | 修正 | 変更内容 |
| --- | --- | --- |
| **E-1** | `river_asase` の `fish_salmon` の Niche | `Midwater` → **`Surface`** |
| **E-2** | `river_kakou` から `fish_nijimasu` を削除 | Spawns エントリ削除 (にじますは asase 専用に) |
| **E-3** | `sea_oki` から `fish_salmon` を削除 | Spawns エントリ削除 |
| **E-4** | `sea_sunahama` に `fish_salmon` を追加 | `WeightMul = 0.6`, `Niche = Surface` |
| **E-5** | `sea_oki` の `fish_ika` の Niche | `Surface` → **`Midwater`** |
| **E-6** | ボーナス種機構を退役 | `sea_sunahama` / `sea_iwaba` から maguro が消える。`fish_maguro` は `sea_oki` の通常 Spawns エントリ (`WeightMul=1.0`, `Niche=DeepOpen`) に降格 |
| **E-7** | 同上 | `fish_unagi` は `river_kakou` の通常 Spawns エントリ (`WeightMul=1.0`, `Niche=RockCover`) に降格。`river_asase` には出さない (清流上流にうなぎはいない → 現行の `IncludeZoneBonus=false` と同じ結果を、機構なしで実現) |
| **E-8** | `fish_ebi` の図鑑説明文をロケ別に | sunahama = 砂にもぐるえび / iwaba = いわの すきまの えび |

---

## 4. 新 Spawns 台帳 (`TsuriWorldData.cs` 全文差し替え相当)

**新しいロケーション設計原則 (ボーナス種機構の代替):**
> **既定ロケ (asase / sunahama) は normal + rare のみ。super / legendary は非既定ロケの報酬。**

これにより「1ロケ1主役」と併せて、各ロケーションが明確な役割を持つ。

| ロケ | 役割 | 主役 | super | legendary |
| --- | --- | --- | --- | --- |
| river_asase | 入門・川のノーマル図鑑 (種数9) | なし (フラット) | なし | なし |
| river_kakou | さけの本場 + 川の大物 | **salmon x2.5** | unagi, namazu | **itou** |
| sea_sunahama | 入門・海のノーマル図鑑 (種数**12**、最多) | なし (フラット) | なし | なし |
| sea_iwaba | 磯 = レアの巣 | **ebi x1.3** | なし | なし |
| sea_oki | 沖 = 大物と伝説の場所 | **tai x1.5** | maguro | **ryuuguunotsukai** |

### 4.1 `river_asase` (せせらぎの あさせ) — WaitSec 6–10 (現行維持)

| SpeciesId | WeightMul | Niche | MinProbability |
| --- | --- | --- | --- |
| fish_ayu | 1.0 | Midwater | **0.05** |
| fish_nijimasu | 1.0 | Midwater | 0 |
| fish_yamame ★ | 1.0 | Midwater | 0 |
| fish_dojou ★ | 1.0 | BottomSand | 0 |
| zarigani | 1.0 | BottomSand | 0 |
| sawagani ★ | 1.0 | RockCover | 0 |
| fish_salmon | 1.0 | **Surface** (E-1) | **0.05** |
| fish_iwana ★ | 1.0 | RockCover | 0 |
| treasure_boot | 1.0 | BottomSand | 0 |

### 4.2 `river_kakou` (ゆうやけの かこう) — WaitSec 3–7

| SpeciesId | WeightMul | Niche |
| --- | --- | --- |
| fish_salmon | **2.5** (2.0 から引き上げ、§5.5 参照) | Surface |
| fish_ayu | 1.0 | Midwater |
| fish_haze ★ | 1.0 | BottomSand |
| fish_dojou ★ | 1.0 | BottomSand |
| fish_shijimi ★ | 1.0 | BottomSand |
| fish_unagi | 1.0 | RockCover (ボーナス→通常降格 E-7) |
| fish_namazu ★ | 1.0 | RockCover |
| fish_itou ★ | 1.0 | DeepOpen |
| treasure_boot | 1.0 | BottomSand |

※ `fish_nijimasu` は削除 (E-2)

### 4.3 `sea_sunahama` (すなはまの さんばし) — WaitSec 3–6

| SpeciesId | WeightMul | Niche | MinProbability |
| --- | --- | --- | --- |
| fish_iwashi | 1.0 | Surface | 0 |
| fish_aji | 1.0 | Midwater | **0.05** |
| fish_kisu ★ | 1.0 | BottomSand | 0 |
| fish_saba ★ | 1.0 | Midwater | 0 |
| fish_ebi | 1.0 | BottomSand | **0.05** |
| fish_karei | 1.0 | BottomSand | 0 |
| fish_asari ★ | 1.0 | BottomSand | 0 |
| fish_kani ★ | 1.0 | BottomSand | 0 |
| fish_hirame ★ | 1.0 | BottomSand | 0 |
| fish_salmon ★ (E-4) | **0.6** | Surface | **0.05** |
| hitode | 1.0 | BottomSand | 0 |
| treasure_kaigara | 1.0 | BottomSand | 0 |

※ maguro は消滅 (E-6)

### 4.4 `sea_iwaba` (いわばの つりば) — WaitSec 4–7

| SpeciesId | WeightMul | Niche |
| --- | --- | --- |
| fish_ebi | **1.3** (主役維持) | RockCover |
| fish_aji | 1.0 | Midwater |
| fish_kani ★ | 1.0 | BottomSand |
| fish_sazae ★ | 1.0 | RockCover |
| fish_tai | 1.0 | RockCover |
| fish_tako ★ | 1.0 | RockCover |
| fish_ika | 1.0 | RockCover |
| hitode | 1.0 | BottomSand |
| treasure_kaigara ★ | 1.0 | BottomSand |

※ maguro は消滅 (E-6)

### 4.5 `sea_oki` (おきの ふね) — WaitSec 5–8

| SpeciesId | WeightMul | Niche |
| --- | --- | --- |
| fish_tai | **1.5** (主役維持) | DeepOpen |
| fish_iwashi | 1.0 | Surface |
| fish_saba ★ | 1.0 | Midwater |
| fish_sanma ★ | 1.0 | Surface |
| fish_aji | 1.0 | Midwater |
| fish_ika | 1.0 | **Midwater** (E-5) |
| fish_hirame ★ | 1.0 | BottomSand |
| fish_maguro | 1.0 | DeepOpen (ボーナス→通常降格 E-6) |
| fish_ryuuguunotsukai ★ | 1.0 | DeepOpen |

※ `fish_salmon` は削除 (E-3)

---

## 5. 抽選確率モデル (最重要・具体数値)

### 5.1 アルゴリズム: 2段正規化を廃止し、1段の絶対重みにする

```
// 現行 (廃止):
//   rarityShare = RarityWeight(r) / Σ(プールに存在する rarity の RarityWeight)
//   P(i) = rarityShare × (Weight_i / Σ 同 rarity 内の Weight)
//
// 新 (採用):
W(i) = RarityWeight(rarity_i)
     × SpeciesWeightMul_i
     × LocationWeightMul_i
     × RecentPenalty(i)
     × RarityPity()          // rarity != Normal のときのみ
     × LegendaryPity()       // rarity == Legendary のときのみ
     × FirstEncounterBonus(i)

P(i) = W(i) / Σ W

// その後 MinProbability の floor を適用し、残りを再正規化する:
//   floor 対象 F = { i | MinProbability_i > 0 かつ P(i) < MinProbability_i }
//   P(i∈F) = MinProbability_i
//   P(i∉F) = P(i) × (1 - Σ MinProbability_{F}) / Σ P(i∉F)
```

この1段化により **RC-1 / RC-2 が構造的に消滅する** — レアリティはプール構成に依存しない絶対的な稀少度になり、normal 種を何種足しても rare の絶対的な出やすさは変わらない (相対シェアだけが自然に薄まる)。

### 5.2 定数 (`TsuriTuning.cs`)

```csharp
// ── レアリティ基本重み (絶対値。層内正規化はもう行わない) ──
public static float RarityBaseWeight(TsuriRarity r) => r switch
{
    TsuriRarity.Normal    => 100f,
    TsuriRarity.Rare      =>  13f,
    TsuriRarity.Super     =>   2.0f,
    TsuriRarity.Legendary =>   0.55f,
    _                     =>   1f,
};

// ── 直前デデュープ (旧 SessionDedupeWeightMul=0.3 を置換) ──
/// 「直前に釣った1匹」だけに掛ける軽い抑制。連続同種を禁止しない。
/// セッション全体に累積させない = 「順番に釣れる」体感の直接原因を除去。
public const float RecentCatchWeightMul = 0.80f;   // ← 旧 0.30 / 旧はセッション永続
public const int   RecentCatchMemory    = 1;       // リングバッファ長

// ── 遭遇 pity (新設。企画書§7 が自己指摘した穴を埋める) ──
/// rare 以上を landed していない連続キャスト数がこの値を超えると発動
public const int   RarityPityStartCasts = 8;
public const float RarityPityStepPerCast = 0.25f;
public const float RarityPityCapMul      = 6.0f;

// ── legendary 専用の長期 pity (アプリ再起動を跨いで永続) ──
public const int   LegendaryPityStartCasts = 100;
public const float LegendaryPityStepPerCast = 0.015f;
public const float LegendaryPityCapMul      = 20.0f;

// ── 図鑑未登録ボーナス (「何度も遊びたい」への直接の手当) ──
/// fishdex に count==0 の種を出やすくする。全種登録後は自然に無効化される。
public const float FirstEncounterWeightMul = 1.6f;

// ── レシピ供給保証 ──
public const float RecipeMinProbability = 0.05f;   // TsuriSpawnEntry.MinProbability の推奨値

// ── 既存 (変更なし) ──
public const float PityWindowBonusPctPerEscape = 20f;   // 窓 pity。抽選には介入しない (現行どおり)
```

### 5.3 各修正子の適用ルール

| 修正子 | 適用条件 | 計算式 | リセット条件 |
| --- | --- | --- | --- |
| `RecentPenalty` | `RecentCatchIds` に含まれる種 | `× 0.80` | 次の landed でリングバッファが1件押し出される |
| `RarityPity` | rarity != Normal の全種に**一律** | `× min(6.0, 1 + 0.25 × max(0, DryCastsSinceRarity − 8))` | rare 以上を **landed** した瞬間に `DryCastsSinceRarity = 0` |
| `LegendaryPity` | rarity == Legendary のみ (`RarityPity` と乗算) | `× min(20.0, 1 + 0.015 × max(0, CastsSinceLegendary − 100))` | legendary を **landed** した瞬間に `CastsSinceLegendary = 0` |
| `FirstEncounterBonus` | `KnownSpeciesIds` に**含まれない**種 | `× 1.6` | 図鑑に登録された時点で自然消滅 |

**設計上の注意点 (実装者は必ず守ること):**

1. **`RarityPity` は rare/super/legendary に一律で掛ける。** レアリティ間の相対比は変わらず、レア層全体の総量だけが膨らむ。層別に別倍率を掛けてはならない (バランスが破綻する)。
2. **pity のリセットは「捕獲 (landed)」であって「遭遇 (抽選ヒット)」ではない。** 逃した場合は pity が伸び続ける。これは既存の窓 pity (`PityWindowBonusPctPerEscape`) と哲学が一致しており、「逃した子ほど次が優しい」を貫く。
3. `DryCastsSinceRarity` / `CastsSinceLegendary` は **`Cast()` のたびに +1**する (逃しも数える)。
4. `CastsSinceLegendary` は **`TsuriDexDocument.counters` に永続化する。** セッション内カウンタだけでは legendary に一生到達できない。
5. `TrySetLocation` は現状 pity/misses を保持している (`WithSpeciesPool`)。新カウンタも同様に**保持する** (ロケーション切替で pity をリセットしない)。

### 5.4 検証済み確率テーブル (シミュレーションで実測)

**【表A】素の出現率 (pity / 未登録ボーナス OFF = 図鑑コンプ済みの定常状態)**

| river_asase (9種) | | river_kakou (9種) | | sea_sunahama (12種) | |
| --- | --- | --- | --- | --- | --- |
| fish_ayu | 20.10% | fish_ayu | 26.78% | fish_iwashi | 12.98% |
| fish_nijimasu | 17.78% | fish_haze | 23.69% | fish_aji | 12.02% |
| fish_yamame | 17.01% | fish_dojou | 16.48% | fish_kisu | 11.54% |
| fish_dojou | 12.37% | fish_shijimi | 15.45% | fish_saba | 11.06% |
| zarigani | 10.83% | **[R] fish_salmon** | **9.37%** | fish_ebi | 10.58% |
| sawagani | 9.28% | treasure_boot | 7.21% | fish_karei | 9.62% |
| treasure_boot | 5.41% | **[S] fish_unagi** | **0.49%** | fish_asari | 8.65% |
| **[R] fish_salmon** | **5.00%** ←floor | **[S] fish_namazu** | **0.41%** | fish_kani | 8.17% |
| **[R] fish_iwana** | **2.21%** | **[L] fish_itou** | **0.11%** | **[R] fish_salmon** | **5.00%** ←floor |
| **n 92.8 / r 7.2** | | **n 89.6 / r 9.4 / s 0.91 / L 0.113** | | hitode 4.81 / kaigara 4.33 / **[R] hirame 1.25** | |
| | | | | **n 93.7 / r 6.2** | |

| sea_iwaba (9種) | | sea_oki (9種) | |
| --- | --- | --- | --- |
| fish_ebi | 24.93% | fish_iwashi | 25.08% |
| fish_aji | 21.80% | fish_aji | 23.22% |
| fish_kani | 14.82% | fish_saba | 21.37% |
| fish_sazae | 13.95% | fish_sanma | 20.44% |
| hitode | 8.72% | **[R] fish_tai** | **4.35%** |
| treasure_kaigara | 7.85% | **[R] fish_ika** | **2.66%** |
| **[R] fish_tai** | **2.72%** | **[R] fish_hirame** | **2.42%** |
| **[R] fish_tako** | **2.72%** | **[S] fish_maguro** | **0.37%** |
| **[R] fish_ika** | **2.49%** | **[L] fish_ryuuguunotsukai** | **0.10%** |
| **n 92.1 / r 7.9** | | **n 90.1 / r 9.4 / s 0.37 / L 0.102** | |

**【表B】体感指標の改善 (pity ON、図鑑コンプ済み想定)**

| ロケ | 連続同種率 (現行 → 新) | 上位3種占有 (現行 → 新) | 種数 (現行 → 新) |
| --- | --- | --- | --- |
| river_asase | 23.6% → **11.6%** | **84.0% → 54.0%** | 5 → 9 |
| river_kakou | 28.0% → **15.6%** | **89.5% → 65.5%** | 5 → 9 |
| sea_sunahama | 16.6% → **8.0%** | **64.6% → 36.3%** | 7 → 12 |
| sea_iwaba | 23.7% → **13.4%** | **77.7% → 60.1%** | 6 → 9 |
| sea_oki | 24.3% → **16.8%** | **79.9% → 68.4%** | 6 → 9 |

> **連続同種率が下がっているのは意図どおり。** ユーザーが求めた「同じのが連続で釣れたりもする」は 8〜17% で十分に体験でき (5〜10回に1回)、`RecentCatchWeightMul=0.80` は**連続を禁止していない**。「順番に釣れる」体感の真因は上位3種占有率 (84% → 54%) の方であり、こちらが大幅に解消している。
> `RecentCatchWeightMul` を `1.0` (完全独立抽選) にする選択肢もあり、その場合 asase の連続同種率は 14.3% になる。0.80 は「3連続以上の張り付き」だけを緩和する最小介入として選定。

**【表C】初遭遇までのキャスト数 (pity + 未登録ボーナス ON、そのロケに居続けた場合)**

| ロケ | 種 | 中央値 | 90%tile |
| --- | --- | --- | --- |
| river_asase | normal 7種 | 3〜10 | 9〜28 |
| river_asase | **[R] fish_salmon** (レシピ必須) | **13** | 34 |
| river_asase | [R] fish_iwana | 18 | 45 |
| river_kakou | **[R] fish_salmon** | **6** | 14 |
| river_kakou | **[S] fish_unagi** | **77** | 245 |
| river_kakou | **[S] fish_namazu** | **89** | 290 |
| river_kakou | **[L] fish_itou** | **214** | **398** |
| sea_sunahama | **[R] fish_ebi / fish_aji** (レシピ必須・normal) | **5〜6** | 15〜17 |
| sea_sunahama | [R] fish_hirame | 25 | 59 |
| sea_iwaba | [R] tai / ika / tako | 16〜17 | 43〜47 |
| sea_oki | [R] fish_tai | 11 | 30 |
| sea_oki | **[S] fish_maguro** | **101** | 319 |
| sea_oki | **[L] fish_ryuuguunotsukai** | **226** | **415** |

**この曲線が設計の要:** legendary は中央値 200超キャストで「まぼろし」の格を保ちながら、**90%tile が 400 前後で頭打ちになる** (pity が効いている証拠)。pity 無しなら中央値 ~680・90%tile ~2200 で事実上到達不能。「遊び続ければ必ず会える」が数値で保証されている。

### 5.5 `river_kakou` の salmon 主役倍率を 2.0 → 2.5 に引き上げる

新モデルでは salmon(rare) の絶対重みが下がるため、x2.0 のままだと kakou で 7.5% となり、asase の floor 5.0% と差が付かず「かこう = さけの場所」というロケーション identity が消える。**2.5 にすることで kakou 9.37% vs asase 5.00% (1.9倍差)** となり、初遭遇中央値も 6 vs 13 キャストと明確に分かれる。不変条件 §3.5-8「1ロケ1主役」は主役が誰かを定めるものであり倍率値は規定していないため、抵触しない。

---

## 6. 不変条件の更新案 (`docs/TSURI_SEA_WORLDMAP_PLAN_2026-07-24.md` §3.5)

| # | 現行 | 新 | 変更理由 |
| --- | --- | --- | --- |
| 1 | レシピ必須魚4種は各供給 zone の既定ロケの Spawns に **WeightMul 1.0 で在籍** | **維持し、さらに「最終確率 ≥ 5.0% を満たす」を追加。** 検算: ayu@asase 20.1% ✓ / salmon@asase 5.0% (MinProbability) ✓ / ebi@sunahama 10.6% ✓ / aji@sunahama 12.0% ✓ | 種倍増でプールが薄まると WeightMul 1.0 だけでは「基準確率で釣れる」意図が守れない。**確率の下限を直接アサートする形に強化する**。実装は `TsuriSpawnEntry.MinProbability` |
| 2 | レシピ必須魚は供給 zone 内で最低2ロケーション在籍 | **維持。** 検算: ayu=asase+kakou / salmon=asase+kakou / ebi=sunahama+iwaba / aji=sunahama+iwaba+oki | 変更なし |
| 3 | 条件1・2はレシピ供給 zone にのみ適用。salmon の海側は対象外 | **維持。** ただし salmon の海側配置は oki → **sunahama** に移設済みである旨を注記 | E-3/E-4 |
| 4 | route 1巡分の Spawns 和集合が zone の全レシピ必須魚を含む | **維持** | |
| 5 | 待ち時間上限 ≤8秒 (asase は現行値のまま) | **維持。ただし §7 の勧告を参照** | |
| 6 | location スキーマは窓・連打・challengeProfile を変更するフィールドを持たない | **維持。** `MinProbability` は**確率にのみ**作用し、窓・連打には触れない | |
| 7 | niche を参照する tuning コードが存在しない | **維持 + 拡張: `TsuriMotionClass` も同格の禁止対象とする** | 新設フィールドが tuning に漏れるのを最初から塞ぐ |
| 8 | 1ロケ1主役: kakou=salmon / iwaba=ebi / oki=tai。ボーナスホームは別系統 | **「ボーナスホームは別系統」の但し書きを削除** (機構ごと退役)。主役の定義は「WeightMul > 1.0 のエントリ」とし、**各ロケ高々1件**。`MinProbability > 0` は主役に数えない | E-6/E-7 |
| 9 | Spawns のマスター未知 speciesId は正規化で無視 | **維持** | |
| 10 | `TsuriDexRecord.Merge` の可換性 | **維持 + `TsuriDexDocument.counters` のマージも可換 (Math.Max) であることを追加** | version 2 |
| **11** | — | **新設: 全ロケーションで rarity 別の合計確率が設計レンジ内にあること。** normal 85–95% / rare 5–13% / super 0–1.5% / legendary 0–0.2% (素の出現率、pity OFF) | RC-1 の再発防止。プール構成を変えたときに rare が暴れないことを機械的に保証する |
| **12** | — | **新設: 既定ロケ (asase / sunahama) には super / legendary を配置しない** | ボーナス種機構の退役に伴う代替ルール。ロケーション identity の保証 |
| **13** | — | **新設: 連続同種抽選を禁止しない。** 決定論シードでの1000回抽選における連続同種率が **8%〜22%** の範囲に入ること | ユーザー要求「同じのが連続で釣れたりもする」の回帰防止。将来誰かが「重複回避」を再導入するのを構造的に止める |
| **14** | — | **新設: 全 legendary 種は、単一ロケーションに居続けた場合の初遭遇キャスト数 90%tile が 500 以下** | pity の実効性の保証。到達不能な図鑑エントリを作らない |
| **15** | — | **新設: `Runs` は全種 0** (「ドラッグ必須の魚は存在しない」) を静的テスト化 | 現行は文書上の裁定のみ。新種17件の追加で破られやすいため機械化 |

---

## 7. スコープ外だが強く勧告する事項

**`river_asase` の待ち時間 6–10 秒は、種倍増と相性が悪い。**
不変条件5で「asase は現行実装値のまま = 回帰アサート無変更」となっているが、salmon の初遭遇中央値 13 キャスト × 平均8秒待ち = **約2分の純待機時間**になる。さらに企画書 §7 のレビューが「最長の無入力時間 × 最少の視覚フィードバック」を最年少層のリスクとして既に指摘している。**asase を 4–7 秒に短縮すること**を推奨する (不変条件5の「≤8秒」は満たしたまま)。これは別バッチで扱ってよいが、確率設計と体感時間はセットでしか評価できないため、確率変更の検証時に必ず同時計測すること。

---

## 8. レアリティの一目瞭然化: データ層 contract (演出実装者への引き渡し)

ユーザー要求「レアなものに関してはちょっと動きが違うとかシルエットが違うとか、一目であ、ちょっとこれレアだなってわかるようなことが欲しい」に対し、**Core 側は以下を公開するのみ**とし、演出の実体は Rendering 担当が決める (niche と同じく tuning 非接続)。

```csharp
// Rendering が消費する読み取り専用の contract
species.Rarity        // Normal / Rare / Super / Legendary
species.MotionClass   // Standard / Slim / Flat / Crawler / Shell / Drifter / Heavy
species.Size          // "s" / "m" / "l"  (既存)
```

**推奨マッピング (Rendering 側の実装指針。数値は要調整):**

| Rarity | 魚影の色 | 輪郭 | 接近の動き | 追加演出 |
| --- | --- | --- | --- | --- |
| Normal | 現行の暗いシルエット | なし | 等速・直線 | なし |
| Rare | やや明るい / 彩度あり | 細い光の縁取り | わずかに蛇行 + 接近を1回ためらう | 前あたり時にきらめき粒子 (少) |
| Super | はっきり色付き | 太い光の縁取り + 脈動 | 大きく蛇行・速度に緩急 | 水面のゆらぎが強くなる + ウキの沈み込みが深い |
| Legendary | シルエット全体が発光 | 強い脈動 + 尾を引く | 画面外から一度横切ってから戻ってくる | 画面全体の色調が一瞬変わる + 専用の音 (実装済みなら) |

`MotionClass` は「レア度」ではなく「生き物としての動き方」なので、rarity と直交して掛け合わせること (例: `fish_tako` = Rare × Drifter、`fish_itou` = Legendary × Heavy)。

**`KawaGlintHud`** に `RaritySuperColor` / `RarityLegendaryColor` を追加すること (現在 `RarityRareColor` / `RarityNormalColor` の2色しかなく、`KawaGlintGameController.cs:803` が `Rare` 以外を全て Normal 色にしている — super/legendary を釣っても図鑑バナーの色が normal と同じになるバグが既にある)。

---

## 9. 影響を受けるファイルとテスト

### 9.1 変更ファイル

| ファイル | 変更内容 |
| --- | --- |
| `Runtime/Core/TsuriCoreTypes.cs` | `TsuriRarity` に `Legendary` 追加 / `TsuriSpecies.Weight` → `SpeciesWeightMul` 改名 / `TsuriMotionClass` 新設 |
| `Runtime/Core/TsuriTuning.cs` | `RarityBaseWeight` 全面書き換え / `SessionDedupeWeightMul` → `RecentCatchWeightMul` / pity 定数群 新設 |
| `Runtime/Core/TsuriFishData.cs` | 既存15種の重み移行 (§2.4) + 新種17種追加 (§2.1) + ヘッダの「不変」契約文言の書き換え |
| `Runtime/Core/TsuriWorldData.cs` | Spawns 台帳全面差し替え (§4) / `MinProbability` 追加 / ボーナス種機構4点の削除 |
| `Runtime/Core/TsuriCore.cs` | `ComputeSpeciesProbabilities` の1段化 (§5.1) / `TsuriDrawContext` 導入 / 旧オーバーロード群削除 / `MarkLanded` で `RecentCatchIds`・pity カウンタを更新 / `Cast` で `DryCastsSinceRarity`・`CastsSinceLegendary` を +1 |
| `Runtime/Core/TsuriSession.cs` | フィールド追加・`Clone` 更新 (§1.3) |
| `Runtime/Core/TsuriDex.cs` | `version = 2` / `counters` 追加 (Math.Max マージ) / `TsuriCatchOp.rarity` 語彙拡張 |
| `Runtime/Gameplay/KawaGlintFishdexService.cs` | `counters` の読み書き / `KnownSpeciesIds` の供給 |
| `Runtime/Gameplay/KawaGlintGameController.cs` | `TrySetLocation` から weightMul マップ生成を Spawns 直接渡しに変更 / `OnLanded` の `dotColor` を4段階に / `Configure` で dex から pity カウンタを復元 |
| `Runtime/UI/KawaGlintHud.cs` | `RaritySuperColor` / `RarityLegendaryColor` 追加 |
| `Runtime/Rendering/KawaGlintSpriteCatalog.cs` | 新種17件の `ShadowPaths` / `CatchPaths` エントリ追加 |
| `Runtime/Rendering/KawaGlintProceduralFishArt.cs` | 新種17件の暫定 Recipe 追加 (アート到着まで) + `Shell` / `Flat` / `Crawler` 用の新シェイプ |

### 9.2 更新が必要な既存テスト (すべて意図的な破壊)

| テスト | 行 | 対応 |
| --- | --- | --- |
| `TsuriCoreEditModeTests.cs` | L37–39 | `RarityBaseWeight` 期待値 70/25/5 → 100/13/2.0 + Legendary 0.55 を追加 |
| `TsuriCoreEditModeTests.cs` | L40 | `SessionDedupeWeightMul == 0.3` → `RecentCatchWeightMul == 0.80` |
| `TsuriCoreEditModeTests.cs` | L59, L247 | `SessionSeenIds` 参照 → `RecentCatchIds` に置換 |
| `TsuriCoreEditModeTests.cs` | L425–452 | `ComputeSpeciesProbabilities` の解析的期待値を1段モデルで再計算 |
| `TsuriCoreEditModeTests.cs` | L444 | 「seen 種が SessionDedupeWeightMul で減衰」→「直前1件のみ 0.80 で減衰、2件前は減衰しない」に書き換え |
| `TsuriCoreEditModeTests.cs` | L456–472 | `PickSpecies` シグネチャ変更に追随 |
| `TsuriWorldDataEditModeTests.cs` | L43–49, L205–206 | `BuildWeightMulMap` 廃止に伴い書き換え |
| `TsuriWorldDataEditModeTests.cs` | L181–182 | `IsBonusHome` / `IncludeZoneBonus` 削除 |
| `TsuriWorldDataEditModeTests.cs` | L220–237 | `BonusSpecies_AppearsInEffectivePool_...` を**削除**し、代わりに「maguro は sea_oki にのみ在籍」「unagi は river_kakou にのみ在籍」をアサートするテストに置換 |

### 9.3 新規テスト (不変条件 11〜15 の機械化)

1. `RarityShare_EveryLocation_WithinDesignRange` — 全ロケの rarity 別合計が §6-11 のレンジ内
2. `RecipeSpecies_MeetMinProbability_AtDefaultLocations` — ayu/salmon/ebi/aji が既定ロケで ≥5.0%
3. `ConsecutiveSameSpecies_RateWithinRange` — 固定シード1000回抽選で連続同種率 8〜22%
4. `LegendaryPity_ReachesEncounterWithin500Casts_At90thPercentile` — 決定論シード群でのモンテカルロ
5. `DefaultLocations_ContainNoSuperOrLegendary`
6. `AllSpecies_RunsAreZero`
7. `AllSpecies_HaveShadowAndCatchPathRegistered` — 32種すべてが `KawaGlintSpriteCatalog` に登録済み (アート未到着でも path 登録は必要)
8. `DexDocument_CountersMerge_IsCommutative`

---

## 10. アート発注リスト (Higgsfield MCP `generate_image`, `model:"gpt_image_2"`, `quality:"high"`, `resolution:"2k"`)

**必須 (catch 画像 17枚 = 119 クレジット / 残高 892):**
`fish_yamame_catch`, `fish_dojou_catch`, `fish_haze_catch`, `sawagani_catch`, `fish_shijimi_catch`, `fish_iwana_catch`, `fish_namazu_catch`, `fish_itou_catch`, `fish_kisu_catch`, `fish_asari_catch`, `fish_saba_catch`, `fish_sanma_catch`, `fish_kani_catch`, `fish_sazae_catch`, `fish_tako_catch`, `fish_hirame_catch`, `fish_ryuuguunotsukai_catch`

**推奨 (shadow 画像 — legendary/super は魚影の識別性が体験の核なので優先):**
`fish_itou_shadow`, `fish_ryuuguunotsukai_shadow`, `fish_namazu_shadow`, `fish_tako_shadow`, `fish_hirame_shadow` (5枚 = 35 クレジット)

その他の新種は `KawaGlintProceduralFishArt` の手続き型シルエットで先行運用し、後日 PNG を差し込めばコード変更ゼロで切り替わる (`KawaGlintSpriteCatalog` のフォールバック機構が既にそう設計されている)。

`fish_itou_catch` プロンプト方針の注記: 「まぼろしの さかな」の格を出すため、他16枚と同じ画風で**わずかに発光する銀色の鱗**を指定すること。`fish_ryuuguunotsukai_catch` は 300–500cm の帯状の体と赤い背びれが特徴で、他のどの catch 画像とも似ないため識別性が最も高い。

---

## 11. 実装順序 (推奨)

1. **Phase 1 (Core・データのみ・演出変更なし)**: §1 のデータ構造 → §5 の抽選アルゴリズム → 既存テスト修正 → 新規テスト 1〜6。この時点で既存15種のまま確率だけが正しくなる (RC-1〜RC-4 が解消)。**ここで一度実機確認し、「順番に釣れる」が消えたかをユーザーに確認する。**
2. **Phase 2 (種の倍増)**: §2 の新種17種 → §4 の Spawns 台帳 → §3 の生態修正 E-1〜E-8 → テスト 7。手続き型シルエットで先行動作。
3. **Phase 3 (アート)**: §10 の発注 → `KawaGlintSpriteCatalog` への差し込み。
4. **Phase 4 (演出)**: §8 のレアリティ可視化。**別担当の背景/水面/ウキ改修バッチと衝突しやすいので、`AGENTS_CLAIMS.md` で Rendering 配下の claim を必ず調整すること。**

Phase 1 と Phase 2 の間で必ずユーザー確認を挟むこと。確率モデルの体感は種の増減と独立に評価できるため、両方を一度に変えると原因の切り分けができなくなる。

---

## 6. クロスレビュー結果(6件、実コードで裏取り済み)

> 各レビューは別領域の視点から実コードを読んで検証したもの。**「致命的」「物理衝突」と
> 書かれた指摘は、複数の設計が同じコードを別方向に変更しようとしている箇所なので、
> 実装前に必ず解消すること。**

### レビュー 1

実コード（`KawaGlintSpriteCatalog.cs` / `KawaGlintProceduralFishArt.cs` / `KawaGlintActorsBuilder.cs` / `KawaGlintGameController.cs` / `TsuriCoreTypes.cs` / `KawaFishWag.shader` / `TsuriCoreEditModeTests.cs`）で裏取りした上でのクロスレビュー結果。

## 致命（このままだと両設計のどちらかが必ず壊れる）

- **Legendary が視覚的に Super と完全に同一になる。** 私の設計は `TsuriRarity.Legendary` を新設し、いとう / リュウグウノツカイを「まぼろし」として別格に置く。一方レア視認性設計は tier テーブルが 3 行 + `Clamp(tier, 0, Length-1)` なので、tier3 は全チャンネル（`RarityLengthMul` / `AppearY` / `WagSpeed` / halo 色 `#FF7FD1` / sparkle rate / HUD ドット色 / `torpedo_giant` シルエット）で tier2 に潰れる。中央値 200 キャストかけて到達した legendary が、まぐろと寸分違わぬ見た目で出る。§3.2 の「将来 `sil_regal_longfin`」は実はリュウグウノツカイそのもので、これを「将来・未発注」に置いたのが原因。**全テーブルに tier3 行を追加し、`sil_regal_longfin_shadow` を P1 に昇格させること**（もしくは私の側が Legendary を撤回するかの二択。中途半端に Clamp だけ入れるのは最悪）。

- **`sil_<archetype>_shadow.png` が §3.2 と §3.3 で矛盾しており、新種以前に既存 9 種で破綻する。** §3.2 は「既存アート流用（新規発注 —）」と書いているが、§3.3 の解決順序 step 2 は `Shadows/sil_<key>_shadow.png` という**存在しないファイル**を引く。`slim_small` は ayu が step1 で解決するだけで、iwashi / aji は step2 に落ちて miss → 手続き型涙型のまま。同じ穴が `standard_mid`(nijimasu以外) / `crawler`(zarigani以外) / `serpentine`(unagi以外) / `salmon_rare` にある。つまり **P1 4 点を発注しても tai/ika/maguro/karei しか直らず、aji/iwashi/hitode/kaigara は現状のまま**。修正は「step 2b: archetype → 代表 speciesId の PNG パスへのエイリアス表」を足すのが最小（追加クレジット 0）。

- **未知 speciesId は fallback ではなく hard error。** `KawaGlintSpriteCatalog.cs:142-146` は `ShadowPaths` 未登録 id で `Debug.LogError` + `return null`、`KawaGlintProceduralFishArt.GetSilhouette:88-91` も `Recipes` 未登録なら `return null`（Recipes は海 10 種のみ）。私の新種 17 件は `ShadowPaths` / `CatchPaths` / `Recipes` 3 箇所に同時に入らないと、**新種が食いつくたびに LogError + 魚影が透明**になる。レア視認性側の 3 段フォールバックは、step3 を「per-species Recipe」ではなく「**archetype 手続きシェイプ**」にすれば、この 3 箇所同時登録の結合を丸ごと外せる。そちらを強く推す。

- **B1 修正が両設計で重複所有。** `KawaGlintGameController.cs:803` / `KawaGlintFishdexPanel.cs:509` / `KawaGlintHud.cs:93-94`（+ `FishdexPanel.cs:416` の既定色）を両方が書き換える宣言をしている。しかもレア視認性側は「3 分岐 **または tier 配列 + Clamp**」で、Clamp を選ぶと legendary が黙って super 色になる。**単一オーナーに寄せ、色は 4 本（normal `#7FD0E8` / rare `#FFD93D` / super `#FF7FD1` / legendary は別色）で確定**させること。

## 重要（設計整合の穴）

- **archetype（11 キー, Rendering, speciesId 直引き）と `TsuriMotionClass`（7 値, Core）が同じ概念の二重台帳。** 32 種 × 2 表は必ずドリフトする。さらに致命的なのは、レア視認性側の既定フォールバックが **rarity ベース**（0→`standard_mid` / 1→`broad_fancy` / 2+→`torpedo_giant`）である点。私の新種に当てると **しじみ・あさり・さざえ（Shell）が紡錘形の魚影**、**さわがに・わたりがに（Crawler）が魚**、**なまず（super, Heavy）といとう（legendary）がまぐろ**になる。生態整合性を直すバッチが生態整合性を壊す構図。修正案: 既定は rarity ではなく **MotionClass** で引き、`KawaGlintFishPresentation` に `RarityTier` と並べて `MotionClassIndex`(int) を積む（Core 非参照契約は維持される）。rarity は tier3 の `regal` 上書きなど例外にだけ効かせる。

- **§7 の防壁テスト「全 id が非 null な archetype に解決」は空振りする。** tier 既定フォールバックがある以上、新種 17 件は全部「非 null」で通ってしまい、シルエットが間違っていることを検出できない。**「tier 既定に落ちずに明示エントリで解決すること」を assert する fail-loud 版**に変えないと防壁にならない。

- **オーラの発火頻度が、投入順序次第で設計意図と正反対になる。** §5.1 の「9 割の通常キャストでハズレとバレる」は rare ≈10% 前提。しかし**現行コードの実測は asase で salmon(rare) 26.3%、kakou で 40.0%**。レア視認性の Phase 1+2 が私の確率 Phase 1 より先に出ると、川 2 ロケでオーラが 26〜40% のキャストで光り、§5.1 自身が警告する「乱発 → 特別の意味が消える」を踏む。**オーラは確率再設計と同時か、その後**。

- **ambient「現ロケの Spawns 上位 4 種」が新台帳では定義不能。** 私の新 `TsuriWorldData` は主役以外ほぼ `WeightMul = 1.0` なので「上位 4 種」の順序が事実上宣言順の偶然になる。加えて `treasure_*` は現行コードが明示的に除外している（`KawaGlintActorsBuilder.cs:50-56` のコメント）のに、しじみ・あさり・さざえ（Shell = 移動しない）・ひとで が候補に入ると**貝が横に泳ぐ背景**になる。ルールを「`Rarity == Normal` かつ `MotionClass ∈ {Standard, Slim}` の宣言順先頭 4 件」と明文化すること。B2 が Phase 3（archetype 解決後）なのは正しい依存順。

- **`Size` フィールドが私の新種 17 件で未指定（私の設計の穴）。** `SpeciesWorldLength`（`KawaGlintGameController.cs:892`）は `Size` の "s"/"m"/"l" しか見ないので、指定漏れは全部 default 1.5 に落ちる。しかも worldLength は halo スケール(`len*1.30`)と sparkle box(`len*0.9`)を駆動するため、レア視認性側が丸ごと巻き添えになる。**加えて、リュウグウノツカイ(300–500cm) が "l"×1.35 = 3.38 でまぐろと同寸**という問題が出る。tier3 の `LengthMul` を 1.6 前後にするか、"xl"(3.4) を足すこと。

## 中（要調整）

- **「遅い・大きい・重い」演出 vs 私の連打要求が逆向き。** tier2 の `ThrashFreq` 13 rad/s（ゆっくり暴れる）に対し、私の ChallengeProfile は namazu/itou/ryuuguu が `TapsBase 15-16` + `WindowMul 0.80-0.85`（速く・シビアに叩け）。3〜7 歳には「ゆっくり動いてるのに一番速く叩けと言われる」矛盾信号。演出側の思想が正しいので、**私の側を legendary `WindowMul 1.0` + `TapsBase 16`（長いが優しい）に寄せる**のが妥当。

- **私の §8「推奨マッピング」は §5.4 禁止事項に 3 件抵触しており、撤回すべき。**「画面全体の色調が一瞬変わる」「シルエット全体が発光」「画面外から一度横切ってから戻ってくる」は光過敏リスクと子供向け要件で禁止側が正しい。特に「横切ってから戻る」は `LerpUnclamped(appear→anchor)` + `window = Sin(PI*p)` モデルで表現不能で、端点 weave = 0 の保証を壊し、糸テンション/thrash アンカーにノイズを乗せる。**私の §8 表は §4/§5 に正式に上書きされる旨を明記**のこと。

- **`(int)species.Rarity` を tier に使う契約が暗黙。** Legendary を enum 末尾に追加する限り安全だが、途中挿入されると全演出が静かにズレる。「`TsuriRarity` の宣言順が tier index の正本、途中挿入禁止」を明文化 + `(int)TsuriRarity.Legendary == 3` の EditMode assert を追加。

- **不変条件 §3.5-7 の文言が Phase 3 を違反に見せる。** 「niche を参照する tuning コードが存在しない」を私が `MotionClass` にも拡張したが、archetype 解決は **rendering** であって tuning ではない。正しく「**tuning（窓・連打・確率）に接続しない。rendering への接続は明示的に許可**」と書き直さないと、レア視認性側の実装がレビューで弾かれる。

- **asase の待ち時間短縮（私の §7 勧告 6–10s → 4–7s）とオーラ reveal タイミングは同時調整項目。** §5.3 の「キャスト後 0.5〜1.6 秒で灯る」は現行の待ち長を前提にしている。短縮した場合、reveal 完了（progress 0.70）がバイトの 1 秒以上前に来ることを再計測すること。

## アート発注（重複・予算）

- 合計は収まる: レア視認性 P1 4 + P2 2 = **42 クレジット**、私の catch 17 + shadow 5 = **154**。計 **196 / 残高 892**。
- **重複 2 件は削除**: 私の `fish_tako_shadow` は `sil_tentacle_shadow` と、`fish_hirame_shadow` は `sil_flat_disc_shadow`（かれい＋ひらめ共有）と重複。私の側から落とす（−14）。
- **`fish_ryuuguunotsukai_shadow` は `sil_regal_longfin_shadow` にリネームして P1 昇格**（私の Phase 2 必須、先方は「将来・未発注」扱い）。
- **不足 archetype**: `barbel_heavy`（なまず、ひげ）、`spiral_shell`（さざえ = 巻貝、`object_shell` の二枚貝と別形）。tako は `tentacle` 共有でも可だが胴＋ひれ vs 丸頭＋8 本足で別が望ましい。+2〜3 点（+14〜21）。総額 ≈203〜217、予算内。
- 生成チャネルは両者 GPT Image 2 で一致（先方 §8 と私の §10）。**二重発注防止のため 1 エージェントに集約**。`sil_*` は単色ベタ #0F2C56 + 頭左 + 38px パッド、`*_catch` は通常イラストと、パイプラインが別である点を発注書に明記すること。

## 良い点（変更不要）

- `sortingOrder` 13 / 15 が空きなのは実コードで確認（`KawaGlintActorsBuilder.cs:32` の `FishSortingOrder = 14`）。halo を 13（魚の背面）に置く判断は、単色ベタ影を洗い流さずに縁だけ光らせる安全な選択で正しい。
- `KawaGlintPreBitePlan.cs` 不可侵 + 合成地点で倍率、は私の設計と完全に整合（私も触らない）。
- `RegisterGeneratedAsset` に Resources 由来 Sprite を渡さない警告は `KawaGlintSpriteCatalog.cs` のクラス doc の実在する契約で、指摘は正確。
- `VelocityOverLifetimeModule` 全カーブ同一モードの地雷（`KawaGlintStageBuilder.cs:1526-1548`）の再掲は有用。
- `_WagStartU` (Range(0,1)) / `_WagWave` (Float) はシェーダで通常プロパティとして宣言されており（`KawaFishWag.shader:35,57,100,104`）、MPB 上書き可能という主張は正しい。最大 18 rad/s = 2.86Hz < 3Hz も正しい。
- レア確率が 26–40% → 5–13% に下がることで、オーラの「特別さ」は私の設計側から強化される方向。相性は良い。

---

### レビュー 2

以下、背景多層化・水面二重解消側から見たクロスレビュー結果。実コードで裏取り済み（行番号は実測）。

## 致命的（両設計が正面衝突する）

- **【最重要】`WaveFollow` 契約の不一致 — ウキ側が「水面二重」を再発させる。**
  背景側は `KawaSurface.shader` の crest を `WaveFollow = 0.30〜0.35` に落とし、「シェーダー稜線は必ず塗りフォームの内側で動く（振れ幅 ±0.029）」を**位相ズレ由来の二重線への構造的回答**にしている。一方ウキ設計は
  - §1.4 `_SurfaceWorldY = _waterlineY + KawaWave.Height(_x, t)`（フル振幅 ±0.082）
  - §2.4 Wake 位置 `waterlineY + KawaWave.Height(x,t)`（同上）

  を採る。差は最大 **0.057wu ≒ 1080p で 6px**。§1.4 は `_MeniscusTint` で**白い濡れ線を明示的に描く**設計なので、この 6px は「塗り水面 / crest 光沢 / ウキの濡れ線」の3本目として直接見える。さらに Wake は白いフォーム板そのものなので、静止した塗りフォームに対して 6px 上下する＝ユーザーが指摘した症状の縮小再現。
  → 対処: `KawaGlintSurfaceStyle.WaveFollow` を `KawaSurfaceBand` 専用にせず**共有契約に格上げ**し、`_SurfaceWorldY` と Wake の Y は `waterlineY + KawaWave.Height(x,t) * style.WaveFollow` を使う。ウキ**本体の位置**（`KawaGlintBobber._renderY`）をフル振幅のままにするか同じく 0.3 倍にするかは要判断（0.3 倍にすると常時揺れが ±2.7px に落ちるが、Twitch 振幅 0.12 とのコントラストはむしろ上がる）。背景側 §2.4 の「意図的に残す差分」注記は §1.4 の存在を前提にしておらず、**そのままでは誤り**なので同時に書き換えが必要。

- **Angler の高さ／アンカーが競合し、ウキ側 §2.5 の安全計算が失効している。**
  背景側は sunahama を anchor `(0.90, 2.20) → (0.98, 2.85)`、`AnglerArtWorldHeight` を const 2.6 → 辞書引き（sunahama 1.95）に変える。ウキ側 §2.5 の「最も余裕が無い sunahama(anchor.y=2.20, 現行余裕0.20)」「+4° 最悪ケース 4.88 ≤ 5.0」は**背景側が消す数値**で計算されている。
  再計算（sunahama, anchor.y=2.85 / H=1.95 / W=1.900）: 右上角 local(0.950,1.95), |r|=2.169, 64.0° → 68.0° で y=2.011 → 上端 **4.861**。背景側が提案した閾値 4.9 に対し余裕 **0.039** しかない。他4ロケは 4.57〜4.71 で安全。
  → 統合された不変条件を1本にすること: `anchor.y + rotated_top(key, +RodHaulDegrees) ≤ 4.9`。ウキ側が別途「AnglerRig 角度域テスト」を、背景側が別途「anchor.y + ResolveAnglerWorldHeight ≤ 4.9」を作ると、**どちらも回転後の実上端を検証しない**まま両方グリーンになる。

- **既存テストの破壊がどちらの設計にも書かれていない（背景側の見落とし）。**
  `Tests/EditMode/KawaGlintAnglerPlacementEditModeTests.cs` は
  1. `[TestCase("bg_tsuri_sea_sunahama", 0.90f, 2.20f)]` でアンカーを**ハードコード**（L88 付近）
  2. `expectedRodTip = expectedAnchor + (AsaseRodTip - AsaseAnchor)` で**全ロケ共通の竿先オフセット**を不変条件として assert
  3. `private const float AnglerArtWorldHeight = 2.6f;`（L155付近）を**テスト側に複製**して上端チェック

  背景側の per-location 身長化は 2 と 3 を必ず落とす（sunahama の rodTip オフセットは (1.167,1.876) → (0.875,1.407) にスケールダウンする）。ウキ側 §2.5 も同じ `PonoRodTipU/V` 由来オフセットを共有ヘルパに切り出すので、**同一の3箇所（`BuildAnglerArt` L1185/L1213、`SetAnglerPosition` L1254）を両設計が別方向に触る**。実装順を「背景 §2.3（身長辞書化＋テスト更新）→ ウキ §2.5（ヘルパ切り出し＋回転）」に固定すること。

## 実装を止める見落とし

- **`ShoreRightEdgeWorldX` は「手続き型パス専用」ではない（背景側の明確な誤り）。**
  `KawaGlintGameController.cs` L580 `_targetX = Mathf.Clamp(world.x, _stage.ShoreRightEdgeWorldX + CastMinMarginWorld, ...)` と L566 の岸タップ棄却で**ゲームプレイに使われている**。背景側 §2.4 の「`KawaStageInfo.ShoreRightEdgeWorldX` は手続き型パス専用として残す」は誤解を招き、将来の整理でキャスト可能域が壊れる。「シェーダーのフォーム位置とは切り離すが、キャストクランプの正本としては生き続ける」と書き換えること。

- **キャスト可能域は `x ∈ [-4.2, +8.09]`。両設計とも「ウキは x≈1.8 付近」を暗黙前提にしている。**
  実測: 左 = −5.4+1.2、右 = `WaterWorldRect.xMax(8.889) − 0.8`。従って:
  - 背景側 iwaba の `FoamCenterA = +2.60 / HalfWidth 1.60`（x≈1.0〜4.2）は、**プレイヤーが普通に投げる位置と重なる**。岸フォームとウキ Wake の白い泡が重畳する。iwaba は HalfWidth を 1.2 程度に絞るか FoamCenterA を +3.4 以上へ。kakou の `FoamCenterB = +4.05 / 1.10`（x≈2.95〜5.15）も同様。
  - 背景側 §4「ウキ回廊 x ∈ [0.5, 3.1]（sunahama は 3.5）に order 21 を置かない」は前提が崩れている。order 21 は Fish(14) より手前なので、**接近中の魚影＝前あたりの主要テルを隠す**。回廊はキャスト域全体に近く、実質「order 21 は水面より下 0.5wu 以内には置かない」等の**Y 方向の規約**に置き換えるべき。

- **リングの位相オフセットは「秒」で焼き込まれている — ウキ側 §2.4(b) の点滅安全計算の前提が誤り。**
  `KawaGlintActorsBuilder.cs` L496: `phaseOffsetSeconds = i * (RingLoopDurationSeconds * 0.5f)` = 1.1s 固定。`AnimateRings` は `Mathf.Repeat((time + offset) / RingLoopDurationSeconds, 1f)`。ループを 0.9s / 0.8s に変えても**オフセットは 1.1s のまま**なので位相差は 0.5 ではなく `frac(1.1/0.9)=0.222` / `frac(1.1/0.8)=0.375`。「半周期オフセットなので体感 2倍」という §2.4 の安全論証は成立せず、2本のリングが不均等間隔でびょこびょこ出る見た目になる。
  → `RegisterRing` を**正規化位相 0..1** で受けるよう変更するか、モード切替時にオフセットを再計算すること（周波数上限自体は依然 3Hz 未満なので安全性は保たれるが、論証は書き直しが必要）。

- **糸の水面貫入点（§3.1）は BiteSink 中には存在しない。**
  非 tense 時の糸は `start = rodTip(−6.03, 3.83)` → `end = (bobberX, TopWorldY ≈ 2.05)`、制御点 `midpoint.y − sag(0.12〜0.35) ≈ 2.8`。**全点が waterline 1.6 より上**なので交差はゼロ。加えて renda 中も `tense = _lineTense && IsTargetFishVisible` で、魚が非表示なら糸自体が描かれない（`AnimateFishingLine` L545-556）。§3.1 は「交差なし」時のフォールバック（Wake を `bobberX` に据え置く／Wake を隠す）を明記しないと、未初期化値でフォーム板が画面外に飛ぶ。

## アート発注の矛盾

- **背景除去の指定が両設計で食い違う。** 背景側は「透過が必要な素材は GPT Image 2 が真のアルファを出せないため**純マゼンタ #FF00FF**（batch:1467 と同じクロマキー）」を規約にしている。ウキ側は ① を**純白 #FFFFFF**、② を**中間グレー #808080** で発注する。
  - ① `bobber_float.png` は**胴体下半分が白**。白背景は背景側規約が回避しようとしている失敗そのもの。
  - ② `bobber_wake_foam.png` は**白い泡のソフトフェード**。グレーは無彩色なので、泡の減衰エッジがグレーに溶けてグレーフリンジが残る（マゼンタなら彩度で分離できる）。
  → 両方 #FF00FF に統一し、納品先も `Sprites/`（ウキ）と `Sprites/Layers/`（背景レイヤー）の使い分けを明記。クレジットは 15+1（背景）+ 2+1（ウキ）= 19枚 ≒ 133 / 892 で**予算は問題なし**。

- **sunahama の `SurfaceDebris`「小さな泡」がウキ Wake と意味的に衝突する。** 背景側 §4 は sunahama の水面浮遊物を「小さな泡」としているが、ウキ側は「水面の白い泡＝魚が引いている」を新しいシグナルとして導入する。**水面の泡は牽引時にしか出ないほうが読み取りが強い**ので、sunahama の debris は貝殻片／海藻片など非泡に変更すること。

## sortingOrder 契約

- ウキ側の「31 が空き」は正しい（`BobberSortingOrder=34` / `RippleRing=32` / SurfaceBand=30 を実コードで確認）。ただし**背景側 §7 のテスト4が挙げる予約セット `{0,1,2,8,10,11,12,14,16,18,20,30,32,33,34,35,40,42}` に 31 が入っていない**。両設計がそれぞれ独自の order 表を持っている状態なので、`KawaGlintStageBuilder` 側に**単一の予約表**（背景新規 3,4,5,6,7,9,13,15,17予約,19,21,22 ＋ Wake 31）を置き、両テストがそれを参照する形にすること。
- ウキ側 §1.4 の新マテリアル（`KawaBobberSubmerge`）は SetPass +1、Wake は draw call +1。背景側 §5 の予算表（≤45 draw call / ≤20 SetPass / ≤3.0× overdraw / ≤12MB）に**ウキ側の増分が計上されていない**。25〜32 → 27〜34、テクスチャ +約2MB。上限内だが表を更新すること。

## 3〜7歳向けとしての懸念

- **本あたりの瞬間に動く要素が多すぎる。** BiteSink 突入時、同時に発生するのは: ウキ26°傾斜＋0.28横滑り＋1.75Hzジッタ、糸の張り＋5.4Hz tremble、Wake 出現＋1.6Hz 呼吸、リング 2.22Hz 化、竿 −9°＋2.4Hz ジャダー、水しぶき。ここに背景側の常時アニメ（雲ドリフト／かもめ 0.35〜0.55u/s／浮遊物 0.12〜0.20u/s／葉揺れ／気泡）が重なる。個々は周波数安全でも、**「食いついた」を読み取るべき瞬間に画面全体が動いている**のは注意配分として悪い。
  → 背景側に「注意予算」の概念がないのが穴。`SetRendaProgress01` / BiteSink 突入をフックに、**SkyLife / SurfaceDebris / CloudsMid のドリフト速度を 0.3 倍に落とす**（0.3s ランプ）ダンピングを背景側 API に追加することを推奨。アート追加ゼロ、`RegisterCloud` の speed をスケールするだけ。
- ウキ側 §2.1 の最大傾斜 32° 自体は許容範囲だが、**Wake の右端クリップ**に注意: 最右キャスト x=8.089 + 牽引 0.28 + Wake オフセット 0.10 + 半幅 0.425 = **8.894 > 画面右端 8.889**。Wake を左寄せ（`flipX` 前提の明部が左端）にしているので実害は軽微だが、`WakeWorldWidth` かオフセットに画面端クランプを入れること。
- リングは `AnimateRings` で **Y が flat waterline に固定**（波追従しない、L517-519 コメント）。Wake を波追従（フル振幅）にすると、同じ中心のリングと Wake が最大 6px 上下にずれる。上記 WaveFollow 統一の対象に含めること。

## 問題なしと確認した点

- ウキ側の互換性制約表（`BiteSink` 改名禁止、`IsFishingLineTense` の意味保持、`KawaGlintSplashMath` 不可触）は既存テストと照合して妥当。
- `KawaGlintSpriteCatalog.LoadSprite(path, pivot, logMissing)` は実在し pivot 引数を取る（L239）。`LoadDecor` の null 許容規約も記述どおり。
- niche → tuning の非接続は両設計とも侵していない（`TsuriNiche` は `TsuriFishData`/`TsuriWorldData` に閉じており、どちらの設計も参照しない）。待ち時間上限に触る変更もなし。
- river_asase 回帰基準: 背景側の s 変化 −1.2%（アート移動 ≤0.09wu）は許容範囲だが、**QA 基準画像の撮り直しが必要**という記載は維持すること。ウキ側は asase のアンカー／竿先を変えないので追加影響なし。

---

### レビュー 3

以下、環境オブジェクト拡充の視点からのクロスレビュー結果です。実コードを読んで裏取りしました。

---

## A. 既存の不変条件・正本裁定の破壊（要修正）

- **`sea_oki` の `fish_hirame` を `Niche = BottomSand` にするのは「沖に床を作らない」設計と正面衝突する。** `/Users/ndw_mac/AppDevelopment/pono-asobiba-app/unity/PonoNativeGames/Assets/Pono/Games/KawaGlint/Runtime/Rendering/KawaGlintStageBuilder.cs` L394-397 が oki を "DeepOpen is explicitly no floor by design" として実装しており、環境設計側も §4.5 でこれを維持している。一方 `KawaGlintNicheCues.cs` L17 の BottomSand ナレは「すなが もこもこ うごいてるよ…」。**砂が1ピクセルも描かれていない画面で「砂が動く」と読み上げる**ことになる。→ oki の hirame は `DeepOpen` にするか、hirame を oki から外して sunahama 専用にすること。

- **`river_kakou` の `fish_itou` を `Niche = DeepOpen` にすると、川で海のナレが出る。** `KawaGlintNicheCues.cs` L19 の DeepOpen 文言は「おおきな **ひきなみ** が きてるよ…」= 海の引き波語彙。にじます@河口・まぐろ@砂浜を「子供でも違和感」で削除した基準に照らせば同格の破綻。→ 正本 §3.1 が kakou に定義済みの「岩かげの深み」= `RockCover` が妥当。

- **E-5（`sea_oki` の ika を Surface→Midwater）は正本の明示裁定の取り消しであり、しかも根拠の立て方が §6-7 と矛盾する。** `docs/TSURI_SEA_WORLDMAP_PLAN_2026-07-24.md` §3.3 に「ika=iwaba では rock_cover / oki では **surface**（岩のない沖で「岩間の泡」演出を出すと絵として破綻するため）」と明記されている。oki の Surface は生態表現ではなく**演出セレクタとしての意図的選択**。設計案自身が §6-7 で「niche は演出専用・tuning 非接続」を維持と書きながら、E-5 だけ「生態的に誤り」を根拠に変えている。Midwater 自体は既定演出なので絵は壊れないが、変更するなら正本 §3.3 の当該行の改訂を差分に含めること。

- **正本 §3.2 の「非食用種の合計出現率は各ロケで normal 帯の 10〜15%」規約を、新確率テーブルが全5ロケで外している。** §5.4 表A から実算:
  - asase = zarigani 10.83 + sawagani 9.28 + boot 5.41 = **25.5%**（上限の1.7倍）
  - kakou = boot 7.21 + itou 0.11 = **7.3%**（下限割れ）
  - sunahama = hitode 4.81 + kaigara 4.33 = **9.1%**（下限割れ）
  - iwaba = hitode 8.72 + kaigara 7.85 = **16.6%**（上限超え）
  - oki = **0.1%**（非食用実質ゼロ）
  §6 の不変条件更新表にこの規約が1行も出てこない = 見落とし。環境側の影響として、「たからもの」枠が asase に偏り oki にゼロとなり、ロケーション個性づけ（装飾の見せ場）と噛み合わない。

- **正本 §3.2 の「treasure デデュープは `treasure_*` prefix 対象・hitode は対象外（不変）」が設計案に一切登場しない。** 実装は現状 `SessionDedupeWeightMul` のみで prefix デデュープは未実装（`TsuriCore.cs` / `TsuriTuning.cs` に `treasure_` の参照ゼロ、grep 確認済み）。`SessionSeenIds` を抽選から外すと、この未実装規約を将来実装する足場（セッション記憶）自体が消える。廃止するなら §3.2 の当該行も明示的に撤回すること。

- **§7 の asase 待ち時間 6-10s→4-7s 勧告は、不変条件5（≤8秒）だけでなく `TsuriKawaTuning.WaitSecRange = {6,10}` とのパリティテストを壊す。** `Tests/EditMode/TsuriWorldDataEditModeTests.cs` L60-71 `NextWaitSecRange_Asase_MatchesTsuriKawaTuning` が `TsuriKawaTuning` と `TsuriWorldData` の一致を固定している。§7 は「≤8秒は満たしたまま」としか書いておらず、`TsuriKawaTuning.cs` L20/L28 の同時変更が必要な事実に触れていない。環境側としては asase 短縮は歓迎（空白時間に見るものが増える）だが、TsuriKawaTuning 込みで扱うこと。

## B. §9.2「更新が必要な既存テスト」の漏れ（Phase 2 で確実に赤になる）

- **`TsuriWorldDataEditModeTests.cs` L25-34 `BuildEffectivePool_Asase_MatchesRiverSpeciesIdsInOrder` が漏れている。** asase に yamame/dojou/sawagani/iwana を追加した瞬間に `pool.Count == TsuriFishData.RiverSpecies.Count` が落ちる。§9.2 表は L43-49 / L181-182 / L205-206 / L220-237 しか挙げていない。
- 同 L36-40 `BuildWeightMulMap_Asase_IsNull` も `BuildWeightMulMap` 廃止（§1.4）で消滅するが表に無い。

## C. アート発注の重複・矛盾・予算

- **重複ファイル名はゼロ**（`kawa_*`/`umi_*` decor と `fish_*_catch/shadow` は名前空間が分かれている）。
- **予算に衝突なし。** 環境27枚=189cr + 種22枚（catch17+shadow5）=154cr = **343cr**。ウキ14cr・パララックス84cr を足しても441cr、リテイク15%込みで約490cr。残高892cr に対し余裕あり。ただし**両設計が独立に「残高892」を前提にしている**ので、発注前に単一台帳へ統合すること。
- **種設計 §10 の shadow 発注のうち海3枚（`fish_ryuuguunotsukai_shadow` / `fish_tako_shadow` / `fish_hirame_shadow`、21cr）は正本裁定違反。** `docs/TSURI_SEA_WORLDMAP_PLAN_2026-07-24.md` §3.3 に「**海=魚影なし（企画書§2.1 裁定）により海の魚は catch 1枚のみ。unagi は川方式（shadow+catch）**」と明記。川の `fish_itou_shadow` / `fish_namazu_shadow` は正当。海種の shadow を出すなら §2.1 裁定の明示的差し替え宣言が要る（設計案にその宣言はない）。

## D. 3〜7歳向けとしての懸念

- **リュウグウノツカイ（300-500cm・深海・legendary・初遭遇中央値226キャスト）は、環境装飾の NEGATIVE BLOCK が明示的に禁じている "no dark or scary mood, no horror" と緊張関係にある。** さらに sea_oki は環境設計上「床なし・超遠景と浮遊物のみ」なので、**画面上に5mを実感させるスケール基準物が存在しない**（ただの巨大な黒い帯になる）。→ 表示サイズを `Size="l"` 相当に抑えるか、oki に基準となる中景物を1点足す必要。
- MotionClass が 32種中およそ半数 `Standard` に偏っている（yamame / haze / kisu / iwana / saba は全て「銀色の紡錘形」）。「一目でレアとわかる」というユーザー要求に対し、レアの識別性より先に**ノーマル同士が見分けられない**問題が出る。

## E. コード読み込みの裏取りで見つかった見落とし

- **`KawaGlintActorsBuilder.cs` L56-59 の `AmbientFishSpeciesIds` は全ロケーション共通で `fish_ayu, fish_nijimasu, fish_salmon, zarigani` にハードコードされている。** つまり砂浜・磯・沖でも背景を常時泳いでいるのは「あゆ・にじます・さけ・ざりがに」。設計案は「全ロケーション・全 Spawns エントリを1件ずつ監査」と称しているが Spawns 台帳しか見ておらず、**画面に最も長く映っている魚が淡水種である**事実を拾えていない。まぐろ@砂浜 0.71% を削除する基準なら、こちらは常時100%表示なので優先度は上。ロケーション別 ambient テーブル化が必要（両設計とも項目なし）。環境側の QA 基準 #2「魚影が NEAR プロップの裏に消える」が対象にするのもこの ambient fish なので、両領域にまたがる。
- **`KawaGlintProceduralFishArt` の Recipe テーブルは §D-1 の10種分しか無い。** `KawaGlintSpriteCatalog.LoadCatchArt` は未登録 id に `Debug.LogError` + `null` を返す（L164-168）。Phase 2 で Spawns 台帳だけ先に入れて Recipe を後回しにすると、その瞬間に catch バナーが空画像になる。**Phase 2 内で Recipe → Spawns の順序を固定**すること。
- §1.5 の「Web 側 consumer が未知 rarity で落ちないことを確認」は、**その consumer が既に存在しない**（`common/tsuri/` は Web 版 tsuri-kawa と共に削除済み。`RARITY_BASE_WEIGHT` の hit は Unity の `TsuriTuning.cs` のみ）。作業項目から落として差し支えない。

## F. 環境設計側の自己申告（こちらが直すべき非整合）

- **`umi_coral_soft_01/02` `umi_coral_table_01` `umi_sponge_01` の発注は自己矛盾。** 自分が `umi_coral_01/02` を「熱帯サンゴ礁の意匠で温帯日本の磯に合わない」として引退させたのと同じ問題を再生産している。種設計の生態基準（にじます/まぐろ削除）を装飾にも適用するなら、iwaba の装飾語彙はホンダワラ/アラメ/フジツボ/ムラサキイガイ/イソギンチャクに寄せ、table coral と barrel sponge は落とす（§6「削るならここ」と一致、−21cr）。
- **NEGATIVE BLOCK の禁則を拡張する必要がある。** 種設計が `fish_sazae`（巻貝）/`fish_asari`・`fish_shijimi`（二枚貝）/`sawagani`・`fish_kani`（カニ）/`fish_tako` を捕獲対象に加えたため、現行の "no seashell / no crab / no starfish" では足りない。特に Wave 1 #9/#10/#15 の "barnacle crust" は さざえ/あさり と子供には区別できない → 「フジツボは surface texture のみ・個体として読めないサイズ」に限定する旨をプロンプトへ追記。
- **DRIFT プレーンの sortingOrder=15 は fish(14) の手前なので泡柱が魚影を隠す。** kakou/iwaba の DRIFT は U=.84 で、種設計が RockCover 種（unagi/namazu/tako/sazae）を増やしたロケなので前あたり演出と重なりうる。DRIFT を 13（MidFront と同じ = 魚の後ろ）に下げるか、DRIFT の x を NEAR と同じ端側に固定するのが安全。

## G. 実装衝突（ファイル単位）

- 実質の同時編集は **`Runtime/Rendering/KawaGlintSpriteCatalog.cs` の1ファイルのみ**（種= `ShadowPaths`/`CatchPaths` に17件、環境= `DecorKeys` に27件）。別 Dictionary なので論理衝突はないが、`AGENTS_CLAIMS.md` をファイル単位で claim すると相互ブロックする。シンボル単位 claim にするか、順序化（種 Phase 2 → 環境 Wave 1 差し込み）を明記すること。
- それ以外は完全に分離（種は Core/Gameplay/Hud、環境は StageBuilder のみ）。**Phase 1（種 Core 確率モデル）と環境 H1-H8 は完全並走可**。

---

### レビュー 4

実コードで裏取りした上でのクロスレビュー結果です。

---

## A. 同一コードを両設計が別方向に変更している（物理衝突）

- **B1 修正が完全に重複**。相手案 §8/§9.1「`KawaGlintHud` に `RaritySuperColor`/`RarityLegendaryColor` 追加、`OnLanded` の dotColor を4段階に」は、私の B1 修正と**同じ式**を書き換える。実コードで確認: `KawaGlintGameController.cs:803` と `KawaGlintFishdexPanel.cs:509` がともに `species.Rarity == TsuriRarity.Rare ? RarityRareColor : RarityNormalColor` の2分岐。2バッチが同一行を触るので rebase 衝突が確定する。**どちらか一方に所有権を寄せること**（推奨: レア視認性側。既存 HUD の色は `KawaGlintHud.cs:93-94` で `#7FD0E8`/`#FFD93D` = 私のオーラ色と既に一致しており、相手案は hex を規定していない）。
- **`KawaGlintProceduralFishArt.cs` への投資が正面から逆向き**。相手案 §9.1 は「新種17件の暫定 Recipe + Shell/Flat/Crawler の新シェイプ」を追加する。私の §3.1 は手続き型を「到達しないフォールバック専用」に降格し、解決順序 2 段目にアーキタイプ PNG を挿す。私の順序では**アーキタイプが先に当たるので新規17 Recipe は初日からデッドコード**。どちらか捨てる必要がある（工数削減効果が最大なのは相手案の Recipe 追加を落とす方）。
- `KawaGlintSpriteCatalog.cs` も両方が改修（相手は辞書へ17件追加、私は解決順序を3段化）。同一ファイル・同一辞書なので順序調整必須。

## B. `TsuriMotionClass` と私のアーキタイプ表が二重管理・かつ相互に消費されない

- **MotionClass の consumer がどこにも存在しない**。私の §4.1 動きテーブルは rarity tier のみをキーにしており MotionClass を読まない。相手案も演出実体は Rendering 任せ。結果として `TsuriCoreTypes.cs` に**誰も使わない enum が増えるだけ**になる。
- **MotionClass はシルエットのキーとしては使えない**。`Standard` が tai(=私の `broad_fancy`、tier1既定)・nijimasu・kisu・saba を潰し、`Heavy` が salmon(既存 `fish_sake_shadow` 流用)・maguro(`torpedo_giant`)・namazu・itou を潰す。私の11キー表の方が粒度が正しい。→ **MotionClass は Core から削除し、種→アーキタイプ表 (`Runtime/Rendering/KawaGlintFishSilhouettes.cs`) に17件追記する**形に一本化を推奨。ただし §E の用途を与えるなら残す価値あり。
- **相手案 §8 のコード契約はコンパイルできない**。`Runtime/Rendering/Pono.KawaGlint.Rendering.asmdef` の `references` は `["Unity.RenderPipelines.*"]` のみで **Core を参照していない**（実ファイル確認済）。`species.Rarity` / `species.MotionClass` / `species.Size` を Rendering が直接読むことは不可能。App asmdef (Gameplay) が plain struct に詰め替える必要があり、それが私の `KawaGlintFishPresentation`。§8 の参照先をそちらに書き換えること。

## C. Legendary 段が私の設計では「Super と完全同一」になる

- 私の tier テーブルは tier0/1/2 の3行 + `Clamp(tier, 0, 2)` なので、**`Legendary` (=tier3) は Super と同じピンク `#FF7FD1` オーラ・同じ `LengthMul 1.35`・同じ wag/接近になる**。相手案が Legendary を新設した理由「super に同居させると まぼろしの格が出ない」が、視覚層で丸ごと無効化される。Legendary を出荷するなら私の全テーブルを4行に拡張 + `RarityLegendaryColor` 追加が必須。
- 併せて **`sil_regal_longfin_shadow.png` が「将来」→「P1 必須」に昇格**する。リュウグウノツカイ(300–500cm の帯状) に既存アーキタイプで合うものが無い（`Slim`/`serpentine` はうなぎの形で、5m の帯としては読めない）。
- **enum の並び順が load-bearing 契約になる**。`(int)TsuriRarity` を私が tier として使うため、`Legendary` を末尾追加なら 0/1/2 は保たれる（相手案の書き方でOK）が、**将来の途中挿入が全魚の見た目を静かに塗り替える**。相手案 §6 の不変条件に「TsuriRarity の宣言順は Rendering の tier index 契約。途中挿入禁止」を追加すべき。

## D. 相手案 §8 の演出指針に、子供向け禁則違反と設計衝突がある

- **「Legendary: 画面全体の色調が一瞬変わる」は禁止**。私の §5.4（画面フラッシュ・急な輝度変化の禁止、3Hz 上限）と正面衝突。光過敏リスク。削除を要求。
- **「Super/Legendary: シルエット全体が発光 / はっきり色付き」は演出の読みを壊す**。魚影が暗いことが「まだ正体が分からない」の担保であり、私の halo は `sortingOrder 13`（魚 14 の**背面**）に置くことで「影のまま光る」を作っている。シルエット自体を光らせると reveal の山が消える。技術的には `_targetFishRenderer.color`（wag シェーダは頂点カラー乗算、環境魚も既に `renderer.color` で減光済み）で可能なので「できない」ではなく「やるべきでない」。
- 「Rare: 接近を1回ためらう」は私の `DepthHoldFrac`/`ApproachExp`/`WeaveAmpY` と同じ挙動の**別スペック**。二重定義なのでどちらかに寄せる（私の方は `sin(π·p)` 窓で progress=0/1 に厳密0が保証され EditMode テスト可能）。
- 「Super: 水面のゆらぎが強くなる」は `KawaSurfaceBand`/`KawaSurface.shader` を触る＝**別担当の背景/水面バッチの領域**。どちらの設計にも工数計上が無い。削除か後送りを推奨。

## E. 非遊泳生物が「泳いで近づいて尾を振る」（両設計とも未手当）

- 相手案は あさり/しじみ/さざえ (Shell=「移動しない」) と さわがに/わたりがに (Crawler) を追加。既存の ざりがに/ひとで/かいがら と合わせると **sea_sunahama は 12件中4件、river_asase は 9件中3件が非遊泳**。
- 実装確認: `KawaGlintActorsBuilder.cs:242` 付近で環境魚もターゲット魚も `renderer.sharedMaterial = fishMaterial`（= `KawaFishWag`）を共有し、`ShowTargetFish` は必ず画面右端 `_wrapMaxX + len*0.5` / `TargetFishAppearY=-1.5` から水平に泳いでくる。**しじみが泳いできて尾を振る**。
- 最小対応: MotionClass ∈ {Shell, Crawler} のとき `WagAmp = 0` + AppearY を水底へ + 水平のみ。これこそが **MotionClass に与えるべき唯一の仕事**（§B と接続）。int で `KawaGlintFishPresentation` に載せれば asmdef 契約も守れる。

## F. データ欠落 — 描画が壊れる

- **§2.1 の新種表に `Size` 列が無い**。`TsuriSpecies.Size` ("s"/"m"/"l") は `KawaGlintGameController.SpeciesWorldLength` (L892-905) の**唯一の入力**で、私の `RarityLengthMul` はこれに乗算する。未設定だと `default: 1.5f` に落ちて**さわがに(2-4cm)となまず(50-100cm)が同じ大きさで泳ぐ**。17種全部に列を足すこと。併せて リュウグウノツカイ = "l" × 1.35 = 3.38 world units が `_wrapMaxX` 出現位置と AppearY -3.0 で水底/画面外に破綻しないか要検算。
- **未登録 id の失敗モードが「静かに前の魚」**。`KawaGlintSpriteCatalog.LoadFishShadow` は未知 id に対し `Debug.LogError` + **null** を返し、`ShowTargetFish` (ActorsController L209-224) は null のとき**前キャストのスプライトを保持したまま続行**する。つまり登録漏れ = 「なまずを狙ったのに あゆの影が来る」+ 毎キャスト LogError。相手案のテスト7は正しいので**blocking にすること**。加えて、私の tier 既定フォールバック (0→`standard_mid` / 1→`broad_fancy` / 2→`torpedo_giant`) を**未知 id にも適用**すれば、失敗が「間違った魚」ではなく「それっぽいレア影」に劣化するので安全側に倒れる。

## G. アート発注の重複・仕様欠落（予算自体は問題なし）

- 合計: 相手 17 catch(119) + 5 shadow(35) = 154、私 P1 4(28) + P2 2(14) = 42、Legendary 対応で +`sil_regal_longfin`(7)。**計 ≈203 / 892。予算は余裕**。
- **相手の shadow 発注 5 件のうち 3 件が私のアーキタイプ発注と重複**: `fish_hirame_shadow` ↔ `sil_flat_disc`、`fish_tako_shadow` ↔ `sil_tentacle`、`fish_ryuuguunotsukai_shadow` ↔ `sil_regal_longfin`。私の解決順序では種専用 PNG が優先されるので、**片方は買っても一生描画されない**。さらに「ひらめ／かれいの左右の違いが知育ネタ」(§2.1) は**単色ベタの影では原理的に見えない**ので、hirame だけ専用影を起こす意味が薄い。→ hirame/tako の専用 shadow を発注から落とし (−14)、なまず/いとうのみ専用に残すことを推奨。
- **§10 に shadow 用の仕様が一切書かれていない**。示されているのは catch 用の指示（「わずかに発光する銀色の鱗」）だけ。shadow には `KawaFishWag.shader` 由来のハード契約がある: **単色 `#0F2C56` ベタ / 頭=左(u=0)・尾=右(u=1) / 四辺 38px(≈4%) 透明パッド / 1024px幅**。発光する影や頭が右の影を納品すると尾振りが逆端から出る。私の §8 共通仕様をそのまま流用させること。
- 関連: 私の tier2 `WagAmp 0.060` はシェーダ既定 0.022・パッド 4% を超える（現行 Flee 0.055 で既に超過）。`WagStartU` を 0.30 に下げると影響帯も広がるので、`sil_torpedo_giant`（高い背びれ）と `sil_broad_fancy`（体高大）だけ**縦パッドを 6% で発注**するか、tier2 `WagAmp` を 0.045 に抑えること。

## H. Legendary の到達性 — 実質「存在しないコンテンツ」に投資している

- 表C の legendary 中央値 214–226 キャスト / 90%tile ≈400。asase の待ち 6–10 秒 + 連打 + バナーで 1 キャスト ≈20–30 秒 → **90%tile は単一ロケに 2.5–3.5 時間張り付く計算**。3〜7歳では到達しない。にもかかわらず両設計が legendary に catch 2枚 + shadow 2枚 + 視覚 tier 1段分を投資している。`LegendaryPityStartCasts` を 100→40 程度に下げるか、専用アートを切るかの二択。
- **pity のロケ跨ぎ保持が演出意図を反転させる**。§5.3-5 で `CastsSinceLegendary` は `TrySetLocation` を跨いで保持されるが、**5ロケ中3ロケに legendary が存在しない**。asase/sunahama で150キャスト遊んだ子が初めて沖を開くと、既に倍率を溜めた状態で入場し、**新ロケ初回数キャストで リュウグウノツカイ が出る**。「まぼろし」の正反対。→ zone 別カウンタ、または legendary 在籍ロケでのキャストのみ加算に変更すべき。
- `LegendaryPityCapMul = 20.0` は到達不能な飾り: `1 + 0.015(N-100) = 20` → N ≈ 1366 キャスト。自案の 90%tile 400 時点では実効 5.5x。定数が読者を誤解させる。

## I. 既存不変条件のチェック結果

- **sortingOrder 契約 ✅**。実測で 11=DecorBack / 12=Plants / **13空き** / 14=Fish / **15空き** / 16=Caustics / 18=Motes / 20=DecorFront を確認。私の halo(13) / sparkles(15) はどちらの設計とも非衝突。
- **待ち時間 ≤8秒 ⚠️ 自案内で矛盾**。asase は現行 `WaitSecMax = 10f` で既に例外扱い。相手案 §4.1 見出しは「6–10 (現行維持)」、§7 は「4–7 に短縮を推奨」。どちらかに統一を。短縮しても私の reveal 窓 (progress 0.45→0.70 ≈ キャスト後 0.4–1.1 秒) は成立する。
- **niche→tuning 非接続 ✅ だが副作用の記載漏れ**。`MinProbability` は窓/連打に触れず契約 OK。ただし **niche は既にナレーションに配線済み**（`KawaGlintNicheCues.cs` ← `KawaGlintGameController.cs:489`）。E-1 (salmon Midwater→Surface) と E-5 (ika Surface→Midwater) は**前あたりナレーション文言を変える**。意図的なら明記を。
- **river_asase 回帰基準 ⚠️ 順序依存**。相手案 Phase 2 は asase に4種追加 + salmon の niche 変更を行う。私の EditMode テスト5 (tier0 定数ビット一致) と QA #1 は描画定数の話なので生き残るが、**ユーザーの体感回帰基準が動く**。私の Phase 1（描画・tier0 ビット同値）を先に実機サインオフしてから相手案 Phase 2 を入れないと、原因の切り分けが不能になる。相手案 §11 も同じ趣旨を書いているので、**2バッチ横断で「Phase 1 系を全部先に、確認を挟んでから Phase 2 系」**と明文化すべき。

## J. 細かい点

- §1.5 の「Web 側 consumer が未知 rarity で落ちないか確認」— リポジトリ内に **Unity 以外の tsuri consumer は現存しない**（Web 版 `tsuri-kawa/` は削除済み、`common/tsuri/` も無い）。作業計上前に確認を。
- 相手案が引用しているテスト行番号（`TsuriCoreEditModeTests.cs` L37-40 の RarityBaseWeight 70/25/5 + `SessionDedupeWeightMul == 0.3`、`TsuriWorldDataEditModeTests.cs` の `BonusSpecies_AppearsInEffectivePool_...`）は実ファイルと一致。**相手案は実コードを読んで書かれている**と判断できる（§0.1 の2段正規化・デデュープ相殺の分析も `TsuriCore.cs:82-140` の実装と合致）。

---

**最優先で解消すべき3点**: (1) B1 修正の所有権を一方に確定（同一行の確定衝突）、(2) MotionClass と アーキタイプ表の一本化 + 非遊泳生物への MotionClass 適用、(3) Legendary を出すなら私の tier テーブルを4行化・`sil_regal_longfin` を P1 化、出さないなら Legendary 段自体を W-2 送りにする。

---

### レビュー 5

KawaGlint 環境オブジェクト拡充案 クロスレビュー (背景多層化・水面二重解消 領域から)

前提: `KawaGlintStageBuilder.cs` L93-115 / L285-413 / L1343-1434、`KawaGlintStageContent.cs` L112-230、`KawaGlintActorsBuilder.cs` L60-90、`KawaGlintSpriteCatalog.cs` L105-130、`TsuriWorldData.cs` L140-180 を自分で読んで裏取り済み。発注書の実測値 (waterline y=1.6 / decor root y=-4.95 / ウキ x=1.8 / 遊泳帯 -4.2〜+0.8 / DecorBack=11・DecorFront=20) は全て正しい。以下は矛盾・見落としのみ。

## A. sortingOrder が正面衝突している (最優先・即調整必要)

発注書 §3 の `DecorPlane {Far=11, MidBack=12, MidFront=13, Drift=15, Near=20, Edge=21}` のうち **4枠が私の背景レイヤー契約と重複**する。両案とも「新設」と書いているので、このまま実装すると同一 sortingOrder 内の描画順が未定義になる。

| order | 環境案 | 背景案 | 状態 |
|---|---|---|---|
| 12 | MIDBACK | — | **既存 `PlantsSortingOrder = 12`** と衝突。`BuildDecor` は Build() L470-491 の if/else の**外**で無条件に走る (L1352) ので、アート未読み込みの手続き型パスでは実際に重なる |
| 13 | MIDFRONT | SubsurfaceHaze | 衝突 |
| 15 | DRIFT | DriftFar | 衝突 (しかも中身も「漂う浮遊物」で概念重複) |
| 21 | EDGE | ForegroundSilhouette | 衝突 (§C 参照) |

- 構造的な問題: BackgroundArt(2) と Fish(14) の間の空き整数は 3,4,5,6,7,9,10,11,12,13 の 10 個しかなく、私が 3,4,5,6,7,9,13 を取ると環境案の「魚より奥の3面 (FAR/MIDBACK/MIDFRONT)」に必要な連番が足りない。
- **調停案 (背景側が譲る)**: 環境案に **FAR=11 / MIDBACK=12 / MIDFRONT=13** をそのまま渡す。背景側は SubsurfaceHaze 13→**10** (手続き型 Riverbed 専用スロット、アートパスと排他なので安全)、DriftFar 15→**17** (私が §3.2 で「v1 未使用」と予約済みの GodRaySheet 枠を転用)、DRIFT=15 は環境案に渡す。EDGE と ForegroundSilhouette は §C のとおり **21 に統合して1レイヤー**にする。
- 波及: 私の EditMode テスト案 #4 (「予約セット {0,1,2,8,10,11,12,14,...} と衝突しない」「1ロケあたりレイヤー種数 ≤ 12」) は 12/13 を予約セットに追加し、カウント対象を backdrop コンテナ限定にスコープし直す必要がある。

## B. 「床の帯」プロップは `BuildDecorInstance` のスケール規約では床にならない (最大の実現性バグ)

`BuildDecorInstance` L1395-1400 は `scale = WorldHeight / sprite.bounds.size.y` の **uniform scale** で、ワールド幅は AR の従属変数。ところが #1 `kawa_bed_cobble_01` / #7 `umi_bed_sand_ripple_01` / #8 `umi_bed_gravel_01` / #18 `kawa_bed_cobble_02` は「16:9 のフレーム**全幅**、下 55% を占める」と発注されている。

- クロマ除去＋タイトクロップ後の実効 AR は 16 : (9×0.55) ≒ **3.23 : 1**。よって `h = .45` → ワールド幅 **1.45**、`h = .90` → **2.91**。
- 水中幅は 17.78。**全幅を張るには h = 5.50 が必要**で、水柱の高さ 6.6 の 83% を1枚が食う → 不可能。
- 実害: kakou MIDFRONT の `kawa_bed_cobble_01`×2 (U .30/.72, h .85) は x −3.56 と +3.91 に幅 2.7 のパッチ2枚が乗るだけで、中央と左右端は空いたまま。**検収基準 §8-1 (空白グラデ <30%) を自案の配置表では満たせない**。`kawa_grass_carpet_01` (h .70→幅 3.1)、`umi_seagrass_meadow_01` (h .80→幅 3.2)、`kawa_leaflitter_01` も同じ。
- 対応いずれか: (a) H1/H2/H3 と一緒に **`WorldWidth` 駆動のスケールモード**を `DecorPlacement` に足す (AR は uniform のまま維持できる、規約違反にならない)、(b) 帯物だけ横タイル (wrapU=Repeat + quad) にする ← 私の `layer_haze_subsurface` / `layer_drift_plankton` と同じ扱いにすれば実装が1本化できる、(c) 「全幅」を諦めてプロンプトから "spans the full width edge to edge" を削り、点数を 2→5 に増やして敷き詰める。**(b) 推奨** (背景側で `wrapU/wrapV: 0` の import 規約と `KawaScrollSheet.shader` を既に立てているので相乗りできる)。

## C. アート発注が背景案と重複している (4〜5点 / 28〜35cr の二重発注)

| 環境案 | 背景案 | 判定 |
|---|---|---|
| #6 `kawa_front_edge_01` / #16 `umi_front_edge_01` (EDGE, order 21, 暗い前景の岩/礁の縁) | `layer_fg_silhouette_rock.png` / `layer_fg_silhouette_kelp.png` (ForegroundSilhouette, order 21, 暗い前景の岩の縁/海藻) | **完全重複**。役割・order・配置ロケーションまで一致。どちらか一方に統合 (bottom-center pivot・揺れシェーダー適用可の背景側フォーマットに寄せるのが楽)。**−14〜28cr** |
| #17 `umi_bubble_column_01` (DRIFT スプライト、kakou/iwaba/oki 計3インスタンス) | BubbleRise (ParticleSystem、`CreateSoftCircleTexture` 手続き生成、**発注不要**、全5ロケ) | 重複。手続き型が既にあるので **スプライト発注は不要 −7cr**。しかも「約20個の不透明な球」を1枚絵に焼くと必ず同じパターンがループして見える |
| #26 `umi_drift_weed_01` (order 15) | `layer_drift_plankton.png` (order 15) | order も概念も重複。前者は個体、後者はシートなので共存自体は可だが order を分けること |

- 予算表の誤り: 環境案 §6 は他領域の「パララックス層≈84cr」と見積もっているが、背景多層化の実発注は **15点 = 105cr** (+ §6.4 の sunahama 撮り直し任意 7cr)。合計は 460 でなく **約 490cr**。残高 892 なので破綻はしないが、上記重複を切ると 455 程度に戻る。

## D. §2.2/§2.3 の waterline 是正と配置表が未同期 (sunahama)

背景案 §2.2 で `bg_tsuri_sea_sunahama` の wl を 0.3961 → **0.4452** に是正する (現行値は水平線を誤測しており、塗り水面とシェーダー稜線が 0.548 ワールド単位 = 1080p で約 59px 離れている)。この結果 sunahama だけ背景アートのスケールが **s 0.73339 → 0.79830 (+8.9%)、drawnW 19.714 → 21.458 (×1.0885)** に変わる。

- 環境案 §4 sunahama の「桟橋杭 U≈0.62 / 0.78」「ポノ U≈0.55」は**是正前のトランスフォームでの実測値**。是正後は杭が **U .63 / .80**、ポノのアンカーも (0.90, 2.20) → (0.98, 2.85) に移動する。配置表の U はこの新値で取り直すこと。特に MIDBACK `umi_anemone_01` (U .84) と NEAR `umi_rock_boulder_01` (U .88) が移動後の右杭 (U .80) に寄る。
- ポノの身長も sunahama だけ `AnglerArtWorldHeight` 2.6 → **1.95** に落とす (2.85+2.6=5.45 > カメラ上端 5.0 で `KawaGlintAnglerPlacementEditModeTests` が落ちるため)。**竿先が (1.855, 4.257)** に移るので、ウキ回廊の保護帯は sunahama だけ **U ∈ [0.528, 0.697] (x 0.5〜3.5)** に広げること (環境案の一律 U ∈ [0.528, 0.674] では足りない)。
- **マージ順序の指定が必須**: 背景案 §2.3 は `DecorPlacementsByBackgroundKey` の sunahama 3行 (L374-379) の WorldX を ×1.0885 して書き換える。環境案 H1/H2/H3 は同じテーブルをスキーマごと全面書き換えする。**先に背景案 §8 ステップ1〜3 (アート不要・二重線解消) を landさせ、環境案はその後の schema でリベース**しないと、私の X 補正が黙って消えるか二重適用になる。なお **H3 (正規化U) が入るなら私の ×1.0885 パッチは破棄**すること (§E 参照)。

## E. H3「WorldX → 正規化U」は診断が誤りで、副作用の方が大きい

環境案は「`WorldX` が絶対値なので 21:9 等で端が剥き出しになる」と書いているが、`ApplyBackgroundArt` L690-696 の cover-fit は `max(visibleRect.width / size.x, ...) * 1.02` を含むので、**背景アート自体はどのアスペクトでも必ず全幅を覆う**。剥き出しになるのは「アートは描かれているのにプロップが x ∈ [−4.6, +4.3] にしか無い」という配置密度の問題であって、座標系の問題ではない。

さらに正規化 U にすると逆方向に壊れる。16:9 では第3項 (水中高) が支配的で s は**アスペクトに依存しない** (sunahama 新 s=0.7983 は 6.6/(15.20×0.5548)×1.02 由来、幅項 0.6746 より大きい)。20:9 (可視幅 22.22) になると幅項 0.8432 が支配に切り替わり、**drawnW は 21.458 → 22.67 で +5.6% しか広がらないのに、waterRect 幅は +25% 広がる**。つまり:

- 現行 (絶対 WorldX): プロップ 0% 移動 vs アート +5.6% → ズレ 5.6%
- H3 (正規化 U): プロップ +25% 移動 vs アート +5.6% → **ズレ 19.4%**

iwaba の NEAR `umi_reef_cluster_02` (U .86) は 16:9 で x=+6.4 だが 20:9 では x=+8.0 に飛び、背景の崖 (アート追従で +5.26 付近) から完全に外れる。sunahama の杭回避も同様に破綻する。

- **正しい修正**: プロップ座標を「カメラ相対 U」ではなく **アート相対 (px→world)** にする。変換式は背景案 §2.2 で既に提供済み: `x = (px/2688 − 0.5) * drawnW`, `y = centerY + (0.5 − py/1520) * drawnH`。杭・崖・岩棚といったアート上のランドマークを避ける配置は全てこちらで指定すべき。DRIFT / EDGE のような「画面の縁に対する額縁」だけカメラ相対 U でよい。**2つのアンカー方式が必要**であって、H3 の一本化は誤り。

## F. rootY バンドが全ロケーション共通の定数になっていて塗り床の位置を無視している

FAR rootY −3.4〜−2.6 / MIDBACK −4.3〜−3.5 という**グローバル定数**だが、塗られた床の上端は背景ごとに違う。sunahama は是正後 world y ≈ **−1.38** 以下が砂底 (背景案 §2.3 実測)、oki は床が存在しない、asase は玉石床が別の高さにある。

- FAR を「床の奥行きの続き」として置くなら、rootY は各背景の塗り床上端から導出する必要がある (上式で px から算出可能)。定数のままだと、ある背景では床の途中に埋まり、別の背景では床の上に浮く。
- 特に oki は塗り床ゼロなので `umi_pinnacle_far_01` の y=−4.6 と `umi_kelp_forest_02` の y=−4.9 は根拠のない値。「根元が霧に溶ける」プロンプト (#27) の意図なら根元固定でなく **DRIFT 扱い (アルファフェード付き)** にすべき。

## G. ゲームデザイン整合: NEAR プロップとニッチの不一致 (3〜7歳への誤誘導)

- **sunahama に NEAR (order 20) を2枚置くのは既存設計と矛盾**。コード L370-373 のコメント通り `TsuriWorldData` の sunahama には **RockCover スポーンが1件も無い** (確認済み)。にもかかわらず `umi_rock_boulder_01` / `umi_kelp_forest_01` を魚影より手前に置くと、「岩の陰に魚が消える」体験だけ起きて `KawaGlintNicheCues` の RockCover 前あたりナレ (「いわの かげで なにか うごいたよ…」) は絶対に鳴らない。3〜7歳には**空振りする期待**になる。sunahama は現行どおり back-layer のみに留めるか、NEAR は「魚が通らない画面端」に限定すること。
- **検収基準 §8-2「魚影が必ず1回以上 NEAR の裏に消える」は自案の配置表で満たせない**。(1) oki には NEAR が0枚 (自案の表どおり) なので原理的に不可能。(2) 遊泳帯は y ∈ [−4.2, +0.8] (`FishMinDepthY`/`FishMaxDepthY` 確認済み) だが NEAR の頂点は root −5.4〜−5.0 + h 2.0〜3.4 = **y −3.4〜−2.0**。つまり **遊泳帯の上側 2.8 / 5.0 = 56% は NEAR より上**を泳ぐ。魚の depth 抽選と NEAR の高さを連動させないと「必ず1回」は保証できない。基準を「iwaba の RockCover 個体に限り」に緩めるか、`umi_reef_cluster_02` の h を 3.2 → 4.0 以上にすること。
- **プロンプト内部矛盾**: NEGATIVE BLOCK が "no dark or scary mood, no horror" と言いながら、#2/#9/#10 の本体で "a soft dark rounded crevice" / "overhanging ledge with a wide open gap" を明示要求している。GPT Image 2 は毎回違う解決をするので画風が割れる (既存 `umi_coral_01` が外れたのと同じ経路)。**"shallow shadowed nook in a mid-tone, never black, never a deep hole"** のように明るさを言語で固定すること。「暗い穴」が並ぶ絵は 3〜7 歳には向かない。
- EDGE の暗い額縁 (tint 0.80,0.86,0.94) を左右に置く案は、背景案の ForegroundSilhouette (同じく暗め) と合わせると **1画面に暗い前景塊が最大3個**になり、囲われた/閉じた印象になる。§C の統合で1個/ロケ (iwaba のみ2個) に上限を切ること。

## H. パフォーマンス予算が背景案の上限と両立しない (合意し直しが必要)

背景案 §5 は「シーン全体の描画コール (UI除く) ≤ 45、変更後 25〜32」「新規テクスチャ合計 ≤ 12MB」と切っている。これは**背景レイヤー分のみ**を織り込んだ数字。

- **描画コール**: 環境案は iwaba で 18 インスタンス。個体ごとに sprite / scale / tint が違うのでスプライトバッチングはほぼ効かず、実質 +14〜18 コール。現行の decor は 2〜4 インスタンス (≒3 コール) なので **+15 前後**。25〜32 + 15 = **40〜47 で ≤45 を超える**。アクティブロケあたり **ユニークスプライト 12 枚以内**に抑えるか、合同で上限を 55 に引き上げるかを決めること (実機 Profiler 確認は AGENTS.md §7.4 の MUST 対象)。
- **テクスチャ**: 環境案 H8 の懸念は正しいが、(a) を「推奨」でなく**必須**にすべき。27点を 2048² で入れると ASTC 6x6 換算で約 50MB、1024² でも約 12.5MB。背景案の 15 点 (合計 6.8Mpx ≒ 3MB) と合算すると現行の「≤12MB」上限を確実に超える。**合同上限を 18〜20MB に改訂 + 1:1/9:16 は maxTextureSize 1024 を必須**に。
- **H8(d) 遅延ロードは両案の「全ロケ事前構築 + SetActive」パターンと矛盾**する。`BuildDecor` L1352-1370 も背景案の `BuildBackdropLayers` も、非アクティブ含む全5ロケ分のスプライトを `Resources.Load` 済みにする設計。遅延ロードを採るなら両方同時に変える必要がある (片方だけだと意味がない)。
- **オーバードロー**: 環境案の DRIFT を order 15 (魚 14 の**手前**) に置く点は要注意。oki の `umi_drift_weed_01` (y −1.2 / −2.4)、`umi_bubble_column_01` (y −4.8〜−2.6) はいずれも遊泳帯の中で魚影の手前に来る。oki は `IsBonusHome = true` (マグロのホーム、`TsuriWorldData` L167 で確認) かつ Surface ニッチ魚が3種いる場所で、**魚影の視認が最も重要なロケーション**。「DeepOpen = 床を作らない = 水がきれいに読める」という既存設計意図とも逆行する。oki の DRIFT は order 15 → **11 (FAR 相当、魚の奥)** に落とすか、アルファを 0.5 以下に。

## I. 揺れ (H5) の方向が奥行き手がかりとして逆

「FAR 5°/**速**、MID 4.5°、NEAR 2.5°/**遅**」— 角度は絶対移動量では FAR が小さいので妥当だが、**速度が逆**。遠いものほど見かけの角速度は小さくなるべきで、環境案自身の §7 パララックス係数 (FAR 0.15 / NEAR 1.0 = 遠いほど動かない) とも背景案の自走速度比 (HorizonHaze 1 : CloudsFar 2 : ... : SkyLife 35 = 遠いほど遅い) とも矛盾する。FAR は「小振幅・**低速**」に。

- 実装面: 揺れ振幅は `KawaGlintStageContent.cs` L194 の `* 4f` が**ハードコード**で、手続き型 `BuildPlants` の水草・既存 decor・(背景案の) `layer_reed_cluster` 葦が全部これを共有する。H5 でプレーン依存にするなら `PlantEntry` に振幅フィールドを追加する変更になり、**背景案の BankFoliage (葦・浜草は `RegisterPlant` 流用) が同じ API を触る**。どちらが先に入っても他方が壊れないよう、`RegisterPlant(transform, baseRotation, speed, phase, amplitudeDegrees = 4f)` のオプショナル引数追加で合意すること。
- 子供向け周波数上限: 背景案は全レイヤー周期 ≥2秒 (≤0.5Hz) に固定している。H5 の「速」を数値で pin すること (現行 `swaySpeed` 0.5〜1.1 rad/s = 0.08〜0.175Hz。**上限 1.6 rad/s = 0.25Hz** までなら背景案の上限内)。

## J. その他の小さな不整合

- **ウキ回廊の根拠が不正確**。「前あたり演出を隠さないため」とあるが、ウキは order **34**、釣り糸 33、リップルリング 32。NEAR(20) も EDGE(21) もウキを隠せない。回廊を守る実際の理由は **order 14 の魚影 (寄ってくる前あたりの影)** を隠さないこと。理由が正しくないと将来「NEAR は 20 だからウキは平気」と誤って回廊が撤廃される。DESIGN.md には「魚影の接近経路の保護」と書くこと。
- **クロマキーが2色混在** (`#00ff00` と `#ff00ff`)。背景案は既存 batch:1467 と同じ**純マゼンタ単一**に固定している。被写体色に応じた使い分け自体は妥当だが、既存の除去スクリプトが単色前提なら2系統の処理設定が要る。どちらでもよいので**1バッチ内では統一**すること。
- **asase の再ベースラインは1回にまとめる**。背景案 §2.2 も asase の s を 0.75556 → 0.74662 (−1.2%) に変え、SurfaceStyle で crest/foam も変えるので、環境案 H7 が要求する「回帰基準の解除 + QA スクショ再取得」は背景案側でも不可避。ただし性質が違う: 背景案の変更は**同じ絵がわずかに動く**だけ、環境案は**新規に12点足す**。ユーザー決裁が必要なのは後者。**背景案 §8 ステップ1〜3 → 再ベースライン1回 → 環境案の asase 追加を別コミットで承認**、の順にすること。
- **`SetCloudWrapBounds` バグの共有**。`_cloudWrapMinX/_cloudWrapMaxX` は `BuildClouds` (手続き型パス) 内でしか設定されず、アートパスでは 0/0 のまま (確認済み)。環境案が DRIFT の横流れに `RegisterCloud` を流用するなら**同じ地雷を踏む**。背景案 §3.1 で `Build()` 直下への移動を修正済みなので、依存関係として明記のこと (背景案 §8 ステップ2 が先)。
- 待ち時間上限 (`WaitSecMax` 最大 8f、oki) とニッチ→チューニング非接続の不変条件は、環境案は装飾のみなので**破っていない**。ただし §G のとおり「NEAR プロップ = 隠れ場所」という視覚的示唆はニッチ表と一致させること。
- 「合計68インスタンス」の内訳 (12+17+15+18+6) は正しく検算できた。「既存15インスタンス」も配置表 (4+3+3+3+2=15) と一致。

## 合意すべき最小セット (これだけ決めれば並走可能)

1. sortingOrder: 環境=11/12/13/15/20/21、背景=3/4/5/6/7/9/**10**/17/19/**21統合**/22 (§A)
2. 床の帯プロップはタイル方式 or `WorldWidth` スケールモード (§B)
3. EDGE と bubble column は発注取り下げ、背景案側に統合 (§C、−21〜35cr)
4. マージ順序: 背景案 §8 ステップ1〜3 → sunahama U 再測定 → 環境案 H1/H2 (§D)
5. H3 は正規化 U ではなく px→world のアート相対座標に置換 (§E)
6. 合同予算: 描画コール ≤55 (要合意)、新規テクスチャ ≤20MB、1:1/9:16 は 1024 上限 (§H)

---

### レビュー 6

以下、環境オブジェクト拡充側からのクロスレビュー。実コード (`KawaGlintStageBuilder.cs` / `KawaGlintStageContent.cs` / `KawaSurface.shader` / `KawaGlintSpriteCatalog.cs` / `KawaGlintActorsBuilder.cs`) と既存 PNG 実寸で裏取り済み。

## A. 両設計が同じものを別方向に変更している (要調停・着手前ブロッカー)

- **【最重大】sortingOrder 13 / 15 / 21 が完全衝突。** 背景側 §3.2 は 13=`SubsurfaceHaze`, 15=`DriftFar`, 21=`ForegroundSilhouette` を新規確保。環境側 H2 は同じ番号を `MidFront=13 / Drift=15 / Edge=21` として確保。しかも背景側テスト #4 の予約セット `{0,1,2,8,10,11,12,14,16,18,20,30,32,33,34,35,40,42}` には 13/15/21 が入っていないため、**両方実装してもテストは緑のまま静かに衝突する**。z が全て 0 なので同 order のタイは URP 2D では renderer 登録順依存＝ビルドごとに前後が入れ替わりうる (半透明ヘイズが不透明プロップの前後を行き来する)。どちらかが 13/15/21 を明け渡すか、`SortingLayer` を分けること。
- **同一行の二重編集: `KawaGlintStageBuilder.cs` L374-379 (sea_sunahama デコ)。** 背景側 §2.3 は絶対ワールド X を ×1.0885 して `-1.63 / 1.31 / -4.68` に書き換える。環境側 H3 は同フィールドを正規化 U に置換し、かつ §4 で sunahama のプレースメント配列そのものを 15 インスタンスに全面差し替える (`umi_rock_01` は降格、`umi_kelp_03` は不採用)。背景側の 1.0885 補正は**適用先ごと消える**。順序を決めるか、背景側の補正を「U 値の再測定」として環境側の新テーブルに直接織り込むこと。
- **`KawaGlintStageContent.cs` の Register* API を両方が同時拡張。** 背景側 §3.4 が `RegisterCloud` オーバーロード / `RegisterScroller` / `RegisterSurfaceDebris` / `RegisterBackdropContainer` を追加。環境側は H5 (プレーン依存 sway) と DRIFT プレーンの上昇/漂いアニメを要求するが、**H1-H8 に DRIFT 用の登録 API が一つも挙がっていない** (RootY と enum だけでは浮遊物は動かない)。アニメーション API のオーナーを 1 本化すること。
- **`AnimatePlants` の振れ幅は L194 でハードコード `* 4f`。** 環境側 H5 (FAR 5°/MID 4.5°/NEAR 2.5°) も背景側の葉揺れも、この定数を per-entry 化しないと成立しない。環境側 H5 は暗黙、背景側は言及なし。どちらかが明示的に `PlantEntry.SwayAmplitude` を追加する担当を持つこと。
- **asase 回帰ベースラインを 2 箇所が別々に破る。** 環境側 H7 (back-layer only 制約解除) と背景側 §2.2 (`BgWaterlineFromTop01` 0.41382→0.4068、s −1.2%) が独立に「QA スクショ再ベースライン」を要求。ユーザー決裁とスクショ撮り直しは**1 回にまとめる**こと (2 回に分けると差分の帰属が不明になる)。

## B. アート発注の重複・矛盾

- **泡が二重発注。** 背景側 order 19 `BubbleRise` (ParticleSystem, 全5ロケ, rate 1.5/s) と環境側 `umi_bubble_column_01` (7cr, kakou/iwaba/oki の DRIFT=15)。同じ絵が粒子とスプライトで同時に出る。しかも環境側プロンプトは "fully opaque, never transparent" な球を約20個 → order 15 は魚 (14) の**前**なので魚影を遮る。背景側の手続き生成 (`CreateSoftCircleTexture` 流用・発注不要) に寄せて環境側 #17 を削るのが素直 (−7cr)。
- **手前シルエットが二重発注。** 背景側 `layer_fg_silhouette_rock.png` / `layer_fg_silhouette_kelp.png` (order 21, 14cr) と環境側 `kawa_front_edge_01` / `umi_front_edge_01` (EDGE=21, 14cr) は役割・配置・order が完全に同じ。加えて iwaba は背景側 ForegroundSilhouette ×2 + 環境側 NEAR ×2 = **手前の岩塊 4 枚**になる。約 28cr の無駄 + 過剰オーバードロー。
- **微粒子が三重。** 既存 Motes (order 18, 150粒) + 背景側 `layer_drift_plankton.png` (DriftFar=15) + 環境側 DRIFT (15)。同一 order でかつ同一表現。
- **クロマキー規約が不一致。** 背景側は「透過素材は全て純マゼンタ #FF00FF、batch:1467 と同じパイプライン」。環境側は #00ff00 と #ff00ff を素材ごとに使い分け。除去スクリプトに per-file chroma 引数がないと片方が破綻する。どちらかに統一するか、引数化を明記すること。
- **環境側の「羽毛状エッジ」指定はクロマキーと両立しない。** #1/#7/#8/#18 の "softly feathered irregular top edge"、#27 の "base fades out softly into nothing"、#27 の "pale blue-grey and pale teal" を**緑クロマ上**で生成 → GPT Image 2 は真のアルファを出さないので半透明羽毛部にカラーフリンジが残り、環境側自身の QA 項目 5(d) で必ず落ちる。エッジは硬く作らせて柔らかさは実行時 tint/α で出すか、寒色系被写体はマゼンタ固定にすること。
- **背景側 15 点には STYLE / NEGATIVE ブロックが無い。** 環境側 §1.3 の診断 (「`umi_coral_01/02` が硬輪郭・高彩度で背景 DNA から外れた原因はこのチェック欠落」) がそのまま背景側 15 点に再発する。特に `layer_drift_plankton` / `layer_fg_silhouette_kelp` / `layer_debris_leaf` は魚・ヒトデ・貝 (=捕獲対象種) の混入リスクが高い。環境側 §5.2/§5.3 のブロックを背景側発注にも必ず連結すること。
- **予算の突き合わせ。** 環境側 §6 は他領域を「パララックス層≈84cr」と見積もっているが背景側の実発注は **15枚=105cr** (+ §6.4 の sunahama v2 7cr)。実合計は 環境 189 (+リテイク28) + 背景 112 = 329cr。全体でも 892cr 内に収まるが、上記重複 (泡7 + シルエット28) の 35cr は削れる。

## C. 環境側設計の内部矛盾 (背景側と組み合わせると顕在化)

- **「床の帯」は現行スケール API では作れない。** `BuildDecorInstance` L1396 は `scale = WorldHeight / sprite.bounds.size.y` の高さ駆動。既存デコ PNG は全点タイトトリム済み (`umi_kelp_01` = 357×1024 等) なので新素材も同様にトリムされる前提。16:9 の帯素材を h .45〜.90 で置くと**ワールド幅は 1.5〜2.9 単位しか出ない** (可視幅 17.78 に対し 2〜3 枚で 5 単位程度)。「全幅にわたる床」を意図するなら幅駆動モードが H1-H8 に必要 (ただし AR 厳守なので stretch は不可 → タイル or 枚数増)。
- **検収基準①「空白 <30%」は自テーブルで到達しない。** プレーン rootY の最大が EDGE −5.6 / NEAR −5.0、最大高が 4.5 / 3.4 なので**全プロップの上端は y ≈ −1.1〜−1.6 に収まる**。水柱は y ∈ [−5.0, +1.6] = 6.6 単位なので、上部 2.7〜3.2 単位 (≈45%) は依然空白。魚の遊泳帯 (`KawaGlintActorsBuilder.cs` L62-63: y −4.2〜+0.8) の上半分も空のまま。皮肉にもそこを埋める設計は背景側の `SubsurfaceHaze`(13) / `DriftFar`(15) 側にあり、**衝突している当の 2 レイヤーが環境側の欠落を補完する関係**にある。番号を整理すれば両設計は競合ではなく相補になる。
- **FAR プレーン (rootY −3.4〜−2.6) は kakou で「偽の海底」を作る。** 環境側自身の実測で kakou は「巨大な暗いティール空白 + **最下部**に砂利」。そこに `kawa_bed_cobble_02` の石床帯を y −3.4 に浮かせると、帯の下に素の水が見える＝環境側が `umi_coral_02`@oki を引退させた理由と同じ欠陥。「画面上で高い位置＝遠い」が成立するのは真の断面図である `bg_river_crosssection` だけ。kakou/sunahama は背景側実測の砂底上端 (sunahama で world y −1.38) を確認した上でロケーション別に FAR の rootY を決めるべき。
- **`kawa_front_edge_01` の配置が実質不可視。** LoadDecor の pivot は bottom-center。プロンプトは「岩塊が**左下**から対角に立ち上がり、右側は不規則な輪郭で終わる」。これを U .00 (worldX −8.89) に置くと岩塊のある左半分が画面外、画面内に出るのは空のクロマ側だった右半分。FlipX (H4、未実装) をかけるか U≈0.15 に寄せる必要がある。※ `umi_front_edge_01` @ U 1.00 + FlipX は逆に正しい。
- **sway ゲートの取り違えリスク。** H5 の「FAR 5°/速」を素直に読むと FAR に含まれる `kawa_rock_02` / `kawa_bed_cobble_02` / `umi_bed_gravel_01` (石床・砂紋) まで揺れる。プレーンは**振幅だけ**を決め、揺れるか否かは既存の `DecorPlacement.Sway` フラグ維持を明記すること。
- **H8 の VRAM 見積が過大。** 既存 .meta は `maxTextureSize: 2048` かつ `textureCompression: 2` (ASTC/ETC2) で、実 PNG はいずれも ≤1024px。34点でも圧縮後 ~16MB 程度で「数百MB」ではない (それは RGBA32 非圧縮換算)。ただし `KawaGlintSpriteCatalog` は static `Sprites` 辞書で Resources 参照を**永久キャッシュ**し、`BuildDecor` は全5ロケーションを事前構築するため、34点 + 背景側15点 + 背景5点が常駐する点は事実。背景側 §5 の「新規テクスチャ ≤12MB」枠に環境側 34 点は含まれていないので、予算は合算し直すこと。

## D. 描画コール予算が両設計で整合していない

- 背景側 §5 は「シーン全体 ≤45、現状 15〜20 → 25〜32」と見積もるが、これは**デコが現行 2〜4 点のまま**という前提。環境側は最大 18 インスタンス／ロケーション。
- 決定的なのは **SpriteAtlas が存在しないこと** (プロジェクト内の `.spriteatlas` は PackageCache のサンプルのみ)。`BuildDecorInstance` は共有 Material を使うが Sprite が別テクスチャなので**別スプライト＝別ドローコール**。iwaba の MIDBACK だけで `umi_reef_cluster_01 / umi_coral_soft_01 / umi_coral_table_01 / umi_anemone_01` の 4 テクスチャ = 4 コール。18 インスタンス ≒ 13〜14 コールになる。
- 背景側の「1レイヤー内は同一 Sprite + 同一 Material + 同一 order でバッチング」という前提は、環境側の「27ファイル 68インスタンス」設計には適用できない。合算すると 45 コール上限を確実に超える。**KawaGlint 用 SpriteAtlas の新規作成を H8 に追加**するか、ロケーション別に遅延ロード + 予算を再合意すること。

## E. 3〜7歳向けとしての懸念

- **手前が二重に暗くなる。** 背景側 order 21 は「手前の**暗い**岩の縁」「暗く沈んだシルエット寄り」、環境側 EDGE 21 も "deep muted blue-grey and dark olive... cooler, deeper and slightly darker"。同 order・同ロケーション (kakou / sunahama / iwaba) で重なると絵本トーンから外れる。環境側プロンプトの "never black, never a flat silhouette, no dark or scary mood" は良い歯止めだが、**2 枚重ねれば結果は暗い**。order ≥20 の暗部は 1 領域がオーナーになること。
- **既存の不変条件「ウキ回廊」が弱められている。** 正本 `docs/KAWAGLINT_DEPTH_FISHDEX_UI_DESIGN_2026-07-25.md:35` は「ウキ回廊(x∈[0.5,3.1])には**手前レイヤー**を置かない」。環境側はこれを「NEAR/EDGE のみ」に狭め、DRIFT (order 15、魚 14 の前) が対象外になっている。背景側も `SurfaceDebris`(22) / `BubbleRise`(19) を回廊制約の対象にしていない。**水面 y=1.6 付近を漂う落ち葉・泡は、未就学児には「ちょんちょん」前あたり演出と誤読されうる**。回廊制約を「order ≥15 の全レイヤー」に戻し、背景側の拡張案 (x∈[0.5,3.5]) を採るべき。
- **oki が最も退屈なまま。** `TsuriWorldData.cs:168` で oki は `WaitSecMax = 8f` (全ロケ最長) かつ魚影なし。既存レビュー (`docs/TSURI_SEA_WORLDMAP_PLAN_2026-07-24.md:464`) が「最長の無入力時間 × 最少の視覚フィードバック」として明示的に問題視した箇所。にもかかわらず背景側は oki の `SurfaceDebris = 0` / `ForegroundSilhouette = 0`、環境側も 6 インスタンスのみ。**8 秒間ウキを見つめる画面で水面付近の動きがゼロ**になる。「床を作らない」設計意図は維持しつつ、水面付近の漂流物・カモメ・泡は oki こそ最も濃くすべき (背景側は逆の判断をしている)。
- **sunahama でポノが小さくなりすぎる。** 背景側 §2.3 は sunahama のみ `AnglerWorldHeight` を 2.6 → **1.95** に縮小。同じ画面で環境側は `umi_kelp_forest_01` を NEAR h 2.8、`umi_rock_boulder_01` を h 2.2 で置く。主人公が海藻より小さく岩と同程度になり、スケールの読み取りが崩れる。背景側 §6.4 の `bg_tsuri_sea_sunahama_v2` (低い桟橋で撮り直し → 2.6 に戻せる) を**任意の第2段ではなく必須**に格上げする判断を推奨。

## F. 軽微 (事実誤り・記述の精度)

- 背景側 §3.3 の「既存 `RegisterPlant` は ±4°、0.5〜1.3 rad/s」は 2 系統の混同。**デコ側は L1420-1422 で ±3° / 0.5〜1.1**、±4° / 0.6〜1.3 は `BuildPlants` (L1036-1037) のみ。実際の揺れ角は `AnimatePlants` L194 の `* 4f` が全登録者共通。
- 環境側 §3 が「27ファイルで 67 インスタンス」、§4 が「合計 68」で不一致 (テーブル合計は 12+17+15+18+6 = 68 が正)。
- 環境側の「niche 演出への接続」表現について: `KawaGlintNicheCues.cs` L10-12 は「演出専用 -- tuning(窓・連打・待ち時間・WeightMul)には**一切接続しない**」と明記されている。デコ配置は純粋に絵の話に留め、コード上 `TsuriNiche` を参照しないこと (現設計はテキスト上の対応付けのみなので違反ではないが、実装者が誤解しないよう明記推奨)。

## 推奨する調停順

1. sortingOrder の再割当を先に確定 (背景=奇数帯 3/4/5/7/9/17/19/22、環境=偶数/専用レイヤー、等)。これが決まるまで両領域とも実装着手しない。
2. 背景側 §8 ステップ 1〜3 (waterline 是正 + `SetCloudWrapBounds` 修正 + SurfaceBand スタイル化、アート発注ゼロ) を先行マージ。ここは環境側と一切干渉しない。
3. 環境側 H1-H8 + SpriteAtlas 追加を次にマージ (sunahama のデコ X はステップ 2 の補正後トランスフォームで再測定した U 値を直接使う)。
4. 重複発注 (泡・手前シルエット) を削って合計 294cr → 約 294−35 = 259cr で発注。asase 再ベースラインは 1 回にまとめてユーザー決裁。

---

## 7. アート生成についての重要事項(2026-07-25 判明)

各設計書には「Higgsfield MCP の generate_image / model gpt_image_2」を前提とした発注書が含まれるが、
**この前提は変更になった**:

- ユーザーは Higgsfield の **ultimate プラン**契約者で、Nano Banana Pro 等の
  **アンリミテッド枠を持っている**。
- ただしプラン情報の実データ(`show_plans_and_credits`)を確認したところ、アンリミテッド枠は
  すべて **"Available ... on web"**(higgsfield.ai のサイト上での生成のみ)と明記されている。
- **MCP 経由(Claude Code から)の生成にはアンリミテッドが適用されず、通常のクレジットを消費する**
  (Nano Banana Pro 2k = 2クレジット、GPT Image 2 high/2k = 7クレジット、残高892)。
  MCP 側からアンリミテッドを有効化するパラメータ・フラグは存在しない(ツール定義・モデル定義・
  プラン情報すべてを確認済み)。
- したがって今回のアート生成は、**MCP から生成するのではなく、web UI(または Claude Cowork 等の
  ブラウザ操作が可能な環境)でアンリミテッド生成する**方針にユーザーが決定した。
- 実装担当は、各設計書のアート発注書を **「web UI にそのまま貼れる形の指示書」**
  (1枚ごとにプロンプト全文 / アスペクト比 / 解像度 / 背景クロマキー色 / 保存ファイル名)に
  整形して提供すること。生成された画像を受け取ってから、クロマキー除去 → Unity 統合 → 実装へ進む。
- 注意: `AGENTS.md` Hard Rule 7 は「画像生成は GPT Image 2 固定」と規定している。Nano Banana Pro へ
  切り替える場合、(a) 既存アート(色鉛筆調パステルの絵本品質)と絵柄が揃うかテスト生成で目視確認、
  (b) 揃うことを確認した上で AGENTS.md 側のルール更新を提案、の2点が必要。
