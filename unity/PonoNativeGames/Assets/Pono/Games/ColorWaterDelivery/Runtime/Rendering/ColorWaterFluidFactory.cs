using UnityEngine;

namespace Pono.ColorWaterDelivery.Rendering
{
    public static class ColorWaterFluidFactory
    {
        public static IColorWaterFluidBackend Create(
            bool forceCpu = false,
            int simulationHeight = 216,
            int pressureIterations = 12)
        {
            if (!forceCpu && ComputeColorWaterFluidBackend.IsSupported())
            {
                var asset = Resources.Load<ComputeShader>(
                    "ColorWaterDelivery/Rendering/ColorWaterFluid");
                if (asset != null)
                {
                    try
                    {
                        return new ComputeColorWaterFluidBackend(
                            asset,
                            simulationHeight,
                            pressureIterations);
                    }
                    catch (System.Exception exception)
                    {
                        Debug.LogWarning(
                            $"ColorWater GPU fluid fallback: {exception.Message}");
                    }
                }
            }

            return new CpuColorWaterFluidBackend();
        }
    }
}
