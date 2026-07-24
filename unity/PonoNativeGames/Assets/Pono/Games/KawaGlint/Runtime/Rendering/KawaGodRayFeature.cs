using System;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.RenderGraphModule;
using UnityEngine.Rendering.RenderGraphModule.Util;
using UnityEngine.Rendering.Universal;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Screen-space god-ray (light shaft) renderer feature for KawaGlint's cutaway-view river
    /// scene: a GPU Gems 3 ch.13 ("Volumetric Light Scattering as a Post-Process") radial-scatter
    /// blur seeded near the sky sun's screen position and composited back onto the scene,
    /// hard-clipped to the underwater half of frame only (see KawaGodRays.shader's Composite pass
    /// for the clip).
    ///
    /// Adapted from <c>Pono.AquaLumina.Rendering.AquaGodRayFeature</c> (read in full; not
    /// modified -- AquaLumina is a protected reference-only directory for this module) for the
    /// RenderGraph pass body, and from this project's own <see cref="KawaRefractionFeature"/> for
    /// the lifecycle skeleton (lazy material creation, permanent-demote-on-failure, camera-type
    /// gating, per-frame uniform push from the Volume stack).
    ///
    /// This project runs with RenderGraph enabled (Assets/UniversalRenderPipelineGlobalSettings
    /// .asset has m_EnableRenderCompatibilityMode: 0), so <see cref="KawaGodRayPass.RecordRenderGraph"/>
    /// is the code path that actually executes. The nested pass also implements the legacy
    /// Configure/Execute Compatibility Mode path purely as a version-safe fallback, mirroring
    /// AquaGodRayFeature's own such fallback.
    ///
    /// Instantiated and wired up entirely by an Editor script (KawaGlintProjectSetup, mirroring
    /// KawaRefractionFeature's own integration), so it must work correctly when created via
    /// <c>ScriptableObject.CreateInstance&lt;KawaGodRayFeature&gt;()</c> with no further setup
    /// beyond appending it to KawaGlintRenderer2D.asset's feature list.
    /// </summary>
    public sealed class KawaGodRayFeature : ScriptableRendererFeature
    {
        private const string ShaderResourcePath = "KawaGlint/Rendering/KawaGodRays";
        private const string ShaderFallbackName = "Pono/KawaGlint/GodRays";

        private const int ThresholdPass = 0;
        private const int RadialBlurPass = 1;
        private const int CompositePass = 2;

        private static readonly int IntensityId = Shader.PropertyToID("_Intensity");
        private static readonly int DensityId = Shader.PropertyToID("_Density");
        private static readonly int DecayId = Shader.PropertyToID("_Decay");
        private static readonly int SampleCountId = Shader.PropertyToID("_SampleCount");
        private static readonly int LightViewportPosId = Shader.PropertyToID("_LightViewportPos");
        private static readonly int ThresholdId = Shader.PropertyToID("_Threshold");
        private static readonly int BeamNoiseStrengthId = Shader.PropertyToID("_BeamNoiseStrength");
        private static readonly int TintId = Shader.PropertyToID("_Tint");
        private static readonly int KawaTimeId = Shader.PropertyToID("_KawaTime");
        private static readonly int WaterlineYId = Shader.PropertyToID("_WaterlineY");
        private static readonly int DepthReachId = Shader.PropertyToID("_DepthReach");
        private static readonly int SeedRadiusId = Shader.PropertyToID("_SeedRadius");
        private static readonly int ScreenAspectId = Shader.PropertyToID("_ScreenAspect");
        private static readonly int KawaRayTexId = Shader.PropertyToID("_KawaRayTex");

        private Material _material;
        private KawaGodRayPass _pass;
        private bool _disabled;
        private bool _warnedOnce;

        /// <inheritdoc/>
        public override void Create()
        {
            // Cheap and side-effect-free: only allocates the pass wrapper. Shader/material setup
            // is deliberately deferred to first actual use (see EnsureMaterial) so that creating
            // this feature (e.g. via ScriptableObject.CreateInstance from an Editor script,
            // before any scene even references it) never touches Resources.Load. Re-entrant:
            // Unity calls Create() on every domain reload/serialization pass.
            _pass ??= new KawaGodRayPass();
        }

        /// <inheritdoc/>
        public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData renderingData)
        {
            if (_disabled)
            {
                return;
            }

            // Defensive lazy-init in case AddRenderPasses is ever reached without Unity having
            // driven the normal Create() lifecycle first (mirrors KawaRefractionFeature).
            if (_pass == null)
            {
                Create();
            }

            var cameraType = renderingData.cameraData.cameraType;
            if (cameraType != CameraType.Game && cameraType != CameraType.SceneView)
            {
                return;
            }

            var volume = VolumeManager.instance.stack.GetComponent<KawaGodRayVolume>();
            if (volume == null || !volume.active || !volume.IsActive())
            {
                return;
            }

            if (!EnsureMaterial())
            {
                return;
            }

            var descriptor = renderingData.cameraData.cameraTargetDescriptor;
            // UniversalCameraData.pixelWidth/pixelHeight are internal to the URP assembly and not
            // visible from here; cameraTargetDescriptor.width/height is the public equivalent and
            // yields the same aspect ratio for our purposes (mirrors KawaRefractionFeature).
            var aspect = descriptor.height > 0 ? descriptor.width / (float)descriptor.height : 1f;

            PushUniforms(volume, aspect);

            // renderPassEvent / requiresIntermediateTexture are constant for the pass's entire
            // lifetime (see the INTEGRATION FIX comment in KawaGodRayPass's constructor for why
            // AfterRenderingPostProcessing specifically is required), so both are set once there
            // rather than reassigned on every AddRenderPasses call.
            _pass.SetMaterial(_material);
            renderer.EnqueuePass(_pass);
        }

        /// <inheritdoc/>
        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _pass?.Dispose();
            }
            CoreUtils.Destroy(_material);
            _material = null;
        }

        private bool EnsureMaterial()
        {
            if (_material != null)
            {
                return true;
            }
            if (_disabled)
            {
                return false;
            }

            try
            {
                var shader = Resources.Load<Shader>(ShaderResourcePath);
                if (shader == null)
                {
                    shader = Shader.Find(ShaderFallbackName);
                }

                if (shader == null || !shader.isSupported)
                {
                    ReportFailure("shader is missing from Resources and Shader.Find, or unsupported on this platform");
                    return false;
                }

                var material = CoreUtils.CreateEngineMaterial(shader);
                if (material == null)
                {
                    ReportFailure("material creation failed for the resolved shader");
                    return false;
                }

                _material = material;
                return true;
            }
            catch (Exception exception)
            {
                // Mirrors the FluidInk "demote once, never retry" fallback pattern used elsewhere
                // in this project (ComputeFluidInkBackend/FluidInkPresenter, AquaGodRayFeature): a
                // rendering spike must never repeatedly attempt (and fail) expensive setup every
                // frame, and must never let a rendering-setup exception take the scene down with
                // it.
                ReportFailure($"unexpected exception during setup ({exception.GetType().Name}: {exception.Message})");
                return false;
            }
        }

        private void ReportFailure(string reason)
        {
            _disabled = true;
            CoreUtils.Destroy(_material);
            _material = null;
            if (_warnedOnce)
            {
                return;
            }
            _warnedOnce = true;
            Debug.LogWarning(
                $"[KawaGodRayFeature] God rays permanently disabled: {reason}. The scene renders normally without them.");
        }

        private void PushUniforms(KawaGodRayVolume volume, float aspect)
        {
            // Pushed once per frame here (not per-pass, not via a MaterialPropertyBlock) because
            // AddRenderPasses runs entirely before RenderGraph recording/execution even begins --
            // there is no risk of these values changing mid-graph for this frame, and this avoids
            // any allocation (SetFloat/SetVector/SetColor on an existing Material never
            // allocate). Mirrors AquaGodRayFeature.PushUniforms.
            _material.SetFloat(IntensityId, volume.intensity.value);
            _material.SetFloat(DensityId, volume.density.value);
            _material.SetFloat(DecayId, volume.decay.value);
            _material.SetFloat(SampleCountId, volume.sampleCount.value);

            var lightViewportPosition = volume.lightViewportPosition.value;
            _material.SetVector(LightViewportPosId, new Vector4(lightViewportPosition.x, lightViewportPosition.y, 0f, 0f));

            _material.SetFloat(ThresholdId, volume.threshold.value);
            _material.SetFloat(BeamNoiseStrengthId, volume.beamNoiseStrength.value);
            _material.SetColor(TintId, volume.tint.value);

            _material.SetFloat(WaterlineYId, volume.waterlineViewportY.value);
            _material.SetFloat(DepthReachId, volume.depthReach.value);
            _material.SetFloat(SeedRadiusId, volume.seedRadius.value);
            _material.SetFloat(ScreenAspectId, aspect);

            // Core Blit.hlsl-based passes do not populate the engine's built-in _Time, so the
            // shader's animated beam noise reads this instead (see class doc on
            // KawaGodRays.shader; same convention as _KawaTime in KawaRefractionFeature).
            _material.SetFloat(KawaTimeId, Time.time);
        }

        /// <summary>
        /// The actual render pass. Kept as a private nested class (mirrors
        /// FullScreenPassRendererFeature.FullScreenRenderPass in the URP package itself, and
        /// AquaGodRayFeature.AquaGodRayPass) so it can freely reach the outer feature's cached
        /// property IDs/pass indices without duplicating them.
        /// </summary>
        private sealed class KawaGodRayPass : ScriptableRenderPass
        {
            private Material _material;

#if URP_COMPATIBILITY_MODE
            private RTHandle _sceneCopyHandle;
            private RTHandle _brightHalfHandleA;
            private RTHandle _brightHalfHandleB;
#endif

            public KawaGodRayPass()
            {
                profilingSampler = new ProfilingSampler("KawaGodRay");

                // INTEGRATION FIX (carried over verbatim from AquaGodRayPass's constructor --
                // AquaLumina/README.md integration notes): the naive choice here would be
                // BeforeRenderingPostProcessing + 1, which crashes every frame on the URP 2D
                // Renderer with "texture handle does not have a valid descriptor ... commonly
                // caused by referencing ... the system back buffer" (RecordRenderGraph on this
                // pass).
                //
                // Root cause, traced through Renderer2DRendergraph.cs: the 2D Renderer buckets
                // every custom pass into one of 4 coarse RenderPassEvent2D groups via a <=
                // comparison (ScriptableRenderPass2D.GetInjectionPoint2D), so
                // BeforeRenderingPostProcessing + 1 DID get bucketed into (and executed during)
                // the AfterRenderingPostProcessing group, same as a pass set to exactly
                // RenderPassEvent.AfterRenderingPostProcessing would be. But
                // Renderer2DRendergraph.OnAfterRendering separately decides whether *anything*
                // runs after post-processing using an *exact* equality check
                // (`x.renderPassEvent == RenderPassEvent.AfterRenderingPostProcessing`), not the
                // same bucketed comparison. BeforeRenderingPostProcessing + 1 failed that exact
                // check, so the renderer wrongly concluded nothing ran afterwards and resolved
                // post-processing straight to the back buffer -- which this pass then tried (and
                // failed) to read back as a normal RenderGraph texture.
                //
                // Using the exact enum value here satisfies both checks: it still lands in the
                // AfterRenderingPostProcessing bucket (so it still runs after KawaRefraction,
                // which sits at exactly BeforeRenderingPostProcessing -- an earlier bucket,
                // processed in an earlier RecordCustomRenderGraphPasses call -- regardless of the
                // two features' order on the Renderer2DData asset), and it correctly signals the
                // renderer to keep an intermediate camera-color target alive for this pass to
                // read from.
                //
                // Both fields are constant for the pass's entire lifetime (set once here, not
                // reassigned per-frame in AddRenderPasses).
                renderPassEvent = RenderPassEvent.AfterRenderingPostProcessing;
                requiresIntermediateTexture = true;
            }

            public void SetMaterial(Material material)
            {
                _material = material;
            }

            public void Dispose()
            {
#if URP_COMPATIBILITY_MODE
                _sceneCopyHandle?.Release();
                _sceneCopyHandle = null;
                _brightHalfHandleA?.Release();
                _brightHalfHandleA = null;
                _brightHalfHandleB?.Release();
                _brightHalfHandleB = null;
#endif
            }

            /// <inheritdoc/>
            public override void RecordRenderGraph(RenderGraph renderGraph, ContextContainer frameData)
            {
                if (_material == null)
                {
                    return;
                }

                var resourceData = frameData.Get<UniversalResourceData>();
                var source = resourceData.activeColorTexture;
                if (!source.IsValid())
                {
                    return;
                }

                var fullDesc = renderGraph.GetTextureDesc(source);
                fullDesc.name = "_KawaGodRaySceneCopy";
                fullDesc.clearBuffer = false;
                fullDesc.depthBufferBits = 0; // already a color-format desc; explicit for clarity/parity with the compat-mode RTHandle path below

                using (new RenderGraphProfilingScope(renderGraph, profilingSampler))
                {
                    var sceneCopy = renderGraph.CreateTexture(fullDesc);

                    var halfDesc = fullDesc;
                    halfDesc.width = Mathf.Max(1, fullDesc.width / 2);
                    halfDesc.height = Mathf.Max(1, fullDesc.height / 2);
                    halfDesc.name = "_KawaGodRayBrightA";
                    var brightHalf = renderGraph.CreateTexture(halfDesc);
                    halfDesc.name = "_KawaGodRayBrightB";
                    var blurHalf = renderGraph.CreateTexture(halfDesc);

                    // Step 1: keep an untouched copy of scene color -- the composite pass needs
                    // the original image (not the thresholded/blurred one) to add light shafts on
                    // top of.
                    //
                    // Deliberately uses the generic (material-less) AddBlitPass overload here
                    // rather than calling RenderGraphUtils.AddCopyPass directly: AddCopyPass
                    // *throws* ArgumentException on any platform/render-graph configuration that
                    // doesn't support native render passes, whereas this overload transparently
                    // falls back to a full quad blit when a true copy isn't available. This is
                    // exactly the pattern URP's own FullScreenPassRendererFeature uses for its
                    // optional scene-color copy (and what AquaGodRayPass / KawaRefractionFeature's
                    // RefractionPass both already do), so it is safe across every platform this
                    // project ships to.
                    renderGraph.AddBlitPass(source, sceneCopy, Vector2.one, Vector2.zero, passName: "KawaGodRay Scene Copy");

                    // Step 2: threshold + sun-proximity window + waterline-neighbourhood mask +
                    // beam-noise seed, downsampled to half-res (running the radial blur at half
                    // resolution is what keeps a full-screen effect like this cheap enough for
                    // mobile while still reading as smooth once composited).
                    renderGraph.AddBlitPass(
                        new RenderGraphUtils.BlitMaterialParameters(source, brightHalf, _material, ThresholdPass),
                        "KawaGodRay Threshold");

                    // Step 3: two radial-blur passes (see KawaGodRays.shader's RadialBlur pass)
                    // smear the seed samples into long, soft, banding-free shafts. Two iterations
                    // of a "cheap" N-tap radial blur look noticeably smoother than one and still
                    // cost far less than a true volumetric raymarch.
                    renderGraph.AddBlitPass(
                        new RenderGraphUtils.BlitMaterialParameters(brightHalf, blurHalf, _material, RadialBlurPass),
                        "KawaGodRay Radial Blur A");
                    renderGraph.AddBlitPass(
                        new RenderGraphUtils.BlitMaterialParameters(blurHalf, brightHalf, _material, RadialBlurPass),
                        "KawaGodRay Radial Blur B");

                    // Step 4: composite the rays back onto the untouched scene copy, writing the
                    // full result (scene + rays, hard-clipped to underwater by the shader) straight
                    // to the camera's active color target with Blend Off. This deliberately avoids
                    // additive-blitting onto the still-bound active target, which would leave
                    // RenderGraph's load/blend state for that target ambiguous -- writing the
                    // complete color once is unambiguous either way.
                    using (var builder = renderGraph.AddRasterRenderPass<CompositePassData>("KawaGodRay Composite", out var passData))
                    {
                        passData.material = _material;
                        passData.sceneCopy = sceneCopy;
                        passData.rayTexture = brightHalf;

                        builder.SetRenderAttachment(source, 0, AccessFlags.Write);
                        builder.UseTexture(sceneCopy, AccessFlags.Read);
                        builder.UseTexture(brightHalf, AccessFlags.Read);

                        // Setting a global texture (or a Material's own texture slot) from inside
                        // SetRenderFunc mutates state the graph does not track as a pass
                        // dependency, so reordering must be disabled for this pass -- the same
                        // call URP's own Bloom-into-UberPost composite pass makes for the same
                        // reason (PostProcessPassRenderGraph.RenderUberPost,
                        // "builder.AllowGlobalStateModification(true)"), and what AquaGodRayPass
                        // does for its own Composite pass.
                        builder.AllowGlobalStateModification(true);

                        // "static" here is not just style: it is what guarantees the compiler can
                        // cache this delegate instead of allocating a new closure every frame (the
                        // lambda touches only its own parameters plus static/const fields, so a
                        // static lambda is valid) -- the same discipline URP's own RenderGraph
                        // passes use (e.g. PostProcessPassRenderGraph.RenderUberPost's
                        // SetRenderFunc), and what AquaGodRayPass does for its own Composite pass.
                        builder.SetRenderFunc(static (CompositePassData data, RasterGraphContext context) =>
                        {
                            context.cmd.SetGlobalTexture(KawaRayTexId, data.rayTexture);
                            Blitter.BlitTexture(context.cmd, data.sceneCopy, FullscreenScaleBias, data.material, CompositePass);
                        });
                    }
                }
            }

#if URP_COMPATIBILITY_MODE
            // --- Compatibility Mode (RenderGraph disabled) fallback ----------------------------
            // ScriptableRenderPass.Configure/Execute in this URP version (17.3, Unity 6000.3) are
            // themselves only compiled into the base class when URP_COMPATIBILITY_MODE is defined
            // (see UniversalRenderPipelineGlobalSettings.m_EnableRenderCompatibilityMode and
            // ScriptableRenderPass.cs) -- they do not exist to override at all otherwise. This
            // project currently runs with RenderGraph enabled (the symbol is undefined for this
            // compile), so this entire block does not compile or execute today; RecordRenderGraph
            // above is the code path that actually runs. It is kept, intentionally, as a
            // version-safe fallback should Compatibility Mode ever be switched back on for this
            // project or a project this code is copied into. Mirrors AquaGodRayPass's own such
            // fallback.
#pragma warning disable CS0618 // Configure/Execute/OnCameraSetup are [Obsolete] by design in this URP version (RenderGraph is preferred) - this override intentionally targets Compatibility Mode only.
#pragma warning disable CS0672 // Member overrides an obsolete member without itself being marked obsolete - intentional, see block comment above.
            public override void Configure(CommandBuffer cmd, RenderTextureDescriptor cameraTextureDescriptor)
            {
                var fullDesc = cameraTextureDescriptor;
                fullDesc.msaaSamples = 1;
                fullDesc.depthBufferBits = 0;
                RenderingUtils.ReAllocateHandleIfNeeded(ref _sceneCopyHandle, fullDesc, FilterMode.Bilinear, TextureWrapMode.Clamp, name: "_KawaGodRaySceneCopy");

                var halfDesc = fullDesc;
                halfDesc.width = Mathf.Max(1, fullDesc.width / 2);
                halfDesc.height = Mathf.Max(1, fullDesc.height / 2);
                RenderingUtils.ReAllocateHandleIfNeeded(ref _brightHalfHandleA, halfDesc, FilterMode.Bilinear, TextureWrapMode.Clamp, name: "_KawaGodRayBrightA");
                RenderingUtils.ReAllocateHandleIfNeeded(ref _brightHalfHandleB, halfDesc, FilterMode.Bilinear, TextureWrapMode.Clamp, name: "_KawaGodRayBrightB");
            }

            public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)
            {
                if (_material == null)
                {
                    return;
                }

                var cmd = CommandBufferPool.Get("KawaGodRay");
                using (new ProfilingScope(cmd, profilingSampler))
                {
                    var cameraColor = renderingData.cameraData.renderer.cameraColorTargetHandle;

                    Blitter.BlitCameraTexture(cmd, cameraColor, _sceneCopyHandle);
                    Blitter.BlitCameraTexture(cmd, cameraColor, _brightHalfHandleA, _material, ThresholdPass);
                    Blitter.BlitCameraTexture(cmd, _brightHalfHandleA, _brightHalfHandleB, _material, RadialBlurPass);
                    Blitter.BlitCameraTexture(cmd, _brightHalfHandleB, _brightHalfHandleA, _material, RadialBlurPass);

                    cmd.SetGlobalTexture(KawaRayTexId, _brightHalfHandleA);
                    Blitter.BlitCameraTexture(cmd, _sceneCopyHandle, cameraColor, _material, CompositePass);
                }

                context.ExecuteCommandBuffer(cmd);
                cmd.Clear();
                CommandBufferPool.Release(cmd);
            }
#pragma warning restore CS0672
#pragma warning restore CS0618
#endif

            private sealed class CompositePassData
            {
                internal Material material;
                internal TextureHandle sceneCopy;
                internal TextureHandle rayTexture;
            }
        }

        private static readonly Vector4 FullscreenScaleBias = new Vector4(1f, 1f, 0f, 0f);
    }
}
