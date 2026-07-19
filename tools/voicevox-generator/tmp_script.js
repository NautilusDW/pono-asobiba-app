
// ============================================================
// データ：発注書記載の27ファイル分のテキスト
// ============================================================
const HARDCODED_FILES = [
  // Q01 (order_color)
  ["q001_q", "まんなかは なにいろ？"],
  ["q001_a", "あか"],
  ["q001_b", "あお"],
  ["q001_c", "きいろ"],
  ["q001_d", "みどり"],
  // Q24 (count_total)
  ["q024_q", "りんごは いくつ？"],
  ["q024_a", "ふたつ"],
  ["q024_b", "みっつ"],
  ["q024_c", "よっつ"],
  ["q024_d", "いつつ"],
  // Q95 (opposite)
  ["q095_q", "おおきい の はんたいは？"],
  ["q095_a", "あかい"],
  ["q095_b", "まるい"],
  ["q095_c", "ちいさい"],
  ["q095_d", "やさしい"],
  // Q160 (body)
  ["q160_q", "いきを すうのは からだの どこ？"],
  ["q160_a", "はい"],
  ["q160_b", "い"],
  ["q160_c", "こころ"],
  ["q160_d", "ゆび"],
  ["q160_a_alt", "ぞうきの はい"],
  ["q160_b_alt", "いぶくろの い"],
  // Q170 (number_sequence)
  ["q170_q", "にの つぎは？"],
  ["q170_a", "に"],
  ["q170_b", "さん"],
  ["q170_c", "よん"],
  ["q170_d", "ご"],
];

// 動的に置き換え可能な FILES (機能 C)
let FILES = HARDCODED_FILES.slice();

// ============================================================
// 共通ユーティリティ
// ============================================================
const $ = (id) => document.getElementById(id);
let endpoint = "http://localhost:50021";
let lastZipBlob = null;
let lastSpeakerId = null;

function getParams() {
  return {
    speedScale: parseFloat($("param-speed").value),
    pitchScale: parseFloat($("param-pitch").value),
    intonationScale: parseFloat($("param-intonation").value),
    volumeScale: parseFloat($("param-volume").value),
    prePhonemeLength: parseFloat($("param-pre").value),
    postPhonemeLength: parseFloat($("param-post").value),
    outputSamplingRate: parseInt($("param-rate").value, 10),
    outputStereo: false,
  };
}

async function synthesize(text, speakerId) {
  // 1) audio_query
  const queryRes = await fetch(
    `${endpoint}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
    { method: "POST" }
  );
  if (!queryRes.ok) throw new Error(`audio_query failed: ${queryRes.status}`);
  const query = await queryRes.json();

  // 2) パラメータ上書き
  const params = getParams();
  Object.assign(query, params);

  // 3) synthesis
  const synRes = await fetch(
    `${endpoint}/synthesis?speaker=${speakerId}&enable_interrogative_upspeak=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    }
  );
  if (!synRes.ok) throw new Error(`synthesis failed: ${synRes.status}`);
  return await synRes.blob();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============================================================
