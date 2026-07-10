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

## FluidInk architecture

FluidInk is the visible play surface, not a particle or erase-mask effect. The
GPU path runs a 384×216 incompressible 2D fluid at a fixed 30 Hz:

- RK2 semi-Lagrangian advection for velocity and pigment.
- Curl plus bounded vorticity confinement for coherent eddies.
- Divergence, 12 warm-started Jacobi pressure iterations, and projection.
- Aspect-correct physical velocity in landscape layouts.
- Up to 16 pointer splats batched into one persistent compute buffer dispatch.
- Transparent pigment centres reveal creatures while denser rolled rims retain
  the colour and direction of the moving water.

The CPU mask never drives the main visual opening. It records deterministic
discovery progress and contributes only a blurred, low-opacity memory after the
simulated pigment has flowed away. Unsupported GPUs switch to the CPU visual
backend for the rest of that session without changing discovery rules.

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

Android uses IL2CPP, ARM64, Vulkan with OpenGL ES 3 fallback, ETC2 baseline
textures, target API 36, minimum API 25, and predictive-back support. Build
outputs and Unity-generated caches are ignored.

The APK command produces a locally signed test build. Store delivery still
requires the release keystore and an Android App Bundle build.

## Verification

The current suite contains 64 EditMode and 5 PlayMode tests. It covers the pure
discovery rules, rendering resources and compute readback, CPU fallback,
runtime composition, pause/retry behaviour, and found-creature layering.

Player visual QA is opt-in and inactive in normal play. Pass `-ponoCapture`,
`-ponoCaptureMode start|mid|complete`, and optionally `-ponoCaptureDelay` to a
macOS player. Mid-mode deliberately leaves the CPU reveal mask untouched, so
captures at 0.10, 0.45, and 1.50 seconds demonstrate that the visible opening
is being transported by GPU pigment density itself.

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
