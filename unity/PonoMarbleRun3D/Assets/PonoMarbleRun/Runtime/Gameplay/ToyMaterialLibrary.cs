using System;
using System.Collections.Generic;
using Pono.MarbleRun3D.Core;
using UnityEngine;

namespace Pono.MarbleRun3D.Gameplay
{
    public sealed class ToyMaterialLibrary : IDisposable
    {
        private readonly List<Material> _owned = new List<Material>();
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
        public Material Selection { get; }
        public Material GhostValid { get; }
        public Material GhostInvalid { get; }
        public Material InvalidMark { get; }
        public Material Shadow { get; }
        public PhysicsMaterial TrackPhysics { get; }
        public Shader BaseShader { get; }

        public ToyMaterialLibrary()
        {
            var baseMaterial = Resources.Load<Material>("Materials/ToyBase");
            BaseShader = baseMaterial != null
                ? baseMaterial.shader
                : Shader.Find("Standard") ?? Shader.Find("Universal Render Pipeline/Lit");
            if (BaseShader == null)
                throw new InvalidOperationException("The toy material shader is unavailable.");
            Maple = Make("メープル", new Color(0.91f, 0.69f, 0.40f), 0.14f);
            MapleDark = Make("こい もく", new Color(0.53f, 0.30f, 0.15f), 0.09f);
            Board = Make("あそびだい", new Color(0.76f, 0.55f, 0.31f), 0.12f);
            BoardEdge = Make("あそびだい ふち", new Color(0.44f, 0.25f, 0.12f), 0.08f);
            Connector = Make("つなぎ まる", new Color(0.18f, 0.78f, 0.92f), 0.48f, true);
            ConnectorGlow = Make("つなぎ ひかり", new Color(0.54f, 1f, 0.66f), 0.55f, true);
            Marble = Make("たま", new Color(0.96f, 0.34f, 0.28f), 0.88f, false, 0.08f);
            Metal = Make("かなぐ", new Color(0.88f, 0.90f, 0.92f), 0.62f, false, 0.55f);
            Selection = MakeTransparent("えらんだ しるし", new Color(0.28f, 0.95f, 1f, 0.48f), true);
            GhostValid = MakeTransparent("おける ゴースト", new Color(0.32f, 1f, 0.62f, 0.48f), true);
            GhostInvalid = MakeTransparent("おけない ゴースト", new Color(1f, 0.42f, 0.28f, 0.46f), true);
            InvalidMark = Make("おけない しるし", new Color(0.92f, 0.16f, 0.12f), 0.28f, true);
            Shadow = MakeTransparent("かげ", new Color(0.16f, 0.09f, 0.06f, 0.22f));
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
                _accent[kind] = Make(PartCatalog.Get(kind).DisplayName, PartCatalog.Get(kind).Accent, 0.26f);
            }
        }

        public Material Accent(MarblePieceKind kind)
        {
            return _accent[kind];
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
            if (material.HasProperty("_SrcBlend")) material.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            if (material.HasProperty("_DstBlend")) material.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            if (material.HasProperty("_ZWrite")) material.SetInt("_ZWrite", 0);
            material.DisableKeyword("_ALPHATEST_ON");
            material.EnableKeyword("_ALPHABLEND_ON");
            material.DisableKeyword("_ALPHAPREMULTIPLY_ON");
            material.renderQueue = 3000;
            return material;
        }
    }
}