// セクション 1: 接続確認
// ============================================================
$("btn-check").addEventListener("click", async () => {
  endpoint = $("endpoint").value.replace(/\/$/, "");
  const st = $("conn-status");
  st.className = "status";
  st.textContent = "接続中…";
  try {
    const res = await fetch(`${endpoint}/version`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const version = await res.text();
    st.className = "status ok";
    st.textContent = `接続OK / VOICEVOX エンジン version: ${version}`;
    $("btn-sample").disabled = false;
    $("btn-generate-all").disabled = false;
    // 機能 A: 辞書管理
    $("btn-dict-load").disabled = false;
    $("btn-dict-list").disabled = false;
    $("btn-dict-clear").disabled = false;
    // 機能 B: AccentPhrase 編集
    $("btn-accent-query").disabled = false;
  } catch (err) {
    st.className = "status err";
    st.textContent = `接続NG: ${err.message} ／ VOICEVOX アプリ起動・ポート 50021 を確認してください`;
  }
});

// ============================================================
// セクション 2: サンプル生成
// ============================================================
const sampleBlobs = { hau: null, metan: null };

$("btn-sample").addEventListener("click", async () => {
  const btn = $("btn-sample");
  const st = $("sample-status");
  btn.disabled = true;
  st.className = "status";
  st.textContent = "生成中…";
  try {
    const text = FILES[0][1]; // q001_q

    // 雨晴はう (10)
    sampleBlobs.hau = await synthesize(text, 10);
    $("audio-hau").src = URL.createObjectURL(sampleBlobs.hau);

    // 四国めたん (2)
    sampleBlobs.metan = await synthesize(text, 2);
    $("audio-metan").src = URL.createObjectURL(sampleBlobs.metan);

    $("sample-cards").style.display = "grid";
    st.className = "status ok";
    st.textContent = "生成完了。両方聴き比べてください。";
  } catch (err) {
    st.className = "status err";
    st.textContent = `エラー: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

$("dl-hau").addEventListener("click", () => {
  if (sampleBlobs.hau) downloadBlob(sampleBlobs.hau, "q001_q__hau.wav");
});
$("dl-metan").addEventListener("click", () => {
  if (sampleBlobs.metan) downloadBlob(sampleBlobs.metan, "q001_q__metan.wav");
});

// ============================================================
// セクション 3: 全27ファイル生成 → zip
// ============================================================
const SPEAKER_NAMES = {
  10: "雨晴はう ノーマル",
  2:  "四国めたん ノーマル",
  14: "冥鳴ひまり ノーマル",
  16: "九州そら ノーマル",
  8:  "春日部つむぎ ノーマル",
  23: "WhiteCUL ふつう",
  20: "もち子さん ノーマル",
};

function buildReadme(speakerId, params) {
  return [
    "# Quizland VOICEVOX テスト発注 (27ファイル) 納品 README",
    "",
    `生成日時: ${new Date().toISOString()}`,
    `使用エンジン: VOICEVOX (${endpoint})`,
    `使用話者: ${SPEAKER_NAMES[speakerId] || `speaker=${speakerId}`} (speaker ID: ${speakerId})`,
    "",
    "## 合成パラメータ",
    `- speedScale (話速): ${params.speedScale}`,
    `- pitchScale (音高): ${params.pitchScale}`,
    `- intonationScale (抑揚): ${params.intonationScale}`,
    `- volumeScale (音量): ${params.volumeScale}`,
    `- prePhonemeLength (前無音 秒): ${params.prePhonemeLength}`,
    `- postPhonemeLength (後無音 秒): ${params.postPhonemeLength}`,
    `- outputSamplingRate: ${params.outputSamplingRate} Hz`,
    `- enable_interrogative_upspeak: true (「？」末尾の自然な上昇イントネーション)`,
    "",
    "## 出力仕様",
    "- wav / 48 kHz / 16 bit / モノラル",
    "- 命名規則: q{NNN}_{q|a|b|c|d}.wav (Q160 補足版は q160_a_alt.wav / q160_b_alt.wav)",
    "",
    "## ファイル一覧（読み上げテキスト）",
    ...FILES.map(([name, text]) => `- ${name}.wav : ${text}`),
    "",
    "## 検収観点（発注書 §検収基準 抜粋）",
    "1. 「ふたつ/みっつ/よっつ/いつつ/じゅっこ」の促音崩れ無し？",
    "2. 「ぞうきの はい」「いぶくろの い」が自然？",
    "3. 抑揚・速度が子供向けに適切？",
    "4. 音量差が大きすぎない？",
    "5. 前後の無音が長すぎない（理想 100〜200ms）？",
    "6. Q95 で「カギカッコ おおきい カッコトジ」のような余計な読み上げが出ていない？",
    "7. Q24「2つ→ふたつ」 vs Q170「2→に」 の読み分けOK？",
    "",
  ].join("\n");
}

$("btn-generate-all").addEventListener("click", async () => {
  const speakerId = parseInt($("final-speaker").value, 10);
  lastSpeakerId = speakerId;
  const btn = $("btn-generate-all");
  const st = $("full-status");
  const list = $("progress-list");
  btn.disabled = true;
  st.className = "status";
  const llmTag = $("llm-enable").checked ? " [LLM 補正 ON]" : "";
  st.textContent = `${SPEAKER_NAMES[speakerId]} で ${FILES.length} ファイル生成中…${llmTag}`;
  list.style.display = "block";
  list.innerHTML = FILES.map(([name]) => `<div id="row-${name}" class="pending">${name}.wav</div>`).join("");

  const zip = new JSZip();
  let failed = 0;
  const params = getParams();

  for (const [name, text] of FILES) {
    const row = $(`row-${name}`);
    try {
      const blob = await synthesizeWithOptionalLLM(text, speakerId);
      zip.file(`${name}.wav`, blob);
      row.className = "ok";
      row.textContent = `${name}.wav  「${text}」`;
    } catch (err) {
      row.className = "err";
      row.textContent = `${name}.wav  FAILED: ${err.message}`;
      failed++;
    }
  }

  // README.txt 同梱
  zip.file("README.txt", buildReadme(speakerId, params));

  st.className = failed === 0 ? "status ok" : "status err";
  st.textContent = failed === 0
    ? `全 ${FILES.length} ファイル生成完了。zip をダウンロードしてください。`
    : `生成完了（${failed} 件失敗 / 全 ${FILES.length}）。zip 内容を確認してください。`;

  $("zip-status").textContent = "zip 作成中…";
  lastZipBlob = await zip.generateAsync({ type: "blob" });
  $("zip-status").textContent = `zip 準備完了（${(lastZipBlob.size / 1024).toFixed(1)} KB）`;
  $("btn-download-zip").disabled = false;
  btn.disabled = false;
});

$("btn-download-zip").addEventListener("click", () => {
  if (!lastZipBlob) return;
  const speakerKey = (SPEAKER_NAMES[lastSpeakerId] || `speaker${lastSpeakerId}`)
    .replace(/\s+/g, "_");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  downloadBlob(lastZipBlob, `quizland_voicevox_test_${speakerKey}_${stamp}.zip`);
});

// ============================================================
// 機能 A: ユーザー辞書管理
// ============================================================
let dictRows = []; // [{surface,pronunciation,accent_type,priority,note,state}]

function parseCsv(text) {
  // 軽量 CSV パーサ (引用符含むセルなし前提、辞書 CSV はシンプル)
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map(s => s.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(s => s.trim());
    const r = {};
    header.forEach((h, idx) => { r[h] = cols[idx] !== undefined ? cols[idx] : ""; });
    rows.push(r);
  }
  return rows;
}

function renderDictTable() {
  const tbody = $("dict-tbody");
  tbody.innerHTML = dictRows.map((r, i) => {
    const stateClass = r.state === "ok" ? "state-ok" : r.state === "err" ? "state-err" : "state-none";
    const stateText = r.state === "ok" ? "✓ 登録済" : r.state === "err" ? `✗ ${r.error || "エラー"}` : "未登録";
    return `<tr>
      <td class="num">${i + 1}</td>
      <td>${r.surface || ""}</td>
      <td>${r.pronunciation || ""}</td>
      <td>${r.accent_type || "0"}</td>
      <td>${r.priority || "5"}</td>
      <td>${r.note || ""}</td>
      <td class="${stateClass}">${stateText}</td>
    </tr>`;
  }).join("");
}

$("btn-dict-load").addEventListener("click", async () => {
  const st = $("dict-status");
  st.className = "status";
  st.textContent = "CSV 読み込み中…";
  try {
    const res = await fetch("./voicevox_user_dict.csv");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parsed = parseCsv(text);
    dictRows = parsed.map(r => ({
      surface: r.surface,
      pronunciation: r.pronunciation,
      accent_type: r.accent_type,
      priority: r.priority,
      note: r.note,
      state: "none",
    }));
    $("dict-wrap").style.display = "block";
    renderDictTable();
    st.className = "status ok";
    st.textContent = `${dictRows.length} 語を読み込みました`;
    $("btn-dict-register").disabled = false;
  } catch (err) {
    st.className = "status err";
    st.textContent = `読み込み失敗: ${err.message} ／ file:// で開いている場合はローカル HTTP サーバ経由で開いてください`;
  }
});

async function fetchUserDict() {
  const res = await fetch(`${endpoint}/user_dict`);
  if (!res.ok) throw new Error(`GET /user_dict failed: ${res.status}`);
  return await res.json();
}

$("btn-dict-list").addEventListener("click", async () => {
  const st = $("dict-status");
  const out = $("dict-current");
  st.className = "status";
  st.textContent = "現在の登録語を取得中…";
  try {
    const dict = await fetchUserDict();
    const entries = Object.entries(dict);
    out.textContent = JSON.stringify(dict, null, 2);
    st.className = "status ok";
    st.textContent = `現在 VOICEVOX に ${entries.length} 語登録されています`;
  } catch (err) {
    st.className = "status err";
    st.textContent = `取得失敗: ${err.message}`;
  }
});

$("btn-dict-register").addEventListener("click", async () => {
  if (dictRows.length === 0) return;
  const st = $("dict-status");
  st.className = "status";
  st.textContent = "既存登録語チェック中…";
  let existing = {};
  try {
    existing = await fetchUserDict();
  } catch (err) {
    st.className = "status err";
    st.textContent = `既存辞書取得失敗: ${err.message}`;
    return;
  }
  const existingSurfaces = new Set(Object.values(existing).map(v => v.surface));
  let okCount = 0;
  let skipCount = 0;
  let errCount = 0;
  for (let i = 0; i < dictRows.length; i++) {
    const r = dictRows[i];
    if (existingSurfaces.has(r.surface)) {
      r.state = "ok";
      r.error = "既存";
      skipCount++;
      continue;
    }
    try {
      const params = new URLSearchParams({
        surface: r.surface,
        pronunciation: r.pronunciation,
        accent_type: String(r.accent_type || 0),
        priority: String(r.priority || 5),
      });
      const res = await fetch(`${endpoint}/user_dict_word?${params.toString()}`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      r.state = "ok";
      okCount++;
    } catch (err) {
      r.state = "err";
      r.error = err.message;
      errCount++;
    }
    renderDictTable();
    st.textContent = `登録中… ${i + 1}/${dictRows.length}（新規 ${okCount} / 既存 ${skipCount} / 失敗 ${errCount}）`;
  }
  renderDictTable();
  st.className = errCount === 0 ? "status ok" : "status err";
  st.textContent = `完了: 新規登録 ${okCount} / 既存スキップ ${skipCount} / 失敗 ${errCount}（合計 ${dictRows.length}）`;
});

$("btn-dict-clear").addEventListener("click", async () => {
  if (!confirm("VOICEVOX エンジンに登録された全ユーザー辞書を削除します。よろしいですか？\n（CSV 側のデータは残ります）")) return;
  const st = $("dict-status");
  st.className = "status";
  st.textContent = "クリア中…";
  try {
    const dict = await fetchUserDict();
    const uuids = Object.keys(dict);
    let okCount = 0, errCount = 0;
    for (const uuid of uuids) {
      try {
        const res = await fetch(`${endpoint}/user_dict_word/${uuid}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        okCount++;
      } catch (e) { errCount++; }
    }
    // CSV 側の状態リセット
    dictRows.forEach(r => { r.state = "none"; delete r.error; });
    renderDictTable();
    st.className = errCount === 0 ? "status ok" : "status err";
    st.textContent = `削除 ${okCount} / 失敗 ${errCount}（合計 ${uuids.length}）`;
  } catch (err) {
    st.className = "status err";
    st.textContent = `失敗: ${err.message}`;
  }
});

// ============================================================
// 機能 B: AccentPhrase 詳細編集
// ============================================================
let currentAccentQuery = null;

function renderAccentPhrases(query) {
  const wrap = $("accent-phrases");
  if (!query || !query.accent_phrases) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = query.accent_phrases.map((ap, apIdx) => {
    const accent = ap.accent; // 1-indexed
    const moras = ap.moras.map((m, mIdx) => {
      const isAccent = (mIdx + 1) === accent;
      return `<div class="mora-cell ${isAccent ? "is-accent" : ""}" data-ap="${apIdx}" data-mora="${mIdx}">
        ${m.text}<span class="vowel">${m.vowel || ""}</span>
      </div>`;
    }).join("");
    return `<div class="accent-block">
      <h4>AccentPhrase #${apIdx + 1} （現在 accent=${accent} / mora数=${ap.moras.length}）</h4>
      <div class="mora-row">${moras}</div>
      <div class="accent-controls">
        <span style="font-size:11px; color:var(--sub);">accent 核位置:</span>
        <button class="secondary" data-acc-down="${apIdx}">−</button>
        <span id="acc-val-${apIdx}" style="font-family:ui-monospace,monospace;">${accent}</span>
        <button class="secondary" data-acc-up="${apIdx}">+</button>
        <span style="font-size:11px; color:var(--sub);">（0 = 平板 / 1 = 頭高 / N = mora N に核）</span>
      </div>
    </div>`;
  }).join("");
  // クリック: mora セル → そのモーラを accent 核に
  wrap.querySelectorAll(".mora-cell").forEach(el => {
    el.addEventListener("click", () => {
      const apIdx = parseInt(el.dataset.ap, 10);
      const mIdx = parseInt(el.dataset.mora, 10);
      currentAccentQuery.accent_phrases[apIdx].accent = mIdx + 1;
      renderAccentPhrases(currentAccentQuery);
    });
  });
  wrap.querySelectorAll("button[data-acc-down]").forEach(b => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.dataset.accDown, 10);
      const ap = currentAccentQuery.accent_phrases[idx];
      ap.accent = Math.max(0, ap.accent - 1);
      renderAccentPhrases(currentAccentQuery);
    });
  });
  wrap.querySelectorAll("button[data-acc-up]").forEach(b => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.dataset.accUp, 10);
      const ap = currentAccentQuery.accent_phrases[idx];
      ap.accent = Math.min(ap.moras.length, ap.accent + 1);
      renderAccentPhrases(currentAccentQuery);
    });
  });
  $("accent-json").textContent = JSON.stringify(query, null, 2);
}

$("btn-accent-query").addEventListener("click", async () => {
  const text = $("accent-text").value.trim();
  const speakerId = parseInt($("accent-speaker").value, 10);
  const st = $("accent-status");
  if (!text) { st.className = "status err"; st.textContent = "テキストを入力してください"; return; }
  st.className = "status"; st.textContent = "audio_query 取得中…";
  try {
    const res = await fetch(`${endpoint}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`, { method: "POST" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    currentAccentQuery = await res.json();
    renderAccentPhrases(currentAccentQuery);
    st.className = "status ok";
    st.textContent = `取得完了 (AccentPhrase ${currentAccentQuery.accent_phrases.length} 個)`;
    $("btn-accent-synth").disabled = false;
    $("btn-accent-csv").disabled = false;
  } catch (err) {
    st.className = "status err";
    st.textContent = `失敗: ${err.message}`;
  }
});

$("btn-accent-synth").addEventListener("click", async () => {
  if (!currentAccentQuery) return;
  const speakerId = parseInt($("accent-speaker").value, 10);
  const st = $("accent-status");
  st.className = "status"; st.textContent = "synthesis 中…";
  try {
    // セクション 2 のパラメータも反映
    Object.assign(currentAccentQuery, getParams());
    const res = await fetch(`${endpoint}/synthesis?speaker=${speakerId}&enable_interrogative_upspeak=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentAccentQuery),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    $("accent-audio").src = URL.createObjectURL(blob);
    $("accent-audio").play().catch(() => {});
    st.className = "status ok";
    st.textContent = "再生中";
  } catch (err) {
    st.className = "status err";
    st.textContent = `失敗: ${err.message}`;
  }
});

$("btn-accent-csv").addEventListener("click", () => {
  if (!currentAccentQuery) return;
  const text = $("accent-text").value.trim();
  // 全 AccentPhrase の最初の accent を使う簡易版
  const accent = currentAccentQuery.accent_phrases[0]?.accent ?? 0;
  // pronunciation: モーラ text をカタカナで連結 (text フィールドが既にカタカナの想定)
  const pron = currentAccentQuery.accent_phrases.flatMap(ap => ap.moras.map(m => m.text)).join("");
  const csvLine = `${text},${pron},${accent},5,アクセント編集ツールで生成 ${new Date().toISOString().slice(0,10)}\n`;
  downloadBlob(new Blob([csvLine], { type: "text/csv" }), `dict_addition_${Date.now()}.csv`);
});

// ============================================================
// 機能 C: 発注書ソース選択 + MD パーサ
// ============================================================
function parseOrderMarkdown(md) {
  // 行ベースで `| q\d{3}(_alt)?_(q|a|b|c|d).wav | ... | speech |` を拾う
  const lines = md.split(/\r?\n/);
  const out = [];
  const seen = new Set();
  // 命名規則: q170_q.wav / q160_a_alt.wav 等
  const FNAME_RE = /^q\d{3}(?:_(?:q|a|b|c|d))(?:_alt)?$/i;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    // セパレータ行 (---) は除外
    if (/^\|[\s\-:|]+\|?\s*$/.test(line)) continue;
    const cols = line.split("|").map(s => s.trim()).filter(s => s.length > 0);
    if (cols.length < 2) continue;
    // 最初の列に *.wav があるか
    const first = cols[0];
    const m = first.match(/(q\d{3}(?:_(?:q|a|b|c|d))(?:_alt)?)\.wav/i);
    if (!m) continue;
    const name = m[1].toLowerCase();
    if (!FNAME_RE.test(name)) continue;
    if (seen.has(name)) continue;
    // テキストカラムは「最後の列 = speech」優先、無ければ 2 列目 = display
    let speech = cols.length >= 3 ? cols[cols.length - 1] : cols[1];
    speech = speech.replace(/\s+/g, " ").trim();
    if (!speech) continue;
    out.push([name, speech]);
    seen.add(name);
  }
  return out;
}

function applyFiles(newFiles, label) {
  FILES = newFiles;
  const n = FILES.length;
  $("files-count-h").textContent = String(n);
  $("files-count-btn").textContent = String(n);
  const st = $("order-status");
  st.className = "status ok";
  st.textContent = `${label} を読み込みました — ${n} ファイル準備完了`;
}

document.querySelectorAll('input[name="order-src"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const v = document.querySelector('input[name="order-src"]:checked').value;
    $("order-file-row").style.display = v === "file" ? "flex" : "none";
    $("order-url-row").style.display = v === "url" ? "flex" : "none";
    if (v === "hardcoded") {
      applyFiles(HARDCODED_FILES.slice(), "ハードコード 27 ファイル");
    }
  });
});

