using System.Collections.Generic;
using UnityEngine;

namespace Pono.FluidMarbleLab
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(Rigidbody2D), typeof(EdgeCollider2D))]
    public sealed class TrackPiece : MonoBehaviour
    {
        private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
        private readonly List<Material> ownedMaterials = new List<Material>(2);

        private Vector2[] localPath;
        private Rigidbody2D body;
        private EdgeCollider2D edgeCollider;
        private LineRenderer outline;
        private LineRenderer fill;
        private Color baseColor;
        private bool selected;

        public string PieceId { get; private set; }
        public bool IsSelected => selected;
        public Vector3 StartPosition { get; private set; }
        public Quaternion StartRotation { get; private set; }

        public void Configure(string pieceId, IReadOnlyList<Vector2> path, Color color)
        {
            PieceId = pieceId;
            baseColor = color;
            localPath = new Vector2[path.Count];
            for (var i = 0; i < path.Count; i++)
            {
                localPath[i] = path[i];
            }

            body = GetComponent<Rigidbody2D>();
            body.bodyType = RigidbodyType2D.Kinematic;
            body.useFullKinematicContacts = true;
            body.interpolation = RigidbodyInterpolation2D.Interpolate;

            edgeCollider = GetComponent<EdgeCollider2D>();
            edgeCollider.points = localPath;
            edgeCollider.edgeRadius = 0.12f;

            outline = CreateLine("ふち", 0.36f, new Color(0.16f, 0.13f, 0.22f, 0.96f), 5);
            fill = CreateLine("いろ", 0.22f, baseColor, 6);
            StoreStartPose();
        }

        public void StoreStartPose()
        {
            StartPosition = transform.position;
            StartRotation = transform.rotation;
        }

        public void ResetPose()
        {
            transform.SetPositionAndRotation(StartPosition, StartRotation);
            body.position = StartPosition;
            body.rotation = StartRotation.eulerAngles.z;
        }

        public void SetSelected(bool value)
        {
            selected = value;
            if (fill == null)
            {
                return;
            }

            var color = value
                ? Color.Lerp(baseColor, Color.white, 0.42f)
                : baseColor;
            ApplyMaterialColor(fill.sharedMaterial, color);
            fill.widthMultiplier = value ? 0.28f : 0.22f;
        }

        public void MoveTo(Vector2 worldPosition)
        {
            body.position = worldPosition;
            transform.position = new Vector3(worldPosition.x, worldPosition.y, transform.position.z);
        }

        public void RotateBy(float degrees)
        {
            var next = Mathf.Round((body.rotation + degrees) / 15f) * 15f;
            body.rotation = next;
            transform.rotation = Quaternion.Euler(0f, 0f, next);
        }

        public void SetSimulationEnabled(bool enabled)
        {
            edgeCollider.enabled = enabled;
        }

        public float DistanceToWorldPoint(Vector2 worldPoint)
        {
            if (localPath == null || localPath.Length < 2)
            {
                return float.PositiveInfinity;
            }

            var minimum = float.PositiveInfinity;
            for (var i = 0; i < localPath.Length - 1; i++)
            {
                var start = (Vector2)transform.TransformPoint(localPath[i]);
                var end = (Vector2)transform.TransformPoint(localPath[i + 1]);
                minimum = Mathf.Min(minimum, DistanceToSegment(worldPoint, start, end));
            }
            return minimum;
        }

        private LineRenderer CreateLine(string label, float width, Color color, int sortingOrder)
        {
            var child = new GameObject(label);
            child.transform.SetParent(transform, false);
            var line = child.AddComponent<LineRenderer>();
            line.useWorldSpace = false;
            line.positionCount = localPath.Length;
            line.widthMultiplier = width;
            line.numCapVertices = 8;
            line.numCornerVertices = 8;
            line.textureMode = LineTextureMode.Stretch;
            line.sortingOrder = sortingOrder;
            for (var i = 0; i < localPath.Length; i++)
            {
                line.SetPosition(i, localPath[i]);
            }

            var shader = Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default");
            var material = new Material(shader)
            {
                name = $"Track {PieceId} {label}"
            };
            ownedMaterials.Add(material);
            ApplyMaterialColor(material, color);
            line.sharedMaterial = material;
            line.startColor = Color.white;
            line.endColor = Color.white;
            return line;
        }

        private void OnDestroy()
        {
            for (var i = 0; i < ownedMaterials.Count; i++)
            {
                if (ownedMaterials[i] != null)
                {
                    if (Application.isPlaying) Destroy(ownedMaterials[i]);
                    else DestroyImmediate(ownedMaterials[i]);
                }
            }
            ownedMaterials.Clear();
        }

        private static void ApplyMaterialColor(Material material, Color color)
        {
            if (material == null)
            {
                return;
            }
            if (material.HasProperty(BaseColorId))
            {
                material.SetColor(BaseColorId, color);
            }
            material.color = color;
        }

        private static float DistanceToSegment(Vector2 point, Vector2 start, Vector2 end)
        {
            var segment = end - start;
            var lengthSquared = segment.sqrMagnitude;
            if (lengthSquared <= Mathf.Epsilon)
            {
                return Vector2.Distance(point, start);
            }
            var t = Mathf.Clamp01(Vector2.Dot(point - start, segment) / lengthSquared);
            return Vector2.Distance(point, start + segment * t);
        }
    }
}
