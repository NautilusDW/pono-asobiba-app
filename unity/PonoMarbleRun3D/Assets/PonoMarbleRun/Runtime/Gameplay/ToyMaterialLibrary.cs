using System;
using System.Collections.Generic;
using Pono.MarbleRun3D.Core;
using UnityEngine;

namespace Pono.MarbleRun3D.Gameplay
{
    public sealed class ToyMaterialLibrary : IDisposable
    {
        private readonly List<Material> _owned = new List<Material>();
        private readonly List<Material> _marbles = new List<Material>();
        private readonly List<Material> _pastels = new List<Material>();
        private readonly Dictionary<MarblePieceKind, Material> _accent =
            new Dictionary<MarblePieceKind, Material>();

        public Material Maple { get; }
        public Material MapleDark { get; }
        public Material Board { get; }
        public Material BoardEdge { get; }
        public Material Connector { get; }
        public Material ConnectorGlow { get; }
        public Material Marble { get; }
        public Material Metal { get; }
        public Material ClearShell { get; }
        public Material ClearEdge { get; }
        public Material Selection { get; }
        public Material GhostValid { get; }
        public Material GhostInvalid { get; }
        public Material InvalidMark { get; }
        public Material Shadow { get; }
        public PhysicsMaterial TrackPhysics { get; }
        public Shader BaseShader { get; }
        public int MarbleColorCount => _marbles.Count;
        public int SharedMaterialCount => _owned.Count;

        public ToyMaterialLibrary()
        {
            var baseMaterial = Resources.Load<Material>("Materials/ToyBase");
            BaseShader = baseMaterial != null
                ? baseMaterial.shader
                : Shader.Find("Standard") ?? Shader.Find("Universal Render Pipeline/Lit");
            if (BaseShader == null)
                throw new InvalidOperationException("The toy material shader is unavailable.");
            // Runtime is Linear. Keep the wood close to the earlier pastel delivery:
            // bright enough to feel like a nursery toy, with cocoa only for structure.
            Maple = Make("バニラ メープル", new Color(0.84f, 0.66f, 0.46f), 0.20f);
            MapleDark = Make("ミルク ココア", new Color(0.48f, 0.30f, 0.23f), 0.16f);
            Board = Make("ピーチ あそびだい", new Color(0.80f, 0.58f, 0.42f), 0.18f);
            BoardEdge = Make("ココア ふち", new Color(0.44f, 0.25f, 0.18f), 0.15f);
            Connector = Make("みずいろ つなぎ まる", new Color(0.397f, 0.716f, 0.888f), 0.50f, true);
            ConnectorGlow = Make("ミント つなぎ ひかり", new Color(0.479f, 0.761f, 0.533f), 0.56f, true);
            var marbleColors = new[]
            {
                new Color(0.98f, 0.62f, 0.57f), // ピーチ
                new Color(1.00f, 0.84f, 0.48f), // バター
                new Color(0.52f, 0.86f, 0.68f), // ミント
                new Color(0.47f, 0.79f, 0.90f), // アクア
                new Color(0.73f, 0.63f, 0.91f), // ラベンダー
                new Color(0.94f, 0.62f, 0.76f)  // ピンク
            };
            var pastelNames = new[] { "ピーチ", "バター", "ミント", "アクア", "ラベンダー", "ピンク" };
            for (var index = 0; index < marbleColors.Length; index++)
            {
                _pastels.Add(Make("パステル " + pastelNames[index], marbleColors[index], 0.38f));
                _marbles.Add(Make("にじいろ たま " + pastelNames[index], marbleColors[index], 0.82f, false, 0.05f));
            }
            Marble = _marbles[0];
            Metal = Make("パール かなぐ", new Color(0.96f, 0.93f, 0.89f), 0.64f, false, 0.30f);
            ClearShell = MakeTransparent("すけすけ みずいろ つつ", new Color(0.60f, 0.86f, 0.96f, 0.18f));
            ClearEdge = MakeTransparent("すけすけ みずいろ ふち", new Color(0.48f, 0.78f, 0.92f, 0.50f), true);
            Selection = MakeTransparent("えらんだ しるし", new Color(0.48f, 0.86f, 0.94f, 0.48f), true);
            GhostValid = MakeTransparent("おける ゴースト", new Color(0.57f, 0.94f, 0.72f, 0.46f), true);
            GhostInvalid = MakeTransparent("おけない ゴースト", new Color(0.98f, 0.58f, 0.52f, 0.46f), true);
            InvalidMark = Make("おけない しるし", new Color(0.88f, 0.30f, 0.30f), 0.28f, true);
            Shadow = MakeTransparent("あたたかい かげ", new Color(0.30f, 0.20f, 0.17f, 0.18f));
            TrackPhysics = new PhysicsMaterial("きの レール")
            {
                staticFriction = MarbleRunPhysicsProfile.TrackStaticFriction,
                dynamicFriction = MarbleRunPhysicsProfile.TrackDynamicFriction,
                bounciness = MarbleRunPhysicsProfile.TrackBounciness,
                frictionCombine = PhysicsMaterialCombine.Average,
                bounceCombine = PhysicsMaterialCombine.Minimum
            };

            foreach (MarblePieceKind kind in Enum.GetValues(typeof(MarblePieceKind)))
            {
                _accent[kind] = _pastels[AccentPaletteIndex(kind)];
            }
        }