$("order-file-input").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = parseOrderMarkdown(reader.result);
      if (parsed.length === 0) throw new Error("MD ファイル中に q*_*.wav 行が見つかりませんでした");
      applyFiles(parsed, `ファイル「${file.name}」`);
    } catch (err) {
      const st = $("order-status");
      st.className = "status err";
      st.textContent = `パース失敗: ${err.message}`;
    }
  };
  reader.onerror = () => {
    const st = $("order-status");
    st.className = "status err";
    st.textContent = `FileReader エラー: ${reader.error}`;
  };
  reader.readAsText(file, "UTF-8");
});

$("btn-order-fetch").addEventListener("click", async () => {
  const url = $("order-url-input").value.trim();
  if (!url) return;
  const st = $("order-status");
  st.className = "status"; st.textContent = "fetch 中…";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    const parsed = parseOrderMarkdown(md);
    if (parsed.length === 0) throw new Error("MD ファイル中に q*_*.wav 行が見つかりませんでした");
    applyFiles(parsed, `URL「${url}」`);
  } catch (err) {
    st.className = "status err";
    st.textContent = `fetch/パース失敗: ${err.message}`;
  }
});

// ============================================================
// 機能 D: LLM アクセント補正（Anthropic Messages API）
// ============================================================
async function llmReviseAccent(text, query) {
  const apiKey = $("llm-key").value.trim();
  const model = $("llm-model").value;
  if (!apiKey) throw new Error("API キー未入力");
  const userPrompt =
    `以下のテキストの VOICEVOX audio_query JSON があります。子供向け（5-6歳）の標準語アクセントとして妥当か検証し、不適切なら修正版 JSON を返してください。\n\n` +
    `テキスト: 「${text}」\n` +
    `現在の AccentPhrase JSON:\n` +
    "```json\n" + JSON.stringify(query.accent_phrases, null, 2) + "\n```\n\n" +
    `修正版があれば accent_phrases 配列だけを以下のフォーマットで JSON コードブロックとして返してください。修正不要なら "OK" だけを返してください。\n` +
    "```json\n[ ... ]\n```";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const reply = (data.content || []).map(c => c.text || "").join("");
  $("llm-result").textContent = reply;
  // OK レスは元のまま
  if (/^\s*OK\s*$/i.test(reply)) return query;
  // ```json ... ``` 抜き出し
  const m = reply.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = m ? m[1] : reply;
  try {
    const newPhrases = JSON.parse(jsonStr);
    if (!Array.isArray(newPhrases)) throw new Error("配列ではない");
    const revised = JSON.parse(JSON.stringify(query));
    revised.accent_phrases = newPhrases;
    return revised;
  } catch (e) {
    throw new Error(`LLM レスポンス解析失敗: ${e.message}`);
  }
}

