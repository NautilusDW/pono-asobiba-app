// Procedural, additive, world-space caustics overlay for the AquaLumina spike.
//
// This is (per the tech-spike brief) this project's first real URP HLSLPROGRAM
// shader — everything before it in this codebase was either legacy CGPROGRAM
// UGUI/Canvas shaders (see HideSeekCreatures/InkComposite.shader) or built-in
// URP shaders used as-is. Kept deliberately simple and conservative: a single
// SRPDefaultUnlit pass drawn on a plain MeshRenderer, no custom
// ScriptableRenderPass / RenderGraph involvement at all — the URP 2D Renderer
// draws this mesh directly as part of its own transparent sort, which is why
// the pass MUST use the SRPDefaultUnlit LightMode tag (a "UniversalForward"
// tag would simply not be drawn by the 2D renderer).
Shader "Pono/AquaLumina/Caustics"
{
    Properties
    {
        _Intensity ("Intensity", Float) = 1.0
        _Tint ("Tint", Color) = (0.68, 0.93, 1.0, 1.0)
        _Scale ("Voronoi Scale", Float) = 2.6
        _Speed ("Animation Speed", Float) = 0.6
        _FadeParams ("Fade Params (bottomV, topV, minFade, unused)", Vector) = (0.05, 0.75, 0.35, 0)
        // Not part of the pinned tuning tuple above: the quad's own UV extents
        // (uMax = aspect, vMax = 1), used only to keep the box-edge soft mask
        // proportionally even on all four sides. See AquaCausticsSurface.cs.
        _RectExtent ("Rect UV Extent (uMax, vMax, unused, unused)", Vector) = (1.78, 1.0, 0, 0)
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
            Name "AquaCausticsUnlit"
            // CRITICAL: SRPDefaultUnlit is the LightMode the URP 2D Renderer
            // draws for plain (non-Sprite) MeshRenderers in its transparent
            // sort. A "UniversalForward" tag here would render nothing.
            Tags { "LightMode" = "SRPDefaultUnlit" }

            // Caustics are pure additive light: they only ever brighten
            // whatever is already behind them (background/rock sprites), never
            // occlude or write depth.
            Blend One One
            ZWrite Off
            Cull Off

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma target 3.0

            // Deliberate, version-safe choice: this file only ever needs a
            // plain vertex/fragment HLSLPROGRAM pass (there is no custom
            // ScriptableRenderPass here for RenderGraph to matter to) — the
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

            // float (not half): _Time.y keeps growing for the lifetime of the
            // session, and half's ~11-bit mantissa loses enough precision
            // within a few minutes to make the animation visibly stutter/jump.
            float _Intensity;
            float4 _Tint;
            float _Scale;
            float _Speed;
            float4 _FadeParams;
            float4 _RectExtent;

            Varyings Vert(Attributes input)
            {
                Varyings output = (Varyings)0;
                output.positionHCS = TransformObjectToHClip(input.positionOS);
                output.uv = input.uv;
                return output;
            }

            // Cheap 2-component hash used to jitter Voronoi feature points.
            // Deliberately not a texture lookup — this whole surface is
            // procedural, no texture assets are introduced.
            float2 Hash2(float2 p)
            {
                p = float2(dot(p, float2(127.1, 311.7)), dot(p, float2(269.5, 183.3)));
                return frac(sin(p) * 43758.5453);
            }

            // Animated Voronoi F1 distance. Feature points oscillate in place
            // (the sin(t + ...) term) rather than translating, which is what
            // makes the cells "dance" in place instead of scrolling like a
            // conveyor belt — the visual signature of real underwater caustics.
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
            // ridges at cell boundaries instead of soft round blobs — this is
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
                uv += 0.05 * sin(uv.yx * 6.0 + _Time.y * 0.7);

                // (2)+(3) Two independently drifting/animating Voronoi layers.
                float2 uv1 = uv * _Scale + float2(_Time.y * 0.04, _Time.y * 0.02);
                float t1 = _Time.y * _Speed;
                float c1 = Layer(uv1, t1);

                float2 uv2 = uv * _Scale * 1.77 - float2(_Time.y * 0.03, -_Time.y * 0.015) + 3.7;
                float t2 = _Time.y * _Speed * 1.23 + 2.0;
                float c2 = Layer(uv2, t2);

                // (4) Multiplying the two layers keeps only their filament
                // intersections — a sharp interference web — rather than the
                // mushy union a simple add/max would give. The extra pow(c1,8)
                // term layers in a scatter of hot sparkle points.
                float c = c1 * c2 * 2.2 + pow(c1, 8.0) * 0.35;

                // (5) Vertical fade: caustics read strongest through the
                // mid/upper water column and fall off near the seabed. uv0.y
                // is already normalized 0..1 across the surface's rect height
                // by construction (see AquaCausticsSurface.BuildQuadMesh), so
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
