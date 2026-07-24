// "Part of me is under the water" shader for KawaGlint's float (ウキ).
//
// The float is the one object in the scene that straddles the waterline
// every single frame, and until now it rendered as a single opaque sprite on
// both sides of it -- so it read as a sticker pasted on top of the water
// rather than an object floating in it. This shader tints, softens and
// gently wobbles whatever part of the sprite currently sits below the
// surface, and paints a thin wet meniscus highlight right at the boundary.
//
// A plain CGPROGRAM sprite pass (mirroring KawaFishWag.shader, and for the
// same reasons): it must keep working on ordinary SpriteRenderer draws
// through the URP 2D Renderer's built-in sprite path with no Core.hlsl
// dependency, and degrade gracefully to "Sprites/Default" if stripped from a
// build.
//
// ### The wave formula is deliberately NOT evaluated here.
// KawaWave.cs already warns that its C# copy and the HLSL copy inside
// KawaSurface.shader must never drift apart. Adding a third copy would be
// asking for exactly that drift, on the one object where a mismatch is most
// visible. Instead KawaGlintBobber writes the already-computed surface
// height at its own X into _SurfaceWorldY through a MaterialPropertyBlock
// every frame. The float is ~0.4 world units wide, over which the surface is
// locally flat to well within a pixel, and the value is literally the same
// number the float is riding -- so the cut line can never disagree with the
// float's own motion, and no material instances are cloned.
//
// The same rule answers the "there appear to be two water surfaces" report:
// this shader must never invent its own waterline constant. Its cut is
// always whatever the C# side derives from the single shared
// WaterlineWorldY + KawaWave.Height() contract.
Shader "Pono/KawaGlint/BobberSubmerge"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Tint", Color) = (1, 1, 1, 1)

        // World-space Y of the water surface at this float's own X, written
        // per-frame by KawaGlintBobber via MaterialPropertyBlock.
        _SurfaceWorldY ("Surface World Y", Float) = 0

        // Multiplicative tint applied to the submerged part. Matches the 0%
        // (surface) stop of the water depth gradient used elsewhere.
        _UnderTint ("Underwater Tint", Color) = (0.498, 0.816, 0.910, 1)
        _UnderTintStrength ("Underwater Tint Strength", Range(0, 1)) = 0.55

        // Submerged pixels lose a little opacity: water in front of them.
        _UnderAlpha ("Underwater Alpha", Range(0, 1)) = 0.88

        // Half-width (world units) of the soft transition across the
        // surface. Never a hard cut -- a crisp horizontal line on the float
        // would read as yet another waterline.
        _MeniscusWorld ("Meniscus Width (world)", Float) = 0.03
        _MeniscusTint ("Meniscus Tint", Color) = (1, 1, 1, 1)

        // Time.time, written alongside _SurfaceWorldY -- the same explicit
        // time-base contract KawaSurfaceBand uses, rather than _Time.y, so
        // every KawaGlint oscillator shares one clock.
        _KawaTime ("Kawa Time", Float) = 0

        // Horizontal UV wobble of the submerged part only. Deliberately
        // tiny: the full-screen KawaRefraction pass already distorts
        // everything below the waterline, so anything larger here reads as a
        // double wobble.
        _UnderWobbleAmp ("Underwater Wobble Amplitude (UV)", Float) = 0.004

        // Radians/second. 9.0 ~= 1.43 Hz, well under the project's 3 Hz
        // child-safety ceiling.
        _UnderWobbleFreq ("Underwater Wobble Speed", Float) = 9.0
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

        Cull Off
        Lighting Off
        ZWrite Off
        Blend SrcAlpha OneMinusSrcAlpha

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 2.0
            #include "UnityCG.cginc"

            struct appdata_t
            {
                float4 vertex : POSITION;
                float4 color : COLOR;
                float2 texcoord : TEXCOORD0;
            };

            struct v2f
            {
                float4 vertex : SV_POSITION;
                fixed4 color : COLOR;
                float2 texcoord : TEXCOORD0;
                float2 worldXY : TEXCOORD1;
            };

            sampler2D _MainTex;
            fixed4 _Color;
            float _SurfaceWorldY;
            fixed4 _UnderTint;
            float _UnderTintStrength;
            float _UnderAlpha;
            float _MeniscusWorld;
            fixed4 _MeniscusTint;
            float _KawaTime;
            float _UnderWobbleAmp;
            float _UnderWobbleFreq;

            v2f vert(appdata_t IN)
            {
                v2f OUT;
                OUT.vertex = UnityObjectToClipPos(IN.vertex);
                OUT.texcoord = IN.texcoord;
                OUT.color = IN.color * _Color;

                float3 worldPosition = mul(unity_ObjectToWorld, IN.vertex).xyz;
                OUT.worldXY = worldPosition.xy;
                return OUT;
            }

            fixed4 frag(v2f IN) : SV_Target
            {
                // Guard against a zero/negative meniscus width reaching the
                // divides below (a stray SetFloat(0) would otherwise produce
                // NaNs and a black float).
                float meniscus = max(_MeniscusWorld, 1e-4);

                // 0 fully above the surface, 1 fully below it. While the
                // float is airborne mid-cast the whole sprite sits above
                // _SurfaceWorldY, so this is 0 everywhere and the shader is
                // a pass-through -- no special-casing of the Flying state is
                // needed anywhere on the C# side.
                float below = smoothstep(
                    _SurfaceWorldY + meniscus,
                    _SurfaceWorldY - meniscus,
                    IN.worldXY.y);

                float2 uv = IN.texcoord;
                uv.x += below * _UnderWobbleAmp * sin(_KawaTime * _UnderWobbleFreq + IN.worldXY.y * 6.0);

                fixed4 c = tex2D(_MainTex, uv);
                c.rgb = lerp(c.rgb, c.rgb * _UnderTint.rgb, below * _UnderTintStrength);
                c.a *= lerp(1.0, _UnderAlpha, below);

                // Wet line: a narrow bright band centred exactly on the
                // surface, squared so it falls off fast, and premultiplied
                // by the sprite's own alpha so it never glows outside the
                // silhouette.
                float band = 1.0 - saturate(abs(IN.worldXY.y - _SurfaceWorldY) / meniscus);
                c.rgb += _MeniscusTint.rgb * band * band * 0.35 * c.a;

                return c * IN.color;
            }
            ENDCG
        }
    }

    Fallback "Sprites/Default"
}
