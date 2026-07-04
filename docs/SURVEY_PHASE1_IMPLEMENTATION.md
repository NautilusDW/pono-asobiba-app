# ポノのあそびば アンケート分析パイプ Phase 1 実装セット

対象 SS: `1Gs79PHC8YUXGN2VpaHHH6edHH1BtfiOYvaCHxcbwXXI`
実装対象: Apps Script (WeeklyDigest.gs) + Sheets 6 タブ + トリガ + Gmail 配信
前提: production タブは 16 列 (A:timestamp 〜 P:email)、doPost 経由で append 済み。

> **本ドキュメントの読み順**: セクション 1 で全体像を掴む → セクション 2 で Apps Script を貼る → セクション 3 で Sheets を作る → セクション 4 で動作確認。所要合計 30 分。

---

## セクション 1: 全体セットアップ フロー (30 分)

### 依存関係グラフ

```
[Step 1] Apps Script プロジェクトを開く (2 min)
      ↓
[Step 2] Gemini API Key を取得 (aistudio.google.com) (5 min)
      ↓
[Step 3] PropertiesService に 2 項目登録 (GEMINI_API_KEY / DIGEST_EMAIL_TO) (2 min)
      ↓
[Step 4] WeeklyDigest.gs を新規ファイルとして貼付・保存 (3 min)
      ↓
[Step 5] Sheets 6 タブを依存順に作成 (12 min)
              _Helpers → Dashboard → Game_DeepDive → Trend_Weekly
                        → Weekly_Summary (ヘッダのみ) → Decision_Log
      ↓
[Step 6] testRunWeeklyDigest を手動実行 → OAuth 3 権限承認 (3 min)
      ↓
[Step 7] トリガ登録 (毎週月曜 09:00 JST) (3 min)
```

### 手順一覧表

| # | 手順 | 所要 | 前提 |
|---|---|---|---|
| 1 | https://script.google.com で対象 SS 紐付けプロジェクトを開く | 2 min | SS 編集権限 |
| 2 | https://aistudio.google.com/ で API key を発行 | 5 min | Google アカウント |
| 3 | プロジェクトの設定 → スクリプトプロパティに 2 項目登録 | 2 min | Step 2 の key |
| 4 | 新規ファイル `WeeklyDigest.gs` を作成しセクション 2 のコード全文を貼付 | 3 min | Step 3 完了 |
| 5 | Sheets で 6 タブを **依存順** に作成 (セクション 3) | 12 min | Step 4 保存済 |
| 6 | Apps Script エディタで `testRunWeeklyDigest` を実行し 3 権限承認 | 3 min | Step 5 完了 |
| 7 | 時計アイコン → トリガー追加 (週タイマー / 月曜 09:00-10:00) | 3 min | Step 6 動作確認 |

**重要**: Step 5 の Sheets タブは順序を守ること。Dashboard / Game_DeepDive は `_Helpers` を参照するので、`_Helpers` が空だと `#REF!` の連鎖で修正しにくくなる。

**タイムゾーン確認**: プロジェクトの設定 → タイムゾーンが `(GMT+09:00) Tokyo` になっていること。ズレていると Weekly_Summary の `weekEndDate` と Gmail 日付が UTC 表記になる。

---

## セクション 2: Apps Script 週次バッチ (完全版コード)

### 2.1 Gemini API Key 取得手順 (3-5 分)

1. https://aistudio.google.com/ にアクセス (Google アカウントでログイン)
2. 左サイドバー **[Get API key]** (または右上ボタン)
3. **[Create API key]** クリック
4. プロジェクト選択 → `Create API key in new project` (既存プロジェクトでも可)
5. 表示された `AIza...` で始まる key をコピー
6. 次項の PropertiesService に貼付

