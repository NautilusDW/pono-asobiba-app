using System;
using UnityEngine;
using UnityEngine.Experimental.Rendering;
using UnityEngine.Rendering;
using UnityEngine.Rendering.RenderGraphModule;
using UnityEngine.Rendering.RenderGraphModule.Util;
using UnityEngine.Rendering.Universal;

namespace Pono.AquaLumina.Rendering
{
    /// <summary>
    /// Full-screen refraction/shimmer pass (visual goals c + d) that self-sources camera color
    /// via an in-pass copy instead of requesting <c>_CameraOpaqueTexture</c>, so it never needs
    /// the shared <c>UniversalRP.asset</c>'s <c>m_RequireOpaqueTexture</c>/<c>m_RequireDepthTexture</c>
    /// flags flipped on -- those stay untouched at the pipeline level, which is what keeps the two
    /// already-shipping games (HideSeekCreatures, ColorWaterDelivery) byte-for-byte unaffected.
    /// </summary>
    /// <remarks>
    /// Follows the same defensive skeleton as every other GPU-dependent effect in this project
    /// (see ComputeFluidInkBackend/CpuInkVisualBackend in HideSeekCreatures): lazily build the
    /// material, and on ANY failure (missing shader, unsupported platform, unexpected exception
    /// while recording the render graph) permanently disable the feature and log exactly one
    /// warning, rather than retrying or spamming the console every frame. The scene then simply
    /// renders undistorted, which is an acceptable degradation for a rendering tech spike.
    /// </remarks>
    public sealed class AquaWaterDistortionFeature : ScriptableRendererFeature
    {
        private const string ShaderResourcePath = "AquaLumina/Rendering/AquaWaterDistortion";
        private const string ShaderFallbackName = "Pono/AquaLumina/WaterDistortion";

        private static readonly int RefractionStrengthId = Shader.PropertyToID("_RefractionStrength");
        private static readonly int ShimmerStrengthId = Shader.PropertyToID("_ShimmerStrength");
        private static readonly int WaveScaleId = Shader.PropertyToID("_WaveScale");
        private static readonly int SpeedId = Shader.PropertyToID("_Speed");
        private static readonly int ChromaticShiftId = Shader.PropertyToID("_ChromaticShift");
        private static readonly int AquaTimeId = Shader.PropertyToID("_AquaTime");
        private static readonly int ScreenAspectId = Shader.PropertyToID("_ScreenAspect");

        private WaterDistortionPass _pass;
        private Material _material;
        private bool _disabled;
        private bool _warned;

        public override void Create()
        {
            // Re-entrant: Unity calls Create() on every domain reload/serialization pass, and
            // this must also tolerate a bare ScriptableObject.CreateInstance() with no further
            // lifecycle callbacks (e.g. from an EditMode test) without throwing.
            _pass ??= new WaterDistortionPass(ReportFailure)
            {
                renderPassEvent = RenderPassEvent.BeforeRenderingPostProcessing,
                requiresIntermediateTexture = true,
            };
        }

