# ⚠️ このブランチ (develop) は凍結されています

この `develop` ブランチは **2026-07-10 に凍結**されました。以後、このブランチへの push は禁止です。

- 開発はすべて **`develop-app` 単一トランク**で行います。
- LP staging (`https://pono-asobiba-staging.ndw.workers.dev/`) へは、`develop-app` への push で App staging と併せて自動デプロイされます。
- このブランチの `deploy.yml` はトリガから `develop` を外してあり、誤って push してもデプロイは走りません。
- 詳細・経緯: `docs/branch-unification-plan.md`（`develop-app` 側の正本）を参照してください。
