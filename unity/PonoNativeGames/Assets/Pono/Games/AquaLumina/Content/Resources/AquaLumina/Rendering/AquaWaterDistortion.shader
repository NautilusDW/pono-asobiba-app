// Full-screen refraction + shimmer pass (visual goals c: refraction/water distortion and
// d: shimmer/ambient water motion combined into a single sample of one flow-noise field).
// Consumed by Pono.AquaLumina.Rendering.AquaWaterDistortionFeature, which blits a same-frame
// copy of the camera color (see the feature's RecordRenderGraph) as _BlitTexture through this
// shader and writes the result back over the active camera color target.
Shader "Pono/AquaLumina/WaterDistortion"
{
    // No editable Properties block: this Material is always created procedurally at runtime
    // (CoreUtils.CreateEngineMaterial in AquaWaterDistortionFeature) and every uniform below is
    // driven every frame from AquaWaterDistortionVolume via Shader.PropertyToID-cached
    // Material.SetFloat calls -- never edited in the Inspector.
    SubShader
    {
        Tags { "RenderPipeline" = "UniversalPipeline" }

        Cull Off
        ZWrite Off
        ZTest Always

        Pass
        {
            Name "AquaWaterDistortion"

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma target 3.5

            // INTEGRATION FIX (see AquaLumina/README.md integration notes): the original
            // "Common.hlsl + TextureXR.hlsl + Blit.hlsl" include set does not compile on Metal.
            // Blit.hlsl's FragOctahedralProject function (unused here, but still part of the
            // same translation unit) calls UnpackNormalOctQuadEncode, which lives in
            // Packing.hlsl - not pulled in by either Common.hlsl or TextureXR.hlsl. (The
            // CoreCopy.shader precedent cited in the original comment does not actually include
            // Blit.hlsl at all, so it never needed Packing.hlsl - verified by reading that file.)
            // URP's own Core.hlsl pulls in Common.hlsl + Packing.hlsl + a robust TEXTURE2D_X
            // definition in one step and is exactly what URP's own Blit.hlsl consumers (e.g.
            // Shaders/Utils/CoreBlit.shader in this same package) include before Blit.hlsl.
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            // Provides Vert(), the Attributes/Varyings structs, _BlitTexture and _BlitScaleBias.
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"

            CBUFFER_START(UnityPerMaterial)
                float _RefractionStrength;
                float _ShimmerStrength;
                float _WaveScale;
                float _Speed;
                float _ChromaticShift;
                float _AquaTime;
                float _ScreenAspect;
            CBUFFER_END

            // Self-contained 2D value noise (no noise texture asset -- this project ships zero
            // authored .mat/.tex assets; everything is generated in code/shader). Reused at
            // several frequencies/speeds below to drive both the refraction flow field and the
            // shimmer sparkle/banding from one shared noise field, which is the whole point of
            // combining goals (c) and (d) into a single pass instead of two.
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
                float2 uv = input.texcoord.xy;

                float t = _AquaTime * _Speed;
                // Aspect-correcting the sample lattice keeps flow-noise blobs visually round
                // instead of stretched on non-square viewports.
                float2 p = uv * float2(_ScreenAspect, 1.0) * _WaveScale;

                float2 flow;
                flow.x = ValueNoise(p * 3.1 + float2(t * 0.9, t * 0.23)) - 0.5;
                flow.y = ValueNoise(p * 2.7 + float2(-t * 0.31, t * 0.77) + 17.3) - 0.5;

                // A finer, faster-moving second octave breaks up the large-scale flow so the
                // water reads as turbulent rather than one smooth wave.
                float2 fineOctave = float2(
                    ValueNoise(p * 7.9 + t * 1.7),
                    ValueNoise(p * 8.3 - t * 1.3 + 5.1)) - 0.5;
                flow += fineOctave * 0.35;

                // Near-surface (top of frame) wobbles a touch more than the "deep" bottom.
                float depthFactor = lerp(0.75, 1.15, uv.y);
                float2 offset = flow * _RefractionStrength * depthFactor;

                // Fade the offset to zero at the frame border so the full-screen blit never
                // samples/smears content from outside the valid 0-1 UV range.
                float2 edge = smoothstep(0.0, 0.06, uv) * smoothstep(1.0, 0.94, uv);
                offset *= min(edge.x, edge.y);

                // Subtle per-channel UV split reads as gentle chromatic refraction at water
                // boundaries without ever exceeding a couple of pixels at 1080p (k stays tiny
                // because _ChromaticShift is clamped to <= 0.01 by the Volume parameter).
                float k = _ChromaticShift * 200.0;
                float4 col = 1.0;
                col.r = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv + offset * (1.0 + k)).r;
                col.g = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv + offset).g;
                col.b = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv + offset * (1.0 - k)).b;

                // Shimmer (goal d): a fast sparkle plus a slow ambient band, both scaled by
                // _ShimmerStrength and depthFactor. Only .rgb is modulated -- this pass
                // overwrites the opaque camera color target outright (no blending), so alpha is
                // never read downstream; keeping it untouched avoids any accidental blend-state
                // surprise if that ever changes.
                float sparkle = ValueNoise(p * 13.0 + t * 2.4);
                col.rgb *= 1.0 + _ShimmerStrength * 0.18 * (sparkle * 2.0 - 1.0) * depthFactor;

                float band = ValueNoise(float2(uv.x * 3.0 + t * 0.2, uv.y * 1.5));
                col.rgb *= 1.0 + _ShimmerStrength * 0.1 * (band - 0.5);

                return col;
            }
            ENDHLSL
        }
    }
}
