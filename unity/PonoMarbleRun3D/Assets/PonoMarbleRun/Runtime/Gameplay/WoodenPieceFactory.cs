using System;
using Pono.MarbleRun3D.Core;
using UnityEngine;

namespace Pono.MarbleRun3D.Gameplay
{
    public static class WoodenPieceFactory
    {
        public const float CellSize = 3f;
        public const float LevelHeight = 1.40f;
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
            var placementSize = GetPlacementVolumeSize(record.kind);
            placementObject.transform.localPosition = new Vector3(0f, placementSize.y * 0.5f - 0.20f, 0f);
            var placement = placementObject.AddComponent<BoxCollider>();
            placement.isTrigger = true;
            placement.size = placementSize;
            view.Initialize(record, placement, isGhost);

            BuildByKind(view, record.kind, materials, isGhost, courseLayer);
            BuildWoodenSupports(view, record, materials, courseLayer);
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
                case MarblePieceKind.Helix:
                    BuildHelix(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Steps:
                    BuildSteps(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Lift:
                    BuildLift(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Tornado:
                    BuildTornado(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Elevator:
                    BuildElevator(view, materials, courseLayer);
                    break;
                case MarblePieceKind.ClearTube:
                    BuildClearTube(view, materials, courseLayer);
                    break;
                case MarblePieceKind.ClearCurve:
                    BuildClearCurve(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Wave:
                    BuildWave(view, materials, courseLayer);
                    break;
                case MarblePieceKind.Spinner:
                    BuildSpinner(view, materials, courseLayer, isGhost);
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
            CreateCylinder(view, "たま いれ そこ", new Vector3(0f, 0.78f, -0.78f), Vector3.up,
                0.60f, 0.12f, materials.Maple, courseLayer, true);
            const int hopperSegments = 12;
            for (var segment = 0; segment < hopperSegments; segment++)
            {
                var angle = Mathf.PI * 2f * segment / hopperSegments;
                if (Mathf.Sin(angle) > 0.58f) continue;
                var radial = new Vector3(Mathf.Cos(angle), 0f, Mathf.Sin(angle));
                var tangent = new Vector3(-Mathf.Sin(angle), 0f, Mathf.Cos(angle));
                CreateCube(
                    view,
                    "たま いれ ふち",
                    new Vector3(0f, 1.12f, -0.78f) + radial * 0.72f,
                    new Vector3(0.46f, 0.62f, 0.13f),
                    Quaternion.LookRotation(tangent, Vector3.up),
                    materials.MarbleAt(segment),
                    courseLayer,
                    true);
            }
            CreateCube(view, "たま いれ すべりだい", new Vector3(0f, 0.48f, -0.18f),
                new Vector3(1.28f, 0.12f, 1.20f), Quaternion.Euler(18f, 0f, 0f),
                materials.Accent(MarblePieceKind.Start), courseLayer, true);
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
            spawn.localPosition = new Vector3(0f, 1.52f, -0.82f);
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
            triggerObject.transform.localPosition = new Vector3(0f, 0.82f, 0.38f);
            var trigger = triggerObject.AddComponent<BoxCollider>();
            trigger.isTrigger = true;
            trigger.size = new Vector3(2.75f, 2.05f, 1.30f);
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
            const int segments = 18;
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
                    materials.Accent(MarblePieceKind.Curve), courseLayer, 0.24f);
                previous = end;
            }
            CreateCylinder(view, "カーブ かざり", new Vector3(1.48f, 0.09f, -1.48f), Vector3.up,
                0.24f, 0.18f, materials.MapleDark, courseLayer, false);
            var guideObject = new GameObject("カーブ ガイド");
            guideObject.layer = courseLayer;
            guideObject.transform.SetParent(view.transform, false);
            guideObject.transform.localPosition = new Vector3(0f, 0.62f, 0f);
            var guideCollider = guideObject.AddComponent<BoxCollider>();
            guideCollider.isTrigger = true;
            guideCollider.size = new Vector3(3f, 1.6f, 3f);
            guideObject.AddComponent<CurveMarbleGuide>().Configure(view.transform);
        }

        private static void BuildSlope(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            var direction = new Vector3(0f, -LevelHeight, CellSize).normalized;
            var slopeLength = Mathf.Sqrt(CellSize * CellSize + LevelHeight * LevelHeight);
            BuildTrackSegment(
                view,
                new Vector3(0f, LevelHeight * 0.5f, 0f),
                direction,
                slopeLength + 0.12f,
                materials.Maple,
                materials.Accent(MarblePieceKind.Slope),
                courseLayer);
            CreateCylinder(view, "さか しるし", new Vector3(0f, LevelHeight * 0.74f, -0.90f), Vector3.up,
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
            for (var i = 0; i < 12; i++)
            {
                var angle = Mathf.PI * 2f * i / 12f;
                if (Mathf.Abs(Mathf.Sin(angle)) > 0.88f) continue;
                var radial = new Vector3(Mathf.Cos(angle), 0f, Mathf.Sin(angle));
                var position = radial * 0.66f + Vector3.up * 0.29f;
                var inwardDown = (-radial + Vector3.down * 0.34f).normalized;
                CreateCube(view, "じょうご さか", position, new Vector3(0.48f, 0.08f, 0.92f),
                    Quaternion.LookRotation(inwardDown, Vector3.up), accent, courseLayer, true);
            }
            var guideObject = new GameObject("じょうご ガイド");
            guideObject.layer = courseLayer;
            guideObject.transform.SetParent(view.transform, false);
            guideObject.transform.localPosition = new Vector3(0f, 0.62f, 0f);
            var guideCollider = guideObject.AddComponent<BoxCollider>();
            guideCollider.isTrigger = true;
            guideCollider.size = new Vector3(2.8f, 1.6f, 3f);
            guideObject.AddComponent<FunnelMarbleGuide>().Configure(view.transform);
        }

        private static void BuildSeesaw(
            PieceView view,
            ToyMaterialLibrary materials,
            int courseLayer,
            bool isGhost)
        {
            CreateCylinder(view, "シーソー どだい", new Vector3(0f, 0.18f, 0f), Vector3.right,
                0.26f, 1.72f, materials.MapleDark, courseLayer, true);
            var plankRoot = new GameObject("シーソー うごくいた");
            plankRoot.layer = courseLayer;
            plankRoot.transform.SetParent(view.transform, false);
            plankRoot.transform.localPosition = new Vector3(0f, 0.43f, 0f);
            CreateCube(view, "シーソー いた", Vector3.zero,
                new Vector3(1.72f, 0.18f, 3.12f), Quaternion.identity,
                materials.Maple, courseLayer, true, plankRoot.transform);
            CreateCylinder(view, "シーソー ひだり", new Vector3(-0.85f, 0.21f, 0f), Vector3.forward,
                0.12f, 3.12f, materials.Accent(MarblePieceKind.Seesaw), courseLayer, true, plankRoot.transform);
            CreateCylinder(view, "シーソー みぎ", new Vector3(0.85f, 0.21f, 0f), Vector3.forward,
                0.12f, 3.12f, materials.Accent(MarblePieceKind.Seesaw), courseLayer, true, plankRoot.transform);

            if (!isGhost)
            {
                var body = plankRoot.AddComponent<Rigidbody>();
                body.mass = 0.85f;
                body.interpolation = RigidbodyInterpolation.Interpolate;
                body.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
                body.maxAngularVelocity = 8f;
                body.isKinematic = true;
                var hinge = plankRoot.AddComponent<HingeJoint>();
                hinge.axis = Vector3.right;
                hinge.autoConfigureConnectedAnchor = false;
                hinge.anchor = Vector3.zero;
                hinge.connectedAnchor = plankRoot.transform.position;
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

        private static void BuildHelix(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            const float radius = 0.82f;
            const float turns = 1.5f;
            const int segments = 18;
            var height = LevelHeight * 2f;
            var accent = materials.Accent(MarblePieceKind.Helix);

            var highConnector = new Vector3(0f, height, -CellSize * 0.5f);
            var highCircle = HelixPoint(0f, radius, height, turns);
            BuildHelixTrackSegment(
                view,
                (highConnector + highCircle) * 0.5f,
                (highCircle - highConnector).normalized,
                Vector3.Distance(highConnector, highCircle) + 0.12f,
                materials.Maple,
                accent,
                courseLayer);

            var previous = highCircle;
            for (var segment = 1; segment <= segments; segment++)
            {
                var t = segment / (float)segments;
                var next = HelixPoint(t, radius, height, turns);
                BuildHelixTrackSegment(
                    view,
                    (previous + next) * 0.5f,
                    (next - previous).normalized,
                    Vector3.Distance(previous, next) + 0.12f,
                    materials.Maple,
                    accent,
                    courseLayer);
                previous = next;
            }

            var lowConnector = new Vector3(0f, 0f, CellSize * 0.5f);
            BuildHelixTrackSegment(
                view,
                (previous + lowConnector) * 0.5f,
                (lowConnector - previous).normalized,
                Vector3.Distance(previous, lowConnector) + 0.12f,
                materials.Maple,
                accent,
                courseLayer);

            CreateCylinder(view, "ぐるぐる まんなか", new Vector3(0f, height * 0.46f, 0f), Vector3.up,
                0.20f, height * 0.92f, materials.MapleDark, courseLayer, false);
            for (var marker = 0; marker < 6; marker++)
            {
                var t = marker / 5f;
                var point = HelixPoint(t, radius, height, turns);
                CreateSphere(view, "ぐるぐる いろ", point + Vector3.up * 0.26f, 0.10f,
                    materials.MarbleAt(marker), courseLayer, false);
            }

            var guideObject = new GameObject("ぐるぐる ガイド");
            guideObject.layer = courseLayer;
            guideObject.transform.SetParent(view.transform, false);
            guideObject.transform.localPosition = new Vector3(0f, height * 0.5f + 0.35f, 0f);
            var guideCollider = guideObject.AddComponent<BoxCollider>();
            guideCollider.isTrigger = true;
            guideCollider.size = new Vector3(2.85f, height + 1.5f, 2.85f);
            guideObject.AddComponent<HelixMarbleGuide>().Configure(view.transform, radius, height, turns);
        }

        private static void BuildSteps(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            var direction = new Vector3(0f, -LevelHeight, CellSize).normalized;
            var length = Mathf.Sqrt(CellSize * CellSize + LevelHeight * LevelHeight);
            var accent = materials.Accent(MarblePieceKind.Steps);
            BuildTrackSegment(
                view,
                new Vector3(0f, LevelHeight * 0.5f, 0f),
                direction,
                length + 0.12f,
                materials.Maple,
                accent,
                courseLayer,
                0.17f);

            const int stepCount = 6;
            for (var step = 0; step < stepCount; step++)
            {
                var t = (step + 0.5f) / stepCount;
                var z = Mathf.Lerp(-CellSize * 0.5f, CellSize * 0.5f, t);
                var surfaceHeight = Mathf.Lerp(LevelHeight, 0f, t);
                var blockHeight = Mathf.Max(0.12f, surfaceHeight);
                CreateCube(
                    view,
                    "だんだん かざり",
                    new Vector3(0f, blockHeight * 0.5f - 0.02f, z),
                    new Vector3(1.48f, blockHeight, CellSize / stepCount * 0.90f),
                    Quaternion.identity,
                    materials.MarbleAt(step),
                    courseLayer,
                    false);
            }
        }

        private static void BuildLift(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            var direction = new Vector3(0f, LevelHeight, CellSize).normalized;
            var length = Mathf.Sqrt(CellSize * CellSize + LevelHeight * LevelHeight);
            var accent = materials.Accent(MarblePieceKind.Lift);
            BuildTrackSegment(
                view,
                new Vector3(0f, LevelHeight * 0.5f, 0f),
                direction,
                length + 0.12f,
                materials.Maple,
                accent,
                courseLayer,
                0.19f);

            const int rollerCount = 7;
            for (var roller = 0; roller < rollerCount; roller++)
            {
                var t = (roller + 0.5f) / rollerCount;
                var z = Mathf.Lerp(-CellSize * 0.5f, CellSize * 0.5f, t);
                var y = Mathf.Lerp(0f, LevelHeight, t) + 0.24f;
                CreateCylinder(view, "のぼる ローラー", new Vector3(0f, y, z), Vector3.right,
                    0.12f, 1.46f, materials.MarbleAt(roller), courseLayer, false);
            }

            var guideObject = new GameObject("のぼる ガイド");
            guideObject.layer = courseLayer;
            guideObject.transform.SetParent(view.transform, false);
            guideObject.transform.localPosition = new Vector3(0f, LevelHeight * 0.5f + 0.48f, 0f);
            guideObject.transform.localRotation = Quaternion.LookRotation(direction, Vector3.up);
            var guideCollider = guideObject.AddComponent<BoxCollider>();
            guideCollider.isTrigger = true;
            guideCollider.size = new Vector3(2.25f, 1.35f, length + 0.30f);
            guideObject.AddComponent<LiftMarbleGuide>().Configure(view.transform);
        }

        private static void BuildTornado(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            const float radius = 0.92f;
            const float turns = 3.5f;
            const int segments = 36;
            var height = LevelHeight * 3f;

            var highConnector = new Vector3(0f, height, -CellSize * 0.5f);
            var highCircle = HelixPoint(0f, radius, height, turns);
            BuildTornadoTrackSegment(view, (highConnector + highCircle) * 0.5f,
                (highCircle - highConnector).normalized,
                Vector3.Distance(highConnector, highCircle) + 0.10f,
                materials.MarbleAt(0), materials.ClearEdge, courseLayer);

            var previous = highCircle;
            for (var segment = 1; segment <= segments; segment++)
            {
                var t = segment / (float)segments;
                var next = HelixPoint(t, radius, height, turns);
                BuildTornadoTrackSegment(view, (previous + next) * 0.5f,
                    (next - previous).normalized,
                    Vector3.Distance(previous, next) + 0.11f,
                    materials.MarbleAt(segment), materials.MarbleAt(segment + 2), courseLayer);
                previous = next;
            }

            var lowConnector = new Vector3(0f, 0f, CellSize * 0.5f);
            BuildTornadoTrackSegment(view, (previous + lowConnector) * 0.5f,
                (lowConnector - previous).normalized,
                Vector3.Distance(previous, lowConnector) + 0.10f,
                materials.MarbleAt(segments + 1), materials.ClearEdge, courseLayer);

            CreateCylinder(view, "トルネード タワー", new Vector3(0f, height * 0.50f, 0f), Vector3.up,
                0.17f, height + 0.12f, materials.MapleDark, courseLayer, false);
            for (var band = 0; band < 7; band++)
            {
                var bandY = height * (band + 0.5f) / 7f;
                CreateCylinder(view, "トルネード にじいろ バンド", new Vector3(0f, bandY, 0f), Vector3.up,
                    0.25f, 0.12f, materials.MarbleAt(band), courseLayer, false);
            }

            var guideObject = new GameObject("トルネード ガイド");
            guideObject.layer = courseLayer;
            guideObject.transform.SetParent(view.transform, false);
            guideObject.transform.localPosition = new Vector3(0f, height * 0.5f + 0.34f, 0f);
            var guideCollider = guideObject.AddComponent<BoxCollider>();
            guideCollider.isTrigger = true;
            guideCollider.size = new Vector3(2.92f, height + 1.55f, 2.92f);
            guideObject.AddComponent<HelixMarbleGuide>().Configure(view.transform, radius, height, turns);
        }

        private static void BuildElevator(
            PieceView view,
            ToyMaterialLibrary materials,
            int courseLayer)
        {
            var height = LevelHeight * 3f;
            BuildElevatorDeck(view, "エレベーター いりぐち", new Vector3(0f, 0f, -0.90f),
                materials.Maple, materials.Accent(MarblePieceKind.Elevator), courseLayer);
            BuildElevatorDeck(view, "エレベーター でぐち", new Vector3(0f, height, 0.90f),
                materials.Maple, materials.Accent(MarblePieceKind.Elevator), courseLayer);

            var cageHeight = height + 1.08f;
            var cageY = height * 0.5f + 0.45f;
            CreateCube(view, "エレベーター とうめい ケージ", new Vector3(-0.73f, cageY, 0f),
                new Vector3(0.07f, cageHeight, 1.10f), Quaternion.identity,
                materials.ClearShell, courseLayer, true);
            CreateCube(view, "エレベーター とうめい ケージ", new Vector3(0.73f, cageY, 0f),
                new Vector3(0.07f, cageHeight, 1.10f), Quaternion.identity,
                materials.ClearShell, courseLayer, true);
            CreateCube(view, "エレベーター とうめい うしろ", new Vector3(0f, cageY, -0.48f),
                new Vector3(1.52f, cageHeight, 0.06f), Quaternion.identity,
                materials.ClearShell, courseLayer, false);

            for (var corner = 0; corner < 4; corner++)
            {
                var x = corner % 2 == 0 ? -0.76f : 0.76f;
                var z = corner < 2 ? -0.50f : 0.50f;
                CreateCylinder(view, "エレベーター ケージ ぼう", new Vector3(x, cageY, z), Vector3.up,
                    0.075f, cageHeight, materials.MarbleAt(corner), courseLayer, false);
            }
            for (var ring = 0; ring <= 3; ring++)
            {
                var y = ring * LevelHeight + 0.16f;
                CreateCube(view, "エレベーター にじいろ わく", new Vector3(0f, y, -0.51f),
                    new Vector3(1.68f, 0.10f, 0.10f), Quaternion.identity,
                    materials.MarbleAt(ring), courseLayer, false);
                CreateCube(view, "エレベーター にじいろ わく", new Vector3(0f, y, 0.51f),
                    new Vector3(1.68f, 0.10f, 0.10f), Quaternion.identity,
                    materials.MarbleAt(ring + 2), courseLayer, false);
            }

            var movingCar = new GameObject("エレベーター うごく だい");
            movingCar.layer = 2;
            movingCar.transform.SetParent(view.transform, false);
            movingCar.transform.localPosition = new Vector3(0f, 0.14f, 0f);
            CreateCube(view, "エレベーター カラフル カー", Vector3.zero,
                new Vector3(1.25f, 0.14f, 0.78f), Quaternion.identity,
                materials.MarbleAt(4), courseLayer, false, movingCar.transform);
            CreateCylinder(view, "エレベーター カー ひかり", new Vector3(0f, 0.16f, 0f), Vector3.up,
                0.22f, 0.10f, materials.ConnectorGlow, courseLayer, false, movingCar.transform);

            var animatorObject = new GameObject("エレベーター アニメーター");
            animatorObject.layer = 2;
            animatorObject.transform.SetParent(view.transform, false);
            animatorObject.AddComponent<ElevatorVisualAnimator>().Configure(movingCar.transform, height);

            var guideObject = new GameObject("エレベーター ガイド");
            guideObject.layer = courseLayer;
            guideObject.transform.SetParent(view.transform, false);
            guideObject.transform.localPosition = new Vector3(0f, height * 0.5f + 0.35f, 0f);
            var guideCollider = guideObject.AddComponent<BoxCollider>();
            guideCollider.isTrigger = true;
            guideCollider.size = new Vector3(2.25f, height + 1.55f, 3.10f);
            guideObject.AddComponent<ElevatorMarbleGuide>().Configure(view.transform, height);
        }

        private static void BuildClearTube(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            CreateCube(view, "とうめい つつ そこ", new Vector3(0f, 0.07f, 0f),
                new Vector3(1.48f, 0.14f, 3.12f), Quaternion.identity,
                materials.ClearShell, courseLayer, true);
            CreateCube(view, "とうめい つつ ひだり", new Vector3(-0.76f, 0.52f, 0f),
                new Vector3(0.08f, 1.04f, 3.08f), Quaternion.identity,
                materials.ClearShell, courseLayer, true);
            CreateCube(view, "とうめい つつ みぎ", new Vector3(0.76f, 0.52f, 0f),
                new Vector3(0.08f, 1.04f, 3.08f), Quaternion.identity,
                materials.ClearShell, courseLayer, true);
            CreateCube(view, "とうめい つつ やね", new Vector3(0f, 1.03f, 0f),
                new Vector3(1.56f, 0.06f, 3.08f), Quaternion.identity,
                materials.ClearShell, courseLayer, true);

            for (var ring = 0; ring < 4; ring++)
            {
                var z = Mathf.Lerp(-1.20f, 1.20f, ring / 3f);
                BuildClearRing(view, "とうめい つつ カラフル リング", z,
                    materials.MarbleAt(ring + 1), courseLayer);
            }

            var guideObject = new GameObject("とうめい つつ ガイド");
            guideObject.layer = courseLayer;
            guideObject.transform.SetParent(view.transform, false);
            guideObject.transform.localPosition = new Vector3(0f, 0.58f, 0f);
            var guideCollider = guideObject.AddComponent<BoxCollider>();
            guideCollider.isTrigger = true;
            guideCollider.size = new Vector3(2.10f, 1.46f, 3.60f);
            guideObject.AddComponent<ClearTubeMarbleGuide>().Configure(view.transform);
        }

        private static void BuildClearCurve(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            const int segments = 14;
            const float radius = 1.5f;
            for (var segment = 0; segment < segments; segment++)
            {
                var t0 = Mathf.PI - Mathf.PI * 0.5f * segment / segments;
                var t1 = Mathf.PI - Mathf.PI * 0.5f * (segment + 1) / segments;
                var start = new Vector3(1.5f + Mathf.Cos(t0) * radius, 0f,
                    -1.5f + Mathf.Sin(t0) * radius);
                var end = new Vector3(1.5f + Mathf.Cos(t1) * radius, 0f,
                    -1.5f + Mathf.Sin(t1) * radius);
                var direction = (end - start).normalized;
                var centre = (start + end) * 0.5f;
                var length = Vector3.Distance(start, end) + 0.13f;
                var rotation = Quaternion.LookRotation(direction, Vector3.up);
                var side = Vector3.Cross(Vector3.up, direction).normalized;

                CreateCube(view, "とうめい カーブ そこ", centre + Vector3.up * 0.07f,
                    new Vector3(1.48f, 0.14f, length), rotation,
                    materials.ClearShell, courseLayer, true);
                CreateCube(view, "とうめい カーブ そと", centre + side * 0.76f + Vector3.up * 0.52f,
                    new Vector3(0.08f, 1.02f, length), rotation,
                    materials.ClearShell, courseLayer, true);
                CreateCube(view, "とうめい カーブ うち", centre - side * 0.76f + Vector3.up * 0.52f,
                    new Vector3(0.08f, 1.02f, length), rotation,
                    materials.ClearShell, courseLayer, true);
                CreateCube(view, "とうめい カーブ やね", centre + Vector3.up * 1.02f,
                    new Vector3(1.52f, 0.06f, length), rotation,
                    materials.ClearShell, courseLayer, false);

                if (segment % 3 == 0)
                {
                    CreateCylinder(view, "とうめい カーブ リング ひだり",
                        centre + side * 0.80f + Vector3.up * 0.52f, Vector3.up,
                        0.07f, 1.12f, materials.MarbleAt(segment), courseLayer, false);
                    CreateCylinder(view, "とうめい カーブ リング みぎ",
                        centre - side * 0.80f + Vector3.up * 0.52f, Vector3.up,
                        0.07f, 1.12f, materials.MarbleAt(segment + 2), courseLayer, false);
                }
            }

            var guideObject = new GameObject("とうめい カーブ ガイド");
            guideObject.layer = courseLayer;
            guideObject.transform.SetParent(view.transform, false);
            guideObject.transform.localPosition = new Vector3(0.18f, 0.60f, -0.18f);
            var guideCollider = guideObject.AddComponent<BoxCollider>();
            guideCollider.isTrigger = true;
            guideCollider.size = new Vector3(3.35f, 1.55f, 3.35f);
            guideObject.AddComponent<ClearCurveMarbleGuide>().Configure(view.transform);
        }

        private static void BuildWave(PieceView view, ToyMaterialLibrary materials, int courseLayer)
        {
            const int segments = 16;
            const float amplitude = 0.72f;
            var previous = WavePoint(0f, amplitude);
            for (var segment = 1; segment <= segments; segment++)
            {
                var t = segment / (float)segments;
                var next = WavePoint(t, amplitude);
                BuildWaveTrackSegment(view, (previous + next) * 0.5f,
                    (next - previous).normalized, Vector3.Distance(previous, next) + 0.10f,
                    materials.Maple, materials.MarbleAt(segment), courseLayer);
                previous = next;
            }

            var guideObject = new GameObject("なみなみ ガイド");
            guideObject.layer = courseLayer;
            guideObject.transform.SetParent(view.transform, false);
            guideObject.transform.localPosition = new Vector3(0f, 0.74f, 0f);
            var guideCollider = guideObject.AddComponent<BoxCollider>();
            guideCollider.isTrigger = true;
            guideCollider.size = new Vector3(2.72f, 2.25f, 3.18f);
            guideObject.AddComponent<WaveMarbleGuide>().Configure(view.transform, amplitude);
        }

        private static void BuildSpinner(
            PieceView view,
            ToyMaterialLibrary materials,
            int courseLayer,
            bool isGhost)
        {
            BuildStraight(view, materials, courseLayer, MarblePieceKind.Spinner);
            CreateCylinder(view, "くるくる ささえ ひだり", new Vector3(-0.75f, 0.73f, 0f), Vector3.up,
                0.09f, 1.18f, materials.MapleDark, courseLayer, false);
            CreateCylinder(view, "くるくる ささえ みぎ", new Vector3(0.75f, 0.73f, 0f), Vector3.up,
                0.09f, 1.18f, materials.MapleDark, courseLayer, false);

            var rotorRoot = new GameObject("くるくる うごく はね");
            rotorRoot.layer = courseLayer;
            rotorRoot.transform.SetParent(view.transform, false);
            rotorRoot.transform.localPosition = new Vector3(0f, 0.76f, 0f);
            CreateCylinder(view, "くるくる まんなか", Vector3.zero, Vector3.right,
                0.18f, 1.34f, materials.Metal, courseLayer, false, rotorRoot.transform);
            for (var paddle = 0; paddle < 6; paddle++)
            {
                var angle = paddle * 60f;
                var radians = angle * Mathf.Deg2Rad;
                var radial = new Vector3(0f, Mathf.Cos(radians), Mathf.Sin(radians));
                CreateCube(view, "くるくる カラフル はね", radial * 0.37f,
                    new Vector3(0.76f, 0.10f, 0.58f),
                    Quaternion.AngleAxis(angle - 90f, Vector3.right),
                    materials.MarbleAt(paddle), courseLayer, false, rotorRoot.transform);
            }

            if (isGhost) return;
            var body = rotorRoot.AddComponent<Rigidbody>();
            body.mass = 0.18f;
            body.interpolation = RigidbodyInterpolation.Interpolate;
            body.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
            body.maxAngularVelocity = 20f;
            body.isKinematic = true;
            var hinge = rotorRoot.AddComponent<HingeJoint>();
            hinge.axis = Vector3.right;
            hinge.autoConfigureConnectedAnchor = false;
            hinge.anchor = Vector3.zero;
            hinge.connectedAnchor = rotorRoot.transform.position;
            hinge.useLimits = false;
            view.RegisterDynamicBody(body);

            var guideObject = new GameObject("くるくる はね ガイド");
            guideObject.layer = courseLayer;
            guideObject.transform.SetParent(view.transform, false);
            guideObject.transform.localPosition = new Vector3(0f, 0.82f, 0f);
            var guideCollider = guideObject.AddComponent<BoxCollider>();
            guideCollider.isTrigger = true;
            guideCollider.size = new Vector3(2.34f, 2.28f, 3.46f);
            guideObject.AddComponent<SpinnerMarbleGuide>().Configure(view.transform, body);
        }

        private static Vector3 WavePoint(float t, float amplitude)
        {
            return new Vector3(
                0f,
                Mathf.Sin(Mathf.Clamp01(t) * Mathf.PI) * amplitude,
                Mathf.Lerp(-CellSize * 0.5f, CellSize * 0.5f, Mathf.Clamp01(t)));
        }

        private static Vector3 HelixPoint(float t, float radius, float height, float turns)
        {
            var angle = -Mathf.PI * 0.5f + Mathf.PI * 2f * turns * t;
            return new Vector3(
                Mathf.Cos(angle) * radius,
                Mathf.Lerp(height, 0f, t),
                Mathf.Sin(angle) * radius);
        }

        private static Vector3 GetPlacementVolumeSize(MarblePieceKind kind)
        {
            switch (kind)
            {
                case MarblePieceKind.Tornado:
                case MarblePieceKind.Elevator:
                    return new Vector3(2.90f, LevelHeight * 3f + 1.55f, 2.90f);
                case MarblePieceKind.Helix:
                    return new Vector3(2.75f, LevelHeight * 2f + 1.45f, 2.75f);
                case MarblePieceKind.Slope:
                case MarblePieceKind.Steps:
                case MarblePieceKind.Lift:
                    return new Vector3(2.75f, LevelHeight + 1.45f, 2.75f);
                default:
                    return new Vector3(2.75f, 1.70f, 2.75f);
            }
        }

        private static void BuildWoodenSupports(
            PieceView view,
            PieceRecord record,
            ToyMaterialLibrary materials,
            int courseLayer)
        {
            if (record.pose.level > 0)
            {
                var top = -0.06f;
                CreateSupport(view, "たかい みちの あし", -0.68f, -0.94f, top, record.pose.level,
                    materials, courseLayer);
                CreateSupport(view, "たかい みちの あし", 0.68f, -0.94f, top, record.pose.level,
                    materials, courseLayer);
                CreateSupport(view, "たかい みちの あし", -0.68f, 0.94f, top, record.pose.level,
                    materials, courseLayer);
                CreateSupport(view, "たかい みちの あし", 0.68f, 0.94f, top, record.pose.level,
                    materials, courseLayer);
            }

            if (record.kind == MarblePieceKind.Tornado)
            {
                CreateSupport(view, "トルネード たかい あし", -0.67f, -1.03f, LevelHeight * 2.86f,
                    record.pose.level, materials, courseLayer);
                CreateSupport(view, "トルネード たかい あし", 0.67f, -1.03f, LevelHeight * 2.86f,
                    record.pose.level, materials, courseLayer);
                CreateSupport(view, "トルネード まんなか あし", 0f, 0f, LevelHeight * 1.45f,
                    record.pose.level, materials, courseLayer, 0.17f);
            }
            else if (record.kind == MarblePieceKind.Elevator)
            {
                CreateSupport(view, "エレベーター でぐちの あし", -0.67f, 1.05f, LevelHeight * 2.88f,
                    record.pose.level, materials, courseLayer);
                CreateSupport(view, "エレベーター でぐちの あし", 0.67f, 1.05f, LevelHeight * 2.88f,
                    record.pose.level, materials, courseLayer);
            }
            else if (record.kind == MarblePieceKind.Helix)
            {
                CreateSupport(view, "ぐるぐる たかい あし", -0.66f, -0.92f, LevelHeight * 1.82f,
                    record.pose.level, materials, courseLayer);
                CreateSupport(view, "ぐるぐる たかい あし", 0.66f, -0.92f, LevelHeight * 1.82f,
                    record.pose.level, materials, courseLayer);
                CreateSupport(view, "ぐるぐる まんなか あし", 0f, 0f, LevelHeight * 0.88f,
                    record.pose.level, materials, courseLayer, 0.16f);
            }
            else if (record.kind == MarblePieceKind.Slope || record.kind == MarblePieceKind.Steps)
            {
                CreateSupport(view, "さかの あし", -0.66f, -1.03f, LevelHeight * 0.82f,
                    record.pose.level, materials, courseLayer);
                CreateSupport(view, "さかの あし", 0.66f, -1.03f, LevelHeight * 0.82f,
                    record.pose.level, materials, courseLayer);
            }
            else if (record.kind == MarblePieceKind.Lift)
            {
                CreateSupport(view, "のぼる あし", -0.66f, 1.03f, LevelHeight * 0.82f,
                    record.pose.level, materials, courseLayer);
                CreateSupport(view, "のぼる あし", 0.66f, 1.03f, LevelHeight * 0.82f,
                    record.pose.level, materials, courseLayer);
            }
        }

        private static void CreateSupport(
            PieceView view,
            string name,
            float x,
            float z,
            float topLocalY,
            int baseLevel,
            ToyMaterialLibrary materials,
            int courseLayer,
            float radius = 0.11f)
        {
            var bottomLocalY = -baseLevel * LevelHeight;
            var length = topLocalY - bottomLocalY;
            if (length < 0.12f) return;
            CreateCylinder(
                view,
                name,
                new Vector3(x, (bottomLocalY + topLocalY) * 0.5f, z),
                Vector3.up,
                radius,
                length,
                materials.MapleDark,
                courseLayer,
                false);
            CreateCylinder(
                view,
                name + " そこ",
                new Vector3(x, bottomLocalY + 0.035f, z),
                Vector3.up,
                radius * 1.55f,
                0.07f,
                materials.Maple,
                courseLayer,
                false);
        }

        private static void BuildHelixTrackSegment(
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
            CreateCube(view, "ぐるぐる みち", centre + Vector3.up * 0.07f,
                new Vector3(0.96f, 0.16f, length), rotation, floorMaterial, courseLayer, true);

            var side = Vector3.Cross(Vector3.up, direction).normalized;
            CreateCylinder(view, "ぐるぐる ひだり", centre + side * 0.49f + Vector3.up * 0.28f,
                direction, 0.12f, length, accentMaterial, courseLayer, true);
            CreateCylinder(view, "ぐるぐる みぎ", centre - side * 0.49f + Vector3.up * 0.28f,
                direction, 0.12f, length, accentMaterial, courseLayer, true);
        }

        private static void BuildTornadoTrackSegment(
            PieceView view,
            Vector3 centre,
            Vector3 direction,
            float length,
            Material floorMaterial,
            Material railMaterial,
            int courseLayer)
        {
            direction.Normalize();
            var rotation = Quaternion.LookRotation(direction, Vector3.up);
            CreateCube(view, "トルネード みち", centre + Vector3.up * 0.065f,
                new Vector3(0.86f, 0.15f, length), rotation,
                floorMaterial, courseLayer, true);

            var side = Vector3.Cross(Vector3.up, direction).normalized;
            CreateCylinder(view, "トルネード ひだり", centre + side * 0.44f + Vector3.up * 0.28f,
                direction, 0.095f, length, railMaterial, courseLayer, false);
            CreateCylinder(view, "トルネード みぎ", centre - side * 0.44f + Vector3.up * 0.28f,
                direction, 0.095f, length, railMaterial, courseLayer, false);
        }

        private static void BuildElevatorDeck(
            PieceView view,
            string name,
            Vector3 centre,
            Material floorMaterial,
            Material accentMaterial,
            int courseLayer)
        {
            const float length = 1.34f;
            CreateCube(view, name + " みち", centre + Vector3.up * 0.08f,
                new Vector3(1.56f, 0.17f, length), Quaternion.identity,
                floorMaterial, courseLayer, true);
            CreateCylinder(view, name + " ひだり", centre + new Vector3(-0.79f, 0.30f, 0f),
                Vector3.forward, 0.11f, length, accentMaterial, courseLayer, true);
            CreateCylinder(view, name + " みぎ", centre + new Vector3(0.79f, 0.30f, 0f),
                Vector3.forward, 0.11f, length, accentMaterial, courseLayer, true);
        }

        private static void BuildClearRing(
            PieceView view,
            string name,
            float z,
            Material material,
            int courseLayer)
        {
            CreateCylinder(view, name + " ひだり", new Vector3(-0.80f, 0.52f, z), Vector3.up,
                0.065f, 1.10f, material, courseLayer, false);
            CreateCylinder(view, name + " みぎ", new Vector3(0.80f, 0.52f, z), Vector3.up,
                0.065f, 1.10f, material, courseLayer, false);
            CreateCylinder(view, name + " うえ", new Vector3(0f, 1.06f, z), Vector3.right,
                0.065f, 1.66f, material, courseLayer, false);
        }

        private static void BuildWaveTrackSegment(
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
            CreateCube(view, "なみなみ みち", centre + Vector3.up * 0.07f,
                new Vector3(1.62f, 0.16f, length), rotation,
                floorMaterial, courseLayer, true);
            var side = Vector3.Cross(Vector3.up, direction).normalized;
            CreateCylinder(view, "なみなみ ひだり", centre + side * 0.82f + Vector3.up * 0.29f,
                direction, 0.105f, length, accentMaterial, courseLayer, false);
            CreateCylinder(view, "なみなみ みぎ", centre - side * 0.82f + Vector3.up * 0.29f,
                direction, 0.105f, length, accentMaterial, courseLayer, false);
        }

        private static void BuildTrackSegment(
            PieceView view,
            Vector3 centre,
            Vector3 direction,
            float length,
            Material floorMaterial,
            Material accentMaterial,
            int courseLayer,
            float railRadius = 0.13f)
        {
            direction.Normalize();
            var rotation = Quaternion.LookRotation(direction, Vector3.up);
            CreateCube(view, "みち", centre + Vector3.up * 0.08f, new Vector3(1.72f, 0.18f, length),
                rotation, floorMaterial, courseLayer, true);

            var side = Vector3.Cross(Vector3.up, direction).normalized;
            CreateCylinder(view, "レール ひだり", centre + side * 0.87f + Vector3.up * 0.31f,
                direction, railRadius, length, accentMaterial, courseLayer, true);
            CreateCylinder(view, "レール みぎ", centre - side * 0.87f + Vector3.up * 0.31f,
                direction, railRadius, length, accentMaterial, courseLayer, true);

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
                    0.28f + connector.localLevelOffset * LevelHeight,
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
