Shader "Pono/FluidMarbleLab/FluidSurface"
{
    Properties
    {
        _DyeTex ("Dye", 2D) = "black" {}
        _VelocityTex ("Velocity", 2D) = "black" {}
        _PaperTint ("Paper Tint", Color) = (0.96, 0.94, 0.86, 1)
        _InkBrightness ("Ink Brightness", Range(0.5, 2)) = 1.12
    }

    SubShader
    {
        Tags
        {
            "RenderType" = "Opaque"
            "Queue" = "Background"
            "RenderPipeline" = "UniversalPipeline"
        }

        Pass
        {
            Name "FluidSurface"
            ZWrite Off
            ZTest Always
            Cull Off

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma target 3.5

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };

            TEXTURE2D(_DyeTex);
            SAMPLER(sampler_DyeTex);
            TEXTURE2D(_VelocityTex);
            SAMPLER(sampler_VelocityTex);

            CBUFFER_START(UnityPerMaterial)
                float4 _DyeTex_ST;
                float4 _DyeTex_TexelSize;
                float4 _VelocityTex_ST;
                float4 _PaperTint;
                float _InkBrightness;
            CBUFFER_END

            float Hash21(float2 value)
            {
                value = frac(value * float2(123.34, 456.21));
                value += dot(value, value + 45.32);
                return frac(value.x * value.y);
            }

            float DensityAt(float2 uv)
            {
                float3 sample = SAMPLE_TEXTURE2D(_DyeTex, sampler_DyeTex, uv).rgb;
                return saturate(max(sample.r, max(sample.g, sample.b)));
            }

            Varyings Vert(Attributes input)
            {
                Varyings output;
                output.positionHCS = TransformObjectToHClip(input.positionOS.xyz);
                output.uv = TRANSFORM_TEX(input.uv, _DyeTex);
                return output;
            }

            half4 Frag(Varyings input) : SV_Target
            {
                float2 uv = input.uv;
                float4 dye = SAMPLE_TEXTURE2D(_DyeTex, sampler_DyeTex, uv);
                float2 velocity = SAMPLE_TEXTURE2D(_VelocityTex, sampler_VelocityTex, uv).xy;
                float density = saturate(max(dye.r, max(dye.g, dye.b)));

                float verticalWarmth = lerp(0.94, 1.04, uv.y);
                float finePaper = (Hash21(floor(uv * 780.0)) - 0.5) * 0.022;
                float broadPaper = (Hash21(floor(uv * 74.0)) - 0.5) * 0.026;
                float3 paper = _PaperTint.rgb * verticalWarmth + finePaper + broadPaper;

                float3 inkHue = dye.rgb / max(density, 0.06);
                inkHue = saturate(inkHue * _InkBrightness + 0.035);
                float coverage = smoothstep(0.015, 0.72, density);
                float3 color = lerp(paper, inkHue, coverage * 0.94);

                float2 texel = max(_DyeTex_TexelSize.xy, float2(1.0 / 512.0, 1.0 / 512.0));
                float gradientX = DensityAt(uv + float2(texel.x, 0)) - DensityAt(uv - float2(texel.x, 0));
                float gradientY = DensityAt(uv + float2(0, texel.y)) - DensityAt(uv - float2(0, texel.y));
                float edge = saturate(length(float2(gradientX, gradientY)) * 4.2);
                float flowSheen = saturate(length(velocity) * 0.28) * coverage;
                color += edge * float3(0.14, 0.17, 0.2);
                color += flowSheen * float3(0.06, 0.08, 0.1);

                float vignette = smoothstep(0.82, 0.25, length((uv - 0.5) * float2(1.0, 0.72)));
                color *= lerp(0.94, 1.015, vignette);
                return half4(saturate(color), 1);
            }
            ENDHLSL
        }
    }
}
