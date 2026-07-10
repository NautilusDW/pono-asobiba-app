using System;
using Pono.MarbleRun3D.Core;
using UnityEngine;

namespace Pono.MarbleRun3D.Gameplay
{
    public static class WoodenPieceFactory
    {
        public const float CellSize = 3f;
        public const float LevelHeight = 1.35f;
        public const float PieceRootY = 0.98f;
        public const float MarbleRadius = 0.32f;

        public static PieceView Create(
            PieceRecord record,
            ToyMaterialLibrary materials,
            Transform parent,
            bool isGhost,
            int placementLayer,
            int courseLayer)
        {
            var root = new GameObject(PartCatalog.Get(record.kind).DisplayName);
            root.transform.SetParent(parent, false);
            root.transform.position = PoseToWorld(record.pose);
            root.transform.rotation = Quaternion.Euler(0f, record.pose.quarterTurns * 90f, 0f);
            var view = root.AddComponent<PieceView>();

            var placementObject = new GameObject("PlacementVolume");
            placementObject.layer = placementLayer;
            placementObject.transform.SetParent(root.transform, false);
            placementObject.transform.localPosition = new Vector3(0f, 0.66f, 0f);
            var placement = placementObject.AddComponent<BoxCollider>();
            placement.isTrigger = true;
            placement.size = new Vector3(2.75f, 1.7f, 2.75f);
            view.Initialize(record, placement, isGhost);

            BuildByKind(view, record.kind, materials, isGhost, courseLayer);
            var runColliders = root.GetComponentsInChildren<Collider>(true);
            for (var colliderIndex = 0; colliderIndex < runColliders.Length; colliderIndex++)
            {
                var runCollider = runColliders[colliderIndex];
                if (runCollider != placement && !runCollider.isTrigger)
                    runCollider.sharedMaterial = materials.TrackPhysics;
            }
            BuildConnectorMarkers(view, record.kind, materials, isGhost);
            BuildSelectionAndInvalidMarks(view, materials);
            view.CaptureNormalMaterials();

            if (isGhost)
            {
                placement.enabled = false;
                DisableAllColliders(root, placement);
                view.SetGhostValidity(true, materials);
            }
            else
            {
                view.SetRunMode(false);
            }
            return view;
        }

        public static Vector3 PoseToWorld(GridPose pose)
        {
            return new Vector3(
                pose.x * CellSize,
                PieceRootY + pose.level * LevelHeight,
                pose.z * CellSize);
        }

