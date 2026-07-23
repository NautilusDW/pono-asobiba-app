// God-ray (light shaft) screen-space shader for the AquaLumina rendering spike.
// Three passes, driven by AquaGodRayFeature/AquaGodRayPass (RenderGraph, see that file for why
// this project's RecordRenderGraph path is what actually executes):
//   0 "Threshold"   - seeds bright/upper-frame pixels into a half-res buffer, modulated by
//                     animated hash-noise "beams" so the radial blur below smears them into
//                     distinct, slowly-shifting shafts rather than one uniform glow.
//   1 "RadialBlur"  - GPU Gems 3, ch.13 "Volumetric Light Scattering as a Post-Process": walks
//                     samples back toward the light's screen position with per-tap decay.
//   2 "Composite"   - adds the resulting ray texture back onto an untouched copy of the scene.
//
// This is the first URP HLSLPROGRAM (RenderGraph-era) shader in this project - every previous
// shader here (see HideSeekCreatures/InkComposite.shader) is a CGPROGRAM UGUI/Canvas shader, not
// a URP scriptable-renderer-feature shader. Kept deliberately simple/conservative as a result:
// plain float precision throughout (no half/real qualifiers), a single shared UnityPerMaterial
// cbuffer duplicated verbatim across all three passes (required for SRP Batcher compatibility -
// every pass of a shader must declare an identical per-material cbuffer layout), and no XR/
// instancing multi_compile pragmas beyond what Blit.hlsl already provides.
Shader "Pono/AquaLumina/GodRays"
{
    Properties
    {
        // _BlitTexture is the implicit source input driven by RenderGraphUtils.AddBlitPass /
        // Blitter.BlitTexture (declared by the Blit.hlsl include below, not redeclared here).
        _AquaRayTex ("Ray Texture (Composite pass only)", 2D) = "black" {}
        _Intensity ("Intensity", Range(0, 2)) = 0
        _Density ("Density", Range(0.5, 1)) = 0.96
        _Decay ("Decay", Range(0.5, 1)) = 0.95
        _SampleCount ("Sample Count", Range(16, 96)) = 64
        _LightViewportPos ("Light Viewport Position", Vector) = (0.5, 1.05, 0, 0)
        _Threshold ("Threshold", Range(0, 2)) = 0.55
        _BeamNoiseStrength ("Beam Noise Strength", Range(0, 1)) = 0.55
        _Tint ("Tint", Color) = (1, 0.92, 0.76, 1)
    }

    SubShader
    {
        Tags { "RenderPipeline" = "UniversalPipeline" }

        ZWrite Off
        ZTest Always
        Cull Off
        Blend Off

        Pass
        {
            Name "Threshold"

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex Vert
            #pragma fragment FragThreshold

            // INTEGRATION FIX (see AquaLumina/README.md integration notes): the original
            // "Common.hlsl + Blit.hlsl" include pair does not compile on Metal. Blit.hlsl's
            // FragOctahedralProject function (unused by this shader, but still part of the same
            // translation unit) calls UnpackNormalOctQuadEncode, which lives in Packing.hlsl -
            // not pulled in by the core package's own Common.hlsl. URP's own Core.hlsl (this
            // include) pulls in Common.hlsl + Packing.hlsl + a robust TEXTURE2D_X definition in
            // one step and is exactly what URP's own Blit.hlsl consumers (e.g.
            // Shaders/Utils/CoreBlit.shader in this same package) include before Blit.hlsl.
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"

            CBUFFER_START(UnityPerMaterial)
                float _Intensity;
                float _Density;
                float _Decay;
                float _SampleCount;
                float4 _LightViewportPos;
                float _Threshold;
                float _BeamNoiseStrength;
                float4 _Tint;
                float _AquaTime;
            CBUFFER_END

            // Self-contained hash noise - this shader has no shared HLSL helper file to pull
            // from (the module is limited to exactly this one .shader file), so the noise lives
            // here, scoped to the only pass that needs it.
            //
            // Deliberately an integer bit-mixing hash (PCG-style avalanche: Jarzynski & Olano,
            // "Hash Functions for GPU Rendering"), not the classic frac(sin(x*127.1)*43758.5453)
            // idiom: that trig-based form is well known to produce visible periodic/banding
            // artifacts on some GPU driver sin() implementations as inputs grow large, and this
            // pass's caller (ValueNoise1D, via FragThreshold's beam angle) feeds it
            // angle * 24.0 + _AquaTime * 0.35, where _AquaTime is Time.time - unbounded over a
            // long play session. A multiply/xorshift avalanche has no such large-argument
            // precision failure mode.
            float Hash11(float x)
            {
                // x arrives pre-floored (an integer-valued float lattice index, see
                // ValueNoise1D), so truncating through int first gives an exact integer to hash
                // instead of re-deriving one from x's raw bit pattern.
                int i = (int)x;
                uint n = (uint)i;

                n = n * 747796405u + 2891336453u;
                uint word = ((n >> ((n >> 28u) + 4u)) ^ n) * 277803737u;
                word = (word >> 22u) ^ word;
                return (float)word * (1.0 / 4294967295.0);
            }

            // Quintic (5th-order) fade between lattice points - cheaper than Perlin's gradient
            // noise but removes the 2nd-derivative discontinuity a plain smoothstep would leave,
            // which matters here because the radial blur amplifies any kink in the seed pattern.
            float QuinticFade(float t)
            {
                return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
            }

            // Self-contained 2-octave hash value noise over a 1D domain (the angle around the
            // light). The coarse octave shapes distinct beams; the second octave (double
            // frequency, offset, half weight) breaks up the silhouette so beams don't read as a
            // single regular sine wave once the radial blur smears this into shafts.
            float ValueNoise1D(float x)
            {
                float i0 = floor(x);
                float octave0 = lerp(Hash11(i0), Hash11(i0 + 1.0), QuinticFade(x - i0));

                float x1 = x * 2.0 + 17.0;
                float i1 = floor(x1);
                float octave1 = lerp(Hash11(i1), Hash11(i1 + 1.0), QuinticFade(x1 - i1));

                return saturate(octave0 * 0.7 + octave1 * 0.3);
            }

            float4 FragThreshold(Varyings input) : SV_Target
            {
                UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);
                float2 uv = input.texcoord;
                float3 sceneColor = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv).rgb;

                float lum = dot(sceneColor, float3(0.2126, 0.7152, 0.0722));
                float mask = saturate((lum - _Threshold) / max(1.0 - _Threshold, 1e-4));

                // Only the upper region of frame (where the sun/surface sits) seeds rays -
                // without this falloff every bright fish or rock highlight would sprout its own
                // shaft, which reads as noisy rather than as directional sunlight.
                mask *= smoothstep(0.15, 0.75, uv.y);

                float2 toLight = uv - _LightViewportPos.xy;
                float angle = atan2(toLight.x, -toLight.y);
                float beams = lerp(1.0, ValueNoise1D(angle * 24.0 + _AquaTime * 0.35), _BeamNoiseStrength);

                return float4(sceneColor * mask * beams, 1.0);
            }
            ENDHLSL
        }

        Pass
        {
            Name "RadialBlur"

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex Vert
            #pragma fragment FragRadialBlur

            // INTEGRATION FIX (see AquaLumina/README.md integration notes): the original
            // "Common.hlsl + Blit.hlsl" include pair does not compile on Metal. Blit.hlsl's
            // FragOctahedralProject function (unused by this shader, but still part of the same
            // translation unit) calls UnpackNormalOctQuadEncode, which lives in Packing.hlsl -
            // not pulled in by the core package's own Common.hlsl. URP's own Core.hlsl (this
            // include) pulls in Common.hlsl + Packing.hlsl + a robust TEXTURE2D_X definition in
            // one step and is exactly what URP's own Blit.hlsl consumers (e.g.
            // Shaders/Utils/CoreBlit.shader in this same package) include before Blit.hlsl.
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"

            CBUFFER_START(UnityPerMaterial)
                float _Intensity;
                float _Density;
                float _Decay;
                float _SampleCount;
                float4 _LightViewportPos;
                float _Threshold;
                float _BeamNoiseStrength;
                float4 _Tint;
                float _AquaTime;
            CBUFFER_END

            float4 FragRadialBlur(Varyings input) : SV_Target
            {
                UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);
                float2 uv = input.texcoord;

                int sampleCount = max((int)_SampleCount, 1);
                float2 deltaUv = (uv - _LightViewportPos.xy) * (_Density / (float)sampleCount);
                float2 sampleUv = uv;
                float3 sum = float3(0.0, 0.0, 0.0);
                float illum = 1.0;

                // GPU Gems 3, ch.13 "Volumetric Light Scattering as a Post-Process": walk back
                // toward the light in screen space, accumulating decayed samples. The clamp
                // sampler is deliberate - samples that step past the top edge of frame clamp to
                // the bright seed row instead of wrapping or reading black, which is exactly what
                // lets shafts extend naturally as if streaming from off-screen.
                [loop]
                for (int i = 0; i < sampleCount; i++)
                {
                    sampleUv -= deltaUv;
                    sum += SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, sampleUv).rgb * illum;
                    illum *= _Decay;
                }

                return float4(sum / (float)sampleCount, 1.0);
            }
            ENDHLSL
        }

        Pass
        {
            Name "Composite"

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex Vert
            #pragma fragment FragComposite

            // INTEGRATION FIX (see AquaLumina/README.md integration notes): the original
            // "Common.hlsl + Blit.hlsl" include pair does not compile on Metal. Blit.hlsl's
            // FragOctahedralProject function (unused by this shader, but still part of the same
            // translation unit) calls UnpackNormalOctQuadEncode, which lives in Packing.hlsl -
            // not pulled in by the core package's own Common.hlsl. URP's own Core.hlsl (this
            // include) pulls in Common.hlsl + Packing.hlsl + a robust TEXTURE2D_X definition in
            // one step and is exactly what URP's own Blit.hlsl consumers (e.g.
            // Shaders/Utils/CoreBlit.shader in this same package) include before Blit.hlsl.
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"

            // The ray texture is not the pass's implicit _BlitTexture input (that slot carries
            // the untouched scene-color copy here) - it is bound separately by AquaGodRayPass via
            // cmd.SetGlobalTexture right before this blit, so it needs its own declaration.
            TEXTURE2D_X(_AquaRayTex);

            CBUFFER_START(UnityPerMaterial)
                float _Intensity;
                float _Density;
                float _Decay;
                float _SampleCount;
                float4 _LightViewportPos;
                float _Threshold;
                float _BeamNoiseStrength;
                float4 _Tint;
                float _AquaTime;
            CBUFFER_END

            float4 FragComposite(Varyings input) : SV_Target
            {
                UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);
                float2 uv = input.texcoord;

                // _BlitTexture here is the untouched scene-color copy (AquaGodRayPass blits from
                // it, see "sceneCopy" there), not the live camera target - that is what makes it
                // safe to write this pass's result straight back onto the active color target
                // with Blend Off instead of needing an additive blend against it.
                float3 sceneColor = SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv).rgb;
                float3 rays = SAMPLE_TEXTURE2D_X(_AquaRayTex, sampler_LinearClamp, uv).rgb;

                return float4(sceneColor + rays * _Tint.rgb * _Intensity, 1.0);
            }
            ENDHLSL
        }
    }
}
