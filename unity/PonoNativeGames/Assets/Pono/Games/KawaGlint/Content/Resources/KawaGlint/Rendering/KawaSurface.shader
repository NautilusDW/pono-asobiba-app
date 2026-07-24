// Procedural waterline surface band for the KawaGlint river-cutaway spike.
//
// Draws three layered pieces of *content* (not a post-process distortion) on
// one in-scene quad, straddling the waterline: (1) a bright, undulating crest
// line that traces the pinned analytic wave -- this is what beats the web
// version's static 2px CSS line; (2) horizontally-stretched sparkle glints
// scattered just below the crest; (3) bubbly foam clustered where the water
// meets the shore. All three are additive/premultiplied "light", never an
// occluder -- the later full-screen refraction pass (module 1) wobbles this
// quad's underwater half again for free, exactly like AquaCaustics's caustics
// quad is wobbled by AquaLumina's distortion pass (see AquaCausticsSurface.cs).
//
// Like AquaCaustics.shader, this is a plain vertex/fragment HLSLPROGRAM pass
// drawn directly by the URP 2D Renderer's transparent sort -- no
// ScriptableRenderPass/RenderGraph involvement here, which is why the pass
// MUST use the SRPDefaultUnlit LightMode tag (a "UniversalForward" tag would
// simply not be drawn by the 2D renderer).
Shader "Pono/KawaGlint/Surface"
{
    Properties
    {
        _Intensity ("Intensity", Float) = 1.0
        _WaterlineY ("Waterline World Y", Float) = 1.6
        _ShoreEdgeX ("Shore Right Edge World X", Float) = -5.4
        _SparkleTint ("Sparkle Tint", Color) = (1.0, 0.98, 0.90, 1.0)
        _FoamTint ("Foam Tint", Color) = (1.0, 1.0, 1.0, 1.0)
        // Driven every frame from KawaSurfaceBand.Update (Time.time) -- never
        // the engine-global _Time.y, which is level-load-relative and would
        // desync this crest line from module 4's KawaWave-driven bobber (see
        // the shared "time base" contract in DESIGN.md).
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
            Name "KawaSurfaceUnlit"
            // CRITICAL: SRPDefaultUnlit is the LightMode the URP 2D Renderer
            // draws for plain (non-Sprite) MeshRenderers in its transparent
            // sort. A "UniversalForward" tag here would render nothing.
            Tags { "LightMode" = "SRPDefaultUnlit" }

            // Premultiplied alpha: the crest line and sparkle glints are pure
            // additive light (alpha contribution 0), while foam carries real
            // coverage alpha. Blend One OneMinusSrcAlpha lets both live in the
            // same output without the glints punching a hole in the foam or
            // vice versa.
            Blend One OneMinusSrcAlpha
            ZWrite Off
            Cull Off

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma target 3.0

            // Deliberate, version-safe choice: this file only ever needs a
            // plain vertex/fragment HLSLPROGRAM pass (there is no custom
            // ScriptableRenderPass here for RenderGraph to matter to).
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float3 positionOS : POSITION;
                // World-space XY (uv.x = world x, uv.y = world y) -- pinned
                // contract, see KawaSurfaceBand.BuildQuadMesh. Lets the
                // fragment stage evaluate the wave in world space with zero
                // per-vertex math.
                float2 uv : TEXCOORD0;
                // Local (0..1) horizontal coordinate for this quad's own
                // left/right edge fade only -- baked once at mesh-build time,
                // deliberately not part of the shared material uniform
                // contract (Intensity/WaterlineY/ShoreEdgeX/SparkleTint/
                // FoamTint).
                float2 edgeUv : TEXCOORD1;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float2 edgeUv : TEXCOORD1;
            };

            CBUFFER_START(UnityPerMaterial)
                float _Intensity;
                float _WaterlineY;
                float _ShoreEdgeX;
                float4 _SparkleTint;
                float4 _FoamTint;
                float _KawaTime;
            CBUFFER_END

            Varyings Vert(Attributes input)
            {
                Varyings output = (Varyings)0;
                output.positionHCS = TransformObjectToHClip(input.positionOS);
                output.uv = input.uv;
                output.edgeUv = input.edgeUv;
                return output;
            }

            // Self-contained 2D value noise (no noise texture asset -- this
            // project ships zero authored .mat/.tex assets). Mirrors the
            // pattern used by AquaWaterDistortion.shader so both spikes share
            // one house style for procedural noise.
            float Hash21(float2 p)
            {
                return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
            }

            float ValueNoise(float2 p)
            {
                float2 i = floor(p);
                float2 f = frac(p);
                // Quintic ("improved fade") smoothing: continuous second
                // derivative, avoids faint grid-aligned seams.
                float2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

                float a = Hash21(i + float2(0.0, 0.0));
                float b = Hash21(i + float2(1.0, 0.0));
                float c = Hash21(i + float2(0.0, 1.0));
                float d = Hash21(i + float2(1.0, 1.0));

                return lerp(lerp(a, b, u.x), lerp(c, d, u.x), u.y);
            }

            half4 Frag(Varyings input) : SV_Target
            {
                float worldX = input.uv.x;
                float worldY = input.uv.y;
                float t = _KawaTime;

                // Pinned 3-sine wave contract (constants verbatim -- must
                // match Pono.KawaGlint.Rendering.KawaWave.Height in module 4
                // to the digit, see DESIGN.md "Wave contract").
                float wave = 0.045 * sin(0.9 * worldX + 1.2 * t)
                    + 0.025 * sin(2.3 * worldX - 2.1 * t + 1.7)
                    + 0.012 * sin(5.1 * worldX + 3.7 * t + 4.2);

                // (1) Crest line: a bright HDR ridge that traces the wave
                // exactly, so the waterline itself visibly undulates instead
                // of sitting on a static horizontal rule (the web version's
                // flat 2px CSS line, which this must beat).
                float d = worldY - (_WaterlineY + wave);
                float crest = exp(-(d * d) / (0.03 * 0.03));
                float3 crestColor = _SparkleTint.rgb * 1.6 * crest;

                // (2) Sparkle: only below the crest, fading out with depth.
                // Horizontally-stretched glints come from an x-frequency that
                // is much lower than the y-frequency in the noise lookup
                // (~6:1 elongation), and the twinkle itself comes from a slow
                // drifting "patch" mask (period >= 0.4s, so <= 2.5Hz -- the
                // child-safe flicker ceiling) rather than a fast-scrolling
                // noise field.
                float below = saturate(-d / 0.45);
                float n = ValueNoise(float2(worldX * 1.4 + t * 0.5, worldY * 9.0));
                float patch = ValueNoise(float2(worldX * 0.35 - t * 0.11, 3.7));
                float glint = pow(saturate((n - 0.66) / 0.30), 3.0)
                    * smoothstep(0.40, 0.70, patch)
                    * (1.0 - below)
                    * step(d, 0.0);
                float3 glintColor = _SparkleTint.rgb * 2.0 * glint;

                // (3) Shoreline foam: proximity to the shore's right edge,
                // a soft vertical window straddling the waterline, and a
                // bubbly two-octave noise texture scrolled slowly toward the
                // shore (+x) so it reads as drifting foam rather than a
                // static white patch.
                float foamZone = exp(-pow((worldX - _ShoreEdgeX) / 1.2, 2.0));
                float window = smoothstep(0.12, 0.05, abs(d));
                float foamNoise = ValueNoise(float2(worldX * 3.0 + t * 0.15, worldY * 6.0))
                    * 0.6 + ValueNoise(float2(worldX * 7.0 + t * 0.15 * 1.7, worldY * 13.0)) * 0.4;
                float bubbles = smoothstep(0.45, 0.75, foamNoise);
                float foamAlpha = 0.85 * foamZone * window * bubbles;
                float3 foamColor = _FoamTint.rgb * foamAlpha;

                // Soft left/right edge fade over the outer 3% of the quad so
                // this band never shows a hard vertical seam at its own
                // horizontal bounds.
                float edgeFade = smoothstep(0.0, 0.03, input.edgeUv.x) * smoothstep(1.0, 0.97, input.edgeUv.x);

                float3 rgb = (crestColor + glintColor + foamColor) * _Intensity * edgeFade;
                float alpha = foamAlpha * _Intensity * edgeFade;
                return half4(rgb, alpha);
            }
            ENDHLSL
        }
    }
}
