using System;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.RenderGraphModule;
using UnityEngine.Rendering.RenderGraphModule.Util;
using UnityEngine.Rendering.Universal;

namespace Pono.AquaLumina.Rendering
{
    /// <summary>
    /// Screen-space god-ray (light shaft) renderer feature: a GPU Gems 3 ch.13
    /// ("Volumetric Light Scattering as a Post-Process") radial-scatter blur seeded from a
    /// thresholded, noise-modulated bright pass and composited back onto the scene.
    ///
    /// This project runs with RenderGraph enabled (Assets/UniversalRenderPipelineGlobalSettings
    /// .asset has m_EnableRenderCompatibilityMode: 0), so <see cref="AquaGodRayPass.RecordRenderGraph"/>
    /// is the code path that actually executes. The nested pass also implements the legacy
    /// Configure/Execute Compatibility Mode path purely as a version-safe fallback - see the
    /// large comment at the top of that block for why it is gated behind
    /// <c>URP_COMPATIBILITY_MODE</c> rather than merely marked [Obsolete].
    ///
    /// Instantiated and wired up entirely by an Editor script (this feature has zero
    /// [SerializeField] Inspector configuration by design - see class-level brief), so it must
    /// work correctly when created via <c>ScriptableObject.CreateInstance&lt;AquaGodRayFeature&gt;()</c>
    /// with no further setup beyond appending it to a Renderer2DData's feature list.
    /// </summary>
    public sealed class AquaGodRayFeature : ScriptableRendererFeature
    {
        private const string ShaderResourcePath = "AquaLumina/Rendering/AquaGodRays";
        private const string ShaderFallbackName = "Pono/AquaLumina/GodRays";

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
        private static readonly int AquaTimeId = Shader.PropertyToID("_AquaTime");
        private static readonly int AquaRayTexId = Shader.PropertyToID("_AquaRayTex");

        private Material _material;
        private AquaGodRayPass _pass;
        private bool _disabled;
        private bool _warnedOnce;

        /// <inheritdoc/>
        public override void Create()
        {
            // Cheap and side-effect-free: only allocates the pass wrapper. Shader/material
            // setup is deliberately deferred to first actual use (see EnsureMaterial) so that
            // creating this feature (e.g. via ScriptableObject.CreateInstance from an Editor
            // script, before any scene even references it) never touches Resources.Load.
            if (_pass == null)
            {
                _pass = new AquaGodRayPass();
            }
        }

        /// <inheritdoc/>
        public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData renderingData)
        {
            if (_disabled)
            {
                return;
            }

            var cameraType = renderingData.cameraData.cameraType;
            if (cameraType != CameraType.Game && cameraType != CameraType.SceneView)
            {
                return;
            }

            var volume = VolumeManager.instance.stack.GetComponent<AquaGodRayVolume>();
            if (volume == null || !volume.IsActive())
            {
                return;
            }

            EnsureMaterial();
            if (_disabled)
            {
                return;
            }

            PushUniforms(volume);

            // renderPassEvent / requiresIntermediateTexture are constant for the pass's entire
            // lifetime (see the INTEGRATION FIX comment in AquaGodRayPass's constructor for why
            // AfterRenderingPostProcessing specifically is required), so both are set once there
            // rather than reassigned on every AddRenderPasses call.
            _pass.SetMaterial(_material);
            renderer.EnqueuePass(_pass);
        }

        /// <inheritdoc/>
        protected override void Dispose(bool disposing)
        {
            CoreUtils.Destroy(_material);
            _material = null;
            // Drop the pass's copy of the reference too, so it can't hold on to a destroyed
            // Material if the pass object outlives this Dispose call for any reason.
            _pass?.SetMaterial(null);
#if URP_COMPATIBILITY_MODE
            // Only meaningful in Compatibility Mode: releases the pass's persistent RTHandles.
            // RenderGraph transient textures (the RecordRenderGraph path this project actually
            // runs) need no such cleanup - they are pooled/released by the graph itself.
            _pass?.ReleaseCompatibilityHandles();
#endif
        }

