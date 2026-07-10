Shader "Pono/HideSeekCreatures/InkComposite"
{
    Properties
    {
        [PerRendererData] _MainTex ("Texture", 2D) = "white" {}
        _PigmentTex ("Pigment", 2D) = "black" {}
        _VelocityTex ("Velocity", 2D) = "black" {}
        _RevealTex ("Reveal", 2D) = "black" {}
        _FogColor ("Fog Color", Color) = (0.94, 0.925, 0.86, 1)
        _FogAmount ("Fog Amount", Range(0, 1)) = 0.92
        _MotionAmount ("Motion Amount", Range(0, 1)) = 1
        [Toggle(UNITY_UI_ALPHACLIP)] _UseUIAlphaClip ("Use Alpha Clip", Float) = 0
        _StencilComp ("Stencil Comparison", Float) = 8
        _Stencil ("Stencil ID", Float) = 0
        _StencilOp ("Stencil Operation", Float) = 0
        _StencilWriteMask ("Stencil Write Mask", Float) = 255
        _StencilReadMask ("Stencil Read Mask", Float) = 255
        _ColorMask ("Color Mask", Float) = 15
    }

    SubShader
    {
        Tags
        {
            "Queue" = "Transparent"
            "IgnoreProjector" = "True"
            "RenderType" = "Transparent"
            "PreviewType" = "Plane"
            "CanUseSpriteAtlas" = "True"
        }

        Stencil
        {
            Ref [_Stencil]
            Comp [_StencilComp]
            Pass [_StencilOp]
            ReadMask [_StencilReadMask]
            WriteMask [_StencilWriteMask]
        }

        Cull Off
        Lighting Off
        ZWrite Off
        ZTest [unity_GUIZTestMode]
        Blend SrcAlpha OneMinusSrcAlpha
        ColorMask [_ColorMask]

        Pass
        {
            Name "FluidInkComposite"

            CGPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma target 3.5
            #pragma multi_compile_local _ UNITY_UI_CLIP_RECT
            #pragma multi_compile_local _ UNITY_UI_ALPHACLIP
            #include "UnityCG.cginc"
            #include "UnityUI.cginc"

            struct Attributes
            {
                float4 vertex : POSITION;
                float4 color : COLOR;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 vertex : SV_POSITION;
                fixed4 color : COLOR;
                float2 uv : TEXCOORD0;
                float4 worldPosition : TEXCOORD1;
            };

            sampler2D _PigmentTex;
            sampler2D _VelocityTex;
            sampler2D _RevealTex;
            float4 _PigmentTex_TexelSize;
            float4 _RevealTex_TexelSize;
            float4 _FogColor;
            float _FogAmount;
            float _MotionAmount;
            float4 _ClipRect;

            float Hash21(float2 p)
            {
                p = frac(p * float2(123.34, 345.45));
                p += dot(p, p + 34.345);
                return frac(p.x * p.y);
            }

            float ValueNoise(float2 p)
            {
                float2 i = floor(p);
                float2 f = frac(p);
                f = f * f * (3.0 - 2.0 * f);
                return lerp(
                    lerp(Hash21(i), Hash21(i + float2(1, 0)), f.x),
                    lerp(Hash21(i + float2(0, 1)), Hash21(i + float2(1, 1)), f.x),
                    f.y);
            }

            float PigmentDensity(float4 sampleValue)
            {
                return saturate(max(
                    sampleValue.a,
                    max(sampleValue.r, max(sampleValue.g, sampleValue.b)) * 0.72));
            }

            Varyings Vert(Attributes input)
            {
                Varyings output;
                output.worldPosition = input.vertex;
                output.vertex = UnityObjectToClipPos(input.vertex);
                output.uv = input.uv;
                output.color = input.color;
                return output;
            }

            fixed4 Frag(Varyings input) : SV_Target
            {
                float2 uv = input.uv;
                float4 pigment = tex2D(_PigmentTex, uv);
                float2 velocity = tex2D(_VelocityTex, uv).xy;
                float density = PigmentDensity(pigment);

                float2 revealStep = _RevealTex_TexelSize.xy * 2.0;
                float memoryReveal = tex2D(_RevealTex, uv).r * 0.28;
                memoryReveal += tex2D(_RevealTex, uv + float2(revealStep.x, 0)).r * 0.12;
                memoryReveal += tex2D(_RevealTex, uv - float2(revealStep.x, 0)).r * 0.12;
                memoryReveal += tex2D(_RevealTex, uv + float2(0, revealStep.y)).r * 0.12;
                memoryReveal += tex2D(_RevealTex, uv - float2(0, revealStep.y)).r * 0.12;
                memoryReveal += tex2D(_RevealTex, uv + revealStep).r * 0.06;
                memoryReveal += tex2D(_RevealTex, uv - revealStep).r * 0.06;
                memoryReveal += tex2D(_RevealTex, uv + float2(revealStep.x, -revealStep.y)).r * 0.06;
                memoryReveal += tex2D(_RevealTex, uv + float2(-revealStep.x, revealStep.y)).r * 0.06;
                memoryReveal = smoothstep(0.10, 0.82, saturate(memoryReveal));

                // The simulated pigment is the visible reveal. The CPU mask is
                // only a softly blurred memory used to keep progress legible.
                float fluidReveal = smoothstep(0.010, 0.26, density);
                float reveal = saturate(fluidReveal * 0.88 + memoryReveal * 0.22);

                float timeOffset = _Time.y * 0.022 * _MotionAmount;
                float paperNoise = ValueNoise(uv * 17.0 + float2(timeOffset, -timeOffset * 0.7));
                paperNoise = lerp(paperNoise, ValueNoise(uv * 41.0 - timeOffset * 0.4), 0.35);
                float edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
                float edgeVeil = lerp(1.08, 0.96, smoothstep(0.0, 0.19, edgeDistance));
                float fogAlpha = saturate((0.98 + paperNoise * 0.08) * edgeVeil * _FogAmount * (1.0 - reveal));

                float neighborDensity = (
                    PigmentDensity(tex2D(_PigmentTex, uv + float2(_PigmentTex_TexelSize.x, 0)))
                    + PigmentDensity(tex2D(_PigmentTex, uv - float2(_PigmentTex_TexelSize.x, 0)))
                    + PigmentDensity(tex2D(_PigmentTex, uv + float2(0, _PigmentTex_TexelSize.y)))
                    + PigmentDensity(tex2D(_PigmentTex, uv - float2(0, _PigmentTex_TexelSize.y)))) * 0.25;
                float fluidEdge = saturate(abs(density - neighborDensity) * 18.0);
                float inkBody = smoothstep(0.004, 0.20, density);
                float rolledRim = smoothstep(0.018, 0.11, density)
                    * (1.0 - smoothstep(0.18, 0.38, density));
                // Transparent colour-water reveals the creature through its
                // centre; only the rolled-up rim becomes richly coloured.
                float inkAlpha = saturate(
                    inkBody * (0.34 + fluidEdge * 0.18)
                    + rolledRim * 0.18);
                inkAlpha *= lerp(0.20, 1.0, _FogAmount);
                float maxPigment = max(pigment.r, max(pigment.g, pigment.b));
                float3 inkHue = pigment.rgb / max(maxPigment, 0.015);
                inkHue = saturate(inkHue * 0.92 + 0.03);
                float flowSheen = saturate(length(velocity) * 0.62) * inkAlpha;
                inkHue += (flowSheen * 0.12 + fluidEdge * 0.10) * float3(0.92, 0.96, 1.0);

                float combinedAlpha = 1.0 - (1.0 - fogAlpha) * (1.0 - inkAlpha);
                float3 premultiplied = inkHue * inkAlpha
                    + _FogColor.rgb * fogAlpha * (1.0 - inkAlpha);
                float3 color = premultiplied / max(combinedAlpha, 0.001);
                color += (paperNoise - 0.5) * 0.04 * (1.0 - inkAlpha);

                #ifdef UNITY_UI_CLIP_RECT
                combinedAlpha *= UnityGet2DClipping(input.worldPosition.xy, _ClipRect);
                #endif

                fixed4 output = fixed4(saturate(color), combinedAlpha) * input.color;
                #ifdef UNITY_UI_ALPHACLIP
                clip(output.a - 0.001);
                #endif
                return output;
            }
            ENDCG
        }
    }
}
