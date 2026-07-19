#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using PonoSubmarine.SeaAlbum;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace PonoSubmarine.SeaAlbum.EditorTools
{
    public static class SeaAlbumStage01Builder
    {
        private const string Root = "Assets/_PonoSubmarine";
        private const string ScenePath = Root + "/Scenes/SeaAlbum_Stage01.unity";

        [MenuItem("Pono/Sea Album/Rebuild Stage 01")]
        public static void RebuildStage01()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                Debug.LogWarning("Stop Play Mode before rebuilding SeaAlbum_Stage01.");
                return;
            }

            EnsureFolders();
            AssetDatabase.Refresh();
            ConfigureImportedSprites();

            GeneratedSprites sprites = CreateProceduralSprites();
            Material bubbleParticleMaterial = CreateParticleMaterial(Root + "/Materials/BubbleParticle_Unlit.mat", "BubbleParticle_Unlit", sprites.bubbleParticle);
            Material waterTrailMaterial = CreateParticleMaterial(Root + "/Materials/WaterTrailParticle_Unlit.mat", "WaterTrailParticle_Unlit", sprites.waterTrailParticle);
            Dictionary<string, CreatureData> creatures = CreateCreatureData();
            GameObject straightProjectilePrefab = CreateStraightProjectilePrefab(sprites.straightProjectile);
            GameObject bombProjectilePrefab = CreateBombProjectilePrefab(sprites.bombProjectile);
            GameObject coinPickupPrefab = CreateCoinPickupPrefab(sprites.shellCoin);
            GameObject treasurePickupPrefab = CreateTreasurePickupPrefab(sprites.treasurePearl);
            GameObject surpriseBubblePrefab = CreateReactionHazardPrefab("SurpriseBubbleReaction", sprites.bubbleParticle, CreatureReactionKind.SurpriseBubble);
            GameObject sandPuffPrefab = CreateReactionHazardPrefab("SandPuffReaction", sprites.sandPuff, CreatureReactionKind.SandPuff);
            GameObject waterVortexPrefab = CreateReactionHazardPrefab("WaterVortexReaction", sprites.waterVortex, CreatureReactionKind.WaterVortex);
            GameObject playerPrefab = CreatePlayerPrefab(straightProjectilePrefab, bombProjectilePrefab, bubbleParticleMaterial, waterTrailMaterial);
            Dictionary<string, GameObject> creaturePrefabs = CreateCreaturePrefabs(creatures, coinPickupPrefab, surpriseBubblePrefab, sandPuffPrefab, waterVortexPrefab);
            GameObject albumItemPrefab = CreateAlbumItemPrefab();
            CreateBackgroundLayerPrefabs(sprites, bubbleParticleMaterial);

            StageData stageData = CreateStage01Data(creatures, creaturePrefabs);
            CreatePlaceholderStageData();
            BuildScene(stageData, playerPrefab, straightProjectilePrefab, bombProjectilePrefab, albumItemPrefab, treasurePickupPrefab, sprites.albumBanner);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("Sea Album Stage 01 vertical slice rebuilt and saved: " + ScenePath);
        }

        private static void EnsureFolders()
        {
            string[] folders =
            {
                Root + "/Art/Player",
                Root + "/Art/Creatures/Stage01",
                Root + "/Art/Backgrounds/Stage01",
                Root + "/Art/UI",
                Root + "/Audio",
                Root + "/Data/Creatures/Stage01",
                Root + "/Data/Stages",
                Root + "/Materials",
                Root + "/Particles",
                Root + "/Prefabs/Player",
                Root + "/Prefabs/Creatures",
                Root + "/Prefabs/Projectiles",
                Root + "/Prefabs/Hazards",
                Root + "/Prefabs/Pickups",
                Root + "/Prefabs/UI",
                Root + "/Prefabs/Background",
                Root + "/Scenes",
                Root + "/Scripts/Album",
                Root + "/Scripts/Background",
                Root + "/Scripts/Core",
                Root + "/Scripts/Creatures",
                Root + "/Scripts/Player",
                Root + "/Scripts/Projectiles",
                Root + "/Scripts/UI",
                Root + "/Scripts/Editor"
            };

            foreach (string folder in folders)
            {
                EnsureFolder(folder);
            }
        }

        private static void EnsureFolder(string folder)
        {
            if (AssetDatabase.IsValidFolder(folder))
            {
                return;
            }

            string parent = Path.GetDirectoryName(folder).Replace("\\", "/");
            string name = Path.GetFileName(folder);
            EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, name);
        }

        private static void ConfigureImportedSprites()
        {
            string[] roots = { Root + "/Art" };
            string[] textureGuids = AssetDatabase.FindAssets("t:Texture2D", roots);
            foreach (string guid in textureGuids)
            {
                ConfigureSpriteImport(AssetDatabase.GUIDToAssetPath(guid), 100f);
            }
        }

        private static void ConfigureSpriteImport(string assetPath, float pixelsPerUnit)
        {
            TextureImporter importer = AssetImporter.GetAtPath(assetPath) as TextureImporter;
            if (importer == null)
            {
                return;
            }

            bool changed = false;
            if (importer.textureType != TextureImporterType.Sprite)
            {
                importer.textureType = TextureImporterType.Sprite;
                changed = true;
            }

            if (importer.spriteImportMode != SpriteImportMode.Single)
            {
                importer.spriteImportMode = SpriteImportMode.Single;
                changed = true;
            }

            if (!importer.alphaIsTransparency)
            {
                importer.alphaIsTransparency = true;
                changed = true;
            }

            if (importer.mipmapEnabled)
            {
                importer.mipmapEnabled = false;
                changed = true;
            }

            if (importer.filterMode != FilterMode.Bilinear)
            {
                importer.filterMode = FilterMode.Bilinear;
                changed = true;
            }

            if (importer.textureCompression != TextureImporterCompression.Uncompressed)
            {
                importer.textureCompression = TextureImporterCompression.Uncompressed;
                changed = true;
            }
            if (Math.Abs(importer.spritePixelsPerUnit - pixelsPerUnit) > 0.001f)
            {
                importer.spritePixelsPerUnit = pixelsPerUnit;
                changed = true;
            }

            if (changed)
            {
                importer.SaveAndReimport();
            }
        }

        private static GeneratedSprites CreateProceduralSprites()
        {
            GeneratedSprites sprites = new GeneratedSprites();
            sprites.straightProjectile = LoadSprite(Root + "/Art/UI/item_food_pellet.png");
            if (sprites.straightProjectile == null)
            {
                sprites.straightProjectile = CreateCircleSprite(
                    Root + "/Art/UI/procedural_food_pellet_fallback.png",
                    96,
                    new Color32(230, 174, 80, 255),
                    new Color32(125, 71, 28, 0));
            }

            sprites.bombProjectile = LoadSprite(Root + "/Art/UI/item_food_bubble.png");
            if (sprites.bombProjectile == null)
            {
                sprites.bombProjectile = CreateBombSprite(Root + "/Art/UI/procedural_gravity_bomb.png");
            }

            sprites.bubbleParticle = CreateBubbleParticleSprite(Root + "/Art/UI/procedural_bubble_particle.png");
            sprites.waterTrailParticle = CreateWaterTrailParticleSprite(Root + "/Art/UI/procedural_water_trail_particle.png");
            sprites.shellCoin = CreateShellCoinSprite(Root + "/Art/UI/procedural_shell_coin.png");
            sprites.treasurePearl = CreateTreasurePearlSprite(Root + "/Art/UI/procedural_treasure_pearl.png");
            sprites.sandPuff = CreateSandPuffSprite(Root + "/Art/UI/procedural_sand_puff.png");
            sprites.waterVortex = CreateWaterVortexSprite(Root + "/Art/UI/procedural_water_vortex.png");
            sprites.albumBanner = CreateAlbumBannerSprite(Root + "/Art/UI/procedural_album_registration_banner.png");
            sprites.waterGradient = CreateWaterGradientSprite(Root + "/Art/Backgrounds/Stage01/procedural_water_gradient.png");
            sprites.caustics = CreateCausticsSprite(Root + "/Art/Backgrounds/Stage01/procedural_caustics.png");
            sprites.surfaceWave = CreateSurfaceWaveSprite(Root + "/Art/Backgrounds/Stage01/procedural_surface_wave.png");
            sprites.panorama = LoadSprite(Root + "/Art/Backgrounds/Stage01/stage1_tidepool_scroll_panorama.png");
            return sprites;
        }

        private static Sprite CreateCircleSprite(string assetPath, int size, Color32 centerColor, Color32 edgeColor)
        {
            return CreateSpritePng(assetPath, size, size, (x, y) =>
            {
                float cx = (size - 1) * 0.5f;
                float cy = (size - 1) * 0.5f;
                float distance = Vector2.Distance(new Vector2(x, y), new Vector2(cx, cy)) / cx;
                float t = Mathf.Clamp01(distance);
                float alpha = Mathf.Clamp01(1f - t);
                alpha *= alpha;
                Color color = Color.Lerp(centerColor, edgeColor, t);
                color.a = alpha;
                return color;
            });
        }

        private static Sprite CreateBombSprite(string assetPath)
        {
            int width = 128;
            int height = 96;
            return CreateSpritePng(assetPath, width, height, (x, y) =>
            {
                Vector2 p = new Vector2(x, y);
                Vector2 center = new Vector2(66f, 48f);
                float body = Mathf.Pow((p.x - center.x) / 34f, 2f) + Mathf.Pow((p.y - center.y) / 24f, 2f);
                bool inBody = body <= 1f;
                bool inOutline = body <= 1.18f;

                Vector2 flameCenter = new Vector2(28f, 48f);
                float flame = Mathf.Pow((p.x - flameCenter.x) / 22f, 2f) + Mathf.Pow((p.y - flameCenter.y) / 13f, 2f);
                bool inFlame = flame <= 1f && p.x < 47f;

                if (inFlame)
                {
                    float t = Mathf.Clamp01((p.x - 8f) / 38f);
                    Color flameColor = Color.Lerp(new Color(1f, 0.18f, 0.03f, 0.9f), new Color(1f, 0.85f, 0.15f, 0.95f), t);
                    return flameColor;
                }

                if (inBody)
                {
                    float highlight = Mathf.Clamp01(1f - Vector2.Distance(p, new Vector2(54f, 60f)) / 32f);
                    Color baseColor = Color.Lerp(new Color(0.18f, 0.12f, 0.08f, 1f), new Color(0.95f, 0.48f, 0.08f, 1f), highlight * 0.65f);
                    if (Vector2.Distance(p, new Vector2(56f, 61f)) < 8f)
                    {
                        baseColor = new Color(1f, 0.95f, 0.55f, 1f);
                    }

                    return baseColor;
                }

                if (inOutline)
                {
                    return new Color(0.06f, 0.05f, 0.04f, 0.95f);
                }

                return new Color(0f, 0f, 0f, 0f);
            });
        }

        private static Sprite CreateBubbleParticleSprite(string assetPath)
        {
            int size = 128;
            return CreateSpritePng(assetPath, size, size, (x, y) =>
            {
                float center = (size - 1) * 0.5f;
                float distance = Vector2.Distance(new Vector2(x, y), new Vector2(center, center)) / center;
                float ring = Mathf.Clamp01(1f - Mathf.Abs(distance - 0.74f) / 0.055f);
                float body = Mathf.Clamp01(1f - distance);
                float alpha = ring * 0.72f + body * 0.05f;
                if (Vector2.Distance(new Vector2(x, y), new Vector2(45f, 82f)) < 9f)
                {
                    alpha = Mathf.Max(alpha, 0.82f);
                }

                return new Color(0.88f, 1f, 1f, alpha);
            });
        }

        private static Sprite CreateWaterTrailParticleSprite(string assetPath)
        {
            int width = 160;
            int height = 48;
            return CreateSpritePng(assetPath, width, height, (x, y) =>
            {
                float centerY = (height - 1) * 0.5f;
                float normalizedX = x / (float)(width - 1);
                float vertical = Mathf.Abs(y - centerY) / centerY;
                float capsule = Mathf.Clamp01(1f - vertical * 1.75f);
                float tail = Mathf.SmoothStep(0f, 1f, normalizedX);
                float alpha = capsule * tail * 0.34f;
                return new Color(0.65f, 0.95f, 1f, alpha);
            });
        }

        private static Sprite CreateShellCoinSprite(string assetPath)
        {
            int size = 128;
            return CreateSpritePng(assetPath, size, size, (x, y) =>
            {
                Vector2 p = new Vector2(x, y);
                Vector2 center = new Vector2(64f, 64f);
                float distance = Vector2.Distance(p, center) / 58f;
                if (distance > 1f)
                {
                    return new Color(0f, 0f, 0f, 0f);
                }

                float ridge = Mathf.Abs(Mathf.Sin((p.x - 64f) * 0.18f + Mathf.Atan2(p.y - 64f, p.x - 64f) * 2.2f));
                float rim = Mathf.Clamp01((distance - 0.78f) / 0.18f);
                Color baseColor = Color.Lerp(new Color(1f, 0.72f, 0.22f, 1f), new Color(1f, 0.96f, 0.55f, 1f), 1f - distance * 0.45f);
                baseColor = Color.Lerp(baseColor, new Color(0.95f, 0.45f, 0.12f, 1f), rim * 0.65f);
                baseColor = Color.Lerp(baseColor, Color.white, ridge * 0.16f);
                return baseColor;
            });
        }

        private static Sprite CreateTreasurePearlSprite(string assetPath)
        {
            int size = 128;
            return CreateSpritePng(assetPath, size, size, (x, y) =>
            {
                Vector2 p = new Vector2(x, y);
                Vector2 center = new Vector2(64f, 62f);
                float distance = Vector2.Distance(p, center) / 46f;
                if (distance > 1.05f)
                {
                    return new Color(0f, 0f, 0f, 0f);
                }

                float shine = Mathf.Clamp01(1f - Vector2.Distance(p, new Vector2(48f, 82f)) / 22f);
                Color pearl = Color.Lerp(new Color(0.45f, 0.92f, 1f, 0.95f), new Color(1f, 0.96f, 0.72f, 1f), 1f - distance * 0.55f);
                pearl = Color.Lerp(pearl, Color.white, shine * 0.65f);
                pearl.a = Mathf.Clamp01(1.1f - distance);
                return pearl;
            });
        }

        private static Sprite CreateSandPuffSprite(string assetPath)
        {
            int size = 128;
            return CreateSpritePng(assetPath, size, size, (x, y) =>
            {
                Vector2 p = new Vector2(x, y);
                float a = SandBlob(p, new Vector2(44f, 54f), 35f);
                a = Mathf.Max(a, SandBlob(p, new Vector2(68f, 64f), 42f));
                a = Mathf.Max(a, SandBlob(p, new Vector2(82f, 48f), 28f));
                float grain = Mathf.PerlinNoise(x * 0.12f, y * 0.12f) * 0.24f;
                return new Color(0.78f + grain, 0.64f + grain * 0.5f, 0.42f, a * 0.72f);
            });
        }

        private static float SandBlob(Vector2 point, Vector2 center, float radius)
        {
            float distance = Vector2.Distance(point, center) / radius;
            return Mathf.Clamp01(1f - distance);
        }

        private static Sprite CreateWaterVortexSprite(string assetPath)
        {
            int size = 160;
            return CreateSpritePng(assetPath, size, size, (x, y) =>
            {
                Vector2 p = new Vector2(x, y);
                Vector2 center = new Vector2(80f, 80f);
                Vector2 d = p - center;
                float radius = d.magnitude / 72f;
                if (radius > 1f)
                {
                    return new Color(0f, 0f, 0f, 0f);
                }

                float angle = Mathf.Atan2(d.y, d.x);
                float spiral = Mathf.Sin(angle * 3.2f + radius * 15f);
                float alpha = Mathf.Clamp01((spiral - 0.15f) * 1.2f) * Mathf.Clamp01(1f - radius * 0.85f);
                return new Color(0.72f, 1f, 1f, alpha * 0.76f);
            });
        }

        private static Sprite CreateAlbumBannerSprite(string assetPath)
        {
            int width = 768;
            int height = 96;
            return CreateSpritePng(assetPath, width, height, (x, y) =>
            {
                float u = x / (float)(width - 1);
                float v = y / (float)(height - 1);
                float edge = Mathf.Min(Mathf.Min(u, 1f - u), Mathf.Min(v, 1f - v));
                float border = Mathf.Clamp01(edge / 0.08f);
                float shine = Mathf.Clamp01(1f - Mathf.Abs(v - (0.62f + Mathf.Sin(u * Mathf.PI * 2f) * 0.06f)) / 0.08f) * 0.26f;
                float shellLine = Mathf.Clamp01(Mathf.Sin((u * 10f + v * 2f) * Mathf.PI) * 0.5f + 0.5f) * 0.08f;
                Color deep = new Color(0.02f, 0.28f, 0.4f, 0.92f);
                Color light = new Color(0.08f, 0.62f, 0.72f, 0.95f);
                Color color = Color.Lerp(deep, light, v * 0.8f + shine + shellLine);
                Color rim = new Color(1f, 0.9f, 0.46f, 0.95f);
                color = Color.Lerp(rim, color, border);
                color.a *= Mathf.SmoothStep(0f, 1f, edge / 0.025f);
                return color;
            });
        }

        private static Sprite CreateWaterGradientSprite(string assetPath)
        {
            int width = 64;
            int height = 256;
            Color top = new Color(0.34f, 0.86f, 1f, 1f);
            Color bottom = new Color(0.02f, 0.2f, 0.45f, 1f);
            return CreateSpritePng(assetPath, width, height, (x, y) => Color.Lerp(bottom, top, y / (float)(height - 1)));
        }

        private static Sprite CreateCausticsSprite(string assetPath)
        {
            int width = 512;
            int height = 256;
            return CreateSpritePng(assetPath, width, height, (x, y) =>
            {
                float v = Mathf.Sin(x * 0.08f + y * 0.035f) + Mathf.Sin(x * 0.027f - y * 0.09f) + Mathf.Sin((x + y) * 0.045f);
                float alpha = Mathf.InverseLerp(1.35f, 2.35f, v) * 0.45f;
                return new Color(0.8f, 1f, 1f, alpha);
            });
        }

        private static Sprite CreateSurfaceWaveSprite(string assetPath)
        {
            int width = 768;
            int height = 96;
            return CreateSpritePng(assetPath, width, height, (x, y) =>
            {
                float wave = height * 0.52f + Mathf.Sin(x * 0.035f) * 9f + Mathf.Sin(x * 0.011f) * 5f;
                float distance = Mathf.Abs(y - wave);
                float alpha = Mathf.Clamp01(1f - distance / 5f) * 0.75f;
                return new Color(0.82f, 1f, 1f, alpha);
            });
        }

        private static Sprite CreateSpritePng(string assetPath, int width, int height, Func<int, int, Color> pixelFunc)
        {
            string fullPath = ToFullPath(assetPath);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath));

            Texture2D texture = new Texture2D(width, height, TextureFormat.RGBA32, false);
            Color[] pixels = new Color[width * height];
            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    pixels[y * width + x] = pixelFunc(x, y);
                }
            }

            texture.SetPixels(pixels);
            texture.Apply();
            File.WriteAllBytes(fullPath, texture.EncodeToPNG());
            Object.DestroyImmediate(texture);

            AssetDatabase.ImportAsset(assetPath, ImportAssetOptions.ForceSynchronousImport);
            ConfigureSpriteImport(assetPath, 100f);
            return LoadSprite(assetPath);
        }

        private static string ToFullPath(string assetPath)
        {
            return Path.Combine(Directory.GetCurrentDirectory(), assetPath.Replace("/", Path.DirectorySeparatorChar.ToString()));
        }

        private static Material CreateParticleMaterial(string materialPath, string materialName, Sprite sprite)
        {
            Material material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if (material == null)
            {
                Shader shader = Shader.Find("Sprites/Default");
                if (shader == null)
                {
                    shader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
                }

                if (shader == null)
                {
                    shader = Shader.Find("Particles/Standard Unlit");
                }

                material = new Material(shader);
                AssetDatabase.CreateAsset(material, materialPath);
            }

            material.name = materialName;
            Texture2D texture = sprite != null ? sprite.texture : null;
            if (texture != null)
            {
                if (material.HasProperty("_BaseMap"))
                {
                    material.SetTexture("_BaseMap", texture);
                }

                if (material.HasProperty("_MainTex"))
                {
                    material.SetTexture("_MainTex", texture);
                }
            }

            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", Color.white);
            }

            if (material.HasProperty("_Color"))
            {
                material.SetColor("_Color", Color.white);
            }

            EditorUtility.SetDirty(material);
            return material;
        }

        private static Dictionary<string, CreatureData> CreateCreatureData()
        {
            CreatureDefinition[] definitions =
            {
                new CreatureDefinition("hermit_crab", "ヤドカリ", "浅い海の岩場や貝殻", "小さな有機物など", "からだを守るために、空いた貝殻をすみかにする。", false, 2),
                new CreatureDefinition("shrimp", "エビ", "岩陰や浅い海", "小さなプランクトンや有機物", "細い足と触角でまわりを探りながらすばやく動く。", false, 2),
                new CreatureDefinition("sea_star", "ヒトデ", "岩場や砂地", "貝などを食べる種類がいる", "星のような腕をゆっくり動かして海底を進む。", false, 3),
                new CreatureDefinition("tidepool_goby", "ハゼ", "浅い海の底や砂地", "小さな虫やプランクトン", "海底に近いところで止まったり、短く泳いだりする。", false, 3),
                new CreatureDefinition("sea_anemone", "イソギンチャク", "岩にくっついて暮らす", "触手で小さな生き物を捕まえる", "花のように見える触手で水の流れを感じている。", false, 4),
                new CreatureDefinition("horseshoe_crab_boss", "カブトガニ", "浅い海や砂地", "砂地の小さな生き物や有機物", "古い時代から形が大きく変わらない生きた化石。", true, 30)
            };

            Dictionary<string, CreatureData> result = new Dictionary<string, CreatureData>();
            foreach (CreatureDefinition definition in definitions)
            {
                string assetPath = Root + "/Data/Creatures/Stage01/" + definition.id + ".asset";
                CreatureData data = LoadOrCreateAsset<CreatureData>(assetPath);
                data.creatureId = definition.id;
                data.displayName = definition.displayName;
                data.habitat = definition.habitat;
                data.food = definition.food;
                data.bodySecret = definition.bodySecret;
                data.isBoss = definition.isBoss;
                data.maxHp = definition.maxHp;
                data.normalSprite = LoadSprite(Root + "/Art/Creatures/Stage01/" + definition.id + "_normal.png");
                data.eatingSprite = LoadSprite(Root + "/Art/Creatures/Stage01/" + definition.id + "_eating.png");
                data.happySprite = LoadSprite(Root + "/Art/Creatures/Stage01/" + definition.id + "_happy.png");
                EditorUtility.SetDirty(data);
                result.Add(definition.id, data);
            }

            return result;
        }

        private static GameObject CreateStraightProjectilePrefab(Sprite sprite)
        {
            GameObject root = new GameObject("StraightProjectile");
            SpriteRenderer renderer = root.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.sortingOrder = 18;
            renderer.color = Color.white;

            Rigidbody2D body = root.AddComponent<Rigidbody2D>();
            body.bodyType = RigidbodyType2D.Kinematic;
            body.gravityScale = 0f;

            CircleCollider2D collider = root.AddComponent<CircleCollider2D>();
            collider.isTrigger = true;
            collider.radius = 0.18f;

            Projectile projectile = root.AddComponent<Projectile>();
            projectile.speed = 13f;
            projectile.gravity = 0f;
            projectile.damage = 1;
            projectile.lifeSeconds = 4f;
            projectile.explosionRadius = 0f;
            projectile.reactionColor = new Color(1f, 0.86f, 0.35f, 1f);
            projectile.destroyOutsideCamera = true;
            projectile.viewportDestroyMargin = new Vector2(0.18f, 0.28f);
            projectile.requireTargetInsideCamera = true;
            projectile.targetViewportMargin = new Vector2(0.28f, 0.32f);

            root.transform.localScale = Vector3.one * 0.18f;
            return SavePrefab(root, Root + "/Prefabs/Projectiles/StraightProjectile.prefab");
        }

        private static GameObject CreateBombProjectilePrefab(Sprite sprite)
        {
            GameObject root = new GameObject("BombProjectile");
            SpriteRenderer renderer = root.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.sortingOrder = 18;
            renderer.color = Color.white;

            Rigidbody2D body = root.AddComponent<Rigidbody2D>();
            body.bodyType = RigidbodyType2D.Kinematic;
            body.gravityScale = 0f;

            CircleCollider2D collider = root.AddComponent<CircleCollider2D>();
            collider.isTrigger = true;
            collider.radius = 0.28f;

            Projectile projectile = root.AddComponent<Projectile>();
            projectile.speed = 8.4f;
            projectile.gravity = 6.2f;
            projectile.damage = 2;
            projectile.lifeSeconds = 4.5f;
            projectile.explosionRadius = 0.82f;
            projectile.reactionColor = new Color(1f, 0.9f, 0.35f, 1f);
            projectile.destroyOutsideCamera = true;
            projectile.viewportDestroyMargin = new Vector2(0.18f, 0.28f);
            projectile.requireTargetInsideCamera = true;
            projectile.targetViewportMargin = new Vector2(0.28f, 0.32f);

            root.transform.localScale = Vector3.one * 0.24f;
            return SavePrefab(root, Root + "/Prefabs/Projectiles/BombProjectile.prefab");
        }

        private static GameObject CreateCoinPickupPrefab(Sprite sprite)
        {
            GameObject root = new GameObject("ShellCoinPickup");
            SpriteRenderer renderer = root.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.sortingOrder = 24;
            renderer.color = Color.white;

            CircleCollider2D collider = root.AddComponent<CircleCollider2D>();
            collider.isTrigger = true;
            collider.radius = 0.26f;

            CoinPickup coin = root.AddComponent<CoinPickup>();
            coin.value = 1;
            coin.lifeSeconds = 18f;
            coin.attractRadius = 2.6f;
            coin.attractSpeed = 8.5f;

            root.transform.localScale = Vector3.one * 0.26f;
            return SavePrefab(root, Root + "/Prefabs/Pickups/ShellCoinPickup.prefab");
        }

        private static GameObject CreateTreasurePickupPrefab(Sprite sprite)
        {
            GameObject root = new GameObject("TreasurePearlPickup");
            SpriteRenderer renderer = root.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.sortingOrder = 23;
            renderer.color = Color.white;

            CircleCollider2D collider = root.AddComponent<CircleCollider2D>();
            collider.isTrigger = true;
            collider.radius = 0.42f;

            TreasurePickup treasure = root.AddComponent<TreasurePickup>();
            treasure.shellValue = 25;
            treasure.requiredAlbumUnlocks = 2;

            root.transform.localScale = Vector3.one * 0.55f;
            return SavePrefab(root, Root + "/Prefabs/Pickups/TreasurePearlPickup.prefab");
        }

        private static GameObject CreateReactionHazardPrefab(string name, Sprite sprite, CreatureReactionKind kind)
        {
            GameObject root = new GameObject(name);
            SpriteRenderer renderer = root.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.sortingOrder = 19;
            renderer.color = Color.white;

            Rigidbody2D body = root.AddComponent<Rigidbody2D>();
            body.bodyType = RigidbodyType2D.Kinematic;
            body.gravityScale = 0f;

            CircleCollider2D collider = root.AddComponent<CircleCollider2D>();
            collider.isTrigger = true;

            CreatureReactionHazard hazard = root.AddComponent<CreatureReactionHazard>();
            hazard.reactionKind = kind;

            switch (kind)
            {
                case CreatureReactionKind.SandPuff:
                    collider.radius = 0.42f;
                    hazard.speed = 2.1f;
                    hazard.lifeSeconds = 5.5f;
                    hazard.pushStrength = 0.9f;
                    hazard.slowMultiplier = 0.74f;
                    hazard.slowSeconds = 0.55f;
                    root.transform.localScale = Vector3.one * 0.42f;
                    break;
                case CreatureReactionKind.WaterVortex:
                    collider.radius = 0.48f;
                    hazard.speed = 2.7f;
                    hazard.lifeSeconds = 6f;
                    hazard.pushStrength = 1.8f;
                    hazard.slowMultiplier = 0.68f;
                    hazard.slowSeconds = 0.72f;
                    hazard.wobbleAmplitude = 0.28f;
                    root.transform.localScale = Vector3.one * 0.52f;
                    break;
                default:
                    collider.radius = 0.28f;
                    hazard.speed = 2.45f;
                    hazard.lifeSeconds = 5f;
                    hazard.pushStrength = 1.0f;
                    hazard.slowMultiplier = 0.82f;
                    hazard.slowSeconds = 0.42f;
                    root.transform.localScale = Vector3.one * 0.32f;
                    break;
            }

            return SavePrefab(root, Root + "/Prefabs/Hazards/" + name + ".prefab");
        }

        private static GameObject CreatePlayerPrefab(GameObject straightProjectilePrefab, GameObject bombProjectilePrefab, Material bubbleParticleMaterial, Material waterTrailMaterial)
        {
            GameObject root = new GameObject("PlayerSubmarine");
            root.transform.localScale = Vector3.one * 0.42f;

            SpriteRenderer renderer = root.AddComponent<SpriteRenderer>();
            renderer.sprite = LoadSprite(Root + "/Art/Player/Submarine_003.png");
            renderer.sortingOrder = 15;

            Rigidbody2D body = root.AddComponent<Rigidbody2D>();
            body.bodyType = RigidbodyType2D.Kinematic;
            body.gravityScale = 0f;
            body.freezeRotation = true;

            CapsuleCollider2D collider = root.AddComponent<CapsuleCollider2D>();
            collider.isTrigger = true;
            collider.size = new Vector2(3.2f, 1.7f);

            PlayerController player = root.AddComponent<PlayerController>();
            player.moveSpeed = 6.4f;
            player.minBounds = new Vector2(-9.5f, -4.2f);
            player.maxBounds = new Vector2(52f, 4.2f);

            GameObject muzzleObject = new GameObject("Muzzle");
            muzzleObject.transform.SetParent(root.transform, false);
            muzzleObject.transform.localPosition = new Vector3(1.45f, 0.05f, 0f);

            WeaponController weapon = root.AddComponent<WeaponController>();
            weapon.muzzle = muzzleObject.transform;
            weapon.straightProjectilePrefab = straightProjectilePrefab;
            weapon.bombProjectilePrefab = bombProjectilePrefab;
            weapon.powerLevel = 1;
            weapon.straightCooldown = 0.16f;
            weapon.bombCooldown = 0.72f;
            weapon.autoFireStraightWhileHeld = true;
            weapon.autoFireBombWhilePrimaryHeld = true;
            weapon.twoFingerBomb = true;

            AddPlayerTrailParticles(root.transform, bubbleParticleMaterial, waterTrailMaterial);

            return SavePrefab(root, Root + "/Prefabs/Player/PlayerSubmarine.prefab");
        }

        private static void AddPlayerTrailParticles(Transform parent, Material bubbleParticleMaterial, Material waterTrailMaterial)
        {
            GameObject trailRoot = new GameObject("RearWaterTrail");
            trailRoot.transform.SetParent(parent, false);
            trailRoot.transform.localPosition = new Vector3(-4.65f, -0.34f, 0f);

            GameObject streamObject = new GameObject("WaterStreamParticles");
            streamObject.transform.SetParent(trailRoot.transform, false);
            ParticleSystem streamParticles = streamObject.AddComponent<ParticleSystem>();
            ConfigurePlayerWaterStream(streamParticles, waterTrailMaterial);

            GameObject bubblesObject = new GameObject("RearBubbleParticles");
            bubblesObject.transform.SetParent(trailRoot.transform, false);
            bubblesObject.transform.localPosition = new Vector3(-0.15f, 0.04f, 0f);
            ParticleSystem bubbleParticles = bubblesObject.AddComponent<ParticleSystem>();
            ConfigurePlayerRearBubbles(bubbleParticles, bubbleParticleMaterial);

            PlayerTrailFxController trailFx = parent.gameObject.AddComponent<PlayerTrailFxController>();
            trailFx.player = parent.GetComponent<PlayerController>();
            trailFx.waterStreamParticles = streamParticles;
            trailFx.rearBubbleParticles = bubbleParticles;
            trailFx.waterSpeedRange = new Vector2(1.5f, 3.1f);
            trailFx.bubbleSpeedRange = new Vector2(0.5f, 1.6f);
        }

        private static void ConfigurePlayerWaterStream(ParticleSystem particles, Material waterTrailMaterial)
        {
            particles.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            ParticleSystem.MainModule main = particles.main;
            main.playOnAwake = true;
            main.loop = true;
            main.duration = 4f;
            main.prewarm = true;
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.28f, 0.65f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(0.05f, 0.2f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.2f, 0.44f);
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(0.55f, 0.95f, 1f, 0.3f), new Color(0.9f, 1f, 1f, 0.55f));
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.scalingMode = ParticleSystemScalingMode.Shape;
            main.cullingMode = ParticleSystemCullingMode.AlwaysSimulate;
            main.maxParticles = 180;

            ParticleSystem.EmissionModule emission = particles.emission;
            emission.enabled = true;
            emission.rateOverTime = 75f;

            ParticleSystem.ShapeModule shape = particles.shape;
            shape.enabled = true;
            shape.shapeType = ParticleSystemShapeType.Circle;
            shape.radius = 0.18f;

            ParticleSystem.VelocityOverLifetimeModule velocity = particles.velocityOverLifetime;
            velocity.enabled = true;
            velocity.x = new ParticleSystem.MinMaxCurve(-3.1f, -1.5f);
            velocity.y = new ParticleSystem.MinMaxCurve(-0.35f, 0.35f);
            velocity.z = new ParticleSystem.MinMaxCurve(0f, 0f);

            ParticleSystemRenderer renderer = particles.GetComponent<ParticleSystemRenderer>();
            renderer.renderMode = ParticleSystemRenderMode.Billboard;
            renderer.sortingOrder = 16;
            renderer.sharedMaterial = waterTrailMaterial;
        }

        private static void ConfigurePlayerRearBubbles(ParticleSystem particles, Material bubbleParticleMaterial)
        {
            particles.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            ParticleSystem.MainModule main = particles.main;
            main.playOnAwake = true;
            main.loop = true;
            main.duration = 4f;
            main.prewarm = true;
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.7f, 1.7f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(0.05f, 0.24f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.14f, 0.34f);
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(0.8f, 1f, 1f, 0.62f), new Color(1f, 1f, 1f, 0.96f));
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.scalingMode = ParticleSystemScalingMode.Shape;
            main.cullingMode = ParticleSystemCullingMode.AlwaysSimulate;
            main.maxParticles = 120;

            ParticleSystem.EmissionModule emission = particles.emission;
            emission.enabled = true;
            emission.rateOverTime = 36f;

            ParticleSystem.ShapeModule shape = particles.shape;
            shape.enabled = true;
            shape.shapeType = ParticleSystemShapeType.Circle;
            shape.radius = 0.18f;

            ParticleSystem.VelocityOverLifetimeModule velocity = particles.velocityOverLifetime;
            velocity.enabled = true;
            velocity.x = new ParticleSystem.MinMaxCurve(-1.6f, -0.5f);
            velocity.y = new ParticleSystem.MinMaxCurve(0.12f, 0.95f);
            velocity.z = new ParticleSystem.MinMaxCurve(0f, 0f);

            ParticleSystemRenderer renderer = particles.GetComponent<ParticleSystemRenderer>();
            renderer.renderMode = ParticleSystemRenderMode.Billboard;
            renderer.sortingOrder = 17;
            renderer.sharedMaterial = bubbleParticleMaterial;
        }

        private static Dictionary<string, GameObject> CreateCreaturePrefabs(
            Dictionary<string, CreatureData> creatures,
            GameObject coinPickupPrefab,
            GameObject surpriseBubblePrefab,
            GameObject sandPuffPrefab,
            GameObject waterVortexPrefab)
        {
            Dictionary<string, GameObject> prefabs = new Dictionary<string, GameObject>();
            foreach (KeyValuePair<string, CreatureData> pair in creatures)
            {
                CreatureData data = pair.Value;
                GameObject root = new GameObject(data.isBoss ? "CreaturePrefab_HorseshoeCrabBoss" : "CreaturePrefab_" + data.creatureId);

                SpriteRenderer renderer = root.AddComponent<SpriteRenderer>();
                renderer.sprite = data.normalSprite;
                renderer.sortingOrder = data.isBoss ? 13 : 12;

                Rigidbody2D body = root.AddComponent<Rigidbody2D>();
                body.bodyType = RigidbodyType2D.Kinematic;
                body.gravityScale = 0f;
                body.freezeRotation = true;

                BoxCollider2D collider = root.AddComponent<BoxCollider2D>();
                collider.isTrigger = true;
                collider.size = data.isBoss ? new Vector2(3.2f, 1.6f) : new Vector2(1.8f, 1.3f);

                CreatureController controller = root.AddComponent<CreatureController>();
                controller.data = data;
                controller.spriteRenderer = renderer;
                controller.normalSprite = data.normalSprite;
                controller.eatingSprite = data.eatingSprite;
                controller.happySprite = data.happySprite;
                controller.maxHp = data.maxHp;
                controller.coinPickupPrefab = coinPickupPrefab;
                ConfigureCreatureCoins(data.creatureId, controller);

                CreatureMotionController motion = root.AddComponent<CreatureMotionController>();
                ConfigureCreatureMotion(data.creatureId, motion);

                CreatureReactionEmitter reaction = root.AddComponent<CreatureReactionEmitter>();
                ConfigureCreatureReaction(data.creatureId, reaction, surpriseBubblePrefab, sandPuffPrefab, waterVortexPrefab);

                CreatureSpeechController speech = root.AddComponent<CreatureSpeechController>();
                ConfigureCreatureSpeech(data.creatureId, speech);

                if (data.isBoss)
                {
                    BossPatternController bossPattern = root.AddComponent<BossPatternController>();
                    ConfigureBossPattern(data.creatureId, bossPattern);
                }

                string prefabPath = Root + "/Prefabs/Creatures/" + root.name + ".prefab";
                prefabs.Add(pair.Key, SavePrefab(root, prefabPath));
            }

            return prefabs;
        }

        private static void ConfigureCreatureCoins(string creatureId, CreatureController controller)
        {
            controller.coinValue = 1;
            controller.coinDropCount = 3;
            controller.coinDropSpread = 0.65f;

            switch (creatureId)
            {
                case "sea_anemone":
                    controller.coinDropCount = 4;
                    break;
                case "horseshoe_crab_boss":
                    controller.coinValue = 1;
                    controller.coinDropCount = 12;
                    controller.coinDropSpread = 1.25f;
                    break;
            }
        }

        private static void ConfigureCreatureReaction(
            string creatureId,
            CreatureReactionEmitter reaction,
            GameObject surpriseBubblePrefab,
            GameObject sandPuffPrefab,
            GameObject waterVortexPrefab)
        {
            reaction.activationDistance = 13.5f;
            reaction.localMouthOffset = new Vector2(-0.25f, 0.05f);

            switch (creatureId)
            {
                case "hermit_crab":
                    reaction.reactionPrefab = sandPuffPrefab;
                    reaction.minInterval = 3.2f;
                    reaction.maxInterval = 5.2f;
                    reaction.localMouthOffset = new Vector2(-0.35f, 0.0f);
                    break;
                case "shrimp":
                    reaction.reactionPrefab = surpriseBubblePrefab;
                    reaction.minInterval = 2.2f;
                    reaction.maxInterval = 3.8f;
                    reaction.localMouthOffset = new Vector2(-0.3f, 0.12f);
                    break;
                case "sea_star":
                    reaction.reactionPrefab = sandPuffPrefab;
                    reaction.minInterval = 4.0f;
                    reaction.maxInterval = 6.2f;
                    reaction.localMouthOffset = new Vector2(-0.15f, 0.08f);
                    break;
                case "tidepool_goby":
                    reaction.reactionPrefab = sandPuffPrefab;
                    reaction.minInterval = 2.6f;
                    reaction.maxInterval = 4.1f;
                    reaction.localMouthOffset = new Vector2(-0.35f, 0.08f);
                    break;
                case "sea_anemone":
                    reaction.reactionPrefab = surpriseBubblePrefab;
                    reaction.minInterval = 3.1f;
                    reaction.maxInterval = 5.0f;
                    reaction.localMouthOffset = new Vector2(-0.1f, 0.3f);
                    break;
                case "horseshoe_crab_boss":
                    reaction.reactionPrefab = waterVortexPrefab;
                    reaction.minInterval = 4.2f;
                    reaction.maxInterval = 6.4f;
                    reaction.activationDistance = 16f;
                    reaction.localMouthOffset = new Vector2(-0.55f, 0.12f);
                    break;
                default:
                    reaction.reactionPrefab = surpriseBubblePrefab;
                    reaction.minInterval = 3f;
                    reaction.maxInterval = 5f;
                    break;
            }
        }

        private static void ConfigureCreatureSpeech(string creatureId, CreatureSpeechController speech)
        {
            speech.localOffset = new Vector2(0f, 1.05f);
            speech.showSeconds = 1.8f;
            speech.bubbleWidth = 3.4f;
            speech.bubbleHeight = 1.35f;
            speech.fontSize = 96;
            speech.characterSize = 0.062f;
            speech.maxCharsPerLine = 12;
            speech.showWaryOnStart = true;

            switch (creatureId)
            {
                case "hermit_crab":
                    speech.waryLine = "この貝がらはぼくのだよ！";
                    speech.eatingLine = "あれ、食べもの？";
                    speech.happyLine = "おいしかった。岩かげも見てみて";
                    break;
                case "shrimp":
                    speech.waryLine = "びっくりした！こっちに来ないで";
                    speech.eatingLine = "いいにおいがする";
                    speech.happyLine = "ありがとう。すなけむりでごめんね";
                    break;
                case "sea_star":
                    speech.waryLine = "ここでじっとしてるだけだよ";
                    speech.eatingLine = "ゆっくり食べるね";
                    speech.happyLine = "ごちそうさま。ゆっくり進もう";
                    speech.localOffset = new Vector2(0f, 0.82f);
                    break;
                case "tidepool_goby":
                    speech.waryLine = "ここに来ても何もないぞ";
                    speech.eatingLine = "え、エサなの？";
                    speech.happyLine = "左のほう、きらっとしたよ";
                    break;
                case "sea_anemone":
                    speech.waryLine = "さわるとあぶないよ";
                    speech.eatingLine = "食べものだったんだね";
                    speech.happyLine = "ありがとう。岩にくっついてるよ";
                    speech.localOffset = new Vector2(0f, 1.1f);
                    break;
                case "horseshoe_crab_boss":
                    speech.waryLine = "ここをこわしに来たのか？";
                    speech.eatingLine = "これは、エサなのか？";
                    speech.happyLine = "勘違いしていたよ。海底にはまだ宝がある";
                    speech.localOffset = new Vector2(0f, 1.35f);
                    speech.bubbleWidth = 4.25f;
                    speech.bubbleHeight = 1.42f;
                    speech.fontSize = 96;
                    speech.characterSize = 0.058f;
                    speech.maxCharsPerLine = 13;
                    speech.showWaryOnStart = false;
                    break;
                default:
                    speech.waryLine = "何しに来たんだ？";
                    speech.eatingLine = "食べもの？";
                    speech.happyLine = "ありがとう";
                    break;
            }
        }

        private static void ConfigureBossPattern(string creatureId, BossPatternController bossPattern)
        {
            if (creatureId != "horseshoe_crab_boss" || bossPattern == null)
            {
                return;
            }

            bossPattern.startupDelay = 1.0f;
            bossPattern.idleSeconds = 1.55f;
            bossPattern.telegraphSeconds = 0.82f;
            bossPattern.dashSpeed = 18.5f;
            bossPattern.returnSpeed = 3.0f;
            bossPattern.minimumDashDistance = 8.2f;
            bossPattern.screenEdgePadding = 1.05f;
            bossPattern.restSeconds = 1.25f;
            bossPattern.tailCurrentChance = 0.55f;
            bossPattern.beamTelegraphSeconds = 0.92f;
            bossPattern.tailCurrentSeconds = 1.1f;
            bossPattern.tailCurrentLength = 10.5f;
            bossPattern.tailCurrentWidth = 0.62f;
            bossPattern.tailCurrentAngleDegrees = 180f;
            bossPattern.tailCurrentPush = 3.2f;
            bossPattern.tailCurrentSlowMultiplier = 0.58f;
            bossPattern.tailCurrentSlowSeconds = 0.8f;
            bossPattern.tailLocalOffset = new Vector2(1.25f, 0.08f);
            bossPattern.holdUntilIntroComplete = true;
        }

        private static void ConfigureCreatureMotion(string creatureId, CreatureMotionController motion)
        {
            motion.flipWithMotion = true;
            switch (creatureId)
            {
                case "hermit_crab":
                    motion.motionStyle = CreatureMotionStyle.ShortHop;
                    motion.amplitude = new Vector2(0.18f, 0.05f);
                    motion.speed = 0.85f;
                    motion.driftSpeed = 0.06f;
                    motion.tiltDegrees = 2f;
                    break;
                case "shrimp":
                    motion.motionStyle = CreatureMotionStyle.SeafloorWander;
                    motion.amplitude = new Vector2(0.38f, 0.14f);
                    motion.speed = 1.55f;
                    motion.driftSpeed = 0.12f;
                    motion.tiltDegrees = 6f;
                    break;
                case "sea_star":
                    motion.motionStyle = CreatureMotionStyle.AnchoredSway;
                    motion.amplitude = new Vector2(0.08f, 0.03f);
                    motion.speed = 0.45f;
                    motion.driftSpeed = 0.03f;
                    motion.tiltDegrees = 1.5f;
                    motion.flipWithMotion = false;
                    break;
                case "tidepool_goby":
                    motion.motionStyle = CreatureMotionStyle.SeafloorWander;
                    motion.amplitude = new Vector2(0.55f, 0.12f);
                    motion.speed = 1.2f;
                    motion.driftSpeed = 0.1f;
                    motion.tiltDegrees = 5f;
                    break;
                case "sea_anemone":
                    motion.motionStyle = CreatureMotionStyle.AnchoredSway;
                    motion.amplitude = new Vector2(0.04f, 0.07f);
                    motion.speed = 0.7f;
                    motion.driftSpeed = 0.02f;
                    motion.tiltDegrees = 3f;
                    motion.flipWithMotion = false;
                    break;
                case "horseshoe_crab_boss":
                    motion.motionStyle = CreatureMotionStyle.BossCrawl;
                    motion.amplitude = new Vector2(0.36f, 0.05f);
                    motion.speed = 0.55f;
                    motion.driftSpeed = 0.08f;
                    motion.tiltDegrees = 2f;
                    break;
                default:
                    motion.motionStyle = CreatureMotionStyle.SeafloorWander;
                    motion.amplitude = new Vector2(0.22f, 0.08f);
                    motion.speed = 1f;
                    motion.driftSpeed = 0.08f;
                    motion.tiltDegrees = 3f;
                    break;
            }
        }

        private static GameObject CreateAlbumItemPrefab()
        {
            GameObject root = CreateUIObject("Album UI item", null);
            RectTransform rootRect = root.GetComponent<RectTransform>();
            rootRect.sizeDelta = new Vector2(240f, 30f);

            Image image = root.AddComponent<Image>();
            image.color = new Color(0.1f, 0.45f, 0.62f, 0.72f);

            Button button = root.AddComponent<Button>();
            ColorBlock colors = button.colors;
            colors.highlightedColor = new Color(0.2f, 0.75f, 0.9f, 0.9f);
            colors.pressedColor = new Color(0.08f, 0.35f, 0.48f, 0.95f);
            button.colors = colors;

            LayoutElement layout = root.AddComponent<LayoutElement>();
            layout.preferredHeight = 30f;

            GameObject labelObject = CreateUIObject("Label", root.transform);
            RectTransform labelRect = labelObject.GetComponent<RectTransform>();
            labelRect.anchorMin = Vector2.zero;
            labelRect.anchorMax = Vector2.one;
            labelRect.offsetMin = new Vector2(10f, 2f);
            labelRect.offsetMax = new Vector2(-10f, -2f);

            Text label = labelObject.AddComponent<Text>();
            label.font = GetUIFont();
            label.fontSize = 16;
            label.color = Color.white;
            label.alignment = TextAnchor.MiddleLeft;
            label.text = "Album Item";

            return SavePrefab(root, Root + "/Prefabs/UI/Album UI item.prefab");
        }

        private static void CreateBackgroundLayerPrefabs(GeneratedSprites sprites, Material particleMaterial)
        {
            SaveBackgroundSpritePrefab("BackgroundRootFarWaterLayer", sprites.waterGradient, new Color(0.54f, 0.93f, 1f, 1f), -100, new Vector3(120f, 5.8f, 1f), 0.04f, new Vector2(0.008f, 0f));
            SaveBackgroundSpritePrefab("SurfaceLayer", sprites.surfaceWave, new Color(0.9f, 1f, 1f, 0.78f), -80, new Vector3(9f, 2.2f, 1f), 0.08f, new Vector2(0.035f, 0f));
            SaveBackgroundSpritePrefab("FarRockLayer", sprites.panorama, new Color(0.42f, 0.74f, 0.86f, 0.42f), -60, new Vector3(2.2f, 2.2f, 1f), 0.18f, new Vector2(0f, 0f));
            SaveBackgroundSpritePrefab("MidRockLayer", sprites.panorama, new Color(0.68f, 0.92f, 0.9f, 0.7f), -40, new Vector3(2.0f, 2.0f, 1f), 0.38f, new Vector2(0f, 0f));
            SaveBackgroundSpritePrefab("ForegroundLayer", sprites.panorama, new Color(0.35f, 0.75f, 0.62f, 0.55f), 25, new Vector3(2.35f, 2.35f, 1f), 0.72f, new Vector2(0f, 0f));
            SaveWaterOverlayPrefab(sprites.caustics, particleMaterial);
        }

        private static GameObject SaveBackgroundSpritePrefab(string name, Sprite sprite, Color color, int sortingOrder, Vector3 scale, float parallaxFactor, Vector2 autoScroll)
        {
            GameObject root = new GameObject(name);
            SpriteRenderer renderer = root.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.color = color;
            renderer.sortingOrder = sortingOrder;
            root.transform.localScale = scale;

            ParallaxLayer parallax = root.AddComponent<ParallaxLayer>();
            parallax.parallaxFactor = parallaxFactor;
            parallax.autoScrollSpeed = autoScroll;

            return SavePrefab(root, Root + "/Prefabs/Background/" + name + ".prefab");
        }

        private static GameObject SaveWaterOverlayPrefab(Sprite causticsSprite, Material particleMaterial)
        {
            GameObject root = new GameObject("WaterOverlay");

            GameObject causticsA = new GameObject("CausticsA");
            causticsA.transform.SetParent(root.transform, false);
            causticsA.transform.localScale = new Vector3(9f, 5.2f, 1f);
            SpriteRenderer causticsRendererA = causticsA.AddComponent<SpriteRenderer>();
            causticsRendererA.sprite = causticsSprite;
            causticsRendererA.color = new Color(0.85f, 1f, 1f, 0.08f);
            causticsRendererA.sortingOrder = 30;

            GameObject causticsB = new GameObject("CausticsB");
            causticsB.transform.SetParent(root.transform, false);
            causticsB.transform.localScale = new Vector3(8f, 4.7f, 1f);
            causticsB.transform.localRotation = Quaternion.Euler(0f, 0f, 180f);
            SpriteRenderer causticsRendererB = causticsB.AddComponent<SpriteRenderer>();
            causticsRendererB.sprite = causticsSprite;
            causticsRendererB.color = new Color(0.75f, 1f, 0.95f, 0.06f);
            causticsRendererB.sortingOrder = 31;

            GameObject bubbles = new GameObject("BubbleParticles");
            bubbles.transform.SetParent(root.transform, false);
            bubbles.transform.localPosition = new Vector3(20f, -4.8f, 0f);
            ParticleSystem bubbleParticles = bubbles.AddComponent<ParticleSystem>();
            ConfigureBubbleParticles(bubbleParticles, particleMaterial);

            WaterFxController waterFx = root.AddComponent<WaterFxController>();
            waterFx.bubbleParticles = bubbleParticles;
            waterFx.causticRenderers = new[] { causticsRendererA, causticsRendererB };

            return SavePrefab(root, Root + "/Prefabs/Background/WaterOverlay.prefab");
        }

        private static void ConfigureBubbleParticles(ParticleSystem particles, Material particleMaterial)
        {
            particles.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            ParticleSystem.MainModule main = particles.main;
            main.playOnAwake = false;
            main.loop = true;
            main.duration = 5f;
            main.prewarm = true;
            main.startLifetime = new ParticleSystem.MinMaxCurve(3.5f, 7f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(0.25f, 0.9f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.08f, 0.28f);
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(0.75f, 1f, 1f, 0.22f), new Color(1f, 1f, 1f, 0.55f));
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.scalingMode = ParticleSystemScalingMode.Shape;
            main.cullingMode = ParticleSystemCullingMode.AlwaysSimulate;
            main.maxParticles = 600;

            ParticleSystem.EmissionModule emission = particles.emission;
            emission.enabled = true;
            emission.rateOverTime = 28f;

            ParticleSystem.ShapeModule shape = particles.shape;
            shape.enabled = true;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(58f, 0.3f, 0.1f);

            ParticleSystem.VelocityOverLifetimeModule velocity = particles.velocityOverLifetime;
            velocity.enabled = true;
            velocity.y = new ParticleSystem.MinMaxCurve(0.45f, 1.2f);
            velocity.x = new ParticleSystem.MinMaxCurve(-0.18f, 0.18f);
            velocity.z = new ParticleSystem.MinMaxCurve(0f, 0f);

            ParticleSystemRenderer renderer = particles.GetComponent<ParticleSystemRenderer>();
            renderer.renderMode = ParticleSystemRenderMode.Billboard;
            renderer.sortingOrder = 32;
            renderer.sharedMaterial = particleMaterial;
        }

        private static StageData CreateStage01Data(Dictionary<string, CreatureData> creatures, Dictionary<string, GameObject> prefabs)
        {
            StageData stage = LoadOrCreateAsset<StageData>(Root + "/Data/Stages/Stage01_Tidepool.asset");
            stage.stageNumber = 1;
            stage.displayName = "Stage 1: しおだまり";
            stage.sceneName = "SeaAlbum_Stage01";
            stage.scenePath = ScenePath;
            stage.backgroundPanorama = LoadSprite(Root + "/Art/Backgrounds/Stage01/stage1_tidepool_scroll_panorama.png");
            stage.playerStart = new Vector2(14f, -0.2f);
            stage.playerMin = new Vector2(-9.5f, -4.2f);
            stage.playerMax = new Vector2(52f, 4.2f);
            stage.cameraMin = new Vector2(-1.6f, 0f);
            stage.cameraMax = new Vector2(44f, 0f);
            stage.collectionCreatures = new[]
            {
                creatures["hermit_crab"],
                creatures["shrimp"],
                creatures["sea_star"],
                creatures["tidepool_goby"],
                creatures["sea_anemone"],
                creatures["horseshoe_crab_boss"]
            };
            stage.creatureSpawns = new[]
            {
                Spawn(creatures["hermit_crab"], prefabs["hermit_crab"], new Vector2(2.8f, -3.05f), new Vector2(0.74f, 0.74f)),
                Spawn(creatures["shrimp"], prefabs["shrimp"], new Vector2(9.5f, -2.45f), new Vector2(0.68f, 0.68f)),
                Spawn(creatures["sea_star"], prefabs["sea_star"], new Vector2(17.5f, -3.18f), new Vector2(0.78f, 0.78f)),
                Spawn(creatures["tidepool_goby"], prefabs["tidepool_goby"], new Vector2(24.5f, -2.48f), new Vector2(0.74f, 0.74f)),
                Spawn(creatures["sea_anemone"], prefabs["sea_anemone"], new Vector2(32.5f, -3.0f), new Vector2(0.86f, 0.86f)),
                Spawn(creatures["horseshoe_crab_boss"], prefabs["horseshoe_crab_boss"], new Vector2(42.5f, -2.75f), new Vector2(1.18f, 1.18f))
            };
            EditorUtility.SetDirty(stage);
            return stage;
        }

        private static CreatureSpawnData Spawn(CreatureData creature, GameObject prefab, Vector2 position, Vector2 scale)
        {
            return new CreatureSpawnData
            {
                creature = creature,
                prefab = prefab,
                position = position,
                scale = scale,
                hpOverride = creature != null ? creature.maxHp : 1
            };
        }

        private static void CreatePlaceholderStageData()
        {
            for (int i = 2; i <= 7; i++)
            {
                StageData stage = LoadOrCreateAsset<StageData>(Root + "/Data/Stages/Stage0" + i + "_Placeholder.asset");
                stage.stageNumber = i;
                stage.displayName = "Stage " + i + ": データ土台";
                stage.sceneName = "SeaAlbum_Stage0" + i;
                stage.scenePath = Root + "/Scenes/SeaAlbum_Stage0" + i + ".unity";
                stage.collectionCreatures = Array.Empty<CreatureData>();
                stage.creatureSpawns = Array.Empty<CreatureSpawnData>();
                EditorUtility.SetDirty(stage);
            }
        }

        private static void BuildScene(
            StageData stageData,
            GameObject playerPrefab,
            GameObject straightProjectilePrefab,
            GameObject bombProjectilePrefab,
            GameObject albumItemPrefab,
            GameObject treasurePickupPrefab,
            Sprite albumBannerSprite)
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            GameObject cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.transform.position = new Vector3(0f, 0f, -10f);
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 5f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.08f, 0.46f, 0.72f, 1f);
            cameraObject.AddComponent<AudioListener>();
            CameraFollow2D cameraFollow = cameraObject.AddComponent<CameraFollow2D>();
            cameraFollow.minPosition = stageData.cameraMin;
            cameraFollow.maxPosition = stageData.cameraMax;

            GameObject lightObject = new GameObject("Global Light 2D");
            Light2D light2D = lightObject.AddComponent<Light2D>();
            light2D.lightType = Light2D.LightType.Global;
            light2D.intensity = 1.1f;
            light2D.color = new Color(0.83f, 0.96f, 1f, 1f);

            GameObject root = new GameObject("SeaAlbumRoot");
            GameObject backgroundRoot = new GameObject("BackgroundRoot");
            backgroundRoot.transform.SetParent(root.transform);

            GameObject farWater = InstantiateBackgroundPrefab("BackgroundRootFarWaterLayer", backgroundRoot.transform, new Vector3(20f, 0f, 8f), camera.transform);
            GameObject surface = InstantiateBackgroundPrefab("SurfaceLayer", backgroundRoot.transform, new Vector3(20f, 4.2f, 7f), camera.transform);
            GameObject farRock = InstantiateBackgroundPrefab("FarRockLayer", backgroundRoot.transform, new Vector3(22f, -0.4f, 6f), camera.transform);
            GameObject midRock = InstantiateBackgroundPrefab("MidRockLayer", backgroundRoot.transform, new Vector3(25f, -0.9f, 5f), camera.transform);

            GameObject playfield = new GameObject("PlayfieldLayer");
            playfield.transform.SetParent(root.transform);
            playfield.transform.position = Vector3.zero;

            GameObject foreground = InstantiateBackgroundPrefab("ForegroundLayer", backgroundRoot.transform, new Vector3(31f, -2.15f, 2f), camera.transform);
            GameObject waterOverlay = InstantiateBackgroundPrefab("WaterOverlay", backgroundRoot.transform, new Vector3(20f, 0f, 1f), camera.transform);

            WaterFxController waterFx = waterOverlay.GetComponent<WaterFxController>();
            if (waterFx != null)
            {
                waterFx.surfaceLayer = surface.transform;
            }

            GameObject managers = new GameObject("Managers");
            managers.transform.SetParent(root.transform);

            GameObject albumManagerObject = new GameObject("AlbumManager");
            albumManagerObject.transform.SetParent(managers.transform);
            AlbumManager albumManager = albumManagerObject.AddComponent<AlbumManager>();
            albumManager.stageData = stageData;

            GameObject currencyManagerObject = new GameObject("CurrencyManager");
            currencyManagerObject.transform.SetParent(managers.transform);
            CurrencyManager currencyManager = currencyManagerObject.AddComponent<CurrencyManager>();

            GameObject stageControllerObject = new GameObject("StageController");
            stageControllerObject.transform.SetParent(managers.transform);
            StageController stageController = stageControllerObject.AddComponent<StageController>();
            stageController.stageData = stageData;
            stageController.albumManager = albumManager;
            stageController.respawnSatisfiedCreatures = true;
            stageController.respawnDelaySeconds = 8f;
            stageController.respawnPlayerDistance = 11f;
            stageController.spawnBossAfterNonBossSatisfied = true;
            stageController.bossWarningSeconds = 2.6f;

            GameObject creatureRoot = new GameObject("CreatureSpawnRoot");
            creatureRoot.transform.SetParent(playfield.transform);
            stageController.creatureRoot = creatureRoot.transform;

            GameObject playerObject = PrefabUtility.InstantiatePrefab(playerPrefab, scene) as GameObject;
            playerObject.name = "PlayerSubmarine";
            playerObject.transform.position = stageData.playerStart;
            PlayerController player = playerObject.GetComponent<PlayerController>();
            player.worldCamera = camera;
            player.minBounds = stageData.playerMin;
            player.maxBounds = stageData.playerMax;

            WeaponController weapon = playerObject.GetComponent<WeaponController>();
            weapon.straightProjectilePrefab = straightProjectilePrefab;
            weapon.bombProjectilePrefab = bombProjectilePrefab;

            stageController.player = player;
            cameraFollow.target = playerObject.transform;

            if (treasurePickupPrefab != null)
            {
                GameObject treasure = PrefabUtility.InstantiatePrefab(treasurePickupPrefab, scene) as GameObject;
                treasure.name = "Treasure_LeftReturnPearlCache";
                treasure.transform.SetParent(playfield.transform);
                treasure.transform.position = new Vector3(-7.8f, -2.65f, 0f);
            }

            GameObject gameControllerObject = new GameObject("GameController");
            gameControllerObject.transform.SetParent(managers.transform);
            GameController gameController = gameControllerObject.AddComponent<GameController>();
            gameController.stageController = stageController;
            gameController.albumManager = albumManager;
            gameController.player = player;

            GameObject bossIntroObject = new GameObject("BossIntroDirector");
            bossIntroObject.transform.SetParent(managers.transform);
            BossIntroDirector bossIntro = bossIntroObject.AddComponent<BossIntroDirector>();
            bossIntro.stageController = stageController;
            bossIntro.targetCamera = camera;
            bossIntro.cameraFollow = cameraFollow;
            bossIntro.player = player;
            bossIntro.panSeconds = 2.15f;
            bossIntro.speechSeconds = 2.35f;
            bossIntro.postSpeechDelay = 0.35f;
            bossIntro.playerOffsetFromBoss = new Vector2(-7.0f, 2.35f);
            bossIntro.cameraXOffsetFromBoss = -0.55f;

            CreateAlbumCanvas(stageData, albumManager, albumItemPrefab, albumBannerSprite);
            CreateCurrencyHud(currencyManager);
            CreateBossWarningHud(stageController);
            CreateBossHealthHud(stageController);
            EnsureEventSystem();

            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, ScenePath);

            // Keep names meaningful in hierarchy and avoid unused local warning after build-time instantiation.
            farWater.name = "BackgroundRootFarWaterLayer";
            farRock.name = "FarRockLayer";
            midRock.name = "MidRockLayer";
            foreground.name = "ForegroundLayer";
        }

        private static GameObject InstantiateBackgroundPrefab(string prefabName, Transform parent, Vector3 position, Transform cameraTransform)
        {
            GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Root + "/Prefabs/Background/" + prefabName + ".prefab");
            GameObject instance = PrefabUtility.InstantiatePrefab(prefab) as GameObject;
            instance.name = prefabName;
            instance.transform.SetParent(parent);
            instance.transform.position = position;

            ParallaxLayer parallax = instance.GetComponent<ParallaxLayer>();
            if (parallax != null)
            {
                parallax.cameraTransform = cameraTransform;
            }

            return instance;
        }

        private static void CreateAlbumCanvas(StageData stageData, AlbumManager albumManager, GameObject albumItemPrefab, Sprite albumBannerSprite)
        {
            GameObject canvasObject = new GameObject("AlbumCanvas", typeof(RectTransform));
            Canvas canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            CanvasScaler scaler = canvasObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasObject.AddComponent<GraphicRaycaster>();

            GameObject panel = CreateUIObject("AlbumPanel", canvasObject.transform);
            RectTransform panelRect = panel.GetComponent<RectTransform>();
            panelRect.anchorMin = new Vector2(1f, 1f);
            panelRect.anchorMax = new Vector2(1f, 1f);
            panelRect.pivot = new Vector2(1f, 1f);
            panelRect.anchoredPosition = new Vector2(-24f, -24f);
            panelRect.sizeDelta = new Vector2(260f, 156f);
            Image panelImage = panel.AddComponent<Image>();
            panelImage.color = new Color(0.02f, 0.18f, 0.28f, 0.72f);

            AlbumUI albumUI = panel.AddComponent<AlbumUI>();
            albumUI.albumManager = albumManager;
            albumUI.stageData = stageData;
            albumUI.bannerSeconds = 2.1f;

            GameObject countObject = CreateUIObject("AlbumCountText", panel.transform);
            RectTransform countRect = countObject.GetComponent<RectTransform>();
            countRect.anchorMin = new Vector2(0f, 1f);
            countRect.anchorMax = new Vector2(1f, 1f);
            countRect.pivot = new Vector2(0.5f, 1f);
            countRect.anchoredPosition = new Vector2(0f, -12f);
            countRect.sizeDelta = new Vector2(-28f, 34f);
            Text countText = countObject.AddComponent<Text>();
            countText.font = GetUIFont();
            countText.fontSize = 22;
            countText.fontStyle = FontStyle.Bold;
            countText.color = Color.white;
            countText.alignment = TextAnchor.MiddleLeft;
            countText.text = "図鑑 0/6";
            albumUI.countText = countText;

            GameObject listRoot = CreateUIObject("AlbumListRoot", panel.transform);
            RectTransform listRect = listRoot.GetComponent<RectTransform>();
            listRect.anchorMin = new Vector2(0f, 1f);
            listRect.anchorMax = new Vector2(1f, 1f);
            listRect.pivot = new Vector2(0.5f, 1f);
            listRect.anchoredPosition = new Vector2(0f, -54f);
            listRect.sizeDelta = new Vector2(-28f, 144f);
            VerticalLayoutGroup layout = listRoot.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 5f;
            layout.childControlWidth = true;
            layout.childForceExpandWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandHeight = false;
            listRoot.SetActive(false);

            GameObject detailObject = CreateUIObject("AlbumDetailText", panel.transform);
            RectTransform detailRect = detailObject.GetComponent<RectTransform>();
            detailRect.anchorMin = new Vector2(0f, 0f);
            detailRect.anchorMax = new Vector2(1f, 0f);
            detailRect.pivot = new Vector2(0.5f, 0f);
            detailRect.anchoredPosition = new Vector2(0f, 16f);
            detailRect.sizeDelta = new Vector2(-28f, 140f);
            Text detailText = detailObject.AddComponent<Text>();
            detailText.font = GetUIFont();
            detailText.fontSize = 17;
            detailText.color = new Color(0.9f, 1f, 1f, 1f);
            detailText.alignment = TextAnchor.UpperLeft;
            detailText.horizontalOverflow = HorizontalWrapMode.Wrap;
            detailText.verticalOverflow = VerticalWrapMode.Truncate;
            detailText.text = "まだ登録なし";
            detailObject.SetActive(false);

            GameObject silhouetteObject = CreateUIObject("NextCreatureSilhouette", panel.transform);
            RectTransform silhouetteRect = silhouetteObject.GetComponent<RectTransform>();
            silhouetteRect.anchorMin = new Vector2(0.5f, 0f);
            silhouetteRect.anchorMax = new Vector2(0.5f, 0f);
            silhouetteRect.pivot = new Vector2(0.5f, 0f);
            silhouetteRect.anchoredPosition = new Vector2(0f, 18f);
            silhouetteRect.sizeDelta = new Vector2(120f, 78f);
            Image silhouetteImage = silhouetteObject.AddComponent<Image>();
            silhouetteImage.color = new Color(0f, 0f, 0f, 0.68f);
            silhouetteImage.preserveAspect = true;
            albumUI.nextSilhouetteImage = silhouetteImage;

            GameObject hintObject = CreateUIObject("NextCreatureHint", panel.transform);
            RectTransform hintRect = hintObject.GetComponent<RectTransform>();
            hintRect.anchorMin = new Vector2(0f, 0f);
            hintRect.anchorMax = new Vector2(1f, 0f);
            hintRect.pivot = new Vector2(0.5f, 0f);
            hintRect.anchoredPosition = new Vector2(0f, 104f);
            hintRect.sizeDelta = new Vector2(-24f, 26f);
            Text hintText = hintObject.AddComponent<Text>();
            hintText.font = GetUIFont();
            hintText.fontSize = 15;
            hintText.color = new Color(0.78f, 1f, 1f, 0.92f);
            hintText.alignment = TextAnchor.MiddleCenter;
            hintText.text = "次の生き物";
            albumUI.nextHintText = hintText;

            GameObject bannerObject = CreateUIObject("AlbumRegistrationBanner", canvasObject.transform);
            RectTransform bannerRect = bannerObject.GetComponent<RectTransform>();
            bannerRect.anchorMin = new Vector2(0.5f, 1f);
            bannerRect.anchorMax = new Vector2(0.5f, 1f);
            bannerRect.pivot = new Vector2(0.5f, 1f);
            bannerRect.anchoredPosition = new Vector2(0f, -42f);
            bannerRect.sizeDelta = new Vector2(640f, 64f);
            Image bannerImage = bannerObject.AddComponent<Image>();
            bannerImage.sprite = albumBannerSprite;
            bannerImage.color = Color.white;
            CanvasGroup bannerGroup = bannerObject.AddComponent<CanvasGroup>();
            bannerGroup.alpha = 0f;

            GameObject bannerTextObject = CreateUIObject("BannerText", bannerObject.transform);
            RectTransform bannerTextRect = bannerTextObject.GetComponent<RectTransform>();
            bannerTextRect.anchorMin = Vector2.zero;
            bannerTextRect.anchorMax = Vector2.one;
            bannerTextRect.offsetMin = new Vector2(24f, 6f);
            bannerTextRect.offsetMax = new Vector2(-24f, -6f);
            Text bannerText = bannerTextObject.AddComponent<Text>();
            bannerText.font = GetUIFont();
            bannerText.fontSize = 24;
            bannerText.fontStyle = FontStyle.Bold;
            bannerText.color = Color.white;
            bannerText.alignment = TextAnchor.MiddleCenter;
            bannerText.text = "";

            albumUI.bannerGroup = bannerGroup;
            albumUI.bannerRect = bannerRect;
            albumUI.bannerText = bannerText;
            bannerObject.SetActive(false);
        }

        private static void CreateCurrencyHud(CurrencyManager currencyManager)
        {
            GameObject canvasObject = new GameObject("CurrencyCanvas", typeof(RectTransform));
            Canvas canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 101;
            CanvasScaler scaler = canvasObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasObject.AddComponent<GraphicRaycaster>();

            GameObject panel = CreateUIObject("GoldCounterPanel", canvasObject.transform);
            RectTransform panelRect = panel.GetComponent<RectTransform>();
            panelRect.anchorMin = new Vector2(0f, 1f);
            panelRect.anchorMax = new Vector2(0f, 1f);
            panelRect.pivot = new Vector2(0f, 1f);
            panelRect.anchoredPosition = new Vector2(24f, -24f);
            panelRect.sizeDelta = new Vector2(230f, 48f);

            Image panelImage = panel.AddComponent<Image>();
            panelImage.color = new Color(0.02f, 0.18f, 0.28f, 0.68f);

            CurrencyUI currencyUI = panel.AddComponent<CurrencyUI>();
            currencyUI.currencyManager = currencyManager;

            GameObject textObject = CreateUIObject("GoldText", panel.transform);
            RectTransform textRect = textObject.GetComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = new Vector2(18f, 4f);
            textRect.offsetMax = new Vector2(-16f, -4f);

            Text shellText = textObject.AddComponent<Text>();
            shellText.font = GetUIFont();
            shellText.fontSize = 24;
            shellText.fontStyle = FontStyle.Bold;
            shellText.color = new Color(1f, 0.95f, 0.62f, 1f);
            shellText.alignment = TextAnchor.MiddleLeft;
            shellText.text = "Gold 0";
            currencyUI.shellText = shellText;
        }

        private static void CreateBossWarningHud(StageController stageController)
        {
            GameObject canvasObject = new GameObject("BossWarningCanvas", typeof(RectTransform));
            Canvas canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 120;
            CanvasScaler scaler = canvasObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;

            GameObject warningObject = CreateUIObject("BossWarning", canvasObject.transform);
            RectTransform warningRect = warningObject.GetComponent<RectTransform>();
            warningRect.anchorMin = new Vector2(0.5f, 0.55f);
            warningRect.anchorMax = new Vector2(0.5f, 0.55f);
            warningRect.pivot = new Vector2(0.5f, 0.5f);
            warningRect.anchoredPosition = Vector2.zero;
            warningRect.sizeDelta = new Vector2(720f, 150f);

            Image image = warningObject.AddComponent<Image>();
            image.color = new Color(0.62f, 0.04f, 0.05f, 0.72f);

            CanvasGroup group = warningObject.AddComponent<CanvasGroup>();
            group.alpha = 0f;

            GameObject textObject = CreateUIObject("WarningText", warningObject.transform);
            RectTransform textRect = textObject.GetComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = new Vector2(24f, 46f);
            textRect.offsetMax = new Vector2(-24f, -4f);

            Text text = textObject.AddComponent<Text>();
            text.font = GetUIFont();
            text.fontSize = 58;
            text.fontStyle = FontStyle.Bold;
            text.color = new Color(1f, 0.92f, 0.2f, 1f);
            text.alignment = TextAnchor.MiddleCenter;
            text.text = "WARNING";

            GameObject messageObject = CreateUIObject("WarningMessageText", warningObject.transform);
            RectTransform messageRect = messageObject.GetComponent<RectTransform>();
            messageRect.anchorMin = Vector2.zero;
            messageRect.anchorMax = Vector2.one;
            messageRect.offsetMin = new Vector2(28f, 12f);
            messageRect.offsetMax = new Vector2(-28f, -92f);

            Text messageText = messageObject.AddComponent<Text>();
            messageText.font = GetUIFont();
            messageText.fontSize = 26;
            messageText.fontStyle = FontStyle.Bold;
            messageText.color = Color.white;
            messageText.alignment = TextAnchor.MiddleCenter;
            messageText.text = "ここをこわしに来たのか？";

            BossWarningUI warningUI = warningObject.AddComponent<BossWarningUI>();
            warningUI.stageController = stageController;
            warningUI.canvasGroup = group;
            warningUI.warningText = text;
            warningUI.messageText = messageText;
            warningUI.message = "ここをこわしに来たのか？";
        }

        private static void CreateBossHealthHud(StageController stageController)
        {
            GameObject canvasObject = new GameObject("BossHealthCanvas", typeof(RectTransform));
            Canvas canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 115;
            CanvasScaler scaler = canvasObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;

            GameObject panel = CreateUIObject("BossHealthPanel", canvasObject.transform);
            RectTransform panelRect = panel.GetComponent<RectTransform>();
            panelRect.anchorMin = new Vector2(0.5f, 0f);
            panelRect.anchorMax = new Vector2(0.5f, 0f);
            panelRect.pivot = new Vector2(0.5f, 0f);
            panelRect.anchoredPosition = new Vector2(0f, 28f);
            panelRect.sizeDelta = new Vector2(760f, 58f);

            CanvasGroup group = panel.AddComponent<CanvasGroup>();
            group.alpha = 0f;

            Image panelImage = panel.AddComponent<Image>();
            panelImage.color = new Color(0.02f, 0.08f, 0.12f, 0.82f);

            GameObject nameObject = CreateUIObject("BossNameText", panel.transform);
            RectTransform nameRect = nameObject.GetComponent<RectTransform>();
            nameRect.anchorMin = new Vector2(0f, 0.5f);
            nameRect.anchorMax = new Vector2(0f, 0.5f);
            nameRect.pivot = new Vector2(0f, 0.5f);
            nameRect.anchoredPosition = new Vector2(18f, 0f);
            nameRect.sizeDelta = new Vector2(170f, 40f);
            Text nameText = nameObject.AddComponent<Text>();
            nameText.font = GetUIFont();
            nameText.fontSize = 23;
            nameText.fontStyle = FontStyle.Bold;
            nameText.color = Color.white;
            nameText.alignment = TextAnchor.MiddleLeft;
            nameText.text = "BOSS";

            GameObject backObject = CreateUIObject("BossHpBack", panel.transform);
            RectTransform backRect = backObject.GetComponent<RectTransform>();
            backRect.anchorMin = new Vector2(0f, 0.5f);
            backRect.anchorMax = new Vector2(1f, 0.5f);
            backRect.pivot = new Vector2(0.5f, 0.5f);
            backRect.offsetMin = new Vector2(198f, -14f);
            backRect.offsetMax = new Vector2(-92f, 14f);
            Image backImage = backObject.AddComponent<Image>();
            backImage.color = new Color(0f, 0f, 0f, 0.62f);

            GameObject fillObject = CreateUIObject("BossHpFill", backObject.transform);
            RectTransform fillRect = fillObject.GetComponent<RectTransform>();
            fillRect.anchorMin = Vector2.zero;
            fillRect.anchorMax = Vector2.one;
            fillRect.offsetMin = new Vector2(3f, 3f);
            fillRect.offsetMax = new Vector2(-3f, -3f);
            Image fillImage = fillObject.AddComponent<Image>();
            fillImage.color = new Color(0.95f, 0.28f, 0.18f, 1f);
            fillImage.type = Image.Type.Filled;
            fillImage.fillMethod = Image.FillMethod.Horizontal;
            fillImage.fillOrigin = (int)Image.OriginHorizontal.Left;
            fillImage.fillAmount = 1f;

            GameObject valueObject = CreateUIObject("BossHpValueText", panel.transform);
            RectTransform valueRect = valueObject.GetComponent<RectTransform>();
            valueRect.anchorMin = new Vector2(1f, 0.5f);
            valueRect.anchorMax = new Vector2(1f, 0.5f);
            valueRect.pivot = new Vector2(1f, 0.5f);
            valueRect.anchoredPosition = new Vector2(-16f, 0f);
            valueRect.sizeDelta = new Vector2(78f, 34f);
            Text valueText = valueObject.AddComponent<Text>();
            valueText.font = GetUIFont();
            valueText.fontSize = 18;
            valueText.color = new Color(1f, 0.92f, 0.75f, 1f);
            valueText.alignment = TextAnchor.MiddleRight;
            valueText.text = "";

            BossHealthUI healthUI = panel.AddComponent<BossHealthUI>();
            healthUI.stageController = stageController;
            healthUI.canvasGroup = group;
            healthUI.fillImage = fillImage;
            healthUI.nameText = nameText;
            healthUI.valueText = valueText;
        }

        private static void EnsureEventSystem()
        {
            GameObject eventSystemObject = new GameObject("EventSystem");
            eventSystemObject.AddComponent<EventSystem>();
            eventSystemObject.AddComponent<InputSystemUIInputModule>();
        }

        private static GameObject CreateUIObject(string name, Transform parent)
        {
            GameObject gameObject = new GameObject(name, typeof(RectTransform));
            if (parent != null)
            {
                gameObject.transform.SetParent(parent, false);
            }

            return gameObject;
        }

        private static Font GetUIFont()
        {
            Font font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (font == null)
            {
                font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            }

            return font;
        }

        private static T LoadOrCreateAsset<T>(string assetPath) where T : ScriptableObject
        {
            T asset = AssetDatabase.LoadAssetAtPath<T>(assetPath);
            if (asset != null)
            {
                return asset;
            }

            asset = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(asset, assetPath);
            return asset;
        }

        private static Sprite LoadSprite(string assetPath)
        {
            return AssetDatabase.LoadAssetAtPath<Sprite>(assetPath);
        }

        private static GameObject SavePrefab(GameObject root, string path)
        {
            GameObject prefab = PrefabUtility.SaveAsPrefabAsset(root, path);
            Object.DestroyImmediate(root);
            return prefab;
        }

        private sealed class CreatureDefinition
        {
            public readonly string id;
            public readonly string displayName;
            public readonly string habitat;
            public readonly string food;
            public readonly string bodySecret;
            public readonly bool isBoss;
            public readonly int maxHp;

            public CreatureDefinition(string id, string displayName, string habitat, string food, string bodySecret, bool isBoss, int maxHp)
            {
                this.id = id;
                this.displayName = displayName;
                this.habitat = habitat;
                this.food = food;
                this.bodySecret = bodySecret;
                this.isBoss = isBoss;
                this.maxHp = maxHp;
            }
        }

        private sealed class GeneratedSprites
        {
            public Sprite straightProjectile;
            public Sprite bombProjectile;
            public Sprite bubbleParticle;
            public Sprite waterTrailParticle;
            public Sprite shellCoin;
            public Sprite treasurePearl;
            public Sprite sandPuff;
            public Sprite waterVortex;
            public Sprite albumBanner;
            public Sprite waterGradient;
            public Sprite caustics;
            public Sprite surfaceWave;
            public Sprite panorama;
        }
    }
}
#endif
