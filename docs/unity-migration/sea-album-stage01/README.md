> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Sea Album Stage01 Unity Migration

2026-06-16 に、Unity 側 `D:\Unity_Projects\Pono\Submarine\Pono_submarine` に残っていた Sea Album / 海底洞窟 Stage01 関連を app 側へ移動した退避フォルダ。

このフォルダは実行時参照ではなく、Unity で作っていた素材・データ・prefab・scene・builder の保管用。Web 版の実行時素材は `assets/images/sea-album/` と `sea-album/index.html` を正とする。

## 移動元

```text
D:\Unity_Projects\Pono\Submarine\Pono_submarine
```

## 移動先

```text
docs/unity-migration/sea-album-stage01/unity-project/
```

## 主な内容

- `Assets/_PonoSubmarine/Art/Creatures/Stage01/`
- `Assets/_PonoSubmarine/Art/Backgrounds/Stage01/`
- `Assets/_PonoSubmarine/Data/Creatures/Stage01/`
- `Assets/_PonoSubmarine/Data/Stages/Stage01_Tidepool.asset`
- `Assets/_PonoSubmarine/Prefabs/Creatures/CreaturePrefab_*`
- `Assets/_PonoSubmarine/Prefabs/Pickups/ShellCoinPickup.prefab`
- `Assets/_PonoSubmarine/Scenes/SeaAlbum_Stage01.unity`
- `Assets/_PonoSubmarine/Scripts/Editor/SeaAlbumStage01Builder.cs`
- `Docs/SEA_ZUKAN_STAGE_AND_SPEC.md`