        public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData renderingData)
        {
            if (_disabled)
            {
                return;
            }

            // Defensive lazy-init in case AddRenderPasses is ever reached without Unity having
            // driven the normal Create() lifecycle first (see Create()'s remarks above).
            if (_pass == null)
            {
                Create();
            }

            // Preview/Reflection cameras never carry a meaningful Volume stack for this scene
            // and would just waste a full-screen pass every frame; only Game and SceneView
            // cameras (for in-Editor authoring/QA) should ever run this effect.
            var cameraType = renderingData.cameraData.cameraType;
            if (cameraType != CameraType.Game && cameraType != CameraType.SceneView)
            {
                return;
            }

            var volume = VolumeManager.instance.stack.GetComponent<AquaWaterDistortionVolume>();
            if (volume == null || !volume.active || !volume.IsActive())
            {
                return;
            }

            if (!EnsureMaterial())
            {
                return;
            }

            // Per-frame uniforms are set here (not inside the pass) because this method already
            // runs once per camera per frame regardless of RenderGraph vs. Compatibility Mode --
            // Material.SetFloat mutates the Material object directly, so whichever path actually
            // executes later this frame (RecordRenderGraph or the legacy Execute()) reads the
            // values set here.
            var descriptor = renderingData.cameraData.cameraTargetDescriptor;
            // UniversalCameraData.pixelWidth/pixelHeight are internal to the URP assembly and
            // not visible from here; cameraTargetDescriptor.width/height is the public
            // equivalent and yields the same aspect ratio for our purposes.
            var aspect = descriptor.height > 0 ? descriptor.width / (float)descriptor.height : 1f;

            _material.SetFloat(RefractionStrengthId, volume.refractionStrength.value);
            _material.SetFloat(ShimmerStrengthId, volume.shimmerStrength.value);
            _material.SetFloat(WaveScaleId, volume.waveScale.value);
            _material.SetFloat(SpeedId, volume.speed.value);
            _material.SetFloat(ChromaticShiftId, volume.chromaticShift.value);
            _material.SetFloat(AquaTimeId, Time.time);
            _material.SetFloat(ScreenAspectId, aspect);

            _pass.SetMaterial(_material);
            renderer.EnqueuePass(_pass);
        }

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
                    throw new InvalidOperationException(
                        $"Shader '{ShaderFallbackName}' could not be loaded from Resources or Shader.Find, or is unsupported on this platform.");
                }

                var material = CoreUtils.CreateEngineMaterial(shader);
                if (material == null)
                {
                    throw new InvalidOperationException($"CoreUtils.CreateEngineMaterial returned null for '{ShaderFallbackName}'.");
                }

                _material = material;
                return true;
            }
            catch (Exception exception)
            {
                CoreUtils.Destroy(_material);
                _material = null;
                ReportFailure(exception.Message);
                return false;
            }
        }

        private void ReportFailure(string message)
        {
            _disabled = true;
            if (_warned)
            {
                return;
            }
            _warned = true;
            Debug.LogWarning($"[AquaWaterDistortionFeature] Disabled permanently, scene will render undistorted: {message}");
        }

        private sealed class WaterDistortionPass : ScriptableRenderPass
        {
            private readonly Action<string> _onFailure;
            private Material _material;

            // Compatibility-Mode-only temp copy target. Allocated/released per camera via the
            // RTHandle pool (see Configure/OnCameraCleanup below) -- never touched by the
            // RenderGraph path.
            private RTHandle _compatCopyHandle;

            public WaterDistortionPass(Action<string> onFailure)
            {
                _onFailure = onFailure;
                profilingSampler = new ProfilingSampler("AquaWaterDistortion");
            }

            public void SetMaterial(Material material)
            {
                _material = material;
            }

            public void Dispose()
            {
                _compatCopyHandle?.Release();
                _compatCopyHandle = null;
            }

            // --- RenderGraph path (primary; this project targets URP 17.3 / Unity 6.3 with
            // RenderGraph enabled project-wide, m_EnableRenderCompatibilityMode: 0). ---
            public override void RecordRenderGraph(RenderGraph renderGraph, ContextContainer frameData)
            {
                if (_material == null)
                {
                    return;
                }

                try
                {
                    var resourceData = frameData.Get<UniversalResourceData>();
                    var source = resourceData.activeColorTexture;
                    if (!source.IsValid())
                    {
                        return;
                    }

                    var copyDesc = renderGraph.GetTextureDesc(source);
                    copyDesc.name = "_AquaDistortSource";
                    copyDesc.clearBuffer = false;
                    var copy = renderGraph.CreateTexture(copyDesc);

                    // Deliberately use the plain (no-material) AddBlitPass overload for the
                    // scene-copy step rather than calling RenderGraphUtils.AddCopyPass directly.
                    // Raw AddCopyPass throws an ArgumentException whenever
                    // RenderGraph.nativeRenderPassesEnabled is false for the active platform/
                    // backend, and we cannot guarantee that flag across every device this spike
                    // may run on. This AddBlitPass overload internally calls the same
                    // CanAddCopyPass check and transparently uses the fast frame-buffer-fetch
                    // copy path when supported, falling back to a plain Blitter copy otherwise --
                    // same visual result, zero crash risk. It is the exact technique URP's own
                    // FullScreenPassRendererFeature uses for its "fetchColorBuffer" copy step.
                    renderGraph.AddBlitPass(source, copy, Vector2.one, Vector2.zero, passName: "AquaWaterDistortion Copy");

                    var blitParameters = new RenderGraphUtils.BlitMaterialParameters(copy, source, _material, 0);
                    renderGraph.AddBlitPass(blitParameters, "AquaWaterDistortion");
                }
                catch (Exception exception)
                {
                    // Permanently demote instead of throwing again next frame: a RenderGraph
                    // recording failure here is almost always a static platform/API mismatch,
                    // not a transient error, so retrying every frame would only spam the log.
                    _onFailure?.Invoke(exception.Message);
                }
            }

            // --- Compatibility Mode fallback (legacy Execute/Configure/OnCameraCleanup). These
            // APIs are Obsolete under the RenderGraph-only surface but are NOT removed: if this
            // project (or a project reusing this code) ever re-enables
            // m_EnableRenderCompatibilityMode, URP calls Execute() instead of
            // RecordRenderGraph(), and a pass that never overrode it would silently do nothing.
            // This is an intentional, version-safe fallback, not an oversight -- hence the
            // pragma rather than fixing the "obsolete" warnings by deleting the override.
#pragma warning disable CS0618 // Configure/Execute/RenderingData are Obsolete under RenderGraph-only URP 17.
#pragma warning disable CS0672 // Overriding Obsolete Configure/Execute is the intended fallback described above.
            public override void Configure(CommandBuffer cmd, RenderTextureDescriptor cameraTextureDescriptor)
            {
                var desc = cameraTextureDescriptor;
                desc.msaaSamples = 1;
                // Matches URP's own FullScreenPassRendererFeature.ReAllocate: clearing
                // depthStencilFormat (rather than the legacy depthBufferBits) is what satisfies
                // ReAllocateHandleIfNeeded's internal "exactly one of graphicsFormat/
                // depthStencilFormat is set" assertion for a color-only copy target.
                desc.depthStencilFormat = GraphicsFormat.None;
                RenderingUtils.ReAllocateHandleIfNeeded(
                    ref _compatCopyHandle,
                    desc,
                    FilterMode.Bilinear,
                    TextureWrapMode.Clamp,
                    name: "_AquaDistortSourceCompat");
            }

            public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)
            {
                if (_material == null || _compatCopyHandle == null)
                {
                    return;
                }

                var cmd = CommandBufferPool.Get("AquaWaterDistortion");
                try
                {
                    using (new ProfilingScope(cmd, profilingSampler))
                    {
                        var cameraColor = renderingData.cameraData.renderer.cameraColorTargetHandle;
                        Blitter.BlitCameraTexture(cmd, cameraColor, _compatCopyHandle);
                        Blitter.BlitCameraTexture(cmd, _compatCopyHandle, cameraColor, _material, 0);
                    }
                    context.ExecuteCommandBuffer(cmd);
                }
                catch (Exception exception)
                {
                    _onFailure?.Invoke(exception.Message);
                }
                finally
                {
                    CommandBufferPool.Release(cmd);
                }
            }

            public override void OnCameraCleanup(CommandBuffer cmd)
            {
                _compatCopyHandle?.Release();
                _compatCopyHandle = null;
            }
#pragma warning restore CS0672
#pragma warning restore CS0618
        }
    }
}
