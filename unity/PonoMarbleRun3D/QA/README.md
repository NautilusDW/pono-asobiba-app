# QA evidence

`Screenshots/` にmacOSプレイヤーから取得した確認画像を保存しています。

- `16x9/`: 1280 × 720。menu、edit、invalid、run、pause、goal、showcase、physical-goal、samples、sample-edit、sample-slope。
- `4x3/`: 1024 × 768。menu、edit、invalid、run、pause、goal、samples、sample-edit。
- `20x9/`: 1800 × 810。menu、edit、invalid、run、pause、goal、samples、sample-edit。
- `samples`: 4つの見本を選ぶ画面。`sample-edit`: 部品選択後の回転案内と改造可能なコース。`sample-slope`: 同じ「さかみち」を180度違いで使う上り/下りコース。
- `16x9/physical-goal.json`: 7本の直線を実物理で走り切り、5.592秒で `Celebrating` になった記録。
- `manual-probe.json`: OSレベルのマウス操作による配置・選択・編集の最終状態。
- `manual-relaunch-probe.json`: 保存後の再起動・読込確認で使用した最終状態。
- `launchservices-final.json`: Finderのダブルクリック相当のLaunchServices経由で最終アプリが起動した記録。

JSONはテスト専用起動引数を指定した場合だけ動くQAドライバーの出力です。通常起動ではQAドライバーも操作プローブも生成されず、ゲーム進行へ影響しません。詳細な実施結果と未確認事項は [../TEST_RESULTS.md](../TEST_RESULTS.md) を参照してください。
