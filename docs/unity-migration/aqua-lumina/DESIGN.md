# AquaLumina — Underwater Rendering Tech Spike (Design Brief)

Date: 2026-07-23
Status: Design approved for parallel implementation (4 modules + 1 integration step)
Unity: 6000.3.19f1 / URP 17.3.0 (2D Renderer, RenderGraph enabled — `m_EnableRenderCompatibilityMode: 0` in `Assets/UniversalRenderPipelineGlobalSettings.asset`)
Project: `unity/PonoNativeGames` inside `pono-asobiba-app`

## Purpose

Prove that Unity/URP can render a *meaningfully more beautiful* underwater scene than the
current web/PixiJS aquarium (hand-rolled GLSL ripple + static translucent ray polygons).
Four target qualities, all real-time and animated:

- (a) God rays / light shafts — volumetric-looking, flickering beams from the surface
- (b) Caustics — sharp, dancing filament networks on background and rocks
- (c) Refraction / water distortion — the scene itself wobbles as if seen through water
- (d) Shimmer — fine-grain luminance sparkle and slow ambient light banding

Output feeds a later go/no-go decision on rebuilding ポノの水族館 natively. This is a spike:
no gameplay, no UI beyond the scene itself, judged from headless CLI screenshots.

## Identity

- Spike name: **AquaLumina**
- Package root: `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/`
- Namespace root: `Pono.AquaLumina` (`.Rendering`, `.Bootstrap`, `.Editor`)
- Scene: `Assets/Pono/Games/AquaLumina/Scenes/90_AquaLumina.unity` (90_ prefix = non-shipping spike)
- Docs record: this file (`docs/unity-migration/aqua-lumina/DESIGN.md`)

## Safety constraints (verbatim, non-negotiable)

1. Never modify/rename/delete anything under `Assets/Pono/Games/HideSeekCreatures/**`,
   `Assets/Pono/Games/ColorWaterDelivery/**`, `Assets/Pono/AppShell/**`.
