using System;
using UnityEngine;

namespace Pono.FluidMarbleLab
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(CircleCollider2D))]
    public sealed class GoalZone : MonoBehaviour
    {
        private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
        private LineRenderer ring;
        private Material material;
        private float radius;
        private int score;

        public int Score => score;
        public event Action<int> ScoreChanged;

        public void Configure(float goalRadius, Color color)
        {
            radius = Mathf.Max(0.3f, goalRadius);
            var collider = GetComponent<CircleCollider2D>();
            collider.isTrigger = true;
            collider.radius = radius;

            ring = gameObject.AddComponent<LineRenderer>();
            ring.useWorldSpace = false;
            ring.loop = true;
            ring.positionCount = 48;
            ring.widthMultiplier = 0.14f;
            ring.numCornerVertices = 6;
            ring.sortingOrder = 7;
            for (var i = 0; i < ring.positionCount; i++)
            {
                var angle = i / (float)ring.positionCount * Mathf.PI * 2f;
                ring.SetPosition(i, new Vector3(Mathf.Cos(angle), Mathf.Sin(angle), 0f) * radius);
            }

            var shader = Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default");
            material = new Material(shader) { name = "Goal Ring (Runtime)" };
            if (material.HasProperty(BaseColorId)) material.SetColor(BaseColorId, color);
            material.color = color;
            ring.sharedMaterial = material;
        }

        public void ResetScore()
        {
            score = 0;
            ScoreChanged?.Invoke(score);
        }

        private void Update()
        {
            if (ring == null)
            {
                return;
            }
            var pulse = 1f + Mathf.Sin(Time.unscaledTime * 3.1f) * 0.045f;
            ring.transform.localScale = Vector3.one * pulse;
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            var marble = other.GetComponent<MarbleFlowMotor>();
            if (marble == null)
            {
                return;
            }
            score++;
            ScoreChanged?.Invoke(score);
            marble.Recover();
        }

        private void OnDestroy()
        {
            if (material != null)
            {
                Destroy(material);
            }
        }
    }
}
