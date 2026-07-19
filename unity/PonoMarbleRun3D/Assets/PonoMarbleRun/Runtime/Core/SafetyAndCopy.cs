using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

namespace Pono.MarbleRun3D.Core
{
    public static class MarbleRunPhysicsProfile
    {
        public const float FixedTimestep = 1f / 60f;
        public const float MaximumTimestep = 1f / 15f;
        public const int SolverIterations = 10;
        public const int SolverVelocityIterations = 4;
        public const float MarbleMass = 0.10f;
        // A small toy marble has negligible air drag. Keep damping low so the visible
        // height drops, rather than an invisible guide motor, can carry a long course.
        public const float MarbleLinearDamping = 0.004f;
        public const float MarbleAngularDamping = 0.012f;
        public const float MarbleMaximumSpeed = 14f;
        // The hopper ramp supplies the initial energy. This is only a small nudge so a
        // level track cannot behave like a powered conveyor belt.
        public const float MarbleLaunchSpeed = 0.65f;
        public const float TrackStaticFriction = 0.24f;
        public const float TrackDynamicFriction = 0.18f;
        public const float TrackBounciness = 0.02f;
        public const float MarbleStaticFriction = 0.16f;
        public const float MarbleDynamicFriction = 0.10f;
        public const float MarbleBounciness = 0.04f;
        public const float SlopeDegrees = 25.02f;
    }

    /// <summary>
    /// Computes a non-powered path constraint. It may steer a marble back to a path,
    /// but like an ideal rail's normal force it performs no work on a moving marble:
    /// it changes direction without secretly increasing or draining its speed.
    /// </summary>
    public static class PassiveGuidePhysics
    {
        public static bool TryCalculateSpecificMechanicalEnergy(
            Vector3 velocity,
            float worldHeight,
            float gravityMagnitude,
            out float specificEnergy)
        {
            specificEnergy = 0f;
            if (!IsFinite(velocity)
                || !IsFinite(worldHeight)
                || !IsFinite(gravityMagnitude)
                || gravityMagnitude < 0f)
            {
                return false;
            }

            specificEnergy = 0.5f * velocity.sqrMagnitude + gravityMagnitude * worldHeight;
            if (IsFinite(specificEnergy)) return true;

            specificEnergy = 0f;
            return false;
        }

        /// <summary>
        /// Reconstructs an ideal constrained velocity from stored specific mechanical
        /// energy. This corrects small losses from segmented colliders without adding
        /// a minimum speed: level paths preserve entry speed, climbing spends kinetic
        /// energy, and descending converts potential energy back into speed.
        /// </summary>
        public static Vector3 CalculateEnergyConservingVelocity(
            float specificEnergy,
            float worldHeight,
            Vector3 pathTangent,
            float gravityMagnitude,
            float maximumSpeed = MarbleRunPhysicsProfile.MarbleMaximumSpeed)
        {
            return TryCalculateEnergyConservingVelocity(
                specificEnergy,
                worldHeight,
                pathTangent,
                gravityMagnitude,
                maximumSpeed,
                out var velocity)
                ? velocity
                : Vector3.zero;
        }

        public static bool TryCalculateEnergyConservingVelocity(
            float specificEnergy,
            float worldHeight,
            Vector3 pathTangent,
            float gravityMagnitude,
            float maximumSpeed,
            out Vector3 velocity)
        {
            velocity = Vector3.zero;
            if (!IsFinite(specificEnergy)
                || !IsFinite(worldHeight)
                || !IsFinite(pathTangent)
                || !IsFinite(gravityMagnitude)
                || !IsFinite(maximumSpeed)
                || gravityMagnitude < 0f
                || maximumSpeed <= 0f)
            {
                return false;
            }

            var tangentMagnitude = pathTangent.magnitude;
            if (!IsFinite(tangentMagnitude) || tangentMagnitude < 0.0001f)
                return false;

            var availableKineticEnergy = specificEnergy - gravityMagnitude * worldHeight;
            if (!IsFinite(availableKineticEnergy)) return false;
            if (availableKineticEnergy <= 0f) return true;

            var energyLimitedSpeed = Mathf.Sqrt(2f * availableKineticEnergy);
            if (!IsFinite(energyLimitedSpeed)) return false;

            var speed = Mathf.Min(energyLimitedSpeed, maximumSpeed);
            velocity = pathTangent / tangentMagnitude * speed;
            return IsFinite(velocity);
        }