2. Never touch `HideSeekProjectSetup.cs` / `ColorWaterDeliveryProjectSetup.cs`; never write
   `EditorBuildSettings.scenes` from spike code (the shipping list `[00_Boot, 10_HideSeekCreatures]`
   is owned by HideSeek's setup). The spike's Mac build passes its scene list directly to
   `BuildPipeline.BuildPlayer`.
3. `Assets/Settings/UniversalRP.asset` `m_RendererDataList[0]` (`Assets/Settings/Renderer2D.asset`,
   guid `424799608f7334c24bf367e4bbfa7f9a`) stays byte-identical. The spike APPENDS its own new
   Renderer2DData asset as a new list entry via SerializedObject (idempotent), never hand-edits YAML,
   never changes `m_DefaultRendererIndex`, `m_RequireDepthTexture` (0) or `m_RequireOpaqueTexture` (0).
4. No hand-authored `.unity` / complex `.asset` YAML. Scene + assets are built by an Editor script
   (`AquaLuminaProjectSetup`) mirroring the two shipping setups.
5. No prefabs, no `.mat` assets — materials created procedurally (`new Material(shader)`).
   Also: spike code never touches `PlayerSettings` (shipping setups own it).

## Renderer isolation plan

- `AssetDatabase.CopyAsset("Assets/Settings/Renderer2D.asset", "Assets/Pono/Games/AquaLumina/Content/Rendering/AquaLuminaRenderer2D.asset")`
  creates the spike's brand-new Renderer2DData. **Why copy instead of `CreateInstance<Renderer2DData>()`:**
  Renderer2DData serializes required default-shader/material/blend-style references that a raw
  CreateInstance leaves unset (risking NREs in the 2D renderer); CopyAsset is still fully programmatic
  (no YAML hand-editing) and provably cannot damage the source. CreateInstance+CreateAsset remains the
  documented fallback if CopyAsset ever fails.
- The two spike renderer features (`AquaWaterDistortionFeature`, `AquaGodRayFeature`) are added to the
  copy as sub-assets: `ScriptableObject.CreateInstance<T>()` + `AssetDatabase.AddObjectToAsset(feature, rendererData)`,
  then SerializedObject append to `m_RendererFeatures` (object reference) and `m_RendererFeatureMap`
  (localId from `AssetDatabase.TryGetGUIDAndLocalFileIdentifier`). Idempotent: skip if a feature of that
  type already exists in the list.
- Pipeline append: `new SerializedObject(universalRpAsset)`, `FindProperty("m_RendererDataList")`,
  scan for an element whose `objectReferenceValue` is already the spike renderer data (idempotency);
  otherwise `InsertArrayElementAtIndex(arraySize)` + set reference. Guard before saving: element 0 must
  still resolve to `Assets/Settings/Renderer2D.asset` — abort loudly otherwise.
- Spike camera selects the appended index at scene-build time via
  `camera.GetUniversalAdditionalCameraData().SetRenderer(index)`; `renderPostProcessing = true` on the
  spike camera only.
- **No global depth/opaque flags needed:** both full-screen passes self-source the camera color by
  copying `UniversalResourceData.activeColorTexture` into a RenderGraph-transient texture inside their
  own pass, so `m_RequireDepthTexture`/`m_RequireOpaqueTexture` stay 0 and shipping games see zero change.
- Cleanup path: menu item `Pono/Aqua Lumina/Remove Renderer From Pipeline` deletes the appended entry
  (null the reference, then `DeleteArrayElementAtIndex`). Known tradeoff while the entry exists: the
  spike renderer data is referenced by the shared pipeline asset and would ride along in any future
  shipping build (small size cost only — features no-op without the spike volume/scene); the removal
  menu item is the exit.

## Visual technique rationale

| Goal | Technique | Why this one |
| --- | --- | --- |
| God rays | Screen-space radial scatter (GPU Gems 3 "Volumetric Light Scattering as a Post-Process"): luminance-threshold prepass shaped by angular beam noise, 2× radial blur toward the sun's screen position at half res, additive composite. | Zero scene coupling, one shader, the canonical "wow" underwater look; animates naturally (threshold source + animated angular noise = flickering beams). Bloom-only + sprite shafts was rejected — that is exactly the static web look we must beat. |
| Caustics | World-space additive quad with fully procedural dual-layer animated Voronoi-F1 filaments (no texture assets), drawn inside the 2D renderer's sorting (order 20, over rocks/background). | Project has zero texture-sheet assets and zero .mat files; procedural = infinite variation and razor-sharp filaments. Being *in-scene* means the later refraction pass distorts the caustics too — physically plausible layering for free. |
| Refraction | Full-screen pass: copy active color, resample with aspect-corrected two-octave value-noise flow offsets, edge-faded, subtle chromatic split. | In-pass copy avoids `_CameraOpaqueTexture` (would need shared pipeline flag changes — forbidden). Identical visual result. |
| Shimmer | Same pass as refraction: high-frequency sparkle modulation + slow broad light banding on luminance. | Shares the noise field and the single scene copy; cheapest correct home; task allows (c)+(d) combined. |
| Everything | Fragment-only (no compute). | Runs on any Metal/GLES3/Vulkan device; graceful degradation is simply "feature self-disables", no CPU sim twin needed (contrast FluidInk's compute+CPU pair). |

Pass ordering: caustics (transparent scene geometry) → distortion (`RenderPassEvent.BeforeRenderingPostProcessing`)
→ god rays (`BeforeRenderingPostProcessing + 1`) → URP Bloom (post-processing). Rays stay crisp above the
wobbling scene and feed Bloom; ordering is guaranteed by event offsets, not feature list order.

RenderGraph is the primary API (project has compatibility mode disabled, so RenderGraph is what runs);
each pass also carries a minimal Compatibility-Mode `Execute` path clearly commented as an intentional,
version-safe fallback (wrapped in `#pragma warning disable CS0618/CS0672`).

Exact URP 17.3 API surface is verifiable locally at
`unity/PonoNativeGames/Library/PackageCache/com.unity.render-pipelines.universal@8a9b4021522a/` and
`.../com.unity.render-pipelines.core@c3bbbae46ff1/` (e.g. `Runtime/Utilities/Blit.hlsl`,
`RenderGraphUtils.BlitMaterialParameters`). Modules should consult these instead of guessing.

## Shared contracts (pinned so 4 parallel agents + integration line up)

- Camera: orthographic, size 5, position (0,0,-10), landscape 16:9 → visible world ≈ x∈[−8.9,8.9], y∈[−5,5].
- Sorting orders: background 0, surface light band 5, far rocks 10, kelp 12, fish 14, near rocks 16,
  **caustics quad 20**, sun disc 30, marine snow 35, bubbles 40.
- Resources paths: `Content/Resources/AquaLumina/Rendering/<Name>.shader`, loaded via
  `Resources.Load<Shader>("AquaLumina/Rendering/<Name>")` with `Shader.Find("Pono/AquaLumina/<Name>")` fallback.
- Blit shaders receive time as `_AquaTime` (float, `Time.time` set per-frame from C#) — engine-global
  `_Time` is not relied on in core-RP blit shaders. The caustics shader includes URP `Core.hlsl` and may
  use `_Time.y` directly.
- Volume components default to *inactive* values (intensity/strength 0); the scene VolumeProfile
  (integration-owned) overrides them on. `IsActive()` gates pass enqueueing, so QA toggling via
  `component.active = false` cleanly disables an effect.
- Volume defaults written into the profile by integration:
  god rays — intensity 0.85, density 0.96, decay 0.95, sampleCount 64, lightViewportPosition (0.5, 1.05),
  threshold 0.55, beamNoiseStrength 0.55, tint (1.0, 0.92, 0.76);
  distortion — refractionStrength 0.012, shimmerStrength 0.35, waveScale 1.6, speed 0.5, chromaticShift 0.0025;
  URP Bloom — intensity 0.9, threshold 0.8, scatter 0.65.
- Modules do NOT create `.asmdef` or `.meta` files (integration owns asmdefs; Unity generates metas).
- C# style: Allman braces, 4-space indent, `sealed` leaf classes, `static readonly int` cached
  `Shader.PropertyToID`, English why-comments, Japanese-only user-facing strings, no per-frame GC allocs.

## Module 1 — `godrays`: God-ray screen-space renderer feature

Files (repo-relative):
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Rendering/AquaGodRayVolume.cs`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Rendering/AquaGodRayFeature.cs`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Content/Resources/AquaLumina/Rendering/AquaGodRays.shader`

`AquaGodRayVolume` (namespace `Pono.AquaLumina.Rendering`):

```csharp
public sealed class AquaGodRayVolume : VolumeComponent, IPostProcessComponent
{
    public ClampedFloatParameter intensity = new ClampedFloatParameter(0f, 0f, 2f);
    public ClampedFloatParameter density = new ClampedFloatParameter(0.96f, 0.5f, 1f);
    public ClampedFloatParameter decay = new ClampedFloatParameter(0.95f, 0.5f, 1f);
    public ClampedIntParameter sampleCount = new ClampedIntParameter(64, 16, 96);
    public Vector2Parameter lightViewportPosition = new Vector2Parameter(new Vector2(0.5f, 1.05f));
    public ClampedFloatParameter threshold = new ClampedFloatParameter(0.55f, 0f, 2f);
    public ClampedFloatParameter beamNoiseStrength = new ClampedFloatParameter(0.55f, 0f, 1f);
    public ColorParameter tint = new ColorParameter(new Color(1f, 0.92f, 0.76f), true, false, true);
    public bool IsActive() { return intensity.value > 0.001f; }
}
```

`AquaGodRayFeature : ScriptableRendererFeature` — must survive being created via
`ScriptableObject.CreateInstance` with zero inspector config. Lazy material from Resources/Shader.Find;
on failure set a permanent `_disabled` flag + single `Debug.LogWarning`. `AddRenderPasses`: skip unless
`cameraData.cameraType == CameraType.Game || SceneView`, volume component present and `IsActive()`.
Pass `renderPassEvent = RenderPassEvent.BeforeRenderingPostProcessing + 1`; `requiresIntermediateTexture = true`.
`Dispose(bool)` → `CoreUtils.Destroy(material)`.

RenderGraph recording (primary path): from `frameData.Get<UniversalResourceData>()` take
`activeColorTexture`; make two half-res transient textures (desc from
`renderGraph.GetTextureDesc(source)`, halved, `depthBufferBits = 0`); pass 0 threshold blit
(`renderGraph.AddBlitPass(new RenderGraphUtils.BlitMaterialParameters(source, brightHalf, material, 0), "AquaGodRay Threshold")`),
pass 1 radial blur brightHalf→blurHalf, then blurHalf→brightHalf again (two iterations); composite via
`AddRasterRenderPass`: `SetRenderAttachment(activeColorTexture)`, `UseTexture(sceneCopy)` +
`UseTexture(brightHalf)`, in the render func `cmd.SetGlobalTexture(_AquaRayTexId, rayHandle)` then
`Blitter.BlitTexture(cmd, sceneCopyHandle, scaleBias, material, 2)` — the composite pass samples a
full-res scene copy (made earlier with `AddCopyPass(source → sceneCopy)`) plus the ray texture and
writes `scene + rays * tint` with `Blend Off` (avoids RenderGraph load/blend ambiguity of additive
blits onto the active target). Set all material floats each frame in `AddRenderPasses` from the volume
(no allocation; cached property IDs `_Intensity`, `_Density`, `_Decay`, `_SampleCount`, `_LightViewportPos`,
`_Threshold`, `_BeamNoiseStrength`, `_Tint`, `_AquaTime`).

Shader `"Pono/AquaLumina/GodRays"` — HLSL, includes core `Common.hlsl` + `Runtime/Utilities/Blit.hlsl`
(use its `Vert`, `_BlitTexture`, `sampler_LinearClamp`). Three passes:
- Pass 0 Threshold: `mask = saturate((luminance - _Threshold) / max(1 - _Threshold, 1e-4))`,
  multiplied by vertical falloff `smoothstep(0.15, 0.75, uv.y)` (only upper scene seeds rays) and by
  beam noise: `angle = atan2(uv.x - light.x, -(uv.y - light.y)); beams = lerp(1, valueNoise1D(angle * 24 + _AquaTime * 0.35), _BeamNoiseStrength)`
  (2-octave hash value noise, self-contained) so blur smears the mask into distinct flickering beams.
- Pass 1 Radial blur (GPU Gems 3): step `deltaUv = (uv - light) * _Density / _SampleCount`; loop
  `[loop] for i < _SampleCount { sampleUv -= deltaUv; sum += tex * illum; illum *= _Decay; }`,
  output `sum / _SampleCount`.
- Pass 2 Composite: `sceneCopy.rgb + rays.rgb * _Tint.rgb * _Intensity`.

Compatibility-Mode `Execute` fallback: `RenderingUtils.ReAllocateHandleIfNeeded` half-res RTHandles +
`Blitter.BlitCameraTexture` chain; comment explicitly that the legacy path exists intentionally for
Compatibility Mode even though this project runs RenderGraph.

Degradation: shader missing/unsupported → feature permanently disabled, scene still renders.

## Module 2 — `caustics`: procedural caustics surface

Files:
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Rendering/AquaCausticsSurface.cs`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Content/Resources/AquaLumina/Rendering/AquaCaustics.shader`

`AquaCausticsSurface` (namespace `Pono.AquaLumina.Rendering`), sealed MonoBehaviour:

```csharp
public static AquaCausticsSurface Create(Transform parent, Rect worldRect, int sortingOrder, float intensity); // null if shader unavailable
public void SetIntensity(float value);
public float Intensity { get; }
```

`Create` loads `Resources.Load<Shader>("AquaLumina/Rendering/AquaCaustics")` →
`Shader.Find("Pono/AquaLumina/Caustics")` → null ⇒ warn once + return null (graceful no-op).
Builds a procedural quad Mesh covering `worldRect` at z=0, UVs in world-units-over-rect-height
(u range = aspect, v 0..1) so Voronoi cells stay isotropic. MeshFilter + MeshRenderer,
`sortingOrder = sortingOrder` (contract: 20), shadows off, light probes off, one
`new Material(shader)`. Mesh + material destroyed in `OnDestroy`. Cached IDs `_Intensity`, `_Tint`,
`_Scale`, `_Speed`, `_FadeParams`.

Shader `"Pono/AquaLumina/Caustics"`: URP HLSL (`Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl`),
SubShader tags `RenderPipeline=UniversalPipeline, RenderType=Transparent, Queue=Transparent`,
pass tag **`LightMode = SRPDefaultUnlit`** (this is what the 2D renderer draws for plain MeshRenderers),
`Blend One One, ZWrite Off, Cull Off`. Fragment: domain-warp uv
(`uv += 0.05 * sin(uv.yx * 6 + _Time.y * 0.7)`), then two animated Voronoi-F1 layers
(3×3 neighborhood, feature points `o = 0.5 + 0.5 * sin(t + 6.2831 * hash2(cell))`), each shaped
`pow(saturate(1 - F1), 5)`; combine `c = c1 * c2 * 2.2 + pow(c1, 8) * 0.35` (filament intersections +
hot sparkles); layer 2 at 1.77× scale scrolling opposite; vertical fade
`lerp(0.35, 1.0, smoothstep(fadeBottom, fadeTop, v))` and soft edge box mask; output
`half4(_Tint.rgb * c * _Intensity, 1)`. Uses `_Time.y` (available via URP include). Sharp dancing
filaments — not blobby noise — are the acceptance bar.

## Module 3 — `waterdistortion`: refraction + shimmer full-screen feature

Files:
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Rendering/AquaWaterDistortionVolume.cs`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Rendering/AquaWaterDistortionFeature.cs`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Content/Resources/AquaLumina/Rendering/AquaWaterDistortion.shader`

`AquaWaterDistortionVolume`: `refractionStrength` (Clamped 0..0.05, default 0), `shimmerStrength`
(0..1, default 0.35), `waveScale` (0.25..8, default 1.6), `speed` (0..3, default 0.5),
`chromaticShift` (0..0.01, default 0.0025); `IsActive() => refractionStrength.value > 0.0001f || shimmerStrength.value > 0.001f`
— but the pass only runs when the *volume stack* says active, so with the scene profile off it no-ops.

`AquaWaterDistortionFeature`: same skeleton/lifecycle/degradation as Module 1's feature.
`renderPassEvent = RenderPassEvent.BeforeRenderingPostProcessing` (one before god rays).
RenderGraph: transient copy of `activeColorTexture` (`AddCopyPass` or material-less `AddBlitPass`),
then `AddBlitPass(copy → activeColor, material, 0)`. Material uniforms per frame: `_RefractionStrength`,
`_ShimmerStrength`, `_WaveScale`, `_Speed`, `_ChromaticShift`, `_AquaTime`, `_ScreenAspect` (w/h from camera data).
Compatibility `Execute` fallback as in Module 1.

Shader `"Pono/AquaLumina/WaterDistortion"` (Blit.hlsl-based, single pass): aspect-corrected
`p = uv * float2(_ScreenAspect, 1) * _WaveScale`; two-octave value-noise flow field
(`flow.x/flow.y` from decorrelated offsets, plus 0.35× fine octave at ~8× frequency);
`offset = flow * _RefractionStrength * depthFactor` with `depthFactor = lerp(0.75, 1.15, uv.y)`
(surface wobbles slightly more than the deep); edge fade
`min(edge.x, edge.y)` with `edge = smoothstep(0, 0.06, uv) * smoothstep(1, 0.94, uv)` so screen borders
never smear. Chromatic split: R at `uv + offset * (1 + k)`, G at `uv + offset`, B at `uv + offset * (1 - k)`
with `k` from `_ChromaticShift` (≤ ~3px). Shimmer: `col *= 1 + _ShimmerStrength * 0.18 * (sparkle*2-1) * depthFactor`
with `sparkle = noise(p * 13 + t * 2.4)`, plus slow broad banding `1 + _ShimmerStrength * 0.1 * (band - 0.5)`
with `band = noise(float2(uv.x * 3 + t * 0.2, uv.y * 1.5))`. Amplitudes deliberately small — no
large-area strobing (child-safe).

## Module 4 — `stage`: procedural underwater stage content

Files:
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Rendering/AquaLuminaStageBuilder.cs`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Rendering/AquaLuminaStageContent.cs`

Pure content, zero dependencies on Modules 1–3; baseline mode screenshots come from this alone.

```csharp
public readonly struct AquaStageInfo
{
    public readonly GameObject Root;
    public readonly Vector2 SunViewportPosition; // (0.5, 0.88)
    public readonly Rect WaterWorldRect;         // camera-visible rect +5%
    public AquaStageInfo(GameObject root, Vector2 sunViewportPosition, Rect waterWorldRect);
}
public static class AquaLuminaStageBuilder
{
    public static AquaStageInfo Build(Transform parent, Camera camera);
}
public sealed class AquaLuminaStageContent : MonoBehaviour // added to Root by Build
```

Build computes the visible world rect from the orthographic camera, then creates (all textures
procedural `Texture2D`, `hideFlags = HideFlags.DontSave`, seeded `System.Random(20260723)` for
reproducible captures; every generated Texture2D/Sprite/Mesh/Material registered with
`AquaLuminaStageContent` and destroyed in its `OnDestroy`):

- Background: 64×512 vertical gradient sprite (deep `#041C30` → `#2E7EA6` → pale `#7FC7DF` top 8%), order 0, scaled to cover.
- Surface light band: pale-aqua soft horizontal strip, alpha ~0.25, top 15%, order 5.
- Sun disc: 128×128 radial white-warm gradient sprite at viewport (0.5, 0.88), ~1.8 world units,
  color (1, 0.96, 0.85), order 30; slow ±3% scale pulse (period ~5 s) in `Update` — this is the god-ray
  threshold seed and Bloom source.
- Rock silhouettes: two 512×160 sine-sum skyline textures (3 randomized-phase sines), far `#12374F`
  order 10, near `#0A2438` order 16, bottom-aligned.
- Kelp: 4–6 bottom-pivoted gradient-strip sprites (`Sprite.Create` pivot (0.5, 0)), heights 3–6 world
  units, `#0E3B33`, order 12; sway ±4° sine with per-kelp phase in `Update` (no allocations).
- Fish: 3 dark silhouette sprites (ellipse + tail baked into 128×64 texture), order 14, drifting
  0.3–0.7 u/s with sine bob, X-flip on direction, wrap at rect edges.
- Bubbles: `ParticleSystem`, procedural 64×64 soft-circle sprite with bright rim, material
  `new Material(Shader.Find("Universal Render Pipeline/2D/Sprite-Unlit-Default"))` (renders in the 2D
  renderer), ~8/s, lifetime 6–10 s, upward 0.5–1.2 u/s, gentle noise (strength 0.15, frequency 0.3),
  size 0.05–0.22 growing slightly, alpha fade in/out, world simulation space, order 40.
- Marine snow: second ParticleSystem, ~30/s tiny (0.01–0.04) faint (alpha 0.12–0.25) motes drifting
  down 0.05–0.15 u/s, order 35.

Uses only stock URP 2D sprite/particle shaders, so the stage renders correctly even if all three
effect modules are absent or disabled.

## Integration step (single agent, runs after all modules)

Files created:
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Editor/AquaLuminaProjectSetup.cs`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Editor/Pono.AquaLumina.Editor.asmdef`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Pono.AquaLumina.App.asmdef`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Rendering/Pono.AquaLumina.Rendering.asmdef`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Bootstrap/AquaLuminaBootstrap.cs`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/Runtime/Bootstrap/AquaLuminaQaCapture.cs`
- `unity/PonoNativeGames/Assets/Pono/Games/AquaLumina/README.md`

Generated by running the setup (never hand-authored):
- `.../Scenes/90_AquaLumina.unity`
- `.../Content/Rendering/AquaLuminaRenderer2D.asset`
- `.../Content/Rendering/AquaLuminaVolumeProfile.asset`
- append-only modification of `unity/PonoNativeGames/Assets/Settings/UniversalRP.asset`

asmdefs (copy field layout from `Pono.HideSeek.*.asmdef`):
- `Pono.AquaLumina.Rendering` (rootNamespace `Pono.AquaLumina.Rendering`) references
  `Unity.RenderPipelines.Universal.Runtime`, `Unity.RenderPipelines.Core.Runtime`.
- `Pono.AquaLumina.App` (Runtime root; picks up `Bootstrap/`) references `Pono.AquaLumina.Rendering` + both RP runtimes.
- `Pono.AquaLumina.Editor` references App, Rendering, both RP runtimes; `includePlatforms: ["Editor"]`.

`AquaLuminaProjectSetup` (namespace `Pono.AquaLumina.Editor`, static class), constants:
`SpikeScenePath`, `RendererDataPath`, `VolumeProfilePath`, `SourceRendererPath = "Assets/Settings/Renderer2D.asset"`,
`PipelineAssetPath = "Assets/Settings/UniversalRP.asset"`. Menu items:
- `Pono/Aqua Lumina/Rebuild Spike Scene` → `RebuildSpikeScene()`:
  `EnsureFolder` → `EnsureRendererData()` (CopyAsset if missing; then idempotently add both features per
  the isolation plan) → `EnsurePipelineEntry()` (SerializedObject append; returns index; index-0 guard)
  → `EnsureVolumeProfile()` (CreateInstance<VolumeProfile> + CreateAsset if missing; idempotent
  `profile.Has<T>()` else `profile.Add<T>(true)` + `AddObjectToAsset(component, profile)` for
  `AquaGodRayVolume`, `AquaWaterDistortionVolume`, URP `Bloom`, with the pinned default overrides)
  → build scene: empty scene, MainCamera (orthographic size 5, pos (0,0,-10), solid `#041C30`,
  `GetUniversalAdditionalCameraData().renderPostProcessing = true` + `.SetRenderer(index)`),
  `AquaLuminaVolume` GameObject (`Volume`, global, profile asset), `AquaLumina` root GameObject with
  `AquaLuminaBootstrap`; save to `SpikeScenePath`. Never writes `EditorBuildSettings.scenes`,
  never touches PlayerSettings.
- `Pono/Aqua Lumina/Verify Spike` → `VerifySpike()`: require 3 shaders, scene, renderer data (with both
  features), profile (with 3 components), pipeline entry at index ≥ 1, index 0 still
  `Assets/Settings/Renderer2D.asset`, `m_RequireDepthTexture == 0 && m_RequireOpaqueTexture == 0`,
  spike scene NOT in `EditorBuildSettings.scenes`. Throw on any failure.
- `Pono/Aqua Lumina/Remove Renderer From Pipeline` → `RemoveRendererFromPipeline()`.
- `SetupFromCommandLine()` = Rebuild + Verify; `BuildMacFromCommandLine()` = EnsureReady + BuildPlayer
  with `scenes = { SpikeScenePath }` only, default output `Builds/macOS/PonoAquaLumina.app`,
  `-buildOutput` override supported (mirror `ColorWaterDeliveryProjectSetup`).

`AquaLuminaBootstrap` (namespace `Pono.AquaLumina.Bootstrap`, sealed MonoBehaviour): `Awake` builds the
stage (`AquaLuminaStageBuilder.Build(transform, Camera.main)`), creates
`AquaCausticsSurface.Create(transform, stage.WaterWorldRect, 20, 0.9f)` (null-tolerant), finds the scene
`Volume` (`FindFirstObjectByType<Volume>()`), aligns
`godRayVolume.lightViewportPosition.Override(stage.SunViewportPosition + new Vector2(0f, 0.17f))` on the
runtime profile copy (`volume.profile` getter instantiates — safe in player), then
`AquaLuminaQaCapture.AttachIfRequested(gameObject, this)`. Public surface:
`public enum AquaEffect { GodRays, Caustics, Distortion, Bloom }`,
`public void SetEffectEnabled(AquaEffect effect, bool enabled)` (volume `component.active` toggles;
caustics `GameObject.SetActive`), plus read-only status for the QA sidecar:
`public bool IsEffectAvailable(AquaEffect effect)`, `public string RendererLabel { get; }`.

`AquaLuminaQaCapture` mirrors `RuntimeQaCapture` exactly (dormant unless args present):
`-ponoSpikeCapture <path.png>`, `-ponoSpikeCaptureMode baseline|full|godrays|caustics|distortion`
(default `full`), `-ponoSpikeCaptureDelay <seconds 0..10>` (default 1.5), `-ponoQuitAfterCapture`.
Mode→effects: baseline = all off; full = all on; godrays = god rays + bloom; caustics = caustics only;
distortion = distortion only. After the delay it measures mean frame ms over 60 frames, waits
`WaitForEndOfFrame`, `ScreenCapture.CaptureScreenshot(path, 1)`, writes sidecar
`Path.ChangeExtension(path, ".txt")` with `mode=`, `delay=`, `renderer=`, `godRays=on/off/unavailable`,
`caustics=`, `distortion=`, `bloom=`, `avgFrameMs=`, then waits for the file (4 s deadline) and
`Application.Quit()` if requested.

Sequencing note: integration runs after all modules, so if a module file fails to compile, minimal
fix-forward edits to module files are permitted (sequential — no clobber risk) but must be reported.

## QA / validation

```bash
UNITY="/Applications/Unity/Hub/Editor/6000.3.19f1/Unity.app/Contents/MacOS/Unity"

"$UNITY" -batchmode -quit \
  -projectPath "$PWD/unity/PonoNativeGames" \
  -executeMethod Pono.AquaLumina.Editor.AquaLuminaProjectSetup.SetupFromCommandLine \
  -logFile -

"$UNITY" -batchmode -quit \
  -projectPath "$PWD/unity/PonoNativeGames" \
  -executeMethod Pono.AquaLumina.Editor.AquaLuminaProjectSetup.BuildMacFromCommandLine \
  -buildOutput "$PWD/unity/PonoNativeGames/Builds/macOS/PonoAquaLumina.app" \
  -logFile -

APP_BIN="$(find "$PWD/unity/PonoNativeGames/Builds/macOS/PonoAquaLumina.app/Contents/MacOS" -type f | head -1)"
for MODE in baseline full godrays caustics distortion; do
  "$APP_BIN" -ponoSpikeCapture "$PWD/unity/PonoNativeGames/Builds/QA/aqualumina_${MODE}.png" \
    -ponoSpikeCaptureMode "$MODE" -ponoSpikeCaptureDelay 1.5 -ponoQuitAfterCapture
done
"$APP_BIN" -ponoSpikeCapture "$PWD/unity/PonoNativeGames/Builds/QA/aqualumina_full_t2.png" \
  -ponoSpikeCaptureMode full -ponoSpikeCaptureDelay 3.0 -ponoQuitAfterCapture
```

Then: run setup a second time and `git diff Assets/Settings/UniversalRP.asset` must be empty
(idempotency); view all six PNGs with the Read tool and judge against the acceptance criteria;
`aqualumina_full.png` vs `aqualumina_full_t2.png` must visibly differ (animation alive); sidecar `.txt`
files must report all effects shader-backed; `git status` must show nothing under the three protected
roots; finally re-run the HideSeek capture flow from the top-level README to prove shipping is intact.
Allow ~10 min for the first batchmode import. The physical-Android check is a separate later human step.

## Acceptance criteria (visual bar, not just "compiles")

1. God rays: ≥3 distinct soft-edged beams radiating from the top-center sun region, fading out by the
   lower third; beams visibly reshape between the 1.5 s and 3.0 s captures; no radial step banding at 100% zoom.
2. Caustics: sharp web-like filament network (cells ~5–10% of screen height), clearly overlapping rock
   silhouettes, brighter mid/upper water than seabed; reads as "dancing light", not gaussian blobs.
3. Refraction: distortion-vs-baseline comparison shows smooth wavy displacement of prop edges of roughly
   0.3–1.0% of screen width; no visible tiling; no border smearing.
4. Shimmer: subtle (<10% luminance) fine sparkle + slow light banding; no large-area flashing above ~3 Hz
   (child-safe constraint).
5. Bloom: soft halo on sun disc and caustic hotspots; average luminance gain vs baseline < 30% (no washout).
6. Cohesion: `full` reads instantly as a living underwater scene against a flat `baseline`; sun-warm
   surface zone grading to deep navy; motes/bubbles catch the light.
7. All 6 captures produced headlessly (batchmode setup + build + player CLI), sidecars confirm
   shader-backed effects and renderer index ≥ 1.
8. `avgFrameMs` ≤ 8 ms at default resolution on the Mac build machine.
9. Player log free of errors/exceptions; setup idempotent on second run; protected paths untouched;
   HideSeek/ColorWater flows still pass.
10. Degradation verified by review: any missing shader leaves a working stage scene with that effect
    cleanly disabled and one warning logged.

## Review checklist

- Constraints 1–5: `git status` clean under `HideSeekCreatures/`, `ColorWaterDelivery/`, `AppShell/`;
  `Renderer2D.asset` untouched; `UniversalRP.asset` diff is exactly one appended list entry;
  `m_DefaultRendererIndex`/depth/opaque flags unchanged; no `EditorBuildSettings.scenes` writes
  (grep spike code); no PlayerSettings writes; no hand-authored `.unity`/renderer/profile YAML;
  no `.prefab`/`.mat` files added.
- URP 17.3/Unity 6.3 correctness: `RecordRenderGraph` implemented and primary (compatibility mode is
  disabled in this project); `UnityEngine.Rendering.RenderGraphModule` namespace (not Experimental);
  no `RenderTargetHandle`/`cameraColorTarget`/other removed APIs; no HDRP namespaces; legacy `Execute`
  paths commented as intentional and warning-suppressed.
- Lifecycle: every `new Material` destroyed (`CoreUtils.Destroy` in feature `Dispose(bool)`,
  `Object.Destroy` in `OnDestroy`); procedural Texture2D/Sprite/Mesh ownership in
  `AquaLuminaStageContent`/`AquaCausticsSurface` `OnDestroy`; no RTHandle leaks in legacy paths.
- Hot paths: `Shader.PropertyToID` in `static readonly int`; no LINQ/string building/boxing per frame;
  volume stack lookups per frame are allocation-free.
- Degradation: Resources.Load → Shader.Find → permanent disable with a single warning; caustics `Create`
  returns null; bootstrap/QA tolerate nulls and report availability in the sidecar.
- 2D renderer specifics: caustics pass tagged `LightMode = SRPDefaultUnlit`; sorting orders match the
  contract table; features skip preview/reflection cameras.
- Idempotency: `EnsureRendererData`/`EnsurePipelineEntry`/`EnsureVolumeProfile`/scene rebuild all
  re-runnable; second `SetupFromCommandLine` produces zero asset diffs.
- Style: Allman braces, 4-space indent, sealed classes, English why-comments, Japanese user-facing
  strings, `Pono.AquaLumina.*` namespaces, asmdef layout mirrors `Pono.HideSeek.*`.
