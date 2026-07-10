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
        public const float MarbleLinearDamping = 0.018f;
        public const float MarbleAngularDamping = 0.04f;
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
    /// Computes a non-powered path constraint. It may steer a marble back to a path
    /// and remove sideways motion, but it never accelerates it along the path and
    /// never performs positive work on its current velocity.
    /// </summary>
    public static class PassiveGuidePhysics
    {
        public static Vector3 CalculateConstraintAcceleration(
            Vector3 velocity,
            Vector3 pathTangent,
            Vector3 positionError,
            float alignmentStrength,
            float centeringStrength,
            float maximumAcceleration)
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
            var acceleration = -sidewaysVelocity * Mathf.Max(0f, alignmentStrength)
                + lateralError * Mathf.Max(0f, centeringStrength);
            acceleration = Vector3.ClampMagnitude(acceleration, maximumAcceleration);

            // A passive guide can decelerate along the current travel direction, but
            // cannot add speed in that direction.
            var alongSpeed = Vector3.Dot(velocity, tangent);
            var alongAcceleration = Vector3.Dot(acceleration, tangent);
            if ((alongSpeed > 0.0001f && alongAcceleration > 0f)
                || (alongSpeed < -0.0001f && alongAcceleration < 0f))
            {
                acceleration -= tangent * alongAcceleration;
            }

            // Centering must not become an invisible motor when the marble approaches
            // the path from an angle. Remove any remaining positive mechanical work.
            var speedSquared = velocity.sqrMagnitude;
            var power = Vector3.Dot(acceleration, velocity);
            if (power > 0f && speedSquared > 0.000001f)
            {
                acceleration -= velocity * (power / speedSquared);
            }

            return Vector3.ClampMagnitude(acceleration, maximumAcceleration);
        }

        private static bool IsFinite(Vector3 value)
        {
            return !(float.IsNaN(value.x) || float.IsInfinity(value.x)
                || float.IsNaN(value.y) || float.IsInfinity(value.y)
                || float.IsNaN(value.z) || float.IsInfinity(value.z));
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
        public float MinimumY { get; set; } = -2f;
        public float MaximumRadius { get; set; } = 34f;

        public MarbleSafetyEvent Tick(Vector3 position, Vector3 velocity, Vector3 angularVelocity, float deltaTime)
        {
            if (position.y < MinimumY
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
            "よみこむ",
            "↻ くるっ みぎに まわす",
            "けす",
            "ひとつ もどす",
            "ぜんぶ けす",
            "ためす",
            "たまを もどす",
            "いったん とめる",
            "つづける",
            "つくりなおす",
            "みわたす",
            "おいかける",
            "たまを おいかけるよ",
            "コースを みわたすよ",
            "ドラッグで カメラを うごかせるよ",
            "ぶひんを えらぼう",
            "おいた ぶひんを おしてね",
            "おいた ぶひんを おしてから くるっ",
            "したの くるっで みぎに まわせるよ",
            "くるっを ２かい おすと のぼりと くだりが かわるよ",
            "くるっと みぎに まわしたよ",
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