$("btn-llm-test").addEventListener("click", async () => {
  const st = $("llm-status");
  st.className = "status"; st.textContent = "テスト中…";
  if (!$("llm-enable").checked) {
    st.className = "status err";
    st.textContent = "「有効化」チェックを ON にしてください";
    return;
  }
  try {
    const text = $("accent-text").value.trim() || "なにいろ";
    const speakerId = parseInt($("accent-speaker").value, 10);
    const qres = await fetch(`${endpoint}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`, { method: "POST" });
    if (!qres.ok) throw new Error(`audio_query: HTTP ${qres.status}`);
    const query = await qres.json();
    const revised = await llmReviseAccent(text, query);
    st.className = "status ok";
    st.textContent = `テスト成功: 元 ${query.accent_phrases.length} 句 / 補正後 ${revised.accent_phrases.length} 句`;
  } catch (err) {
    st.className = "status err";
    st.textContent = `失敗: ${err.message}`;
  }
});

// 一括生成中も LLM 補正を挟む差し替え版 synthesize
async function synthesizeWithOptionalLLM(text, speakerId) {
  if (!$("llm-enable").checked) {
    return await synthesize(text, speakerId);
  }
  // LLM 経路: query → 補正 → synthesis
  try {
    const qres = await fetch(`${endpoint}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`, { method: "POST" });
    if (!qres.ok) throw new Error(`audio_query failed: ${qres.status}`);
    let query = await qres.json();
    try {
      query = await llmReviseAccent(text, query);
    } catch (llmErr) {
      console.warn("[LLM 補正失敗 / フォールバック]", llmErr.message);
    }
    Object.assign(query, getParams());
    const sres = await fetch(`${endpoint}/synthesis?speaker=${speakerId}&enable_interrogative_upspeak=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    if (!sres.ok) throw new Error(`synthesis failed: ${sres.status}`);
    return await sres.blob();
  } catch (err) {
    // 完全フォールバック
    return await synthesize(text, speakerId);
  }
}
