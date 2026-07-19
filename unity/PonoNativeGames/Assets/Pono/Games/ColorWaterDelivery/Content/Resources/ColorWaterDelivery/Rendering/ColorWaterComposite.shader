Shader "Pono/ColorWaterDelivery/Composite"
{
    Properties
    {
        [PerRendererData] _MainTex ("Texture", 2D) = "white" {}
        _PigmentTex ("Pigment", 2D) = "black" {}
        _VelocityTex ("Velocity", 2D) = "black" {}
        _ObstacleTex ("Obstacle", 2D) = "black" {}
        _BlueColor ("Blue Color", Color) = (0.04, 0.42, 0.92, 1)
        _YellowColor ("Yellow Color", Color) = (1.00, 0.76, 0.04, 1)
        _GreenColor ("Green Color", Color) = (0.02, 0.58, 0.16, 1)
        _Opacity ("Opacity", Range(0, 1)) = 1
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
            Name "ColorWaterComposite"

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
            sampler2D _ObstacleTex;
            float4 _PigmentTex_TexelSize;
            float4 _ObstacleTex_TexelSize;
            float4 _BlueColor;
            float4 _YellowColor;
            float4 _GreenColor;
            float _Opacity;
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
                float2 cell = floor(p);
                float2 local = frac(p);
                local = local * local * (3.0 - 2.0 * local);
                return lerp(
                    lerp(Hash21(cell), Hash21(cell + float2(1, 0)), local.x),
                    lerp(Hash21(cell + float2(0, 1)), Hash21(cell + float2(1, 1)), local.x),
                    local.y);
            }

            float PigmentDensity(float2 uv)
            {
                float2 pigment = tex2D(_PigmentTex, uv).rg;
                return saturate(max(pigment.x, pigment.y));
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
                float2 pigment = saturate(tex2D(_PigmentTex, uv).rg);
                float density = max(pigment.x, pigment.y);
                float mixedAmount = min(pigment.x, pigment.y);
                float greenWeight = mixedAmount * 2.0;
                float blueWeight = max(pigment.x - pigment.y, 0.0);
                float yellowWeight = max(pigment.y - pigment.x, 0.0);
                float totalWeight = greenWeight + blueWeight + yellowWeight;
                float3 hue = (
                    _GreenColor.rgb * greenWeight
                    + _BlueColor.rgb * blueWeight
                    + _YellowColor.rgb * yellowWeight)
                    / max(totalWeight, 0.001);

                float2 texel = _PigmentTex_TexelSize.xy;
                float neighborDensity = (
                    PigmentDensity(uv + float2(texel.x, 0))
                    + PigmentDensity(uv - float2(texel.x, 0))
                    + PigmentDensity(uv + float2(0, texel.y))
                    + PigmentDensity(uv - float2(0, texel.y))) * 0.25;
                float fluidEdge = saturate(abs(density - neighborDensity) * 30.0);
                float body = smoothstep(0.025, 0.34, density);
                float rolledRim = smoothstep(0.035, 0.12, density)
                    * (1.0 - smoothstep(0.18, 0.42, density));

                // A translucent body keeps the stream readable as water rather
                // than an opaque erase mask. Only the rolled edge carries dark ink.
                float alpha = saturate(
                    body * 0.40
                    + rolledRim * 0.18
                    + fluidEdge * 0.30) * _Opacity;
                float mixBalance = greenWeight / max(totalWeight, 0.001);
                alpha = saturate(alpha * (1.0 + mixBalance * 0.68));
                float2 velocity = tex2D(_VelocityTex, uv).xy;
                float flowSheen = saturate(length(velocity) * 0.72)
                    * (0.30 + fluidEdge * 0.70)
                    * _MotionAmount;
                hue = lerp(hue, float3(0.92, 0.98, 1.0), flowSheen * 0.28);
                hue *= 0.92 + fluidEdge * 0.15;

                float timeOffset = _Time.y * 0.018 * _MotionAmount;
                float granulation = ValueNoise(
                    uv * 46.0 + float2(timeOffset, -timeOffset * 0.7));
                hue += (granulation - 0.5) * 0.055 * body;
                alpha *= 0.94 + granulation * 0.08;

                // The geometry is drawn by the game. This is only a faint water
                // contact shadow at solid edges, never an opaque obstacle mask.
                float obstacle = tex2D(_ObstacleTex, uv).r;
                float obstacleNeighbor = (
                    tex2D(_ObstacleTex, uv + float2(_ObstacleTex_TexelSize.x, 0)).r
                    + tex2D(_ObstacleTex, uv - float2(_ObstacleTex_TexelSize.x, 0)).r
                    + tex2D(_ObstacleTex, uv + float2(0, _ObstacleTex_TexelSize.y)).r
                    + tex2D(_ObstacleTex, uv - float2(0, _ObstacleTex_TexelSize.y)).r) * 0.25;
                float contactEdge = saturate(abs(obstacle - obstacleNeighbor) * 5.0);
                float contactAlpha = contactEdge * 0.055 * _Opacity;
                float combinedAlpha = 1.0 - (1.0 - alpha) * (1.0 - contactAlpha);
                float3 premultiplied = saturate(hue) * alpha
                    + float3(0.18, 0.34, 0.32) * contactAlpha * (1.0 - alpha);
                float3 outputColor = premultiplied / max(combinedAlpha, 0.001);

                #ifdef UNITY_UI_CLIP_RECT
                combinedAlpha *= UnityGet2DClipping(input.worldPosition.xy, _ClipRect);
                #endif

                fixed4 output = fixed4(saturate(outputColor), combinedAlpha) * input.color;
                #ifdef UNITY_UI_ALPHACLIP
                clip(output.a - 0.001);
                #endif
                return output;
            }
            ENDCG
        }
    }
}
