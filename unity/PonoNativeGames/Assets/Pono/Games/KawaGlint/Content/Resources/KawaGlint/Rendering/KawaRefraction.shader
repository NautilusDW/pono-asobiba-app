// Full-screen waterline-masked refraction + squashed-mirror-reflection + underwater shimmer pass
// (visual goals b: refraction/reflection and, incidentally, part of the underwater shimmer feel).
// Consumed by Pono.KawaGlint.Rendering.KawaRefractionFeature, which blits a same-frame copy of the
// camera color (see the feature's RecordRenderGraph) as _BlitTexture through this shader and writes
// the result back over the active camera color target. Everything above the waterline passes
// through untouched -- all masks below evaluate to exactly zero there.
Shader "Pono/KawaGlint/Refraction"
{
    // No editable Properties block: this Material is always created procedurally at runtime
    // (CoreUtils.CreateEngineMaterial in KawaRefractionFeature) and every uniform below is driven
    // every frame from KawaRefractionVolume via Shader.PropertyToID-cached Material.SetFloat
    // calls -- never edited in the Inspector.
    SubShader
    {
        Tags { "RenderPipeline" = "UniversalPipeline" }

        Cull Off
        ZWrite Off
        ZTest Always

        Pass
        {
            Name "KawaRefraction"

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma target 3.5

            // INTEGRATION FIX (carried over from AquaWaterDistortion.shader): the "Common.hlsl +
            // TextureXR.hlsl + Blit.hlsl" include set does not compile on Metal. Blit.hlsl's
            // FragOctahedralProject function (unused here, but still part of the same translation
            // unit) calls UnpackNormalOctQuadEncode, which lives in Packing.hlsl -- not pulled in
            // by either Common.hlsl or TextureXR.hlsl. URP's own Core.hlsl pulls in Common.hlsl +
            // Packing.hlsl + a robust TEXTURE2D_X definition in one step and is exactly what URP's
            // own Blit.hlsl consumers (e.g. Shaders/Utils/CoreBlit.shader in this same package)
            // include before Blit.hlsl.
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            // Provides Vert(), the Attributes/Varyings structs, _BlitTexture and _BlitScaleBias.
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"

            CBUFFER_START(UnityPerMaterial)
                float _RefractionStrength;
                float _ReflectionStrength;
                float _ShimmerStrength;
                float _WaveScale;
                float _Speed;
                float _ChromaticShift;
                float _WaterlineY;
                float _KawaTime;
                float _ScreenAspect;
            CBUFFER_END

            // Self-contained 2D value noise (no noise texture asset -- this spike ships zero
            // authored .mat/.tex assets; everything is generated in code/shader). Reused at
            // several frequencies/speeds below to drive the refraction flow field, the squashed
            // reflection's own wobble, and the underwater shimmer sparkle/banding from one shared
            // noise field.
            float Hash21(float2 p)
            {
                return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
            }

            float ValueNoise(float2 p)
            {
                float2 i = floor(p);
                float2 f = frac(p);
                // Quintic ("improved fade") smoothing instead of a cubic smoothstep: it has a
                // continuous second derivative, which avoids faint grid-aligned seams once this
                // noise is used to displace sampling UVs.
                float2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

                float a = Hash21(i + float2(0.0, 0.0));
                float b = Hash21(i + float2(1.0, 0.0));
                float c = Hash21(i + float2(0.0, 1.0));
                float d = Hash21(i + float2(1.0, 1.0));

                return lerp(lerp(a, b, u.x), lerp(c, d, u.x), u.y);
            }

            float4 Frag(Varyings input) : SV_Target
            {
                // uv.y == 1 is the top of frame (matches the viewport/world-Y convention used
                // throughout this spike's shared contract -- see DESIGN.md).
                float2 uv = input.texcoord.xy;

                float t = _KawaTime * _Speed;
                // Aspect-correcting the sample lattice keeps flow-noise blobs visually round
                // instead of stretched on non-square viewports.
                float2 p = uv * float2(_ScreenAspect, 1.0) * _WaveScale;

                // underMask: 1 below the waterline, 0 above, with a small feather so the crest
                // line itself does not alias against the refraction mask boundary.
                float underMask = smoothstep(_WaterlineY + 0.004, _WaterlineY - 0.02, uv.y);

                // Wobble is strongest just under the surface and calms with depth -- the inverse
                // of AquaLumina's depthFactor (that scene's water surface sits near the top of
                // frame; this one's waterline sits mid-frame with "deep" extending toward uv.y=0).
                float nearSurface = 1.0 - saturate((_WaterlineY - uv.y) / 0.45);
                float depthAmp = lerp(0.55, 1.6, pow(nearSurface, 1.5));

                // Two-octave flow field (coarse + a finer, faster-moving octave so the water reads
                // as turbulent rather than one smooth wave) -- identical technique to
                // AquaWaterDistortion.shader's flow field, decorrelated offsets included.
                float2 flow;
                flow.x = ValueNoise(p * 3.1 + float2(t * 0.9, t * 0.23)) - 0.5;
                flow.y = ValueNoise(p * 2.7 + float2(-t * 0.31, t * 0.77) + 17.3) - 0.5;

                float2 fineOctave = float2(
                    ValueNoise(p * 7.9 + t * 1.7),
                    ValueNoise(p * 8.3 - t * 1.3 + 5.1)) - 0.5;
                flow += fineOctave * 0.35;

                // Vertical bias on the displacement (flow.x damped, flow.y full strength): a
                // vertical stretch-ripple reads as water in a side-on cutaway view, whereas an
                // even horizontal/vertical mix reads more like a top-down pond.
                float2 offset = float2(flow.x * 0.6, flow.y) * _RefractionStrength * depthAmp * underMask;

                // Fade the offset to zero at the frame border so the full-screen blit never
                // samples/smears content from outside the valid 0-1 UV range.
                float2 edge = smoothstep(0.0, 0.06, uv) * smoothstep(1.0, 0.94, uv);
                offset *= min(edge.x, edge.y);

                // Subtle per-channel UV split reads as gentle chromatic refraction right at the
                // waterline. Masked by underMask so the untouched sky/shore above the line never
                // picks up any fringing. Deliberately derived only from _ChromaticShift and the
                // *direction* of the flow field -- it does NOT multiply against `offset` (which
                // already carries _RefractionStrength's own 0-0.05 range and depthAmp), keeping
                // the two Volume-exposed sliders independent.
                float flowLen = length(flow);
                float2 flowDir = flowLen > 1e-5 ? flow / flowLen : float2(0.0, 0.0);
                float2 chromaOffset = flowDir * _ChromaticShift * 0.5 * underMask;

                float4 col = 1.0;
                col.r = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv + offset + chromaOffset).r;
                col.g = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv + offset).g;
                col.b = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv + offset - chromaOffset).b;

                // Squashed-mirror reflection: the canonical free-2D-water-shader trick -- resample
                // a vertically-compressed mirror of the region ABOVE the waterline and blend it
                // into the band just BELOW the line, so the shore/sky appear to shimmer in the
                // water's surface without any reflection camera or probe.
                float reflDist = _WaterlineY - uv.y;
                // Only meaningful where reflDist > 0 (i.e. underwater, where underMask is already
                // ~1); the multiplication by underMask below also zeroes this out above the line,
                // where reflDist would otherwise go negative.
                float2 mirrorUv = float2(uv.x, min(_WaterlineY + reflDist * 2.2, 0.998)) + flow * _RefractionStrength * 1.5;
                float reflMask = underMask * exp(-reflDist / 0.055) * _ReflectionStrength;
                float3 mirrorSample = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, mirrorUv).rgb;
                col.rgb = lerp(col.rgb, mirrorSample, saturate(reflMask * 0.55));

                // Underwater-only shimmer: a fast sparkle plus a slow ambient band, both scaled by
                // _ShimmerStrength and masked to underMask so the sky/shore above the line is
                // never modulated. Amplitudes are deliberately small -- no large-area strobing
                // above ~3 Hz (child-safe).
                float sparkle = ValueNoise(p * 13.0 + t * 2.4);
                col.rgb *= 1.0 + _ShimmerStrength * 0.15 * (sparkle * 2.0 - 1.0) * underMask;

                float band = ValueNoise(float2(uv.x * 3.0 + t * 0.2, uv.y * 1.5));
                col.rgb *= 1.0 + _ShimmerStrength * 0.08 * (band - 0.5) * underMask;

                // Above the waterline every mask term is exactly zero, so col is the untouched
                // camera color sample -- alpha is never read downstream (this pass overwrites the
                // opaque camera color target outright), kept at 1.0 to avoid any accidental blend-
                // state surprise if that ever changes.
                col.a = 1.0;
                return col;
            }
            ENDHLSL
        }
    }
}
