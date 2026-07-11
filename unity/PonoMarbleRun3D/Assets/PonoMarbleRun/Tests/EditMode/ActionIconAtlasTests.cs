using System;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.MarbleRun3D.UI;
using UnityEditor;
using UnityEngine;

namespace Pono.MarbleRun3D.Tests.EditMode
{
    public sealed class ActionIconAtlasTests
    {
        private const string AssetPath = "Assets/Resources/UI/MarbleActionIcons.png";

        [Test]
        public void EnumMatchesGeneratedTopToBottomAtlasOrder()
        {
            var expected = new[]
            {
                ActionIcon.Rotate,
                ActionIcon.Delete,
                ActionIcon.Undo,
                ActionIcon.Clear,
                ActionIcon.Save,
                ActionIcon.Load,
                ActionIcon.Orbit,
                ActionIcon.Overview,
                ActionIcon.Reset,
                ActionIcon.Play,
                ActionIcon.Pause,
                ActionIcon.Edit
            };

            CollectionAssert.AreEqual(expected, (ActionIcon[])Enum.GetValues(typeof(ActionIcon)));
            Assert.That(expected.Length, Is.EqualTo(ActionIconAtlas.IconCount));
            for (var index = 0; index < expected.Length; index++)
                Assert.That((int)expected[index], Is.EqualTo(index));
        }

        [Test]
        public void EveryIconHasOneUniqueCellWithCorrectYFlipAndIsCached()
        {
            var texture = ActionIconAtlas.Texture;
            Assert.That(texture, Is.Not.Null);
            Assert.That(texture.width, Is.EqualTo(724));
            Assert.That(texture.height, Is.EqualTo(543));
            Assert.That(texture.filterMode, Is.EqualTo(FilterMode.Bilinear));
            Assert.That(texture.wrapMode, Is.EqualTo(TextureWrapMode.Clamp));

            var sprites = new List<Sprite>();
            var seenRects = new HashSet<string>();
            foreach (ActionIcon icon in Enum.GetValues(typeof(ActionIcon)))
            {
                var sprite = ActionIconAtlas.Get(icon);
                var cached = ActionIconAtlas.Get(icon);
                Assert.That(cached, Is.SameAs(sprite), icon + " should reuse its Sprite");
                Assert.That(sprite.texture, Is.SameAs(texture));
                Assert.That(sprite.rect.width, Is.EqualTo(181f));
                Assert.That(sprite.rect.height, Is.EqualTo(181f));

                var index = (int)icon;
                var expectedX = index % ActionIconAtlas.Columns * 181f;
                var expectedY = (ActionIconAtlas.Rows - 1 - index / ActionIconAtlas.Columns) * 181f;
                Assert.That(sprite.rect.x, Is.EqualTo(expectedX), icon.ToString());
                Assert.That(sprite.rect.y, Is.EqualTo(expectedY), icon.ToString());
                Assert.That(seenRects.Add(sprite.rect.ToString("F0")), Is.True, icon.ToString());
                sprites.Add(sprite);
            }

            Assert.That(sprites.Count, Is.EqualTo(ActionIconAtlas.IconCount));
            for (var left = 0; left < sprites.Count; left++)
            for (var right = left + 1; right < sprites.Count; right++)
                Assert.That(sprites[left].rect.Overlaps(sprites[right].rect), Is.False,
                    sprites[left].name + " overlaps " + sprites[right].name);
        }

        [Test]
        public void ImportSettingsAreUiAndAndroidFriendlyWithoutAlphaOrMipmaps()
        {
            var importer = AssetImporter.GetAtPath(AssetPath) as TextureImporter;
            Assert.That(importer, Is.Not.Null);
            Assert.That(importer.textureType, Is.EqualTo(TextureImporterType.Default));
            Assert.That(importer.mipmapEnabled, Is.False);
            Assert.That(importer.alphaSource, Is.EqualTo(TextureImporterAlphaSource.None));
            Assert.That(importer.alphaIsTransparency, Is.False);
            Assert.That(importer.isReadable, Is.False);
            Assert.That(importer.sRGBTexture, Is.True);
            Assert.That(importer.filterMode, Is.EqualTo(FilterMode.Bilinear));
            Assert.That(importer.wrapMode, Is.EqualTo(TextureWrapMode.Clamp));

            var android = importer.GetPlatformTextureSettings("Android");
            Assert.That(android.overridden, Is.True);
            Assert.That(android.maxTextureSize, Is.EqualTo(1024));
            Assert.That(android.format, Is.EqualTo(TextureImporterFormat.ETC2_RGB4));
            Assert.That(android.textureCompression, Is.EqualTo(TextureImporterCompression.Compressed));
            Assert.That(android.allowsAlphaSplitting, Is.False);
        }
    }
}
