using System.Collections.Generic;
using UnityEngine;

namespace Pono.FluidMarbleLab
{
    [DisallowMultipleComponent]
    public sealed class MarbleSpawner : MonoBehaviour
    {
        private static readonly Color[] Palette =
        {
            new Color(0.98f, 0.31f, 0.39f),
            new Color(1.00f, 0.66f, 0.19f),
            new Color(0.24f, 0.76f, 0.63f),
            new Color(0.24f, 0.57f, 0.96f),
            new Color(0.57f, 0.39f, 0.91f),
            new Color(0.96f, 0.43f, 0.72f)
        };

        [SerializeField, Range(1, 16)] private int maximumMarbles = 12;
        [SerializeField, Range(1, 12)] private int initialMarbles = 6;

        private readonly List<MarbleFlowMotor> marbles = new List<MarbleFlowMotor>(12);
        private LabViewport viewport;
        private FluidSimulationController simulation;
        private LabModeController modeController;
        private Transform marbleRoot;
        private Texture2D marbleTexture;
        private Sprite marbleSprite;
        private Material trailMaterial;
        private PhysicsMaterial2D physicsMaterial;

        public IReadOnlyList<MarbleFlowMotor> Marbles => marbles;

        public void Configure(
            LabViewport labViewport,
            FluidSimulationController fluidSimulation,
            LabModeController labMode,
            Transform root)
        {
            viewport = labViewport;
            simulation = fluidSimulation;
            marbleRoot = root != null ? root : transform;

            if (modeController != null)
            {
                modeController.ModeChanged -= HandleModeChanged;
            }
            modeController = labMode;
            if (modeController != null)
            {
                modeController.ModeChanged += HandleModeChanged;
            }

            EnsureSharedAssets();
            if (marbles.Count == 0)
            {
                for (var i = 0; i < initialMarbles; i++)
                {
                    CreateMarble(i);
                }
            }
            ResetMarbles();
            HandleModeChanged(modeController != null ? modeController.Mode : LabMode.Flow);
        }

        public void AddMarble()
        {
            if (marbles.Count >= maximumMarbles)
            {
                marbles[marbles.Count - 1].Recover();
                return;
            }
            var marble = CreateMarble(marbles.Count);
            marble.Body.simulated = modeController == null || modeController.Mode == LabMode.Flow;
        }

        public void ResetMarbles()
        {
            if (viewport == null)
            {
                return;
            }
            for (var i = 0; i < marbles.Count; i++)
            {
                var column = i % 4;
                var row = i / 4;
                var uv = new Vector2(0.12f + column * 0.047f, 0.78f - row * 0.09f);
                var spawn = viewport.GameplayUvToWorld(uv);
                marbles[i].SetSpawn(spawn);
                marbles[i].Recover();
            }
        }

        private MarbleFlowMotor CreateMarble(int index)
        {
            EnsureSharedAssets();
            var gameObject = new GameObject($"ビーだま {index + 1}");
            gameObject.transform.SetParent(marbleRoot, false);
            gameObject.transform.localScale = Vector3.one * 0.72f;

            var renderer = gameObject.AddComponent<SpriteRenderer>();
            renderer.sprite = marbleSprite;
            renderer.color = Palette[index % Palette.Length];
            renderer.sortingOrder = 10;

            var collider = gameObject.AddComponent<CircleCollider2D>();
            collider.radius = 0.47f;
            collider.sharedMaterial = physicsMaterial;

            var body = gameObject.AddComponent<Rigidbody2D>();
            body.mass = 0.72f;
            body.gravityScale = 0.72f;
            body.linearDamping = 0.42f;
            body.angularDamping = 0.2f;
            body.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
            body.interpolation = RigidbodyInterpolation2D.Interpolate;
            body.sleepMode = RigidbodySleepMode2D.StartAwake;

            var trail = gameObject.AddComponent<TrailRenderer>();
            trail.sharedMaterial = trailMaterial;
            trail.time = 0.62f;
            trail.minVertexDistance = 0.045f;
            trail.startWidth = 0.19f;
            trail.endWidth = 0.015f;
            trail.startColor = new Color(renderer.color.r, renderer.color.g, renderer.color.b, 0.42f);
            trail.endColor = new Color(renderer.color.r, renderer.color.g, renderer.color.b, 0f);
            trail.sortingOrder = 8;

            var spawn = viewport != null ? viewport.GameplayUvToWorld(new Vector2(0.14f, 0.78f)) : Vector2.zero;
            var motor = gameObject.AddComponent<MarbleFlowMotor>();
            motor.Configure(viewport, simulation, spawn);
            marbles.Add(motor);
            return motor;
        }

        private void EnsureSharedAssets()
        {
            if (marbleSprite == null)
            {
                marbleTexture = CreateMarbleTexture(96);
                marbleSprite = Sprite.Create(
                    marbleTexture,
                    new Rect(0f, 0f, marbleTexture.width, marbleTexture.height),
                    new Vector2(0.5f, 0.5f),
                    marbleTexture.width);
                marbleSprite.name = "Runtime Marble";
            }
            if (trailMaterial == null)
            {
                var shader = Shader.Find("Sprites/Default") ?? Shader.Find("Universal Render Pipeline/Unlit");
                trailMaterial = new Material(shader) { name = "Marble Trail (Runtime)" };
            }
            physicsMaterial ??= new PhysicsMaterial2D("Marble Physics")
            {
                bounciness = 0.24f,
                friction = 0.18f
            };
        }

        private void HandleModeChanged(LabMode mode)
        {
            var running = mode == LabMode.Flow;
            for (var i = 0; i < marbles.Count; i++)
            {
                marbles[i].Body.simulated = running;
            }
        }

        private void OnDestroy()
        {
            if (modeController != null)
            {
                modeController.ModeChanged -= HandleModeChanged;
            }
            if (marbleSprite != null) Destroy(marbleSprite);
            if (marbleTexture != null) Destroy(marbleTexture);
            if (trailMaterial != null) Destroy(trailMaterial);
            if (physicsMaterial != null) Destroy(physicsMaterial);
        }

        private static Texture2D CreateMarbleTexture(int size)
        {
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, false, true)
            {
                name = "Runtime Marble Texture",
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp
            };
            var pixels = new Color32[size * size];
            for (var y = 0; y < size; y++)
            {
                for (var x = 0; x < size; x++)
                {
                    var uv = new Vector2(
                        (x + 0.5f) / size * 2f - 1f,
                        (y + 0.5f) / size * 2f - 1f);
                    var distance = uv.magnitude;
                    var alpha = Mathf.SmoothStep(1f, 0f, Mathf.InverseLerp(0.82f, 1f, distance));
                    var bodyShade = Mathf.Lerp(0.63f, 1f, Mathf.Clamp01(1.12f - distance));
                    var highlight = Mathf.Pow(Mathf.Clamp01(1f - Vector2.Distance(uv, new Vector2(-0.34f, 0.38f)) * 2.1f), 3f);
                    var value = Mathf.Clamp01(bodyShade + highlight * 0.44f);
                    pixels[y * size + x] = new Color(value, value, value, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, true);
            return texture;
        }
    }
}
