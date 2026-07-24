// Procedural, additive, world-space caustics overlay for the KawaGlint river-cutaway spike.
//
// This is a verbatim-formula port of AquaLumina's AquaCaustics.shader (see
// Pono.AquaLumina.Rendering.AquaCausticsSurface / AquaCaustics.shader --
// reference only, never modified by this file's existence): the same
// two-layer animated Voronoi-F1 filament technique (domain warp -> two
// independently drifting layers -> multiplicative interference + pow(c1,8)
// sparkle scatter -> vertical fade -> soft box-edge mask). AquaLumina's own
// files are untouched; this is a wholly separate asset under KawaGlint's own
// package so the two spikes never share state.
//
// The one deliberate deviation from the Aqua original: every _Time.y read is
// replaced with a _KawaTime uniform driven every frame from
// KawaCausticsSurface.Update() via Time.time -- KawaGlint's pinned "time
// base" contract (see KawaSurface.shader / DESIGN.md), never the
// engine-global level-load-relative _Time.y, which would desync this layer
// from the crest line / bobber wave that everything else in this spike is
// keyed off of.
//
// Like AquaCaustics.shader, this is a plain vertex/fragment HLSLPROGRAM pass
// drawn directly by the URP 2D Renderer's own transparent sort -- no custom
// ScriptableRenderPass/RenderGraph involvement here, which is why the pass
// MUST use the SRPDefaultUnlit LightMode tag (a "UniversalForward" tag would
// simply not be drawn by the 2D renderer).
Shader "Pono/KawaGlint/Caustics"
{
    Properties
    {
        _Intensity ("Intensity", Float) = 1.0
        _Tint ("Tint", Color) = (0.72, 0.94, 1.0, 1.0)
        _Scale ("Voronoi Scale", Float) = 2.2
        _Speed ("Animation Speed", Float) = 0.5
        _FadeParams ("Fade Params (bottomV, topV, minFade, unused)", Vector) = (0.08, 0.80, 0.30, 0)
        // Sixth entry of this material's Aqua-mirrored uniform contract
        // (Intensity/Tint/Scale/Speed/FadeParams/RectExtent): the quad's own
        // UV extents (uMax = aspect, vMax = 1), required so the box-edge
        // soft mask stays proportionally even on all four sides regardless
        // of worldRect's aspect ratio. Not optional/private -- see
        // KawaCausticsSurface.cs.
        _RectExtent ("Rect UV Extent (uMax, vMax, unused, unused)", Vector) = (1.78, 1.0, 0, 0)
        // Seventh and final entry, KawaGlint-specific (AquaCaustics.shader
        // has no equivalent -- it reads _Time.y directly): driven every
        // frame from KawaCausticsSurface.Update via Time.time, matching the
        // shared "time base" contract with KawaSurface.shader/KawaWave so
        // this layer never drifts out of sync with the rest of the scene's
        // animation.
        _KawaTime ("Kawa Time", Float) = 0.0
    }

    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Transparent"
            "Queue" = "Transparent"
        }

        Pass
        {
            Name "KawaCausticsUnlit"
            // CRITICAL: SRPDefaultUnlit is the LightMode the URP 2D Renderer
            // draws for plain (non-Sprite) MeshRenderers in its transparent
            // sort. A "UniversalForward" tag here would render nothing.
            Tags { "LightMode" = "SRPDefaultUnlit" }

            // Caustics are pure additive light: they only ever brighten
            // whatever is already behind them (riverbed/plants/fish
            // shadows), never occlude or write depth.
            Blend One One
            ZWrite Off
            Cull Off

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma target 3.0

            // Deliberate, version-safe choice: this file only ever needs a
            // plain vertex/fragment HLSLPROGRAM pass (there is no custom
            // ScriptableRenderPass here for RenderGraph to matter to) -- the
            // classic-vs-RenderGraph API question that applies to
            // ScriptableRendererFeatures elsewhere in this spike simply does
            // not arise for this shader.
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float3 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };

            // float (not half): _KawaTime keeps growing for the lifetime of
            // the session (it mirrors Time.time), and half's ~11-bit mantissa
            // loses enough precision within a few minutes to make the
            // animation visibly stutter/jump -- same rationale as
            // AquaCaustics.shader's _Time.y.
            //
            // Wrapped in the idiomatic URP UnityPerMaterial CBUFFER (matching
            // Unity's own built-in URP Sprite/Lit shaders, and KawaSurface.shader
            // in this same package) rather than declared as loose globals, so
            // the SRP Batcher can treat this material's per-draw data as one
            // batched constant buffer instead of falling back to legacy
            // per-draw-call constant upload.
            CBUFFER_START(UnityPerMaterial)
                float _Intensity;
                float4 _Tint;
                float _Scale;
                float _Speed;
                float4 _FadeParams;
                float4 _RectExtent;
                float _KawaTime;
            CBUFFER_END

            Varyings Vert(Attributes input)
            {
                Varyings output = (Varyings)0;
                output.positionHCS = TransformObjectToHClip(input.positionOS);
                output.uv = input.uv;
                return output;
            }

            // Cheap 2-component hash used to jitter Voronoi feature points.
            // Deliberately not a texture lookup -- this whole surface is
            // procedural, no texture assets are introduced.
            float2 Hash2(float2 p)
            {
                p = float2(dot(p, float2(127.1, 311.7)), dot(p, float2(269.5, 183.3)));
                return frac(sin(p) * 43758.5453);
            }

            // Animated Voronoi F1 distance. Feature points oscillate in place
            // (the sin(t + ...) term) rather than translating, which is what
            // makes the cells "dance" in place instead of scrolling like a
            // conveyor belt -- the visual signature of real underwater
            // caustics.
            float Voro(float2 x, float t)
            {
                float2 n = floor(x);
                float2 f = frac(x);
                float d = 8.0;
                [unroll]
                for (int j = -1; j <= 1; j++)
                {
                    [unroll]
                    for (int i = -1; i <= 1; i++)
                    {
                        float2 g = float2((float)i, (float)j);
                        float2 o = Hash2(n + g);
                        o = 0.5 + 0.5 * sin(t + 6.2831 * o);
                        float2 r = g + o - f;
                        d = min(d, dot(r, r));
                    }
                }
                return sqrt(d);
            }

            // pow(..., 5.0) squeezes the Voronoi F1 field down to thin, bright
            // ridges at cell boundaries instead of soft round blobs -- this is
            // what reads as "sharp dancing filaments" rather than gaussian blur.
            float Layer(float2 uv, float t)
            {
                return pow(saturate(1.0 - Voro(uv, t)), 5.0);
            }

            half4 Frag(Varyings input) : SV_Target
            {
                // Pristine mesh UV (0..aspect, 0..1), kept aside from the
                // domain-warped copy below so the vertical fade and the box
                // edge mask stay locked to the surface's actual rect bounds.
                float2 uv0 = input.uv;
                float2 uv = uv0;

                // (1) Domain warp: bends the lattice into organic wobbling
                // shapes instead of a rigid, obviously-repeating Voronoi grid.
                uv += 0.05 * sin(uv.yx * 6.0 + _KawaTime * 0.7);

                // (2)+(3) Two independently drifting/animating Voronoi layers.
                float2 uv1 = uv * _Scale + float2(_KawaTime * 0.04, _KawaTime * 0.02);
                float t1 = _KawaTime * _Speed;
                float c1 = Layer(uv1, t1);

                float2 uv2 = uv * _Scale * 1.77 - float2(_KawaTime * 0.03, -_KawaTime * 0.015) + 3.7;
                float t2 = _KawaTime * _Speed * 1.23 + 2.0;
                float c2 = Layer(uv2, t2);

                // (4) Multiplying the two layers keeps only their filament
                // intersections -- a sharp interference web -- rather than the
                // mushy union a simple add/max would give. The extra pow(c1,8)
                // term layers in a scatter of hot sparkle points.
                float c = c1 * c2 * 2.2 + pow(c1, 8.0) * 0.35;

                // (5) Vertical fade: caustics read strongest through the
                // mid/upper water column and fall off near the riverbed. uv0.y
                // is already normalized 0..1 across the surface's rect height
                // by construction (see KawaCausticsSurface.BuildQuadMesh), so
                // it doubles directly as the fade coordinate.
                float vNormalized = uv0.y;
                float fade = lerp(_FadeParams.z, 1.0, smoothstep(_FadeParams.x, _FadeParams.y, vNormalized));

                // (6) Soft box edge mask so this additive quad never shows a
                // hard rectangle silhouette against the background. _RectExtent
                // carries the quad's own UV extents (uMax = aspect, vMax = 1),
                // so the margin is proportionally even on all four sides no
                // matter the rect's aspect ratio.
                float2 edgeDist = min(uv0, _RectExtent.xy - uv0);
                float edgeWidth = max(0.06 * _RectExtent.y, 1e-4);
                float2 edgeMask2 = smoothstep(0.0, edgeWidth, edgeDist);
                float edgeMask = edgeMask2.x * edgeMask2.y;

                float3 color = _Tint.rgb * c * _Intensity * fade * edgeMask;
                return half4(color, 1.0);
            }
            ENDHLSL
        }
    }
}
