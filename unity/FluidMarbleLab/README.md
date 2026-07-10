# Pono Fluid Marble Lab

Unity 6.3 LTS / URP で、指から生まれる流れと 2D マーブル物理を分離検証するアプリ専用プロトタイプです。

## Architecture

- GPU compute fluid: 色素と渦の高品質な見た目を担当します。
- CPU flow field: 同じ入力を低解像度格子へ注入し、ゲーム物理を決定します。
- Rigidbody2D marbles: CPU flow field と重力から力を受けます。
- CPU ink fallback: Compute Shader 非対応端末でも同じ操作とゲーム進行を維持します。
- Track editor: `つくる` と `ながす` を分け、部品をドラッグ・回転できます。

GPU から CPU への毎フレーム readback は行いません。見た目の品質と遊びの再現性を独立させる設計です。

## Local commands

```bash
UNITY="$HOME/.unity/bin/unity"
PROJECT="$(pwd)/unity/FluidMarbleLab"

"$UNITY" run "$PROJECT" -- -nographics -accept-apiupdate
"$UNITY" test "$PROJECT" --mode EditMode --output "$PROJECT/Logs/editmode-results.xml"
```

Editor メニューの `Pono > Fluid Marble Lab > Rebuild Prototype Scene` で検証シーンを再生成できます。
