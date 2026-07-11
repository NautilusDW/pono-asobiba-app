---
name: feedback-no-premature-game-launch
description: もじっこファーム/トントンキッチン等の「コード完成 ≠ ローンチ可」— 開放はユーザーのローンチ判断のみで行う (2026-07-11 明示指示)
metadata:
  type: feedback
---

# ゲーム開放はユーザーのローンチ判断のみ (2026-07-11)

ユーザー明示指示: 「MVPじゃないからまだダメだってば。」— もじっこファーム (writing-mori) と トントンキッチン (bento/kitchen.html) の book 開放提案に対する回答。

**Why:** エージェントの監査で「TODO ゼロ・遊べる状態 = 完成品」と評価しても、それはコードレベルの話。製品としてローンチできる品質・スコープかはユーザー (プロダクトオーナー) だけが判断する。MVP スコープ外のゲームを勝手に (あるいは提案ベースで安易に) メニュー開放してはならない。

**How to apply:**
- writing-mori / cooking (トントンキッチン) は `comingSoon: true` + `tier:'sub'` のまま維持。開放 (tier:'book' 化 + メニュー接続) は**ユーザーが「ローンチする」と明示した時のみ**、そのゲームのローンチバッチとして実施 ([[project-single-trunk-migration]] の D7 と同義)。
- 「実装が完成している」ことを理由に開放を再提案しない。逆に、未ローンチコンテンツの**直 URL 漏れはガードで塞ぐ**方向の提案は歓迎される (batch:1215 の 5 ゲームガードと同型)。
- 他の comingSoon / 非掲載ゲーム (zukan, monster-math, quiz-sound 等) にも同じ原則を適用。
