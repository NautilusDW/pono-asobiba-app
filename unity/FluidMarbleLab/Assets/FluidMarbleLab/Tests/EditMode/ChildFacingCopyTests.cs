using System.Text.RegularExpressions;
using NUnit.Framework;

namespace Pono.FluidMarbleLab.Tests
{
    public sealed class ChildFacingCopyTests
    {
        private static readonly Regex Kanji = new Regex("[\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF]", RegexOptions.Compiled);

        [TestCase("いろみずと ビーだま")]
        [TestCase("ゆびで ながれを つくろう")]
        [TestCase("ぶひんを えらんで うごかそう")]
        [TestCase("つくる")]
        [TestCase("ながす")]
        [TestCase("ビーだま")]
        [TestCase("まわす")]
        [TestCase("リセット")]
        [TestCase("きれい")]
        [TestCase("ふつう")]
        [TestCase("かるい")]
        [TestCase("ゴール 0")]
        public void VisibleCopyContainsNoKanji(string value)
        {
            Assert.That(Kanji.IsMatch(value), Is.False, value);
        }
    }
}