        public static Vector3 CalculateConstraintAcceleration(
            Vector3 velocity,
            Vector3 pathTangent,
            Vector3 positionError,
            float alignmentStrength,
            float centeringStrength,
            float maximumAcceleration)
        {
            return CalculateConstraintAcceleration(
                velocity,
                pathTangent,
                positionError,
                alignmentStrength,
                centeringStrength,
                maximumAcceleration,
                Vector3.zero);
        }

        public static Vector3 CalculateConstraintAcceleration(
            Vector3 velocity,
            Vector3 pathTangent,
            Vector3 positionError,
            float alignmentStrength,
            float centeringStrength,
            float maximumAcceleration,
            Vector3 centripetalAcceleration)
        {
            if (!IsFinite(velocity) || !IsFinite(pathTangent) || !IsFinite(positionError))
                return Vector3.zero;

            var tangentMagnitude = pathTangent.magnitude;
            if (tangentMagnitude < 0.0001f || maximumAcceleration <= 0f)
                return Vector3.zero;

            var tangent = pathTangent / tangentMagnitude;
            var tangentialVelocity = tangent * Vector3.Dot(velocity, tangent);
            var sidewaysVelocity = velocity - tangentialVelocity;
            var lateralError = positionError - tangent * Vector3.Dot(positionError, tangent);
            var candidateAcceleration = -sidewaysVelocity * Mathf.Max(0f, alignmentStrength)
                + lateralError * Mathf.Max(0f, centeringStrength);

            return CombineZeroWorkConstraintAcceleration(
                velocity,
                candidateAcceleration,
                centripetalAcceleration,
                maximumAcceleration);
        }

        /// <summary>
        /// Adds the inward acceleration needed to follow a curved path, then removes
        /// every component that could change kinetic energy. The result can turn a
        /// fast marble but can never propel or brake it along its velocity vector.
        /// </summary>
        public static Vector3 CombineZeroWorkConstraintAcceleration(
            Vector3 velocity,
            Vector3 candidateAcceleration,
            Vector3 centripetalAcceleration,
            float maximumAcceleration)
        {
            if (!IsFinite(velocity)
                || !IsFinite(candidateAcceleration)
                || !IsFinite(centripetalAcceleration)
                || !IsFinite(maximumAcceleration)
                || maximumAcceleration <= 0f)
            {
                return Vector3.zero;
            }

            var acceleration = candidateAcceleration + centripetalAcceleration;
            if (!IsFinite(acceleration)) return Vector3.zero;

            // A rigid rail's normal force is perpendicular to motion. Project away
            // all mechanical work so the helper neither motors nor brakes the marble.
            var speedSquared = velocity.sqrMagnitude;
            var power = Vector3.Dot(acceleration, velocity);
            if (speedSquared > 0.000001f)
            {
                acceleration -= velocity * (power / speedSquared);
            }

            if (!IsFinite(acceleration)) return Vector3.zero;
            return Vector3.ClampMagnitude(acceleration, maximumAcceleration);
        }

        private static bool IsFinite(Vector3 value)
        {
            return !(float.IsNaN(value.x) || float.IsInfinity(value.x)
                || float.IsNaN(value.y) || float.IsInfinity(value.y)
                || float.IsNaN(value.z) || float.IsInfinity(value.z));
        }

        private static bool IsFinite(float value)
        {
            return !(float.IsNaN(value) || float.IsInfinity(value));
        }
    }

    public enum MarbleSafetyEvent
    {
        None,
        Stalled,
        OutOfBounds
    }

    public sealed class MarbleSafetyModel
    {
        private float _slowSeconds;
        private bool _stallRaised;

        public float StallSpeed { get; set; } = 0.08f;
        public float StallAngularSpeed { get; set; } = 0.4f;
        public float StallDelay { get; set; } = 2.5f;
        // A marble resting on the board (about y=1.24) has left every level-0 rail
        // (running centre about y=1.47), so return it before it crosses the whole room.
        public float MinimumY { get; set; } = 1.30f;
        public float MaximumRadius { get; set; } = 34f;
        public float MaximumX { get; set; } = 19.5f;
        public float MaximumZ { get; set; } = 16.5f;

        public MarbleSafetyEvent Tick(Vector3 position, Vector3 velocity, Vector3 angularVelocity, float deltaTime)
        {
            if (position.y < MinimumY
                || Mathf.Abs(position.x) > MaximumX
                || Mathf.Abs(position.z) > MaximumZ
                || new Vector2(position.x, position.z).sqrMagnitude > MaximumRadius * MaximumRadius)
            {
                return MarbleSafetyEvent.OutOfBounds;
            }

            if (velocity.magnitude < StallSpeed && angularVelocity.magnitude < StallAngularSpeed)
            {
                _slowSeconds += Mathf.Max(0f, deltaTime);
                if (!_stallRaised && _slowSeconds >= StallDelay)
                {
                    _stallRaised = true;
                    return MarbleSafetyEvent.Stalled;
                }
            }
            else
            {
                _slowSeconds = 0f;
                _stallRaised = false;
            }
            return MarbleSafetyEvent.None;
        }