        private void EnsureMaterial()
        {
            if (_disabled || _material != null)
            {
                return;
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
                    Demote("shader is missing from Resources and Shader.Find, or unsupported on this platform");
                    return;
                }

                _material = CoreUtils.CreateEngineMaterial(shader);
                if (_material == null)
                {
                    Demote("material creation failed for the resolved shader");
                }
            }
            catch (Exception exception)
            {
                // Mirrors the FluidInk "demote once, never retry" fallback pattern used
                // elsewhere in this project (ComputeFluidInkBackend/FluidInkPresenter): a
                // rendering spike must never repeatedly attempt (and fail) expensive setup
                // every frame, and must never let a rendering-setup exception take the scene
                // down with it.
                Demote($"unexpected exception during setup ({exception.GetType().Name}: {exception.Message})");
            }
        }

        private void Demote(string reason)
        {
            _disabled = true;
            CoreUtils.Destroy(_material);
            _material = null;
            if (!_warnedOnce)
            {
                _warnedOnce = true;
                Debug.LogWarning(
                    $"[AquaGodRayFeature] God rays permanently disabled: {reason}. The scene renders normally without them.");
            }
        }

        private void PushUniforms(AquaGodRayVolume volume)
        {
            // Pushed once per frame here (not per-pass, not via a MaterialPropertyBlock) because
            // AddRenderPasses runs entirely before RenderGraph recording/execution even begins -
            // there is no risk of these values changing mid-graph for this frame, and this avoids
            // any allocation (SetFloat/SetVector/SetColor on an existing Material never allocate).
            _material.SetFloat(IntensityId, volume.intensity.value);
            _material.SetFloat(DensityId, volume.density.value);
            _material.SetFloat(DecayId, volume.decay.value);
            _material.SetFloat(SampleCountId, volume.sampleCount.value);

            var lightViewportPosition = volume.lightViewportPosition.value;
            _material.SetVector(LightViewportPosId, new Vector4(lightViewportPosition.x, lightViewportPosition.y, 0f, 0f));

            _material.SetFloat(ThresholdId, volume.threshold.value);
            _material.SetFloat(BeamNoiseStrengthId, volume.beamNoiseStrength.value);
            _material.SetColor(TintId, volume.tint.value);

            // Core Blit.hlsl-based passes do not populate the engine's built-in _Time, so the
            // shader's animated beam noise reads this instead (see class doc on AquaGodRays.shader).
            _material.SetFloat(AquaTimeId, Time.time);
        }

        /// <summary>
        /// The actual render pass. Kept as a private nested class (mirrors
        /// FullScreenPassRendererFeature.FullScreenRenderPass in the URP package itself) so it
        /// can freely reach the outer feature's cached property IDs/pass indices without
        /// duplicating them.
        /// </summary>
        private sealed class AquaGodRayPass : ScriptableRenderPass
        {
            private Material _material;

#if URP_COMPATIBILITY_MODE
            private RTHandle _sceneCopyHandle;
            private RTHandle _brightHalfHandleA;
            private RTHandle _brightHalfHandleB;
#endif

            public AquaGodRayPass()
            {
                profilingSampler = new ProfilingSampler("AquaGodRay");

                // INTEGRATION FIX (see AquaLumina/README.md integration notes): the original value
                // here was BeforeRenderingPostProcessing + 1, which crashed every frame on the URP
                // 2D Renderer with "texture handle does not have a valid descriptor ... commonly
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
                // post-processing straight to the back buffer - which this pass then tried (and
                // failed) to read back as a normal RenderGraph texture.
                //
                // Using the exact enum value here satisfies both checks: it still lands in the
                // AfterRenderingPostProcessing bucket (so it still runs after the water-distortion
                // feature, which sits at exactly BeforeRenderingPostProcessing - an earlier
                // bucket, processed in an earlier RecordCustomRenderGraphPasses call - regardless
                // of the two features' order on the Renderer2DData asset), and it correctly
                // signals the renderer to keep an intermediate camera-color target alive for this
                // pass to read from.
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
                fullDesc.name = "_AquaGodRaySceneCopy";
                fullDesc.clearBuffer = false;
                fullDesc.depthBufferBits = 0; // already a color-format desc; explicit for clarity/parity with the compat-mode RTHandle path below
                var sceneCopy = renderGraph.CreateTexture(fullDesc);

                var halfDesc = fullDesc;
                halfDesc.width = Mathf.Max(1, fullDesc.width / 2);
                halfDesc.height = Mathf.Max(1, fullDesc.height / 2);
                halfDesc.name = "_AquaGodRayBrightA";
                var brightHalf = renderGraph.CreateTexture(halfDesc);
                halfDesc.name = "_AquaGodRayBrightB";
                var blurHalf = renderGraph.CreateTexture(halfDesc);

                // Step 1: keep an untouched copy of scene color - the composite pass needs the
                // original image (not the thresholded/blurred one) to add light shafts on top of.
                //
                // Deliberately uses the generic (material-less) AddBlitPass overload here rather
                // than calling RenderGraphUtils.AddCopyPass directly: AddCopyPass *throws*
                // ArgumentException on any platform/render-graph configuration that doesn't
                // support native render passes, whereas this overload transparently falls back to
                // a full quad blit when a true copy isn't available. This is exactly the pattern
                // URP's own FullScreenPassRendererFeature uses for its optional scene-color copy,
                // so it is safe across every platform this project ships to.
                renderGraph.AddBlitPass(source, sceneCopy, Vector2.one, Vector2.zero, passName: "AquaGodRay Scene Copy");

                // Step 2: threshold + vertical falloff + beam-noise seed, downsampled to half-res
                // (running the radial blur at half resolution is what keeps a full-screen effect
                // like this cheap enough for mobile while still reading as smooth once composited).
                renderGraph.AddBlitPass(
                    new RenderGraphUtils.BlitMaterialParameters(source, brightHalf, _material, ThresholdPass),
                    "AquaGodRay Threshold");

                // Step 3: two radial-blur passes (see AquaGodRays.shader's RadialBlur pass) smear
                // the seed samples into long, soft, banding-free shafts. Two iterations of a
                // "cheap" N-tap radial blur look noticeably smoother than one and still cost far
                // less than a true volumetric raymarch.
                renderGraph.AddBlitPass(
                    new RenderGraphUtils.BlitMaterialParameters(brightHalf, blurHalf, _material, RadialBlurPass),
                    "AquaGodRay Radial Blur A");
                renderGraph.AddBlitPass(
                    new RenderGraphUtils.BlitMaterialParameters(blurHalf, brightHalf, _material, RadialBlurPass),
                    "AquaGodRay Radial Blur B");

                // Step 4: composite the rays back onto the untouched scene copy, writing the full
                // result (scene + rays) straight to the camera's active color target with
                // Blend Off. This deliberately avoids additive-blitting onto the still-bound
                // active target, which would leave RenderGraph's load/blend state for that target
                // ambiguous - writing the complete color once is unambiguous either way.
                using (var builder = renderGraph.AddRasterRenderPass<CompositePassData>("AquaGodRay Composite", out var passData))
                {
                    passData.material = _material;
                    passData.sceneCopy = sceneCopy;
                    passData.rayTexture = brightHalf;

                    builder.SetRenderAttachment(source, 0, AccessFlags.Write);
                    builder.UseTexture(sceneCopy, AccessFlags.Read);
                    builder.UseTexture(brightHalf, AccessFlags.Read);

                    // Setting a global texture (or a Material's own texture slot) from inside
                    // SetRenderFunc mutates state the graph does not track as a pass dependency,
                    // so reordering must be disabled for this pass - the same call URP's own
                    // Bloom-into-UberPost composite pass makes for the same reason
                    // (PostProcessPassRenderGraph.RenderUberPost, "builder.AllowGlobalStateModification(true)").
                    builder.AllowGlobalStateModification(true);

                    // "static" here is not just style: it is what guarantees the compiler can
                    // cache this delegate instead of allocating a new closure every frame (the
                    // lambda touches only its own parameters plus static/const fields, so a
                    // static lambda is valid) - the same discipline URP's own RenderGraph passes
                    // use (e.g. PostProcessPassRenderGraph.RenderUberPost's SetRenderFunc).
                    builder.SetRenderFunc(static (CompositePassData data, RasterGraphContext context) =>
                    {
                        context.cmd.SetGlobalTexture(AquaRayTexId, data.rayTexture);
                        Blitter.BlitTexture(context.cmd, data.sceneCopy, FullscreenScaleBias, data.material, CompositePass);
                    });
                }
            }

#if URP_COMPATIBILITY_MODE
            // --- Compatibility Mode (RenderGraph disabled) fallback ----------------------------
            // ScriptableRenderPass.Configure/Execute in this URP version (17.3, Unity 6000.3) are
            // themselves only compiled into the base class when URP_COMPATIBILITY_MODE is defined
            // (see UniversalRenderPipelineGlobalSettings.m_EnableRenderCompatibilityMode and
            // ScriptableRenderPass.cs) - they do not exist to override at all otherwise. This
            // project currently runs with RenderGraph enabled (the symbol is undefined for this
            // compile), so this entire block does not compile or execute today; RecordRenderGraph
            // above is the code path that actually runs. It is kept, intentionally, as a
            // version-safe fallback should Compatibility Mode ever be switched back on for this
            // project or a project this code is copied into.
#pragma warning disable CS0618 // Configure/Execute/OnCameraSetup are [Obsolete] by design in this URP version (RenderGraph is preferred) - this override intentionally targets Compatibility Mode only.
#pragma warning disable CS0672 // Member overrides an obsolete member without itself being marked obsolete - intentional, see block comment above.
            public override void Configure(CommandBuffer cmd, RenderTextureDescriptor cameraTextureDescriptor)
            {
                var fullDesc = cameraTextureDescriptor;
                fullDesc.msaaSamples = 1;
                fullDesc.depthBufferBits = 0;
                RenderingUtils.ReAllocateHandleIfNeeded(ref _sceneCopyHandle, fullDesc, FilterMode.Bilinear, TextureWrapMode.Clamp, name: "_AquaGodRaySceneCopy");

                var halfDesc = fullDesc;
                halfDesc.width = Mathf.Max(1, fullDesc.width / 2);
                halfDesc.height = Mathf.Max(1, fullDesc.height / 2);
                RenderingUtils.ReAllocateHandleIfNeeded(ref _brightHalfHandleA, halfDesc, FilterMode.Bilinear, TextureWrapMode.Clamp, name: "_AquaGodRayBrightA");
                RenderingUtils.ReAllocateHandleIfNeeded(ref _brightHalfHandleB, halfDesc, FilterMode.Bilinear, TextureWrapMode.Clamp, name: "_AquaGodRayBrightB");
            }

            public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)
            {
                if (_material == null)
                {
                    return;
                }

                var cmd = CommandBufferPool.Get("AquaGodRay");
                using (new ProfilingScope(cmd, profilingSampler))
                {
                    var cameraColor = renderingData.cameraData.renderer.cameraColorTargetHandle;

                    Blitter.BlitCameraTexture(cmd, cameraColor, _sceneCopyHandle);
                    Blitter.BlitCameraTexture(cmd, cameraColor, _brightHalfHandleA, _material, ThresholdPass);
                    Blitter.BlitCameraTexture(cmd, _brightHalfHandleA, _brightHalfHandleB, _material, RadialBlurPass);
                    Blitter.BlitCameraTexture(cmd, _brightHalfHandleB, _brightHalfHandleA, _material, RadialBlurPass);

                    cmd.SetGlobalTexture(AquaRayTexId, _brightHalfHandleA);
                    Blitter.BlitCameraTexture(cmd, _sceneCopyHandle, cameraColor, _material, CompositePass);
                }

                context.ExecuteCommandBuffer(cmd);
                cmd.Clear();
                CommandBufferPool.Release(cmd);
            }
#pragma warning restore CS0672
#pragma warning restore CS0618

            public void ReleaseCompatibilityHandles()
            {
                _sceneCopyHandle?.Release();
                _sceneCopyHandle = null;
                _brightHalfHandleA?.Release();
                _brightHalfHandleA = null;
                _brightHalfHandleB?.Release();
                _brightHalfHandleB = null;
            }
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