**注意**:
- 具体的な RPM/RPD 数値は [Gemini API 料金ページ](https://ai.google.dev/gemini-api/docs/rate-limits) で最新値を確認 (Free Tier は変動中)。週 1 回 1 リクエストなので通常は問題なし。
- API key は Sheet / GitHub にコミット厳禁。PropertiesService のみで管理。

### 2.2 PropertiesService に登録する 2 項目

Apps Script エディタ → 歯車アイコン [プロジェクトの設定] → 最下部 **[スクリプト プロパティ]** → [スクリプト プロパティを追加]

| プロパティ | 値 |
|---|---|
| `GEMINI_API_KEY` | Step 2.1 で取得した `AIza...` |
| `DIGEST_EMAIL_TO` | `ndwss2023@gmail.com` |

**[スクリプトのプロパティを保存]** を押すのを忘れずに。

### 2.3 WeeklyDigest.gs 全文

既存 doPost プロジェクトに **新規ファイル `WeeklyDigest.gs`** として追加 (既存の `SHEET_ID` / `HEADERS` 定数とは名前空間分離済み、`WD_` prefix)。

```javascript
/**
 * ============================================================================
 *  ポノのあそびば アンケート週次ダイジェスト (Phase 1)
 *  トリガ: 毎週月曜 09:00 JST → runWeeklyDigest()
 * ============================================================================
 */

// ---------- 定数 ----------
const WD_SHEET_ID = '1Gs79PHC8YUXGN2VpaHHH6edHH1BtfiOYvaCHxcbwXXI';
const WD_PROD_TAB = 'production';
const WD_SUMMARY_TAB = 'Weekly_Summary';
const WD_MVP_GAMES = ['quizland', 'maze', 'oto', 'bento', 'puzzle'];

// フォーム側で日本語ラベルを送っている場合の英字正規化テーブル
// (favoriteNet が全 0 になる silent failure を防止)
const WD_GAME_ID_ALIASES = {
  'クイズランド': 'quizland', 'クイズ': 'quizland', 'quiz': 'quizland',
  'めいろ': 'maze', 'メイロ': 'maze', '迷路': 'maze',
  'おと': 'oto', 'オト': 'oto', '音': 'oto',
  'おべんとう': 'bento', 'お弁当': 'bento', '弁当': 'bento',
  'パズル': 'puzzle', 'ぱずる': 'puzzle'
};

// 16 列スキーマ (0-based index)
const WD_COL = {
  timestamp: 0, environment: 1, anonSid: 2, starScore: 3, gameId: 4,
  swVersion: 5, playDurationSec: 6, age: 7, engagement: 8,
  positiveNotes: 9, stumbles: 10, favoriteGames: 11,
  bookConnection: 12, pricePerception: 13, freeText: 14, email: 15
};

// GO/HOLD 閾値 (動かさない)
const WD_THRESHOLDS = {
  K1_STAR_AVG: 4.0, K2_HIGH_RATIO: 0.60, K3_LOW_RATIO: 0.15,
  K4_ENGAGE_AVG: 3.8, N_MIN: 80, STREAK_WEEKS: 4
};

// Gemini
const WD_GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ★ Weekly_Summary は 12 列固定 (Sheets 側と厳密一致必須)
const WD_SUMMARY_HEADERS = [
  'weekEndDate',   // A: 集計対象週の終日 (JST)
  'runAt',         // B: 実行時刻
  'N',             // C: サンプル数
  'starAvg',       // D: 星平均
  'highRatio',     // E: ★4-5 比率
  'lowRatio',      // F: ★1-2 比率
  'engageAvg',     // G: 熱中度平均
  'goHoldStatus',  // H: GO / HOLD / MARGINAL
  'streakCount',   // I: GO 連続週数 (数値)
  'goReady',       // J: 4 週連続達成フラグ ('READY' or '')
  'digestMarkdown',// K: AI 生成 markdown 全文
  'errorLog'       // L: エラー時のみ
];


// ============================================================================
//  メインエントリ
// ============================================================================
function runWeeklyDigest() {
  const startTime = new Date();
  let errorLog = '';

  try {
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const rows = getWeekProductionRows_(fromDate, toDate);
    Logger.log('Fetched %s rows from production', rows.length);

    const stats = computeQuantitativeStats_(rows);
    stats.periodFrom = Utilities.formatDate(fromDate, 'Asia/Tokyo', 'yyyy-MM-dd');
    stats.periodTo   = Utilities.formatDate(toDate,   'Asia/Tokyo', 'yyyy-MM-dd');

    const textBundle = bundleFreeTextForAI_(rows);

    let digestMarkdown = '';
    try {
      const prompt = buildDigestPrompt_(stats, textBundle);
      digestMarkdown = callGemini_(prompt);
    } catch (e) {
      errorLog = 'Gemini 呼び出し失敗: ' + e.message;
      digestMarkdown = '## AI 要約失敗\n\n' + errorLog +
        '\n\n(定量指標のみ以下に記載)\n\n' + formatQuantOnlyMarkdown_(stats);
    }

    const judgement = judgeGoHold_(stats);
    const streakInfo = updateGoHoldStreak_(judgement.status);

    writeToWeeklySummary_({
      stats: stats, judgement: judgement, streakInfo: streakInfo,
      digestMarkdown: digestMarkdown, errorLog: errorLog, runAt: startTime
    });

    sendGmailDigest_({
      stats: stats, judgement: judgement, streakInfo: streakInfo,
      digestMarkdown: digestMarkdown, errorLog: errorLog
    });

    Logger.log('runWeeklyDigest completed in %s ms', new Date() - startTime);

  } catch (e) {
    Logger.log('runWeeklyDigest FATAL: %s\n%s', e.message, e.stack);
    try {
      const to = PropertiesService.getScriptProperties().getProperty('DIGEST_EMAIL_TO');
      if (to) {
        MailApp.sendEmail(to,
          '[ポノのあそびば 週次] FATAL エラー',
          'runWeeklyDigest が例外で停止:\n\n' + e.message + '\n\n' + e.stack
        );
      }
    } catch (_) { /* noop */ }
    throw e;
  }
}


// ============================================================================
//  データ抽出
// ============================================================================
function getWeekProductionRows_(fromDate, toDate) {
  const sheet = SpreadsheetApp.openById(WD_SHEET_ID).getSheetByName(WD_PROD_TAB);
  if (!sheet) throw new Error('production タブが見つかりません');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 16).getValues();

  return values.filter(row => {
    const ts = row[WD_COL.timestamp];
    if (!ts) return false;
    const d = (ts instanceof Date) ? ts : new Date(ts);
    if (isNaN(d.getTime())) return false;
    return d >= fromDate && d <= toDate;
  });
}


// ============================================================================
//  gameId 正規化
// ============================================================================
function normalizeGameId_(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (WD_GAME_ID_ALIASES[s]) return WD_GAME_ID_ALIASES[s];
  const lower = s.toLowerCase();
  if (WD_MVP_GAMES.indexOf(lower) >= 0) return lower;
  return lower; // 未知の gameId はそのまま返し、下流で除外
}


// ============================================================================
//  定量集計
// ============================================================================
function computeQuantitativeStats_(rows) {
  const N = rows.length;
  const stats = {
    N: N, starAvg: 0,
    starDist: {1:0,2:0,3:0,4:0,5:0},
    highRatio: 0, lowRatio: 0, engageAvg: 0,
    engageDist: {1:0,2:0,3:0,4:0,5:0},
    ageDist: {}, gameStats: {}, favoriteNet: {},
    stumbleByGame: {}, priceDist: {}, bookConnectionDist: {},
    playDurationAvg: 0
  };
  if (N === 0) return stats;

  let starSum = 0, engageSum = 0, engageCount = 0;
  let durSum = 0, durCount = 0;

  // MVP 5 ゲームの集計器を初期化
  WD_MVP_GAMES.forEach(g => {
    stats.gameStats[g] = { count: 0, starSum: 0, engageSum: 0, engageCount: 0 };
    stats.favoriteNet[g] = 0;
    stats.stumbleByGame[g] = [];
  });

  rows.forEach(row => {
    // star
    const star = Number(row[WD_COL.starScore]);
    if (Number.isInteger(star) && star >= 1 && star <= 5) {
      starSum += star;
      stats.starDist[star]++;
    }

    // engagement
    const eng = Number(row[WD_COL.engagement]);
    if (Number.isInteger(eng) && eng >= 1 && eng <= 5) {
      engageSum += eng; engageCount++;
      stats.engageDist[eng]++;
    }

    // age
    const age = String(row[WD_COL.age] || '不明').trim() || '不明';
    stats.ageDist[age] = (stats.ageDist[age] || 0) + 1;

    // gameId (プレイした 1 個)
    const gid = normalizeGameId_(row[WD_COL.gameId]);
    if (gid && stats.gameStats[gid]) {
      stats.gameStats[gid].count++;
      if (star >= 1) stats.gameStats[gid].starSum += star;
      if (eng >= 1) {
        stats.gameStats[gid].engageSum += eng;
        stats.gameStats[gid].engageCount++;
      }
    }

    // favoriteGames
    const fav = String(row[WD_COL.favoriteGames] || '');
    if (fav) {
      fav.split(/[,、;|\s]+/).forEach(g => {
        const gnorm = normalizeGameId_(g);
        if (stats.favoriteNet.hasOwnProperty(gnorm)) {
          stats.favoriteNet[gnorm]++;
        }
      });
    }

    // stumbles (ゲーム別に貯める)
    const stumble = String(row[WD_COL.stumbles] || '').trim();
    if (stumble && gid && stats.stumbleByGame[gid]) {
      stats.stumbleByGame[gid].push(stumble);
    }

    // price
    const price = String(row[WD_COL.pricePerception] || '不明').trim() || '不明';
    stats.priceDist[price] = (stats.priceDist[price] || 0) + 1;

    // bookConnection
    const bc = String(row[WD_COL.bookConnection] || '不明').trim() || '不明';
    stats.bookConnectionDist[bc] = (stats.bookConnectionDist[bc] || 0) + 1;

    // playDuration
    const dur = Number(row[WD_COL.playDurationSec]);
    if (dur > 0) { durSum += dur; durCount++; }
  });

  const starN = stats.starDist[1] + stats.starDist[2] + stats.starDist[3] +
                stats.starDist[4] + stats.starDist[5];
  stats.starAvg  = starN > 0 ? starSum / starN : 0;
  stats.highRatio = starN > 0 ? (stats.starDist[4] + stats.starDist[5]) / starN : 0;
  stats.lowRatio  = starN > 0 ? (stats.starDist[1] + stats.starDist[2]) / starN : 0;
  stats.engageAvg = engageCount > 0 ? engageSum / engageCount : 0;
  stats.playDurationAvg = durCount > 0 ? durSum / durCount : 0;

  Object.keys(stats.gameStats).forEach(g => {
    const gs = stats.gameStats[g];
    gs.starAvg   = gs.count > 0 ? gs.starSum / gs.count : 0;
    gs.engageAvg = gs.engageCount > 0 ? gs.engageSum / gs.engageCount : 0;
  });

  return stats;
}


// ============================================================================
//  freeText 束ね (層化サンプリング: freeText 150 / positive 75 / stumble 75)
// ============================================================================
function bundleFreeTextForAI_(rows) {
  const freeItems = [], posItems = [], stumbleItems = [];

  rows.forEach(row => {
    const gid  = normalizeGameId_(row[WD_COL.gameId]) || '?';
    const age  = String(row[WD_COL.age] || '?').trim() || '?';
    const star = row[WD_COL.starScore] || '?';
    const ft   = String(row[WD_COL.freeText] || '').trim();
    const pos  = String(row[WD_COL.positiveNotes] || '').trim();
    const stum = String(row[WD_COL.stumbles] || '').trim();
    if (ft)   freeItems.push(`[${gid} / ${age} / ★${star}] ${ft}`);
    if (pos)  posItems.push(`[${gid} / ${age} / ★${star}] (positive) ${pos}`);
    if (stum) stumbleItems.push(`[${gid} / ${age} / ★${star}] (stumble) ${stum}`);
  });

  const CAPS = { free: 150, pos: 75, stum: 75 };
  const cap = (arr, n) => arr.length > n ? arr.slice(0, n) : arr;
  const items = cap(freeItems, CAPS.free)
    .concat(cap(posItems, CAPS.pos))
    .concat(cap(stumbleItems, CAPS.stum));

  return {
    itemCount: items.length,
    truncated: freeItems.length > CAPS.free || posItems.length > CAPS.pos || stumbleItems.length > CAPS.stum,
    text: items.join('\n')
  };
}


// ============================================================================
//  Gemini プロンプト (11 セクション出力)
// ============================================================================
function buildDigestPrompt_(stats, textBundle) {
  const quantSummary = formatQuantOnlyMarkdown_(stats);
  return `あなたは子供向け Web 知育アプリ「ポノのあそびば」のユーザーリサーチアナリストです。
以下の週次アンケート結果を分析し、 プロダクトチーム向けの週次ダイジェストを **日本語 Markdown** で作成してください。

# 集計対象期間
${stats.periodFrom} 〜 ${stats.periodTo}
サンプル数 N = ${stats.N}

# 定量指標 (既に計算済)
${quantSummary}

# 定性データ (freeText / positiveNotes / stumbles ${textBundle.itemCount} 件${textBundle.truncated ? ' 上限で cap' : ''})
各行フォーマット: [gameId / age / ★] コメント原文

${textBundle.text}

# 出力仕様 (以下の順で必ず記載、 見出し ## は保持)

## 1. 母集団特性
age 分布から読み取れる傾向を 2-3 行。

## 2. 星スコア分布 (K1-K3)
K1 星平均 / K2 ★4-5 比率 / K3 ★1-2 比率 の現状評価。 閾値 K1≥4.0, K2≥60%, K3≤15%。

## 3. 熱中度分布 (K4)
K4 平均。 閾値 ≥ 3.8。

## 4. gameId 別評価
5 ゲーム (quizland/maze/oto/bento/puzzle) それぞれの ★平均 / 熱中度 / サンプル数 / 特徴を 1 行ずつ。

## 5. favoriteGames Net Score
どのゲームがお気に入りとして最も選ばれているか、 上位 3 つ。

## 6. stumbles top ゲーム別
つまずきが多かったゲーム上位 3 つと、 その具体的内容 (原文引用可)。

## 7. pricePerception 分布
価格帯感の分布から読み取れる示唆。

## 8. bookConnection 分布
絵本との接続についての回答分布と示唆。

## 9. 定性要約 (freeText)
### positive top3
上位 3 つのポジティブテーマ + 各テーマの原文引用 1 件。

### 課題 top3
上位 3 つの課題テーマ + 各テーマの原文引用 1 件。

### 印象的な発話 3 件
特筆すべきコメント 3 件を **原文そのまま引用** (改変禁止、 [gameId/age/★] タグ付き)。

## 10. Action Item (優先度順)
プロダクトチームが翌週着手すべき具体的アクションを優先度順に 3-5 個。 各アクションに:
- 優先度 (高/中/低)
- なぜ (根拠となる定量 or 定性データ)
- 具体的な打ち手

## 11. GO/HOLD 判定
現在の指標が閾値 (K1≥4.0, K2≥60%, K3≤15%, K4≥3.8, N≥80) を全て満たしているか、 GO / HOLD / MARGINAL で判定。 満たしていない指標があれば列挙。

# 禁則
- 原文引用は改変禁止 (誤字も含めそのまま)。
- 数字を捏造しない (提示された定量指標のみ使用)。
- 冗長な前置き禁止、 いきなり "## 1." から始めてください。
`;
}


function formatQuantOnlyMarkdown_(stats) {
  const lines = [];
  lines.push(`- K1 星平均: **${stats.starAvg.toFixed(2)}** / 5`);
  lines.push(`- K2 ★4-5 比率: **${(stats.highRatio * 100).toFixed(1)}%**`);
  lines.push(`- K3 ★1-2 比率: **${(stats.lowRatio * 100).toFixed(1)}%**`);
  lines.push(`- K4 熱中度平均: **${stats.engageAvg.toFixed(2)}** / 5`);
  lines.push(`- N: **${stats.N}**`);
  lines.push(`- 平均プレイ時間: ${Math.round(stats.playDurationAvg)} 秒`);
  lines.push('');
  lines.push('星分布: ' + [1,2,3,4,5].map(s => `★${s}=${stats.starDist[s]}`).join(' / '));
  lines.push('熱中度分布: ' + [1,2,3,4,5].map(s => `${s}=${stats.engageDist[s]}`).join(' / '));
  lines.push('age 分布: ' + Object.keys(stats.ageDist).map(a => `${a}=${stats.ageDist[a]}`).join(' / '));
  lines.push('価格分布: ' + Object.keys(stats.priceDist).map(p => `${p}=${stats.priceDist[p]}`).join(' / '));
  lines.push('絵本接続分布: ' + Object.keys(stats.bookConnectionDist).map(b => `${b}=${stats.bookConnectionDist[b]}`).join(' / '));
  lines.push('');
  lines.push('### gameId 別');
  WD_MVP_GAMES.forEach(g => {
    const gs = stats.gameStats[g];
    lines.push(`- ${g}: N=${gs.count}, ★avg=${gs.starAvg.toFixed(2)}, 熱中度avg=${gs.engageAvg.toFixed(2)}`);
  });
  lines.push('');
  lines.push('### favoriteGames Net');
  const favSorted = Object.entries(stats.favoriteNet).sort((a,b) => b[1] - a[1]);
  favSorted.forEach(([g, n]) => lines.push(`- ${g}: ${n} 票`));
  return lines.join('\n');
}


// ============================================================================
//  Gemini API 呼び出し (exponential backoff 3 回)
// ============================================================================
function callGemini_(prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY が PropertiesService に未設定');

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8000,      // 11 セクション日本語出力に十分な余裕
      topP: 0.95,
      thinkingConfig: { thinkingBudget: 0 }  // Gemini 2.5 の thinking mode を切って本文出力を確保
    }
  };
  const options = {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(payload), muteHttpExceptions: true
  };
  const url = WD_GEMINI_ENDPOINT + '?key=' + encodeURIComponent(apiKey);

  let lastCode = 0, lastBody = '';
  for (let i = 0; i < 3; i++) {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    const body = response.getContentText();
    lastCode = code; lastBody = body;

    if (code === 200) {
      const parsed = JSON.parse(body);
      const candidates = parsed.candidates || [];
      if (candidates.length === 0) throw new Error('Gemini candidates 空: ' + body.substring(0, 500));
      const parts = (candidates[0].content && candidates[0].content.parts) || [];
      const text = parts.map(p => p.text || '').join('').trim();
      if (!text) throw new Error('Gemini text 空: ' + body.substring(0, 500));
      return text;
    }
    if (code === 429 || code >= 500) {
      Utilities.sleep(Math.pow(2, i) * 2000); // 2s, 4s, 8s
      continue;
    }
    throw new Error('Gemini HTTP ' + code + ': ' + body.substring(0, 500));
  }
  throw new Error('Gemini リトライ 3 回失敗: HTTP ' + lastCode + ': ' + lastBody.substring(0, 500));
}


// ============================================================================
//  GO/HOLD 判定
// ============================================================================
function judgeGoHold_(stats) {
  const checks = {
    K1: stats.starAvg   >= WD_THRESHOLDS.K1_STAR_AVG,
    K2: stats.highRatio >= WD_THRESHOLDS.K2_HIGH_RATIO,
    K3: stats.lowRatio  <= WD_THRESHOLDS.K3_LOW_RATIO,
    K4: stats.engageAvg >= WD_THRESHOLDS.K4_ENGAGE_AVG,
    N:  stats.N         >= WD_THRESHOLDS.N_MIN
  };
  const allPass = Object.values(checks).every(v => v === true);
  const critFail = !checks.K1 || !checks.N;
  const status = allPass ? 'GO' : (critFail ? 'HOLD' : 'MARGINAL');
  return { status: status, checks: checks };
}


// ============================================================================
//  GO/HOLD 4 週連続カウント
// ============================================================================
function updateGoHoldStreak_(currentStatus) {
  const ss = SpreadsheetApp.openById(WD_SHEET_ID);
  const sheet = getOrCreateSummarySheet_(ss);
  const lastRow = sheet.getLastRow();

  let prevStreak = 0, prevStatus = '';
  if (lastRow >= 2) {
    const prev = sheet.getRange(lastRow, 1, 1, WD_SUMMARY_HEADERS.length).getValues()[0];
    prevStatus = prev[7];              // H: goHoldStatus
    prevStreak = Number(prev[8]) || 0; // I: streakCount
  }

  const streakCount = (currentStatus === 'GO')
    ? (prevStatus === 'GO' ? prevStreak + 1 : 1)
    : 0;
  const goReady = (currentStatus === 'GO' && streakCount >= WD_THRESHOLDS.STREAK_WEEKS);
  return { streakCount: streakCount, goReady: goReady, prevStatus: prevStatus };
}


// ============================================================================
//  Weekly_Summary 書込
// ============================================================================
function writeToWeeklySummary_(bundle) {
  const ss = SpreadsheetApp.openById(WD_SHEET_ID);
  const sheet = getOrCreateSummarySheet_(ss);

  const weekEndDate = bundle.stats.periodTo;   // periodTo と一致させる
  const runAt = Utilities.formatDate(bundle.runAt, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  sheet.appendRow([
    weekEndDate,                                // A weekEndDate
    runAt,                                      // B runAt
    bundle.stats.N,                             // C N
    Number(bundle.stats.starAvg.toFixed(3)),    // D starAvg
    Number(bundle.stats.highRatio.toFixed(4)),  // E highRatio
    Number(bundle.stats.lowRatio.toFixed(4)),   // F lowRatio
    Number(bundle.stats.engageAvg.toFixed(3)),  // G engageAvg
    bundle.judgement.status,                    // H goHoldStatus
    bundle.streakInfo.streakCount,              // I streakCount (数値)
    bundle.streakInfo.goReady ? 'READY' : '',   // J goReady
    bundle.digestMarkdown,                      // K digestMarkdown
    bundle.errorLog || ''                       // L errorLog
  ]);
}

function getOrCreateSummarySheet_(ss) {
  let sheet = ss.getSheetByName(WD_SUMMARY_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(WD_SUMMARY_TAB);
    sheet.getRange(1, 1, 1, WD_SUMMARY_HEADERS.length).setValues([WD_SUMMARY_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, WD_SUMMARY_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}


// ============================================================================
//  Gmail 送信 (HTML)
// ============================================================================
function sendGmailDigest_(bundle) {
  const to = PropertiesService.getScriptProperties().getProperty('DIGEST_EMAIL_TO');
  if (!to) { Logger.log('DIGEST_EMAIL_TO 未設定'); return; }

  const s = bundle.stats;
  const subject = `[ポノのあそびば 週次] ${s.periodFrom}〜${s.periodTo} N=${s.N} ★avg=${s.starAvg.toFixed(2)} ${bundle.judgement.status}`;
  const html = buildHtmlEmail_(bundle);
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html });
}

function buildHtmlEmail_(bundle) {
  const s = bundle.stats, j = bundle.judgement, streak = bundle.streakInfo;
  const BRAND_ORANGE = '#E88F3F', BRAND_GREEN = '#6EA84A', BRAND_BROWN = '#5C3A1E';
  const statusColor = j.status === 'GO' ? BRAND_GREEN
                    : j.status === 'HOLD' ? '#C0392B' : '#E8B03F';

  const kpiRow = (label, value, pass) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${value}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;color:${pass ? BRAND_GREEN : '#C0392B'};font-weight:bold;">${pass ? 'OK' : 'NG'}</td>
    </tr>`;

  const digestHtml = escapeHtml_(bundle.digestMarkdown)
    .replace(/^### (.+)$/gm, '<h3 style="color:' + BRAND_BROWN + ';margin-top:20px;">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="color:' + BRAND_ORANGE + ';border-bottom:2px solid ' + BRAND_ORANGE + ';padding-bottom:4px;margin-top:24px;">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="color:' + BRAND_BROWN + ';">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:720px;margin:0 auto;color:#333;">
  <div style="background:${BRAND_ORANGE};color:white;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">ポノのあそびば 週次ダイジェスト</h1>
    <div style="margin-top:8px;opacity:0.9;">${s.periodFrom} 〜 ${s.periodTo}</div>
  </div>
  <div style="background:${statusColor};color:white;padding:16px 24px;font-size:20px;font-weight:bold;text-align:center;">
    判定: ${j.status} ${streak.goReady ? '(4週連続達成 READY)' : `(連続 ${streak.streakCount} 週)`}
  </div>
  <div style="padding:24px;background:white;">
    <h2 style="color:${BRAND_BROWN};">KPI サマリ</h2>
    <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:6px;overflow:hidden;">
      <thead>
        <tr style="background:${BRAND_BROWN};color:white;">
          <th style="padding:10px 12px;text-align:left;">指標</th>
          <th style="padding:10px 12px;text-align:right;">値</th>
          <th style="padding:10px 12px;text-align:center;">判定</th>
        </tr>
      </thead>
      <tbody>
        ${kpiRow('N (サンプル数)', s.N, j.checks.N)}
        ${kpiRow('K1 星平均', s.starAvg.toFixed(2) + ' / 5', j.checks.K1)}
        ${kpiRow('K2 ★4-5 比率', (s.highRatio * 100).toFixed(1) + '%', j.checks.K2)}
        ${kpiRow('K3 ★1-2 比率', (s.lowRatio * 100).toFixed(1) + '%', j.checks.K3)}
        ${kpiRow('K4 熱中度平均', s.engageAvg.toFixed(2) + ' / 5', j.checks.K4)}
      </tbody>
    </table>
    ${bundle.errorLog ? `<div style="margin-top:16px;padding:12px;background:#ffe6e6;border-left:4px solid #C0392B;color:#C0392B;"><strong>エラー:</strong> ${escapeHtml_(bundle.errorLog)}</div>` : ''}
    <div style="margin-top:32px;">${digestHtml}</div>
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#888;">
      Sheet: <a href="https://docs.google.com/spreadsheets/d/${WD_SHEET_ID}" style="color:${BRAND_ORANGE};">Weekly_Summary タブを開く</a><br>
      Generated by runWeeklyDigest() at ${Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss')} JST
    </div>
  </div>
</div>`;
}

function escapeHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


// ============================================================================
//  手動テスト用エントリ
// ============================================================================
function testRunWeeklyDigest() { runWeeklyDigest(); }
```

### 2.4 トリガ設定手順 (3 分)

1. Apps Script エディタ左サイドバーの時計アイコン **[トリガー]**
2. **[+ トリガーを追加]**
3. 設定:
   - 実行する関数: `runWeeklyDigest`
   - デプロイ: `Head`
   - イベントのソース: `時間主導型`
   - 時間ベースのトリガーのタイプ: **`週タイマー`**
   - 曜日: **`毎週月曜日`**
   - 時刻: **`午前 9 時 〜 10 時`**
4. **保存** → OAuth 承認画面 → Sheets / 外部 fetch / Gmail 送信 の 3 権限を許可

---

## セクション 3: Sheets 6 タブ (数式 + チャート仕様)

### 全体順序 (依存関係)

```
_Helpers  → Dashboard        (30 日 KPI)
          → Game_DeepDive    (5 ゲーム Net Score)
production → Trend_Weekly     (週次 QUERY 直接参照)
Weekly_Summary (ヘッダのみ、Apps Script が append)
Decision_Log (独立、user 手記)
```

複数選択項目 (positiveNotes / stumbles / favoriteGames) の**区切り文字はカンマ `,`** 前提。フォーム側が `|` `;` なら本ドキュメントの SPLIT 第 2 引数を全置換。

---

### 3.1 `_Helpers` タブ (内部展開・非表示予定)

**目的**: 複数選択列を FLATTEN 展開して COUNTIF/AVERAGEIF で単純参照可能に。Dashboard 用の直近 30 日スライスも保持。

#### user 手順
1. 画面下 `+` → 新規シート → 名前を `_Helpers` に変更
2. 下記数式を貼付
3. 動作確認後、タブ右クリック → **シートを非表示**

#### セクション A-D: positiveNotes 展開

A1:D1 ヘッダ:
```
A1: timestamp   B1: environment   C1: gameId   D1: positiveNote
```

A2 (自動展開):
```
=ARRAYFORMULA(
  LET(
    parts, IFERROR(SPLIT(production!J2:J5000 & ",", ","), ""),
    concat, IF(production!A2:A5000="",,
      TEXT(production!A2:A5000,"yyyy-MM-dd HH:mm:ss") & "†" &
      production!B2:B5000 & "†" & production!E2:E5000 & "†" & parts),
    flat, FLATTEN(concat),
    filt, IFERROR(FILTER(flat, REGEXMATCH(flat & "", "†[^†]+$"))),
    IFERROR(SPLIT(filt, "†"))
  )
)
```
※ `TEXT(...,"yyyy-MM-dd HH:mm:ss")` を必ず挟むこと。Date 型のまま `&` で連結すると serial number 化して `44832.54†...` になる。

#### セクション F-I: stumbles 展開

F1:I1 ヘッダ:
```
F1: timestamp   G1: environment   H1: gameId   I1: stumble
```

F2:
```
=ARRAYFORMULA(
  LET(
    parts, IFERROR(SPLIT(production!K2:K5000 & ",", ","), ""),
    concat, IF(production!A2:A5000="",,
      TEXT(production!A2:A5000,"yyyy-MM-dd HH:mm:ss") & "†" &
      production!B2:B5000 & "†" & production!E2:E5000 & "†" & parts),
    flat, FLATTEN(concat),
    filt, IFERROR(FILTER(flat, REGEXMATCH(flat & "", "†[^†]+$"))),
    IFERROR(SPLIT(filt, "†"))
  )
)
```

#### セクション K-N: favoriteGames 展開

K1:N1 ヘッダ:
```
K1: timestamp   L1: environment   M1: gameId   N1: favoriteGame
```

K2:
```
=ARRAYFORMULA(
  LET(
    parts, IFERROR(SPLIT(production!L2:L5000 & ",", ","), ""),
    concat, IF(production!A2:A5000="",,
      TEXT(production!A2:A5000,"yyyy-MM-dd HH:mm:ss") & "†" &
      production!B2:B5000 & "†" & production!E2:E5000 & "†" & parts),
    flat, FLATTEN(concat),
    filt, IFERROR(FILTER(flat, REGEXMATCH(flat & "", "†[^†]+$"))),
    IFERROR(SPLIT(filt, "†"))
  )
)
```

#### セクション P-AE: 直近 30 日 production スライス

P1:AE1 に production ヘッダをコピー:
```
P1: =production!A1:P1
```
※ `ARRAYFORMULA` は不要。単一セル参照で 16 列横展開される (spill).

P2 (直近 30 日 filter):
```
=FILTER(production!A2:P5000, production!A2:A5000>=TODAY()-30, production!A2:A5000<>"")
```

これで `S=starScore, T=gameId, V=playDuration, W=age, X=engagement, AB=bookConnection, AC=pricePerception` の 16 列が 30 日ぶんスライスされる。

#### timestamp が ISO 文字列で入っていた場合の対処

`FILTER` が全部空、または `_Helpers!A2` が `#VALUE!` になる場合、production!A が Date でなく文字列。AG 列に conversion を追加:
```
AG2: =ARRAYFORMULA(IF(production!A2:A5000="",,DATEVALUE(LEFT(production!A2:A5000,10))))
```
そして P2 の FILTER 条件を `AG2:AG5000>=TODAY()-30` に置換。同様に Trend_Weekly の QUERY も AG を参照。

#### FLATTEN 数式 fail 時の切り分け

| A2 の状態 | 想定原因 | 対処 |
|---|---|---|
| `#REF!` | production の行数が 5000 超過 | SPLIT 範囲を `A2:A10000` に拡大 |
| `#VALUE!` | production!A が文字列 timestamp | AG 列に DATEVALUE 変換を追加 (上記) |
| `#N/A` | LET/FLATTEN が利用不能 | ファイル → 設定 → ロケール を `en_US` に一時変更 → 再度 `ja_JP` に戻す |
| 空セル | production の J/K/L 列が全部空 | フォーム送信を確認、doPost の COL 定数と一致するか grep |

---

### 3.2 `Dashboard` タブ (直近 30 日 KPI + chart 4)

**目的**: 直近 30 日の意思決定用ダッシュボード。K1-K4 + N + 補助指標を 1 画面で表示。

#### user 手順
1. 新規タブ → `Dashboard` にリネーム
2. A1:A2 にタイトル
3. B3:C16 に KPI ラベル・値
4. E3:F26 に chart 用データ
5. Insert → Chart で 4 種類挿入
6. C14, B16 に条件付き書式

#### タイトルと Meta

| セル | 内容 |
|---|---|
| A1 | `ポノのあそびば KPI ダッシュボード (直近30日)` |
| A2 | `="更新: " & TEXT(NOW(),"yyyy-MM-dd HH:mm") & " / N(30日)=" & COUNTA(_Helpers!P2:P) & " / N(直近7日)=" & C15` |

#### KPI 12 タイル + streak (B3:C16)

| セル | ラベル (B列) | 値の数式 (C列) |
|---|---|---|
| 3 | `K1: ★平均 (target≥4.0)` | `=IFERROR(AVERAGE(_Helpers!S2:S),0)` |
| 4 | `K2: ★4-5 比率 (target≥60%)` | `=IFERROR(COUNTIFS(_Helpers!S2:S,">=4")/COUNTA(_Helpers!S2:S),0)` |
| 5 | `K3: ★1-2 比率 (target≤15%)` | `=IFERROR((COUNTIF(_Helpers!S2:S,1)+COUNTIF(_Helpers!S2:S,2))/COUNTA(_Helpers!S2:S),0)` |
| 6 | `K4: 熱中度平均 (target≥3.8)` | `=IFERROR(AVERAGE(_Helpers!X2:X),0)` |
| 7 | `K5: N (30日, target≥80)` | `=COUNTA(_Helpers!P2:P)` |
| 8 | `K6: 平均プレイ秒数` | `=IFERROR(AVERAGE(_Helpers!V2:V),0)` |
| 9 | `K7: 最頻年齢` | `=IFERROR(INDEX(QUERY(_Helpers!W2:W,"SELECT Col1 WHERE Col1 IS NOT NULL GROUP BY Col1 ORDER BY COUNT(Col1) DESC LIMIT 1",0),1,1),"")` |
| 10 | `K8: bookConnection top` | `=IFERROR(INDEX(QUERY(_Helpers!AB2:AB,"SELECT Col1 WHERE Col1 IS NOT NULL GROUP BY Col1 ORDER BY COUNT(Col1) DESC LIMIT 1",0),1,1),"")` |
| 11 | `K9: 価格印象 top` | `=IFERROR(INDEX(QUERY(_Helpers!AC2:AC,"SELECT Col1 WHERE Col1 IS NOT NULL GROUP BY Col1 ORDER BY COUNT(Col1) DESC LIMIT 1",0),1,1),"")` |
| 12 | `K10: 好きなゲーム top` | `=IFERROR(INDEX(QUERY(_Helpers!N2:N,"SELECT Col1 WHERE Col1 IS NOT NULL GROUP BY Col1 ORDER BY COUNT(Col1) DESC LIMIT 1",0),1,1),"")` |
| 13 | `K11: つまずき top` | `=IFERROR(INDEX(QUERY(_Helpers!I2:I,"SELECT Col1 WHERE Col1 IS NOT NULL GROUP BY Col1 ORDER BY COUNT(Col1) DESC LIMIT 1",0),1,1),"")` |
| 14 | `K12: GO/HOLD (30日スナップショット)` | `=IF(AND(C3>=4.0,C4>=0.6,C5<=0.15,C6>=3.8,C7>=80),"GO","HOLD")` |
| 15 | `N (直近7日, Weekly_Summary 参照)` | `=IFERROR(INDEX(Weekly_Summary!C:C,COUNTA(Weekly_Summary!C:C)),0)` |
| 16 | `4週連続判定 (Weekly_Summary streak)` | `=IF(AND(IFERROR(INDEX(Weekly_Summary!H:H,COUNTA(Weekly_Summary!H:H)),"")="GO", IFERROR(INDEX(Weekly_Summary!I:I,COUNTA(Weekly_Summary!I:I)),0)>=4),"GO","HOLD")` |

**書式**: C3/C6 は小数 2 桁、C4/C5 はパーセント、C7/C8/C15 は整数。

**重要**: C7 (30 日 N) と C15 (直近 7 日 N) は **別集計期間** の N。Decision_Log で N を引用するときは必ず「30日 N」「7日 N」を明示する。

#### Chart 用データテーブル

★ヒスト (E3:F7):
```
E3: 1★    F3: =COUNTIF(_Helpers!S2:S,1)
E4: 2★    F4: =COUNTIF(_Helpers!S2:S,2)
E5: 3★    F5: =COUNTIF(_Helpers!S2:S,3)
E6: 4★    F6: =COUNTIF(_Helpers!S2:S,4)
E7: 5★    F7: =COUNTIF(_Helpers!S2:S,5)
```

favoriteGames TOP10 (E10):
```
=QUERY(_Helpers!N2:N,"SELECT Col1, COUNT(Col1) WHERE Col1 IS NOT NULL GROUP BY Col1 ORDER BY COUNT(Col1) DESC LIMIT 10 LABEL Col1 'ゲーム', COUNT(Col1) '件数'",0)
```

gameId × ★平均 (E17:F22、Draft B の散布図の代替):
```
E17: quizland    F17: =IFERROR(AVERAGEIF(_Helpers!T2:T,E17,_Helpers!S2:S),0)
E18: maze        F18: =IFERROR(AVERAGEIF(_Helpers!T2:T,E18,_Helpers!S2:S),0)
E19: oto         F19: =IFERROR(AVERAGEIF(_Helpers!T2:T,E19,_Helpers!S2:S),0)
E20: bento       F20: =IFERROR(AVERAGEIF(_Helpers!T2:T,E20,_Helpers!S2:S),0)
E21: puzzle      F21: =IFERROR(AVERAGEIF(_Helpers!T2:T,E21,_Helpers!S2:S),0)
```

pricePerception 分布 (E24):
```
=QUERY(_Helpers!AC2:AC,"SELECT Col1, COUNT(Col1) WHERE Col1 IS NOT NULL GROUP BY Col1 LABEL Col1 '価格印象', COUNT(Col1) '件数'",0)
```

#### チャート仕様

| No | 挿入位置 | データ範囲 | Chart Type | Title | 備考 |
|---|---|---|---|---|---|
| C1 | H3 付近 | `E3:F7` | Column | `★スコア分布` | X=E, Y=F |
| C2 | H20 付近 | `E10:F19` | Bar | `好きなゲーム TOP10` | 横棒、count 降順 |
| C3 | O3 付近 | `E17:F21` | Column | `gameId × ★平均` | Y 軸 min=0/max=5、target line 4.0 を Gridline で追加 |
| C4 | O20 付近 | `E24:F32` | Pie | `価格印象 分布` | ラベル="価格印象" |

#### 条件付き書式 (C14, C16)
- 対象範囲: `C14:C14, C16:C16`
- Rule 1: 完全一致 `GO` → 背景 `#B7E1CD` (緑) / 文字 `#0B7A3B` 太字
- Rule 2: 完全一致 `HOLD` → 背景 `#FCE8B2` (黄) / 文字 `#8B5A00` 太字

---

### 3.3 `Game_DeepDive` タブ (5 ゲーム × Net Score)

**目的**: MVP 5 ゲームの相対評価。favorite - stumble を Net Score として並べ替え。

#### user 手順
1. 新規タブ → `Game_DeepDive`
2. A1:F1 ヘッダ、A2:A6 に 5 ゲーム名
3. B2:F2 に数式、A6 までドラッグコピー

#### ヘッダ + データ

```
A1: gameId    B1: favorite_N    C1: stumble_N    D1: 平均★    E1: 平均play秒    F1: Net Score
A2: quizland
A3: maze
A4: oto
A5: bento
A6: puzzle
```

| 列 | 数式 (B2 以下同型) |
|---|---|
| B2 | `=COUNTIF(_Helpers!N:N, A2)` |
| C2 | `=COUNTIF(_Helpers!I:I, A2)` |
| D2 | `=IFERROR(AVERAGEIF(_Helpers!T2:T, A2, _Helpers!S2:S), 0)` |
| E2 | `=IFERROR(AVERAGEIF(_Helpers!T2:T, A2, _Helpers!V2:V), 0)` |
| F2 | `=B2-C2` |

B2:F2 を A6 までドラッグ。F 列にカラースケール条件付き書式 (min 赤 / mid 白 / max 緑)。

#### 整合チェック
- `SUM(B2:B6)` が `COUNTA(_Helpers!N2:N)` と一致 → OK
- 差分あり → **5 ゲーム以外の gameId (未定義) が混入**。原因はフォーム側の gameId 表記ゆれ。Apps Script の `WD_GAME_ID_ALIASES` に追加、または Sheets 側 A 列に未知 gameId を追加。

#### チャート仕様 (オプション)
A2:A6 と F2:F6 を選び **Column chart** 挿入、Title `Net Score (favorite - stumble)`。

---

### 3.4 `Trend_Weekly` タブ (週次 3 指標)

**目的**: 週次で ★平均 / 熱中度 / N の推移。GO 到達までのトラッキング。

#### user 手順
1. 新規タブ → `Trend_Weekly`
2. A1 に下記 QUERY
3. Insert → Chart で Combo

#### 数式 (A1)

```
=QUERY(production!A2:P5000,
  "SELECT YEAR(A)*100+WEEK(A,2), AVG(D), AVG(I), COUNT(A) 
   WHERE A IS NOT NULL 
   GROUP BY YEAR(A)*100+WEEK(A,2) 
   ORDER BY YEAR(A)*100+WEEK(A,2) 
   LABEL YEAR(A)*100+WEEK(A,2) 'week_id', AVG(D) '平均★', AVG(I) '平均熱中度', COUNT(A) 'N'",
  1)
```

`WEEK(A,2)` の第 2 引数 `2` で **月曜始まり** を明示 (バッチ実行日と週境界を一致させる)。

**timestamp が文字列**: production!A ではなく `_Helpers!AG` を SOURCE に置換 (Section 3.1 末尾参照)。

#### チャート仕様

- 範囲: `A1:D` (全展開)
- Chart Type: **Combo chart**
- Title: `週次トレンド (★平均 / 熱中度 / N)`
- Series:
  - `平均★`: 折れ線、左軸、範囲 0-5
  - `平均熱中度`: 折れ線、左軸、範囲 0-5
  - `N`: 棒、**右軸**、色薄グレー
- Gridline: 左軸 4.0 と 3.8 に target line

---

### 3.5 `Weekly_Summary` タブ (Apps Script が書込 — **12 列**)

**目的**: 毎週月曜 09:00 JST の Apps Script バッチが 1 行 append。Dashboard の streak/verdict の source of truth。

#### user 手順
1. 新規タブ → `Weekly_Summary`
2. A1:L1 に **12 列** ヘッダを入力 (Apps Script の `WD_SUMMARY_HEADERS` と厳密一致)
3. H 列 (goHoldStatus) に条件付き書式

#### ヘッダ (A1:L1) — 12 列固定

| 列 | ヘッダ | 型 | 説明 |
|---|---|---|---|
| A | `weekEndDate` | date str | 集計終日 (yyyy-MM-dd) |
| B | `runAt` | datetime str | バッチ実行時刻 |
| C | `N` | int | 直近 7 日 N |
| D | `starAvg` | float | ★平均 |
| E | `highRatio` | 0-1 | ★4-5 比率 |
| F | `lowRatio` | 0-1 | ★1-2 比率 |
| G | `engageAvg` | float | 熱中度平均 |
| H | `goHoldStatus` | GO/HOLD/MARGINAL | 週次判定 |
| I | `streakCount` | int | GO 連続週数 |
| J | `goReady` | 'READY'/'' | 4 週連続達成フラグ |
| K | `digestMarkdown` | text | Gemini 生成本文 |
| L | `errorLog` | text | エラー時のみ |

**⚠️ 注意**: このヘッダは Apps Script が `getOrCreateSummarySheet_` で自動作成もするが、user が先に手動作成する場合は **必ず 12 列** で作ること。10 列で作ると Apps Script が書き足す形になるが、`writeToWeeklySummary_` は `appendRow([12 個])` するので列位置が合う。

#### 条件付き書式

- 対象範囲: `H2:H1000`
- Rule 1: 完全一致 `GO` → 背景 `#B7E1CD` (緑)
- Rule 2: 完全一致 `HOLD` → 背景 `#FCE8B2` (黄)
- Rule 3: 完全一致 `MARGINAL` → 背景 `#FDECC8` (薄橙)

- 対象範囲: `J2:J1000`
- Rule 1: 完全一致 `READY` → 背景 `#6EA84A` (深緑) / 文字白太字

---

### 3.6 `Decision_Log` タブ (user 手記)

**目的**: 週次サマリを見て user が下した意思決定を残す。3-6 ヶ月後に再現可能に。

#### user 手順
1. 新規タブ → `Decision_Log`
2. A1:E1 ヘッダ
3. サンプル 3 行を投入

#### ヘッダ (A1:E1)
```
A1: date    B1: decision    C1: rationale    D1: KPI_snapshot    E1: next_action
```

#### サンプル 3 行

| 行 | A (date) | B (decision) | C (rationale) | D (KPI_snapshot) | E (next_action) |
|---|---|---|---|---|---|
| 2 | 2026-07-06 | MVP tier ロック維持 | N=45 で信頼区間広すぎ、判断保留 | 7日N=45 / K1=3.9 / K2=55% / K4=3.7 | N=80 到達まで運用継続、告知強化なし |
| 3 | 2026-07-20 | quizland tutorial 追加 | stumbles top で quizland (12件)、★平均 3.4 で他 4 ゲームより低い | 7日N=62 / K1=4.0 / K2=61% / K4=3.9 / quizland★=3.4 | sw v1400 で quizland チュートリアル reseq、次週再測定 |
| 4 | 2026-08-03 | GO 判定 → Early Access launch 準備 | K1-K4 全達成 + N=85 で streak=4 | 7日N=85 / K1=4.2 / K2=68% / K3=8% / K4=4.1 / streak=4 | master merge + KDP listing 有料化 + 買い切り¥980 で告知 |

**書式**: A 列 `yyyy-MM-dd`、B 列太字、E 列薄い黄色背景。

---

## セクション 4: 動作確認手順

### 4.1 Apps Script トリガを「今すぐ実行」で発火

1. Apps Script エディタで関数選択 dropdown から `testRunWeeklyDigest` を選ぶ
2. **▶ 実行** ボタンを押す
3. 初回は OAuth ダイアログ (3 権限):
   - Google Sheets アクセス
   - 外部 URL fetch (Gemini)
   - Gmail 送信
4. 「詳細」→「安全でないページに移動 (プロジェクト名)」を承認
5. 実行ログ (`表示 → ログ`) に `runWeeklyDigest completed in XXXX ms` が出れば成功

### 4.2 期待結果

| 場所 | 期待内容 |
|---|---|
| Weekly_Summary タブ | 2 行目に 1 行 append (12 列全て埋まる、K 列は Markdown 全文) |
| Dashboard!C15 | 直近 7 日 N が表示される |
| Dashboard!C16 | 現時点は "HOLD" (Phase 1 序盤なので N<80) |
| Gmail 受信箱 (`ndwss2023@gmail.com`) | `[ポノのあそびば 週次] YYYY-MM-DD〜YYYY-MM-DD N=X ★avg=X.XX HOLD` の HTML メール 1 通 |
| Apps Script 実行ログ | `Fetched X rows from production` + 完了メッセージ |

### 4.3 トラブル時の対処表

| 症状 | 原因 | 対処 |
|---|---|---|
| 実行ログに `GEMINI_API_KEY が PropertiesService に未設定` | Step 2.2 の登録漏れ | プロジェクトの設定 → スクリプトプロパティで `GEMINI_API_KEY` を確認・追加 |
| Gemini HTTP 400 `API key not valid` | key の typo | aistudio.google.com で key を再確認、`AIza` から始まっているか |
| Gemini HTTP 429 | Free Tier RPM 超過 | 自動 backoff 3 回で通常回復。3 回失敗時は Weekly_Summary L 列に errorLog、K 列に定量のみ Markdown。翌週まで放置で復旧 |
| Gemini HTTP 500/503 | 一時障害 | 自動 backoff で回復、または `testRunWeeklyDigest` を手動再実行 |
| Gemini 応答が空 (`Gemini text 空`) | thinking mode で本文出力枯渇 | `thinkingConfig: { thinkingBudget: 0 }` が入っているか確認 (2.3 のコードに含む) |
| MailApp `Service invoked too many times` | 100 通/日 quota 超過 (@gmail.com) | 手動再実行を控える、翌 24 時間待機 |
| production タブが見つかりません | タブ名変更 or SS ID 誤り | `WD_PROD_TAB` / `WD_SHEET_ID` を確認 |
| Fetched 0 rows | timestamp 列が空 or 型不一致 | production!A2 の型を確認、Date でなく文字列なら Section 3.1 末尾の AG 列 conversion を追加 |
| Dashboard 全 KPI が 0 | `_Helpers!P2` の FILTER が空 (timestamp 型不一致) | Section 3.1 末尾の対処を実施 |
| favoriteNet が全ゲーム 0 | フォームが日本語 gameId 送信 | `WD_GAME_ID_ALIASES` に該当ラベルを追加、または Draft C チェックリスト §4 参照 |
| Weekly_Summary の H 列が予期しない文字列 | 手動作成時にヘッダ順が違う | H=goHoldStatus, I=streakCount であることを再確認、必要ならタブ削除 → Apps Script が再作成 |
| streak が永遠に 0 のまま | prev の H 列を読めていない | 上記 H 列順を確認、テスト時の重複行を手動削除 |
| Dashboard!C16 が空セル参照エラー | Weekly_Summary が空 | Apps Script を 1 回手動実行して 1 行入れる |

### 4.4 完了チェックリスト

- [ ] `WeeklyDigest.gs` 貼付・保存
- [ ] `GEMINI_API_KEY` 登録
- [ ] `DIGEST_EMAIL_TO` = `ndwss2023@gmail.com` 登録
- [ ] 6 タブ作成 (`_Helpers`, `Dashboard`, `Game_DeepDive`, `Trend_Weekly`, `Weekly_Summary`, `Decision_Log`)
- [ ] `_Helpers` の A2 / F2 / K2 / P2 全て展開されている
- [ ] `Dashboard` の C3-C7 が数値で埋まっている
- [ ] `Game_DeepDive` の B2:F6 が全て 0 以上の数値
- [ ] `Trend_Weekly` の A1 に week_id 列が出ている
- [ ] `Weekly_Summary` A1:L1 に 12 列ヘッダ
- [ ] `Decision_Log` A1:E1 + サンプル 3 行
- [ ] `testRunWeeklyDigest` 手動実行 → Weekly_Summary 2 行目 append
- [ ] Gmail に HTML ダイジェスト到着
- [ ] トリガ登録 (毎週月曜 09:00-10:00 JST)
- [ ] `_Helpers` タブを非表示に設定