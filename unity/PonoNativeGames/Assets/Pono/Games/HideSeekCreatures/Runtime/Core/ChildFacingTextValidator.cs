using System;
using System.Globalization;

namespace Pono.HideSeek.Core
{
    public enum ChildFacingTextIssue
    {
        None = 0,
        Empty = 1,
        Kanji = 2,
        NonKanaLetter = 3,
        InvalidUnicode = 4,
        UnsupportedCharacter = 5
    }

    public readonly struct ChildFacingTextValidation
    {
        internal ChildFacingTextValidation(
            bool isValid,
            ChildFacingTextIssue issue,
            int invalidUtf16Index,
            int invalidCodePoint)
        {
            IsValid = isValid;
            Issue = issue;
            InvalidUtf16Index = invalidUtf16Index;
            InvalidCodePoint = invalidCodePoint;
        }

        public bool IsValid { get; }

        public ChildFacingTextIssue Issue { get; }

        public int InvalidUtf16Index { get; }

        public int InvalidCodePoint { get; }
    }

    /// <summary>
    /// Validation for copy shown directly to children. Kana, digits, whitespace,
    /// punctuation and symbols are accepted; kanji and non-kana alphabets are rejected.
    /// </summary>
    public static class ChildFacingTextValidator
    {
        public static bool IsKanaFriendly(string text, bool allowEmpty = false)
        {
            return ValidateKanaFriendly(text, allowEmpty).IsValid;
        }

        public static ChildFacingTextValidation ValidateKanaFriendly(
            string text,
            bool allowEmpty = false)
        {
            if (string.IsNullOrEmpty(text))
            {
                return allowEmpty
                    ? Valid()
                    : Invalid(ChildFacingTextIssue.Empty, -1, -1);
            }

            for (var utf16Index = 0; utf16Index < text.Length;)
            {
                if (!TryReadCodePoint(text, utf16Index, out var codePoint, out var codeUnitCount))
                {
                    return Invalid(ChildFacingTextIssue.InvalidUnicode, utf16Index, text[utf16Index]);
                }

                if (IsKanjiCodePoint(codePoint))
                {
                    return Invalid(ChildFacingTextIssue.Kanji, utf16Index, codePoint);
                }

                if (!IsKanaCodePoint(codePoint) && !IsNeutralCodePoint(codePoint))
                {
                    var issue = IsLetterCodePoint(codePoint)
                        ? ChildFacingTextIssue.NonKanaLetter
                        : ChildFacingTextIssue.UnsupportedCharacter;
                    return Invalid(issue, utf16Index, codePoint);
                }

                utf16Index += codeUnitCount;
            }

            return Valid();
        }

        public static bool ContainsKanji(string text)
        {
            if (string.IsNullOrEmpty(text))
            {
                return false;
            }

            for (var utf16Index = 0; utf16Index < text.Length;)
            {
                if (!TryReadCodePoint(text, utf16Index, out var codePoint, out var codeUnitCount))
                {
                    utf16Index++;
                    continue;
                }

                if (IsKanjiCodePoint(codePoint))
                {
                    return true;
                }

                utf16Index += codeUnitCount;
            }

            return false;
        }

        public static bool IsKanaCodePoint(int codePoint)
        {
            return (codePoint >= 0x3040 && codePoint <= 0x309F)
                || (codePoint >= 0x30A0 && codePoint <= 0x30FF)
                || (codePoint >= 0x31F0 && codePoint <= 0x31FF)
                || (codePoint >= 0xFF65 && codePoint <= 0xFF9F);
        }

