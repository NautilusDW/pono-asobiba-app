Shader "Pono/HideSeekCreatures/InkComposite"
{
    Properties
    {
        [PerRendererData] _MainTex ("Texture", 2D) = "white" {}
        _PigmentTex ("Pigment", 2D) = "black" {}
        _VelocityTex ("Velocity", 2D) = "black" {}
        _RevealTex ("Reveal", 2D) = "black" {}
        _FogColor ("Fog Color", Color) = (0.965, 0.945, 0.89, 1)
        _FogAmount ("Fog Amount", Range(0, 1)) = 0.72
        _MotionAmount ("Motion Amount", Range(0, 1)) = 1
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
                float reveal = saturate(tex2D(_RevealTex, uv).r);
                float4 pigment = tex2D(_PigmentTex, uv);
                float2 velocity = tex2D(_VelocityTex, uv).xy;
                float density = saturate(max(max(pigment.r, pigment.g), max(pigment.b, pigment.a * 0.75)));

                float timeOffset = _Time.y * 0.022 * _MotionAmount;
                float paperNoise = ValueNoise(uv * 17.0 + float2(timeOffset, -timeOffset * 0.7));
                paperNoise = lerp(paperNoise, ValueNoise(uv * 41.0 - timeOffset * 0.4), 0.35);
                float edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
                float edgeVeil = lerp(1.08, 0.96, smoothstep(0.0, 0.19, edgeDistance));
                float fogAlpha = saturate((0.82 + paperNoise * 0.23) * edgeVeil * _FogAmount * (1.0 - reveal));

                float inkAlpha = smoothstep(0.012, 0.58, density) * 0.76;
                float3 inkHue = pigment.rgb / max(max(pigment.r, max(pigment.g, pigment.b)), 0.08);
                inkHue = saturate(inkHue * 0.92 + 0.12);
                float flowSheen = saturate(length(velocity) * 0.42) * inkAlpha;
                inkHue += flowSheen * float3(0.08, 0.10, 0.12);

                float combinedAlpha = 1.0 - (1.0 - fogAlpha) * (1.0 - inkAlpha);
                float3 premultiplied = _FogColor.rgb * fogAlpha
                    + inkHue * inkAlpha * (1.0 - fogAlpha);
                float3 color = premultiplied / max(combinedAlpha, 0.001);
                color += (paperNoise - 0.5) * 0.025;

                combinedAlpha *= UnityGet2DClipping(input.worldPosition.xy, _ClipRect);
                return fixed4(saturate(color), combinedAlpha) * input.color;
            }
            ENDCG
        }
    }
}
