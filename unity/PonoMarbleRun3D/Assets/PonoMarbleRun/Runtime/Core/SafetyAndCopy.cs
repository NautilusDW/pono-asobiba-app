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
        public const float MarbleLaunchSpeed = 6.8f;
        public const float TrackStaticFriction = 0.24f;
        public const float TrackDynamicFriction = 0.18f;
        public const float TrackBounciness = 0.02f;
        public const float MarbleStaticFriction = 0.16f;
        public const float MarbleDynamicFriction = 0.10f;
        public const float MarbleBounciness = 0.04f;
        public const float SlopeDegrees = 16.70f;
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
            "じゆうに つくる",
            "さかみち",
            "みほん コース",
            "はじめての みち",
            "くねくね みち",
            "そらの はし",
            "くるくる じょうご",
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
            "ぶひんを えらぼう",
            "おいた ぶひんを おしてね",
            "おいた ぶひんを おしてから くるっ",
            "したの くるっで みぎに まわせるよ",
            "くるっを ２かい おすと のぼりと くだりが かわるよ",
            "くるっと みぎに まわしたよ",
            "ここに おこう",
            "つなげてみよう",
            "ここには おけないよ",
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
