using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using NUnit.Framework;
using Pono.MarbleRun3D.Core;
using Pono.MarbleRun3D.Editor;
using Pono.MarbleRun3D.UI;
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.MarbleRun3D.Tests.EditMode
{
    public sealed class PieceThumbnailAssetTests
    {
        [Test]
        public void EveryCatalogPieceHasOneDistinctOptimizedPicture()
        {
            var kinds = (MarblePieceKind[])Enum.GetValues(typeof(MarblePieceKind));
            Assert.That(kinds.Length, Is.EqualTo(19));
            var hashes = new HashSet<string>();

            foreach (var kind in kinds)
            {
                var assetPath = PieceThumbnailAssetGenerator.OutputFolder + "/" + kind + ".png";
                var sprite = AssetDatabase.LoadAssetAtPath<Sprite>(assetPath);
                var importer = AssetImporter.GetAtPath(assetPath) as TextureImporter;
                Assert.That(sprite, Is.Not.Null, kind + " picture is missing");
                Assert.That(sprite.texture.width, Is.EqualTo(PieceThumbnailAssetGenerator.TextureSize), kind.ToString());
                Assert.That(sprite.texture.height, Is.EqualTo(PieceThumbnailAssetGenerator.TextureSize), kind.ToString());
                Assert.That(importer, Is.Not.Null, kind.ToString());
                Assert.That(importer.textureType, Is.EqualTo(TextureImporterType.Sprite), kind.ToString());
                Assert.That(importer.mipmapEnabled, Is.False, kind.ToString());
                Assert.That(importer.isReadable, Is.False, kind.ToString());
                Assert.That(importer.alphaIsTransparency, Is.True, kind.ToString());

                using (var sha = SHA256.Create())
                {
                    var bytes = File.ReadAllBytes(Path.GetFullPath(assetPath));
                    hashes.Add(Convert.ToBase64String(sha.ComputeHash(bytes)));
                }
            }

            Assert.That(hashes.Count, Is.EqualTo(kinds.Length),
                "Each part picture must show its own geometry rather than a repeated placeholder.");
        }

        [Test]
        public void IconLoadsPictureWithoutBlockingPointerInput()
        {
            var host = new GameObject("PiecePicture", typeof(RectTransform), typeof(Image), typeof(PieceThumbnailIcon));
            try
            {
                var icon = host.GetComponent<PieceThumbnailIcon>();
                icon.Configure(MarblePieceKind.Tornado);

                Assert.That(icon.Kind, Is.EqualTo(MarblePieceKind.Tornado));
                Assert.That(icon.Image.sprite, Is.Not.Null);
                Assert.That(icon.Image.preserveAspect, Is.True);
                Assert.That(icon.Image.raycastTarget, Is.False);
                Assert.That(PieceThumbnailIcon.ResourcePath(MarblePieceKind.Tornado),
                    Is.EqualTo("PieceThumbnails/Tornado"));
                Assert.That(host.GetComponent<Camera>(), Is.Null);
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void ThumbnailCameraFramingIncludesWideAndTallGeometry()
        {
            var cameraObject = new GameObject("FramingCamera", typeof(Camera));
            try
            {
                var camera = cameraObject.GetComponent<Camera>();
                camera.orthographic = true;
                camera.aspect = 1f;
                camera.transform.rotation = Quaternion.Euler(28f, -38f, 0f);

                var wide = new Bounds(Vector3.zero, new Vector3(8f, 1f, 2f));
                var tall = new Bounds(Vector3.zero, new Vector3(2f, 9f, 2f));
                var wideSize = PieceThumbnailAssetGenerator.CalculateOrthographicSize(camera, wide);
                var tallSize = PieceThumbnailAssetGenerator.CalculateOrthographicSize(camera, tall);

                Assert.That(wideSize, Is.GreaterThan(2.5f));
                Assert.That(tallSize, Is.GreaterThan(3.5f));
                Assert.That(wideSize, Is.GreaterThan(0f));
                Assert.That(tallSize, Is.GreaterThan(0f));
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(cameraObject);
            }
        }
    }
}
