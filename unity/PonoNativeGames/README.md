# Pono Native Games

`PonoNativeGames` is the native Unity workspace for rich, device-only games in
ポノのあそびば. It is intentionally separate from the HTML/CSS/JavaScript game
runtime. The first game is the 2D FluidInk title **かくれんぼいきもの**.

The 3D marble-run concept is a different game and is not part of this project or
scene flow.

## Technology choices

- Unity 6.3 (`6000.3.19f1`) and C# for the native runtime.
- Universal Render Pipeline with a lightweight 2D scene.
- A custom compute-shader fluid simulation for supported GPUs.
- A deterministic 256×144 CPU reveal mask as the gameplay source of truth.
- A CPU visual fallback that keeps the same rules on devices without compute
  shader support.
- Unity Input System with one-finger play and optional two-finger interaction.
- PNG source art, Ogg/Vorbis or ADPCM runtime audio import settings, and a
  variable Noto Sans JP font bundled locally.

This split keeps discovery fair and testable while the visual fluid can be tuned
independently for different device classes.

## Project layout

```text
Assets/Pono/AppShell/
  Runtime/                 Native shell and safe-area helpers
  Scenes/00_Boot.unity     Entry scene

Assets/Pono/Games/HideSeekCreatures/
  Content/Resources/       Stage art, UI, audio, compute shader, composite shader
  Runtime/Core/            Pure reveal, discovery, and hint models
  Runtime/Rendering/       GPU fluid and CPU fallback
  Runtime/Gameplay/        Stage rules, input handling, animations, audio
  Runtime/Bootstrap/       Runtime UI composition
  Editor/                  Repeatable setup, verification, and build commands
  Tests/                   EditMode and PlayMode tests
  Scenes/                  Game scene
```

Runtime assemblies are separated with `.asmdef` files so the pure core can be
tested without scene or rendering dependencies.

## Open and verify

```sh
/Users/ndw_mac/.unity/bin/unity open unity/PonoNativeGames
```

In the editor, use:

- `Pono > Hide Seek Creatures > Rebuild Game Scenes`
- `Pono > Hide Seek Creatures > Verify Project`

The scene builder is repeatable. UI is composed at runtime so scene YAML remains
small and merge-safe.

## Command-line builds

Run these from the repository root with Unity closed:

```sh
UNITY="/Applications/Unity/Hub/Editor/6000.3.19f1/Unity.app/Contents/MacOS/Unity"

"$UNITY" -batchmode -quit \
  -projectPath "$PWD/unity/PonoNativeGames" \
  -executeMethod Pono.HideSeekCreatures.Editor.HideSeekProjectSetup.BuildMacFromCommandLine \
  -buildOutput "$PWD/unity/PonoNativeGames/Builds/macOS/PonoHideSeek.app" \
  -logFile -

"$UNITY" -batchmode -quit \
  -projectPath "$PWD/unity/PonoNativeGames" \
  -executeMethod Pono.HideSeekCreatures.Editor.HideSeekProjectSetup.BuildAndroidFromCommandLine \
  -buildOutput "$PWD/unity/PonoNativeGames/Builds/Android/PonoHideSeek.apk" \
  -logFile -
```

Android uses IL2CPP, ARM64, Vulkan with OpenGL ES 3 fallback, target API 36,
and minimum API 25. Build outputs and Unity-generated caches are ignored.

## Game contract

- Landscape-first, safe-area-aware UI.
- Three creatures can be found in any order.
- No timer, lives, penalties, failure screen, score, or star rating.
- A found creature never becomes hidden again.
- Tap, hold, or drag all produce feedback; dragging alone can finish the game.
- One finger is sufficient. A second finger adds fluid interaction, and further
  pointers are ignored safely.
- Child-visible Japanese uses kana and katakana only.
- There are no character voices. The current audio layer contains sound effects
  only.
- Sound, reduced-motion, tutorial-seen, and stage-complete flags are stored with
  `PlayerPrefs`.

## Native-shell integration

The Unity workspace can be shipped as its own Android application for testing,
or exported as a Unity library for a later host-shell integration. The gameplay
code communicates exit requests through `NativeGameBridge`, keeping host-specific
navigation outside the game assembly.

