using NUnit.Framework;
using Pono.HideSeek.Core;

namespace Pono.HideSeek.Tests.EditMode
{
    public sealed class ChildFacingTextValidatorTests
    {
        [TestCase("いきものを みつけよう！")]
        [TestCase("ポノと あそぼう")]
        [TestCase("あと 3びき")]
        [TestCase("キラキラ〜☆")]
        [TestCase("ﾎﾟﾉ と いっしょ")]
        [TestCase("みつけた！ 🎉")]
        public void KanaFriendlyCopy_IsAccepted(string text)
        {
            Assert.That(ChildFacingTextValidator.IsKanaFriendly(text), Is.True);
        }

        [TestCase("森で あそぼう")]
        [TestCase("動物を みつけよう")]
        [TestCase("あと 三びき")]
        [TestCase("くり返す")]
        public void KanjiCopy_IsRejected(string text)
        {
            var result = ChildFacingTextValidator.ValidateKanaFriendly(text);

            Assert.That(result.IsValid, Is.False);
            Assert.That(result.Issue, Is.EqualTo(ChildFacingTextIssue.Kanji));
            Assert.That(ChildFacingTextValidator.ContainsKanji(text), Is.True);
        }

        [Test]
        public void SupplementaryPlaneKanji_IsDetectedWithCorrectUtf16Index()
        {
            const string text = "ぽの\U00020BB7";

            var result = ChildFacingTextValidator.ValidateKanaFriendly(text);

            Assert.That(result.IsValid, Is.False);
            Assert.That(result.Issue, Is.EqualTo(ChildFacingTextIssue.Kanji));
            Assert.That(result.InvalidUtf16Index, Is.EqualTo(2));
            Assert.That(result.InvalidCodePoint, Is.EqualTo(0x20BB7));
            Assert.That(ChildFacingTextValidator.ContainsKanji(text), Is.True);
        }

        [TestCase("PONO")]
        [TestCase("hello ポノ")]
        [TestCase("안녕")]
        public void NonKanaLetters_AreRejected(string text)
        {
            var result = ChildFacingTextValidator.ValidateKanaFriendly(text);

            Assert.That(result.IsValid, Is.False);
            Assert.That(result.Issue, Is.EqualTo(ChildFacingTextIssue.NonKanaLetter));
            Assert.That(ChildFacingTextValidator.ContainsKanji(text), Is.False);
        }

        [Test]
        public void EmptyText_RequiresExplicitAllowance()
        {
            Assert.That(ChildFacingTextValidator.IsKanaFriendly(null), Is.False);
            Assert.That(ChildFacingTextValidator.IsKanaFriendly(string.Empty), Is.False);
            Assert.That(ChildFacingTextValidator.IsKanaFriendly(string.Empty, allowEmpty: true), Is.True);
        }

        [Test]
        public void UnpairedSurrogate_IsReportedAsInvalidUnicode()
        {
            var text = new string(new[] { '\uD800' });

            var result = ChildFacingTextValidator.ValidateKanaFriendly(text);

            Assert.That(result.IsValid, Is.False);
            Assert.That(result.Issue, Is.EqualTo(ChildFacingTextIssue.InvalidUnicode));
            Assert.That(result.InvalidUtf16Index, Is.Zero);
        }

        [Test]
        public void KanaAndKanjiCodePointHelpers_CoverJapaneseSpecialCases()
        {
            Assert.That(ChildFacingTextValidator.IsKanaCodePoint('あ'), Is.True);
            Assert.That(ChildFacingTextValidator.IsKanaCodePoint('ヲ'), Is.True);
            Assert.That(ChildFacingTextValidator.IsKanaCodePoint('ー'), Is.True);
            Assert.That(ChildFacingTextValidator.IsKanjiCodePoint('森'), Is.True);
            Assert.That(ChildFacingTextValidator.IsKanjiCodePoint('々'), Is.True);
            Assert.That(ChildFacingTextValidator.IsKanjiCodePoint(0x20BB7), Is.True);
        }
    }
}
