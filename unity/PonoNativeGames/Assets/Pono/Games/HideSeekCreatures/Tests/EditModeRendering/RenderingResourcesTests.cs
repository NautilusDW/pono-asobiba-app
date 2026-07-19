using NUnit.Framework;
using UnityEngine;

namespace Pono.HideSeek.Tests.EditModeRendering
{
    public sealed class RenderingResourcesTests
    {
        private const string ShaderResourcePath = "HideSeekCreatures/Rendering/InkComposite";
        private const string ComputeResourcePath = "HideSeekCreatures/Rendering/FluidInk";

        [Test]
        public void InkCompositeShader_IsLoadableFromRuntimeResourcesPath()
        {
            var shader = Resources.Load<Shader>(ShaderResourcePath);

            Assert.That(shader, Is.Not.Null, ShaderResourcePath);
            Assert.That(shader.name, Is.EqualTo("Pono/HideSeekCreatures/InkComposite"));
            var foundByShaderName = Shader.Find("Pono/HideSeekCreatures/InkComposite");
            Assert.That(foundByShaderName, Is.Not.Null);
            Assert.That(foundByShaderName.name, Is.EqualTo(shader.name));
        }

        [Test]
        public void FluidInkCompute_IsLoadableAndContainsEveryRuntimeKernel()
        {
            var compute = Resources.Load<ComputeShader>(ComputeResourcePath);

            Assert.That(compute, Is.Not.Null, ComputeResourcePath);
            var expectedKernels = new[]
            {
                "Clear",
                "Splat",
                "Advect",
                "Curl",
                "ApplyVorticity",
                "Divergence",
                "PressureJacobi",
                "Project"
            };

            for (var index = 0; index < expectedKernels.Length; index++)
            {
                Assert.That(
                    compute.HasKernel(expectedKernels[index]),
                    Is.True,
                    $"Missing compute kernel: {expectedKernels[index]}");
            }
        }
    }
}