        public Material Accent(MarblePieceKind kind)
        {
            return _accent[kind];
        }

        public Material MarbleAt(int index)
        {
            if (_marbles.Count == 0) return Marble;
            var normalized = index % _marbles.Count;
            if (normalized < 0) normalized += _marbles.Count;
            return _marbles[normalized];
        }

        public Material PastelAt(int index)
        {
            if (_pastels.Count == 0) return Maple;
            var normalized = index % _pastels.Count;
            if (normalized < 0) normalized += _pastels.Count;
            return _pastels[normalized];
        }

        public void Dispose()
        {
            for (var i = 0; i < _owned.Count; i++)
            {
                if (_owned[i] == null) continue;
                if (Application.isPlaying) UnityEngine.Object.Destroy(_owned[i]);
                else UnityEngine.Object.DestroyImmediate(_owned[i]);
            }
            _owned.Clear();
            _marbles.Clear();
            _pastels.Clear();
            _accent.Clear();
            if (TrackPhysics != null)
            {
                if (Application.isPlaying) UnityEngine.Object.Destroy(TrackPhysics);
                else UnityEngine.Object.DestroyImmediate(TrackPhysics);
            }
        }

        private Material Make(
            string name,
            Color color,
            float smoothness,
            bool emission = false,
            float metallic = 0f)
        {
            var material = new Material(BaseShader) { name = name, color = color };
            if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", smoothness);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", metallic);
            if (emission)
            {
                material.EnableKeyword("_EMISSION");
                if (material.HasProperty("_EmissionColor")) material.SetColor("_EmissionColor", color * 0.20f);
            }
            material.enableInstancing = true;
            _owned.Add(material);
            return material;
        }

        private Material MakeTransparent(string name, Color color, bool emission = false)
        {
            var material = Make(name, color, 0.24f, emission);
            material.SetOverrideTag("RenderType", "Transparent");
            if (material.HasProperty("_Mode")) material.SetFloat("_Mode", 3f);
            if (material.HasProperty("_Surface")) material.SetFloat("_Surface", 1f);
            if (material.HasProperty("_Blend")) material.SetFloat("_Blend", 0f);
            if (material.HasProperty("_SrcBlend")) material.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            if (material.HasProperty("_DstBlend")) material.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            if (material.HasProperty("_ZWrite")) material.SetInt("_ZWrite", 0);
            if (material.HasProperty("_AlphaClip")) material.SetFloat("_AlphaClip", 0f);
            material.DisableKeyword("_ALPHATEST_ON");
            material.EnableKeyword("_ALPHABLEND_ON");
            material.DisableKeyword("_ALPHAPREMULTIPLY_ON");
            material.renderQueue = 3000;
            return material;
        }

        private static int AccentPaletteIndex(MarblePieceKind kind)
        {
            switch (kind)
            {
                case MarblePieceKind.Start:
                case MarblePieceKind.Seesaw:
                case MarblePieceKind.Lift:
                case MarblePieceKind.Wave:
                    return 2; // ミント
                case MarblePieceKind.Goal:
                case MarblePieceKind.Splitter:
                case MarblePieceKind.Spinner:
                    return 1; // バター
                case MarblePieceKind.Straight:
                case MarblePieceKind.Tunnel:
                case MarblePieceKind.Elevator:
                case MarblePieceKind.ClearTube:
                    return 3; // アクア
                case MarblePieceKind.Curve:
                case MarblePieceKind.Steps:
                    return 0; // ピーチ
                case MarblePieceKind.Slope:
                case MarblePieceKind.Helix:
                case MarblePieceKind.ClearCurve:
                    return 4; // ラベンダー
                default:
                    return 5; // ピンク
            }
        }
    }
}