        private static void BuildByKind(
            PieceView view,
            MarblePieceKind kind,
            ToyMaterialLibrary materials,
            bool isGhost,
            int courseLayer)
        {
            switch (kind)
            {
                case MarblePieceKind.Start:
                    BuildStart(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Goal:
                    BuildGoal(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Straight:
                    BuildStraight(view, materials, courseLayer, kind);
                    break;
                case MarblePieceKind.Curve:
                    BuildCurve(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Slope:
                    BuildSlope(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Splitter:
                    BuildSplitter(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Tunnel:
                    BuildTunnel(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Funnel:
                    BuildFunnel(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Seesaw:
                    BuildSeesaw(view, materials, courseLayer, isGhost);
                    break;
                case MarblePieceKind.Domino:
                    BuildDomino(view, materials, courseLayer, isGhost);
                    break;
            }
        }

        private static void BuildStraight(
            PieceView view,
            ToyMaterialLibrary materials,
            int courseLayer,
            MarblePieceKind kind)
        {
            BuildTrackSegment(
                view,
                Vector3.zero,
                Vector3.forward,
                3.12f,
                materials.Maple,
                materials.Accent(kind),
                courseLayer);
            AddWoodGrain(view, materials, courseLayer);
        }

        private static void BuildStart(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            BuildTrackSegment(
                view,
                Vector3.zero,
                Vector3.forward,
                3.12f,
                materials.Maple,
                materials.Accent(MarblePieceKind.Start),
                courseLayer);

            CreateCylinder(view, "スタート だい", new Vector3(0f, 0.16f, -0.78f), Vector3.up,
                0.68f, 0.18f, materials.Accent(MarblePieceKind.Start), courseLayer, true);
            CreateCylinder(view, "はた ぼう", new Vector3(-0.62f, 0.88f, -0.78f), Vector3.up,
                0.07f, 1.36f, materials.MapleDark, courseLayer, false);
            CreateCube(view, "はた", new Vector3(-0.36f, 1.31f, -0.78f), new Vector3(0.52f, 0.34f, 0.09f),
                Quaternion.Euler(0f, 0f, -8f), materials.Accent(MarblePieceKind.Start), courseLayer, false);
            CreateCylinder(view, "ゲート ひだり", new Vector3(-0.72f, 0.60f, 0.72f), Vector3.up,
                0.10f, 0.96f, materials.MapleDark, courseLayer, true);
            CreateCylinder(view, "ゲート みぎ", new Vector3(0.72f, 0.60f, 0.72f), Vector3.up,
                0.10f, 0.96f, materials.MapleDark, courseLayer, true);

            var spawn = new GameObject("MarbleSpawn").transform;
            spawn.SetParent(view.transform, false);
            spawn.localPosition = new Vector3(0f, 0.70f, -0.72f);
            view.SetMarbleSpawn(spawn);
        }

        private static void BuildGoal(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            BuildTrackSegment(
                view,
                Vector3.zero,
                Vector3.forward,
                3.12f,
                materials.Maple,
                materials.Accent(MarblePieceKind.Goal),
                courseLayer);

            CreateCylinder(view, "ゴール ひだり", new Vector3(-0.76f, 0.72f, 0.38f), Vector3.up,
                0.13f, 1.30f, materials.Accent(MarblePieceKind.Goal), courseLayer, true);
            CreateCylinder(view, "ゴール みぎ", new Vector3(0.76f, 0.72f, 0.38f), Vector3.up,
                0.13f, 1.30f, materials.Accent(MarblePieceKind.Goal), courseLayer, true);
            CreateCylinder(view, "ゴール うえ", new Vector3(0f, 1.32f, 0.38f), Vector3.right,
                0.13f, 1.52f, materials.Accent(MarblePieceKind.Goal), courseLayer, true);
            CreateCylinder(view, "ベル", new Vector3(0f, 1.12f, 0.38f), Vector3.up,
                0.23f, 0.20f, materials.Metal, courseLayer, false);

            var triggerObject = new GameObject("GoalTrigger");
            triggerObject.layer = courseLayer;
            triggerObject.transform.SetParent(view.transform, false);
            triggerObject.transform.localPosition = new Vector3(0f, 0.58f, 0.38f);
            var trigger = triggerObject.AddComponent<BoxCollider>();
            trigger.isTrigger = true;
            trigger.size = new Vector3(1.45f, 1.10f, 0.58f);
            view.SetGoalSensor(triggerObject.AddComponent<GoalSensor>());

            for (var i = 0; i < 5; i++)
            {
                var angle = Mathf.PI * 2f * i / 5f;
                CreateSphere(view, "ひかり", new Vector3(Mathf.Cos(angle) * 0.58f, 1.55f + Mathf.Sin(angle) * 0.18f, 0.38f),
                    0.09f, materials.ConnectorGlow, courseLayer, false);
            }
        }

        private static void BuildCurve(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            const int segments = 10;
            const float radius = 1.5f;
            var previous = new Vector3(0f, 0f, -1.5f);
            for (var i = 0; i < segments; i++)
            {
                var t0 = Mathf.PI - (Mathf.PI * 0.5f) * i / segments;
                var t1 = Mathf.PI - (Mathf.PI * 0.5f) * (i + 1) / segments;
                var start = new Vector3(1.5f + Mathf.Cos(t0) * radius, 0f, -1.5f + Mathf.Sin(t0) * radius);
                var end = new Vector3(1.5f + Mathf.Cos(t1) * radius, 0f, -1.5f + Mathf.Sin(t1) * radius);
                BuildTrackSegment(view, (start + end) * 0.5f, (end - start).normalized,
                    Vector3.Distance(start, end) + 0.16f, materials.Maple,
                    materials.Accent(MarblePieceKind.Curve), courseLayer);
                previous = end;
            }
            CreateCylinder(view, "カーブ かざり", new Vector3(1.48f, 0.09f, -1.48f), Vector3.up,
                0.24f, 0.18f, materials.MapleDark, courseLayer, false);
        }

        private static void BuildSlope(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            var direction = Quaternion.Euler(MarbleRunPhysicsProfile.SlopeDegrees, 0f, 0f) * Vector3.forward;
            BuildTrackSegment(
                view,
                new Vector3(0f, 0.33f, 0f),
                direction,
                3.14f,
                materials.Maple,
                materials.Accent(MarblePieceKind.Slope),
                courseLayer);
            CreateCylinder(view, "さか しるし", new Vector3(0f, 0.20f, -0.90f), Vector3.up,
                0.24f, 0.12f, materials.Accent(MarblePieceKind.Slope), courseLayer, false);
        }

        private static void BuildSplitter(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            var accent = materials.Accent(MarblePieceKind.Splitter);
            BuildTrackSegment(view, new Vector3(0f, 0f, -0.73f), Vector3.forward, 1.75f,
                materials.Maple, accent, courseLayer);
            BuildTrackSegment(view, new Vector3(-0.72f, 0f, 0f), Vector3.left, 1.72f,
                materials.Maple, accent, courseLayer);
            BuildTrackSegment(view, new Vector3(0.72f, 0f, 0f), Vector3.right, 1.72f,
                materials.Maple, accent, courseLayer);
            CreateCylinder(view, "ぶんき まる", new Vector3(0f, 0.06f, 0f), Vector3.up,
                0.82f, 0.16f, materials.Maple, courseLayer, true);
            CreateCube(view, "ぶんき しるし", new Vector3(0f, 0.33f, -0.02f), new Vector3(0.16f, 0.36f, 0.72f),
                Quaternion.Euler(0f, 45f, 0f), materials.MapleDark, courseLayer, true);
        }

        private static void BuildTunnel(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            BuildStraight(view, materials, courseLayer, MarblePieceKind.Tunnel);
            var accent = materials.Accent(MarblePieceKind.Tunnel);
            for (var z = -1; z <= 1; z++)
            {
                var zPosition = z * 0.86f;
                CreateCylinder(view, "トンネル ひだり", new Vector3(-0.92f, 0.72f, zPosition), Vector3.up,
                    0.10f, 1.22f, accent, courseLayer, true);
                CreateCylinder(view, "トンネル みぎ", new Vector3(0.92f, 0.72f, zPosition), Vector3.up,
                    0.10f, 1.22f, accent, courseLayer, true);
                CreateCylinder(view, "トンネル やね", new Vector3(0f, 1.28f, zPosition), Vector3.right,
                    0.11f, 1.85f, accent, courseLayer, true);
            }
            CreateCube(view, "トンネル やねいた", new Vector3(0f, 1.37f, 0f), new Vector3(1.95f, 0.13f, 2.76f),
                Quaternion.identity, materials.MapleDark, courseLayer, true);
        }

        private static void BuildFunnel(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            BuildStraight(view, materials, courseLayer, MarblePieceKind.Funnel);
            var accent = materials.Accent(MarblePieceKind.Funnel);
            const int segments = 16;
            for (var i = 0; i < segments; i++)
            {
                var angle = Mathf.PI * 2f * i / segments;
                if (Mathf.Abs(Mathf.Sin(angle)) > 0.82f) continue;
                var position = new Vector3(Mathf.Cos(angle) * 1.03f, 0.44f, Mathf.Sin(angle) * 1.03f);
                var tangent = new Vector3(-Mathf.Sin(angle), 0f, Mathf.Cos(angle));
                CreateCube(view, "じょうご ふち", position, new Vector3(0.58f, 0.48f, 0.14f),
                    Quaternion.LookRotation(tangent, Vector3.up), accent, courseLayer, true);
            }
            CreateCylinder(view, "じょうご そこ", new Vector3(0f, 0.02f, 0f), Vector3.up,
                0.78f, 0.10f, materials.MapleDark, courseLayer, false);
            for (var i = 0; i < 8; i++)
            {
                var angle = Mathf.PI * 2f * i / 8f;
                var position = new Vector3(Mathf.Cos(angle) * 0.70f, 0.25f, Mathf.Sin(angle) * 0.70f);
                CreateCube(view, "じょうご いろ", position, new Vector3(0.54f, 0.07f, 0.18f),
                    Quaternion.Euler(0f, -angle * Mathf.Rad2Deg, -11f), accent, courseLayer, false);
            }
        }

        private static void BuildSeesaw(
            PieceView view,
            ToyMaterialLibrary materials,
            int courseLayer,
            bool isGhost)
        {
            CreateCylinder(view, "シーソー どだい", new Vector3(0f, 0.18f, 0f), Vector3.right,
                0.26f, 1.72f, materials.MapleDark, courseLayer, true);
            var plank = CreateCube(view, "シーソー いた", new Vector3(0f, 0.43f, 0f),
                new Vector3(1.72f, 0.18f, 3.12f), Quaternion.identity,
                materials.Maple, courseLayer, true);
            CreateCylinder(view, "シーソー ひだり", new Vector3(-0.85f, 0.21f, 0f), Vector3.forward,
                0.12f, 3.12f, materials.Accent(MarblePieceKind.Seesaw), courseLayer, true, plank.transform);
            CreateCylinder(view, "シーソー みぎ", new Vector3(0.85f, 0.21f, 0f), Vector3.forward,
                0.12f, 3.12f, materials.Accent(MarblePieceKind.Seesaw), courseLayer, true, plank.transform);

            if (!isGhost)
            {
                var body = plank.AddComponent<Rigidbody>();
                body.mass = 0.85f;
                body.interpolation = RigidbodyInterpolation.Interpolate;
                body.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
                body.maxAngularVelocity = 8f;
                body.isKinematic = true;
                var hinge = plank.AddComponent<HingeJoint>();
                hinge.axis = Vector3.right;
                hinge.autoConfigureConnectedAnchor = false;
                hinge.anchor = Vector3.zero;
                hinge.connectedAnchor = plank.transform.position;
                var limits = hinge.limits;
                limits.min = -12f;
                limits.max = 12f;
                hinge.limits = limits;
                hinge.useLimits = true;
                var spring = hinge.spring;
                spring.spring = 7f;
                spring.damper = 1.2f;
                spring.targetPosition = 0f;
                hinge.spring = spring;
                hinge.useSpring = true;
                view.RegisterDynamicBody(body);
            }
        }

        private static void BuildDomino(
            PieceView view,
            ToyMaterialLibrary materials,
            int courseLayer,
            bool isGhost)
        {
            BuildStraight(view, materials, courseLayer, MarblePieceKind.Domino);
            var colors = new[]
            {
                materials.Accent(MarblePieceKind.Domino),
                materials.Accent(MarblePieceKind.Curve),
                materials.Accent(MarblePieceKind.Slope),
                materials.Accent(MarblePieceKind.Straight)
            };
            for (var i = 0; i < 6; i++)
            {
                var domino = CreateCube(view, "ドミノ", new Vector3((i % 2 == 0 ? -0.16f : 0.16f), 0.68f, -1.05f + i * 0.42f),
                    new Vector3(0.48f, 0.90f, 0.15f), Quaternion.identity, colors[i % colors.Length], courseLayer, true);
                if (isGhost) continue;
                var body = domino.AddComponent<Rigidbody>();
                body.mass = 0.055f;
                body.interpolation = RigidbodyInterpolation.Interpolate;
                body.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
                body.maxAngularVelocity = 18f;
                body.isKinematic = true;
                view.RegisterDynamicBody(body);
            }
        }

        private static void BuildTrackSegment(
            PieceView view,
            Vector3 centre,
            Vector3 direction,
            float length,
            Material floorMaterial,
            Material accentMaterial,
            int courseLayer)
        {
            direction.Normalize();
            var rotation = Quaternion.LookRotation(direction, Vector3.up);
            CreateCube(view, "みち", centre + Vector3.up * 0.08f, new Vector3(1.72f, 0.18f, length),
                rotation, floorMaterial, courseLayer, true);

            var side = Vector3.Cross(Vector3.up, direction).normalized;
            CreateCylinder(view, "レール ひだり", centre + side * 0.87f + Vector3.up * 0.31f,
                direction, 0.13f, length, accentMaterial, courseLayer, true);
            CreateCylinder(view, "レール みぎ", centre - side * 0.87f + Vector3.up * 0.31f,
                direction, 0.13f, length, accentMaterial, courseLayer, true);

            var slatCount = Mathf.Max(2, Mathf.RoundToInt(length / 0.55f));
            for (var i = 0; i < slatCount; i++)
            {
                var t = slatCount == 1 ? 0f : Mathf.Lerp(-0.42f, 0.42f, i / (float)(slatCount - 1));
                var position = centre + direction * length * t + Vector3.up * 0.19f;
                CreateCube(view, "いろの せん", position, new Vector3(1.46f, 0.035f, 0.055f),
                    rotation, accentMaterial, courseLayer, false);
            }
        }

        private static void AddWoodGrain(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            for (var i = -1; i <= 1; i++)
            {
                CreateCube(view, "もくめ", new Vector3(0f, 0.185f, i * 0.74f), new Vector3(1.18f, 0.018f, 0.026f),
                    Quaternion.Euler(0f, i * 6f, 0f), materials.MapleDark, courseLayer, false);
            }
        }

        private static void BuildConnectorMarkers(
            PieceView view,
            MarblePieceKind kind,
            ToyMaterialLibrary materials,
            bool isGhost)
        {
            var spec = PartCatalog.Get(kind);
            for (var i = 0; i < spec.Connectors.Count; i++)
            {
                var connector = spec.Connectors[i];
                var markerRoot = new GameObject("つなぎ まる");
                markerRoot.layer = 2;
                markerRoot.transform.SetParent(view.transform, false);
                markerRoot.transform.localPosition = new Vector3(
                    connector.localCellPosition.x * CellSize,
                    0.28f,
                    connector.localCellPosition.y * CellSize);

                var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                ring.name = "つなぎ リング";
                ring.layer = 2;
                ring.transform.SetParent(markerRoot.transform, false);
                ring.transform.localScale = new Vector3(0.32f, 0.045f, 0.32f);
                ring.GetComponent<Renderer>().sharedMaterial = isGhost ? materials.GhostValid : materials.Connector;
                ring.GetComponent<Collider>().enabled = false;
                view.RegisterRenderer(ring.GetComponent<Renderer>());

                var peg = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                peg.name = "つなぎ ぺぐ";
                peg.layer = 2;
                peg.transform.SetParent(markerRoot.transform, false);
                peg.transform.localPosition = new Vector3(0f, 0.13f, 0f);
                peg.transform.localScale = Vector3.one * 0.24f;
                peg.GetComponent<Renderer>().sharedMaterial = isGhost ? materials.GhostValid : materials.ConnectorGlow;
                peg.GetComponent<Collider>().enabled = false;
                view.RegisterRenderer(peg.GetComponent<Renderer>());
                view.RegisterConnector(markerRoot);
            }
        }

        private static void BuildSelectionAndInvalidMarks(PieceView view, ToyMaterialLibrary materials)
        {
            var selection = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            selection.name = "えらんだ しるし";
            selection.layer = 2;
            selection.transform.SetParent(view.transform, false);
            selection.transform.localPosition = new Vector3(0f, -0.07f, 0f);
            selection.transform.localScale = new Vector3(1.38f, 0.025f, 1.38f);
            selection.GetComponent<Renderer>().sharedMaterial = materials.Selection;
            selection.GetComponent<Collider>().enabled = false;
            view.RegisterRenderer(selection.GetComponent<Renderer>());
            view.SetSelectionMark(selection);

            var invalidRoot = new GameObject("おけない しるし");
            invalidRoot.layer = 2;
            invalidRoot.transform.SetParent(view.transform, false);
            invalidRoot.transform.localPosition = new Vector3(0f, 1.52f, 0f);
            for (var i = 0; i < 2; i++)
            {
                var bar = GameObject.CreatePrimitive(PrimitiveType.Cube);
                bar.layer = 2;
                bar.transform.SetParent(invalidRoot.transform, false);
                bar.transform.localScale = new Vector3(0.16f, 0.16f, 1.05f);
                bar.transform.localRotation = Quaternion.Euler(0f, i == 0 ? 45f : -45f, 0f);
                bar.GetComponent<Renderer>().sharedMaterial = materials.InvalidMark;
                bar.GetComponent<Collider>().enabled = false;
                view.RegisterRenderer(bar.GetComponent<Renderer>());
            }
            view.SetInvalidMark(invalidRoot);
        }

        private static GameObject CreateCube(
            PieceView view,
            string name,
            Vector3 localPosition,
            Vector3 localScale,
            Quaternion localRotation,
            Material material,
            int layer,
            bool collider,
            Transform customParent = null)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.layer = collider ? layer : 2;
            go.transform.SetParent(customParent != null ? customParent : view.transform, false);
            go.transform.localPosition = localPosition;
            go.transform.localRotation = localRotation;
            go.transform.localScale = localScale;
            go.GetComponent<Renderer>().sharedMaterial = material;
            go.GetComponent<Collider>().enabled = collider;
            view.RegisterRenderer(go.GetComponent<Renderer>());
            return go;
        }

        private static GameObject CreateCylinder(
            PieceView view,
            string name,
            Vector3 localPosition,
            Vector3 axis,
            float radius,
            float length,
            Material material,
            int layer,
            bool collider,
            Transform customParent = null)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            go.name = name;
            go.layer = collider ? layer : 2;
            go.transform.SetParent(customParent != null ? customParent : view.transform, false);
            go.transform.localPosition = localPosition;
            go.transform.localRotation = Quaternion.FromToRotation(Vector3.up, axis.normalized);
            go.transform.localScale = new Vector3(radius, length * 0.5f, radius);
            go.GetComponent<Renderer>().sharedMaterial = material;
            go.GetComponent<Collider>().enabled = collider;
            view.RegisterRenderer(go.GetComponent<Renderer>());
            return go;
        }

        private static GameObject CreateSphere(
            PieceView view,
            string name,
            Vector3 localPosition,
            float radius,
            Material material,
            int layer,
            bool collider)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = name;
            go.layer = collider ? layer : 2;
            go.transform.SetParent(view.transform, false);
            go.transform.localPosition = localPosition;
            go.transform.localScale = Vector3.one * radius * 2f;
            go.GetComponent<Renderer>().sharedMaterial = material;
            go.GetComponent<Collider>().enabled = collider;
            view.RegisterRenderer(go.GetComponent<Renderer>());
            return go;
        }

        private static void DisableAllColliders(GameObject root, Collider keepDisabled)
        {
            var colliders = root.GetComponentsInChildren<Collider>(true);
            for (var i = 0; i < colliders.Length; i++)
            {
                colliders[i].enabled = false;
            }
            if (keepDisabled != null) keepDisabled.enabled = false;
        }
    }
}
