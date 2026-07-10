using NUnit.Framework;
using UnityEngine;

namespace Pono.FluidMarbleLab.Tests
{
    public sealed class TrackEditorTests
    {
        [Test]
        public void TapSelectionDoesNotSnapPiece()
        {
            var context = CreateContext();
            try
            {
                var initial = (Vector2)context.Piece.transform.position;

                Assert.That(context.Editor.TryBeginDrag(7, initial), Is.True);
                context.Editor.EndDrag(7);

                Assert.That((Vector2)context.Piece.transform.position, Is.EqualTo(initial));
            }
            finally
            {
                Object.DestroyImmediate(context.Root);
            }
        }

        [Test]
        public void SecondPointerCannotStealActivePiece()
        {
            var context = CreateContext();
            try
            {
                var initial = (Vector2)context.Piece.transform.position;

                Assert.That(context.Editor.TryBeginDrag(11, initial), Is.True);
                Assert.That(context.Editor.TryBeginDrag(22, initial), Is.False);
                context.Editor.Drag(22, initial + Vector2.right);
                context.Editor.EndDrag(22);

                Assert.That((Vector2)context.Piece.transform.position, Is.EqualTo(initial));
                context.Editor.Drag(11, initial + Vector2.right * 0.4f);
                context.Editor.EndDrag(11);
                Assert.That(context.Piece.transform.position.x, Is.GreaterThan(initial.x));
            }
            finally
            {
                Object.DestroyImmediate(context.Root);
            }
        }

        private static Context CreateContext()
        {
            var root = new GameObject("TrackEditorTestRoot");
            var cameraObject = new GameObject("Camera");
            cameraObject.transform.SetParent(root.transform);
            var camera = cameraObject.AddComponent<Camera>();
            camera.transform.position = new Vector3(0f, 0f, -10f);
            camera.orthographic = true;

            var viewportObject = new GameObject("Viewport");
            viewportObject.transform.SetParent(root.transform);
            var viewport = viewportObject.AddComponent<LabViewport>();
            viewport.Configure(camera, 10f);

            var mode = root.AddComponent<LabModeController>();
            mode.SetMode(LabMode.Build);
            var editor = root.AddComponent<TrackEditor>();
            editor.Configure(viewport, mode);

            var pieceObject = new GameObject("Piece");
            pieceObject.transform.SetParent(root.transform);
            pieceObject.transform.position = new Vector3(0.13f, 0.17f, 0f);
            pieceObject.AddComponent<Rigidbody2D>();
            pieceObject.AddComponent<EdgeCollider2D>();
            var piece = pieceObject.AddComponent<TrackPiece>();
            piece.Configure("test", new[] { Vector2.left, Vector2.right }, Color.cyan);
            editor.Register(piece);

            return new Context(root, editor, piece);
        }

        private readonly struct Context
        {
            public readonly GameObject Root;
            public readonly TrackEditor Editor;
            public readonly TrackPiece Piece;

            public Context(GameObject root, TrackEditor editor, TrackPiece piece)
            {
                Root = root;
                Editor = editor;
                Piece = piece;
            }
        }
    }
}
