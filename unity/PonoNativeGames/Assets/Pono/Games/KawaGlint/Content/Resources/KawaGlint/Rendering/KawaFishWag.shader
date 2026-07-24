// Procedural "tail wag" shader for KawaGlint's illustrated (and procedural
// fallback) fish silhouettes/catch art -- batch:1458-kawaglint-fish-art.
//
// The art assets are static PNGs (no authored skeletal rig), so the wag is a
// pure fragment-stage UV shear: pixels near the tail (high U, since every
// source asset is authored head=u0 / tail=u1) are displaced along V by a
// small traveling sine wave, while pixels near the head barely move at all.
// This is intentionally NOT a vertex-stage effect -- shearing UVs in the
// fragment stage lets a single quad (the sprite's own FullRect mesh) wag
// without needing extra subdivided geometry.
//
// flipX-independence: SpriteRenderer.flipX mirrors the mesh's local vertex
// X (and winding), it does NOT touch the baked UVs -- so texcoord.x still
// runs head(0)->tail(1) exactly as authored regardless of which way the
// fish is currently facing on screen. The formula below is therefore
// correct unmodified for both swim directions; no direction parameter
// needed.
//
// A plain CGPROGRAM sprite-style pass (mirrors Unity's built-in
// Sprites/Default source) rather than an HLSLPROGRAM/Core.hlsl URP pass
// (contrast KawaSurface.shader): this shader must keep working on plain
// SpriteRenderer draws via the URP 2D Renderer's built-in sprite path with
// zero dependency on Core.hlsl includes, and gracefully degrade to
// "Sprites/Default" (Fallback) if stripped -- exactly module D's contract
// ("シェーダ欠落時は既存Sprite-Unlit-Defaultでwagなし、静止画のまま").
Shader "Pono/KawaGlint/FishWag"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Tint", Color) = (1, 1, 1, 1)

        // U (0=head .. 1=tail) at which the wag window begins ramping up
        // from zero via smoothstep(_WagStartU, 1.0, u).
        _WagStartU ("Wag Start U", Range(0, 1)) = 0.55

        // Peak V-axis UV displacement at the tail tip (u = 1), in UV units.
        // The asset pipeline's 4% transparent pad (batch:1458) is the
        // intended sample-overshoot absorption margin for this -- it is
        // never large enough to sample past that pad at the default value.
        _WagAmp ("Wag Amplitude (UV)", Float) = 0.022

        // Angular speed of the wag oscillation, radians/second against
        // _Time.y. 8.2 ~= 1.3Hz, comfortably under the project's 3Hz
        // child-safe flicker ceiling.
        _WagSpeed ("Wag Speed", Float) = 8.2

        // Per-instance phase offset (radians) -- set via
        // MaterialPropertyBlock so multiple fish sharing this one material
        // desync from each other without needing separate material
        // instances.
        _WagPhase ("Wag Phase", Float) = 0.0

        // Traveling-wave coefficient: how much additional phase accrues per
        // unit of (u - _WagStartU), giving the tail a slight lagging "whip"
        // shape rather than the whole wag window moving as one rigid slab.
        _WagWave ("Wag Wave", Float) = 4.0
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
            };

            sampler2D _MainTex;
            fixed4 _Color;
            float _WagStartU;
            float _WagAmp;
            float _WagSpeed;
            float _WagPhase;
            float _WagWave;

            v2f vert(appdata_t IN)
            {
                v2f OUT;
                OUT.vertex = UnityObjectToClipPos(IN.vertex);
                OUT.texcoord = IN.texcoord;
                // Vertex-color * material tint multiply, matching
                // SpriteRenderer.color's usual contribution path (module D
                // contract: "頂点カラー乗算").
                OUT.color = IN.color * _Color;
                return OUT;
            }

            fixed4 frag(v2f IN) : SV_Target
            {
                float u = IN.texcoord.x;

                // w(u): 0 at/before _WagStartU (head stays pinned), ramping
                // smoothly to 1 by the tail tip (u = 1).
                float w = smoothstep(_WagStartU, 1.0, u);

                float offset = _WagAmp * w * sin(
                    _Time.y * _WagSpeed
                    + _WagPhase
                    + (u - _WagStartU) * _WagWave);

                float2 uv = float2(u, clamp(IN.texcoord.y + offset, 0.001, 0.999));
                fixed4 texColor = tex2D(_MainTex, uv);
                return texColor * IN.color;
            }
            ENDCG
        }
    }

    Fallback "Sprites/Default"
}
