using UnityEngine;

namespace Pono.FluidMarbleLab
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(Rigidbody2D))]
    public sealed class MarbleFlowMotor : MonoBehaviour
    {
        [SerializeField, Min(0f)] private float flowResponse = 2.6f;
        [SerializeField, Min(0.1f)] private float maximumFlowForce = 12f;
        [SerializeField, Min(0.1f)] private float maximumSpeed = 10f;

        private Rigidbody2D body;
        private LabViewport viewport;
        private FluidSimulationController simulation;
        private TrailRenderer trail;
        private Vector2 spawnPosition;

        public Rigidbody2D Body => body;

        public void Configure(LabViewport labViewport, FluidSimulationController fluidSimulation, Vector2 spawn)
        {
            body = GetComponent<Rigidbody2D>();
            viewport = labViewport;
            simulation = fluidSimulation;
            trail = GetComponent<TrailRenderer>();
            spawnPosition = spawn;
        }

        public void SetSpawn(Vector2 position)
        {
            spawnPosition = position;
        }

        public void Recover()
        {
            if (body == null)
            {
                body = GetComponent<Rigidbody2D>();
            }
            if (trail == null)
            {
                trail = GetComponent<TrailRenderer>();
            }
            if (trail != null)
            {
                trail.emitting = false;
                trail.Clear();
            }
            body.position = spawnPosition;
            body.linearVelocity = Vector2.zero;
            body.angularVelocity = 0f;
            transform.position = new Vector3(spawnPosition.x, spawnPosition.y, transform.position.z);
            if (trail != null)
            {
                trail.Clear();
                trail.emitting = true;
            }
        }

        private void FixedUpdate()
        {
            if (body == null || !body.simulated || viewport == null || simulation?.CpuField == null)
            {
                return;
            }

            var position = body.position;
            if (!IsFinite(position) || !IsFinite(body.linearVelocity) || !viewport.Contains(position, 1.5f))
            {
                Recover();
                return;
            }

            var uv = viewport.WorldToUv(position);
            var uvFlow = simulation.CpuField.SampleVelocity(uv);
            var desiredVelocity = viewport.UvVelocityToWorld(uvFlow) * 0.72f;
            var relativeVelocity = desiredVelocity - body.linearVelocity;
            var force = Vector2.ClampMagnitude(relativeVelocity * flowResponse, maximumFlowForce);
            body.AddForce(force, ForceMode2D.Force);

            if (body.linearVelocity.sqrMagnitude > maximumSpeed * maximumSpeed)
            {
                body.linearVelocity = body.linearVelocity.normalized * maximumSpeed;
            }
        }

        private static bool IsFinite(Vector2 value)
        {
            return float.IsFinite(value.x) && float.IsFinite(value.y);
        }
    }
}