        public static bool IsKanjiCodePoint(int codePoint)
        {
            return codePoint == 0x3005
                || codePoint == 0x3007
                || (codePoint >= 0x3400 && codePoint <= 0x4DBF)
                || (codePoint >= 0x4E00 && codePoint <= 0x9FFF)
                || (codePoint >= 0xF900 && codePoint <= 0xFAFF)
                || (codePoint >= 0x20000 && codePoint <= 0x2A6DF)
                || (codePoint >= 0x2A700 && codePoint <= 0x2B73F)
                || (codePoint >= 0x2B740 && codePoint <= 0x2B81F)
                || (codePoint >= 0x2B820 && codePoint <= 0x2CEAF)
                || (codePoint >= 0x2CEB0 && codePoint <= 0x2EBEF)
                || (codePoint >= 0x2F800 && codePoint <= 0x2FA1F)
                || (codePoint >= 0x30000 && codePoint <= 0x323AF);
        }

        private static bool IsNeutralCodePoint(int codePoint)
        {
            if (codePoint == '\r' || codePoint == '\n' || codePoint == '\t')
            {
                return true;
            }

            // Emoji presentation selectors and the zero-width joiner are neutral
            // components of an otherwise symbol-only grapheme.
            if (codePoint == 0x200D
                || (codePoint >= 0xFE00 && codePoint <= 0xFE0F)
                || (codePoint >= 0xE0100 && codePoint <= 0xE01EF))
            {
                return true;
            }

            var category = GetUnicodeCategory(codePoint);
            switch (category)
            {
                case UnicodeCategory.SpaceSeparator:
                case UnicodeCategory.LineSeparator:
                case UnicodeCategory.ParagraphSeparator:
                case UnicodeCategory.DecimalDigitNumber:
                case UnicodeCategory.ConnectorPunctuation:
                case UnicodeCategory.DashPunctuation:
                case UnicodeCategory.OpenPunctuation:
                case UnicodeCategory.ClosePunctuation:
                case UnicodeCategory.InitialQuotePunctuation:
                case UnicodeCategory.FinalQuotePunctuation:
                case UnicodeCategory.OtherPunctuation:
                case UnicodeCategory.MathSymbol:
                case UnicodeCategory.CurrencySymbol:
                case UnicodeCategory.ModifierSymbol:
                case UnicodeCategory.OtherSymbol:
                    return true;
                default:
                    return false;
            }
        }

        private static bool IsLetterCodePoint(int codePoint)
        {
            var category = GetUnicodeCategory(codePoint);
            return category == UnicodeCategory.UppercaseLetter
                || category == UnicodeCategory.LowercaseLetter
                || category == UnicodeCategory.TitlecaseLetter
                || category == UnicodeCategory.ModifierLetter
                || category == UnicodeCategory.OtherLetter
                || category == UnicodeCategory.LetterNumber;
        }

        private static UnicodeCategory GetUnicodeCategory(int codePoint)
        {
            if (codePoint <= char.MaxValue)
            {
                return CharUnicodeInfo.GetUnicodeCategory((char)codePoint);
            }

            var text = char.ConvertFromUtf32(codePoint);
            return CharUnicodeInfo.GetUnicodeCategory(text, 0);
        }

        private static bool TryReadCodePoint(
            string text,
            int utf16Index,
            out int codePoint,
            out int codeUnitCount)
        {
            var first = text[utf16Index];
            if (char.IsHighSurrogate(first))
            {
                if (utf16Index + 1 >= text.Length || !char.IsLowSurrogate(text[utf16Index + 1]))
                {
                    codePoint = first;
                    codeUnitCount = 1;
                    return false;
                }

                codePoint = char.ConvertToUtf32(first, text[utf16Index + 1]);
                codeUnitCount = 2;
                return true;
            }

            if (char.IsLowSurrogate(first))
            {
                codePoint = first;
                codeUnitCount = 1;
                return false;
            }

            codePoint = first;
            codeUnitCount = 1;
            return true;
        }

        private static ChildFacingTextValidation Valid()
        {
            return new ChildFacingTextValidation(true, ChildFacingTextIssue.None, -1, -1);
        }

        private static ChildFacingTextValidation Invalid(
            ChildFacingTextIssue issue,
            int index,
            int codePoint)
        {
            return new ChildFacingTextValidation(false, issue, index, codePoint);
        }
    }
}
