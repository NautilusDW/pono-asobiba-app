using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// A half-submerged float (ウキ) that rides the pinned <see cref="KawaWave"/>
    /// formula at a fixed world-space X. Its target height is smoothed with
    /// <see cref="Mathf.SmoothDamp"/> (rather than snapping straight onto the
    /// wave) so it reads as buoyant, and it tilts to the local wave slope.
    ///
    /// The bobber sprite's pivot is set to its own vertical center by
    /// <see cref="KawaGlintActorsBuilder"/>, so resting the transform exactly
    /// on the waterline already reads as "half submerged" purely from the
    /// pivot placement -- this component never needs a separate submersion
    /// parameter.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintBobber : MonoBehaviour
    {
        // Buoyancy feel: large enough that the float visibly lags the wave
        // (reads as floating, not glued to it) while still small enough to
        // stay clearly synced with the waterline shape at a glance.
        private const float SmoothTime = 0.08f;

        // Converts the wave's dimensionless slope into a small, child-safe
        // tilt: 0.6 scales the raw arctangent-degrees down, and the result is
        // additionally hard-clamped to +/-MaxTiltDegrees below.
        private const float TiltDegreesPerSlopeUnit = 0.6f;
        private const float MaxTiltDegrees = 8f;

        private float _x;
        private float _waterlineY;
        private float _halfHeightWorld;
        private float _y;
        private float _velocity;

        /// <summary>World-space X of the bobber. Fixed for its lifetime (module contract: +1.8).</summary>
        internal float CenterWorldX => _x;

        /// <summary>Current world-space Y of the top edge of the bobber sprite -- the fishing line's endpoint.</summary>
        internal float TopWorldY => _y + _halfHeightWorld;

        /// <summary>
        /// Sets the bobber's fixed rest X, the waterline it rides, and half
        /// of its own rendered world height (used to find the sprite's top
        /// edge for the fishing-line attachment point). Called once by
        /// <see cref="KawaGlintActorsBuilder.Build"/> immediately after this
        /// component is added.
        /// </summary>
        internal void Initialize(float restWorldX, float waterlineWorldY, float halfHeightWorld)
        {
            _x = restWorldX;
            _waterlineY = waterlineWorldY;
            _halfHeightWorld = halfHeightWorld;
            _y = waterlineWorldY;
            _velocity = 0f;
            transform.position = new Vector3(_x, _y, 0f);
        }

        private void Update()
        {
            var time = Time.time;

            // Pinned wave contract -- must stay in sync with the surface
            // band shader's HLSL copy of the identical formula (see the
            // remarks on KawaWave).
            var wave = KawaWave.Height(_x, time);
            var targetY = _waterlineY + wave;
            _y = Mathf.SmoothDamp(_y, targetY, ref _velocity, SmoothTime);

            var slope = KawaWave.Slope(_x, time);
            var tilt = Mathf.Clamp(
                Mathf.Atan(slope) * Mathf.Rad2Deg * TiltDegreesPerSlopeUnit,
                -MaxTiltDegrees,
                MaxTiltDegrees);

            transform.SetPositionAndRotation(new Vector3(_x, _y, 0f), Quaternion.Euler(0f, 0f, tilt));
        }
    }
}