        public void Reset()
        {
            _slowSeconds = 0f;
            _stallRaised = false;
        }
    }

    public static class ChildFacingTextValidator
    {
        public static bool IsKanaSafe(string text, out string invalidElement)
        {
            invalidElement = string.Empty;
            if (text == null) return true;
            var enumerator = StringInfo.GetTextElementEnumerator(text);
            while (enumerator.MoveNext())
            {
                var element = enumerator.GetTextElement();
                var codePoint = char.ConvertToUtf32(element, 0);
                if (IsAllowed(codePoint)) continue;
                invalidElement = element;
                return false;
            }
            return true;
        }

        private static bool IsAllowed(int codePoint)
        {
            if (codePoint == '\n' || codePoint == '\r' || codePoint == '\t' || codePoint == 0x20)
                return true;
            if (codePoint >= 0x3040 && codePoint <= 0x30FF) return true;
            if (codePoint >= 0xFF65 && codePoint <= 0xFF9F) return true;
            if (codePoint >= 0xFF01 && codePoint <= 0xFF20) return true;
            if (codePoint >= 0xFF3B && codePoint <= 0xFF40) return true;
            if (codePoint >= 0xFF5B && codePoint <= 0xFF64) return true;
            if (codePoint >= 0x30 && codePoint <= 0x39) return true;
            if (codePoint >= 0xFF10 && codePoint <= 0xFF19) return true;
            if (codePoint >= 0x2000 && codePoint <= 0x206F) return true;
            if (codePoint >= 0x3000 && codePoint <= 0x303F && codePoint != 0x3005) return true;
            if (codePoint >= 0x2190 && codePoint <= 0x21FF) return true;
            if (codePoint >= 0x2200 && codePoint <= 0x22FF) return true;
            if (codePoint == 0x00D7 || codePoint == 0x25CB || codePoint == 0x25CF
                || codePoint == 0x25B2 || codePoint == 0x25BC || codePoint == 0x2605
                || codePoint == 0x266A || codePoint == 0x221E)
                return true;
            return false;
        }
    }

    public static class MarbleRunCopy
    {
        public static readonly IReadOnlyList<string> All = new[]
        {
            "ポノの マーブルラン",
            "あそびかた",
            "チャレンジ １",
            "チャレンジ ２",
            "チャレンジ ３",
            "すぐ ころがす",
            "いろいろな うごきを みてみよう",
            "じゆうに つくる",
            "さかみち",
            "みほん コース",
            "はじめての みち",
            "にじいろ タワー",
            "そらの まよいみち",
            "のぼって おりて",
            "トルネード タワー",
            "たかい ところから トルネードを おりよう",
            "エレベーター シティ",
            "のぼって おりて まちを めぐろう",
            "ぐるぐる",
            "かいだん",
            "のぼる みち",
            "トルネード",
            "エレベーター",
            "すけすけ つつ",
            "すけすけ カーブ",
            "なみなみ",
            "くるくる はね",
            "もどる",
            "ほぞん",
            "よむ",
            "まわす",
            "けす",
            "もどす",
            "ぜんぶ",
            "ころがす",
            "たまを もどす",
            "とめる",
            "つづける",
            "つくる",
            "みわたす",
            "おいかける",
            "たまを おいかけるよ",
            "コースを みわたすよ",
            "ドラッグで カメラを うごかせるよ",
            "ぶひんを えらぼう",
            "おいた ぶひんを おしてね",
            "おいた ぶひんを おしてから まわす",
            "したの まわすで みぎに まわせるよ",
            "まわすを ２かい おすと のぼりと くだりが かわるよ",
            "みぎに まわしたよ",
            "ここに おこう",
            "つなげてみよう",
            "ここには おけないよ",
            "ぶひんが かさなるよ",
            "もういちど おしてね",
            "たまが とまったよ",
            "たまを もどしたよ",
            "ゴール！",
            "やったね！",
            "つづきから あそべるよ",
            "ほぞん できたよ",
            "よみこめなかったよ",
            "スタートと ゴールを おこう",
            "まわして つなげよう",
            "みどりの まるを つなげよう",
            "のこり",
            "たくさん"
        };
    }
}
