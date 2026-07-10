using UnityEngine;

namespace Pono.FluidMarbleLab
{
    /// <summary>
    /// Owns every conversion between screen space, the 2D world and fluid UVs.
    /// Keeping this in one place avoids input/physics drift after rotation.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class LabViewport : MonoBehaviour
    {
        [SerializeField] private Camera worldCamera;
        [SerializeField, Min(1f)] private float verticalWorldSize = 10f;
        [SerializeField, Min(0f)] private float horizontalPadding = 0.2f;
        [SerializeField, Min(0f)] private float verticalPadding = 0.25f;
        [SerializeField, Min(0f)] private float gameplayBottomInset = 1.65f;
        [SerializeField, Min(0f)] private float gameplayTopInset = 1.6f;

        private Rect worldRect;
        private Rect gameplayRect;
        private int cachedScreenWidth;
        private int cachedScreenHeight;

        public Camera WorldCamera => worldCamera;
        public Rect WorldRect => worldRect;
        public Rect GameplayRect => gameplayRect;
        public Vector2 WorldSize => worldRect.size;

        public void Configure(Camera camera, float worldHeight = 10f)
        {
            worldCamera = camera;
            verticalWorldSize = Mathf.Max(1f, worldHeight);
            Refresh(true);
        }

        private void Awake()
        {
            if (worldCamera == null)
            {
                worldCamera = Camera.main;
            }

            Refresh(true);
        }

        private void LateUpdate()
        {
            Refresh(false);
        }

        public void Refresh(bool force)
        {
            if (worldCamera == null || Screen.width <= 0 || Screen.height <= 0)
            {
                return;
            }

            if (!force && cachedScreenWidth == Screen.width && cachedScreenHeight == Screen.height)
            {
                return;
            }

            cachedScreenWidth = Screen.width;
            cachedScreenHeight = Screen.height;

            worldCamera.orthographic = true;
            worldCamera.orthographicSize = verticalWorldSize * 0.5f;

            var height = verticalWorldSize - verticalPadding * 2f;
            var width = verticalWorldSize * worldCamera.aspect - horizontalPadding * 2f;
            var center = (Vector2)worldCamera.transform.position;
            worldRect = new Rect(
                center.x - width * 0.5f,
                center.y - height * 0.5f,
                Mathf.Max(1f, width),
                Mathf.Max(1f, height));
            var gameplayHeight = Mathf.Max(1f, worldRect.height - gameplayBottomInset - gameplayTopInset);
            gameplayRect = new Rect(
                worldRect.xMin,
                worldRect.yMin + gameplayBottomInset,
                worldRect.width,
                gameplayHeight);
        }

        public Vector2 ScreenToWorld(Vector2 screenPosition)
        {
            if (worldCamera == null)
            {
                return Vector2.zero;
            }

            var point = worldCamera.ScreenToWorldPoint(new Vector3(screenPosition.x, screenPosition.y, -worldCamera.transform.position.z));
            return new Vector2(point.x, point.y);
        }

        public Vector2 ScreenToUv(Vector2 screenPosition)
        {
            return WorldToUv(ScreenToWorld(screenPosition));
        }

        public Vector2 WorldToUv(Vector2 worldPosition)
        {
            if (worldRect.width <= Mathf.Epsilon || worldRect.height <= Mathf.Epsilon)
            {
                return Vector2.zero;
            }

            return new Vector2(
                Mathf.InverseLerp(worldRect.xMin, worldRect.xMax, worldPosition.x),
                Mathf.InverseLerp(worldRect.yMin, worldRect.yMax, worldPosition.y));
        }

        public Vector2 UvToWorld(Vector2 uv)
        {
            return new Vector2(
                Mathf.Lerp(worldRect.xMin, worldRect.xMax, uv.x),
                Mathf.Lerp(worldRect.yMin, worldRect.yMax, uv.y));
        }

        public Vector2 GameplayUvToWorld(Vector2 uv)
        {
            return new Vector2(
                Mathf.Lerp(gameplayRect.xMin, gameplayRect.xMax, uv.x),
                Mathf.Lerp(gameplayRect.yMin, gameplayRect.yMax, uv.y));
        }

        public Vector2 UvVelocityToWorld(Vector2 uvVelocity)
        {
            return Vector2.Scale(uvVelocity, worldRect.size);
        }

        public bool Contains(Vector2 worldPosition, float margin = 0f)
        {
            return worldPosition.x >= worldRect.xMin - margin
                && worldPosition.x <= worldRect.xMax + margin
                && worldPosition.y >= worldRect.yMin - margin
                && worldPosition.y <= worldRect.yMax + margin;
        }
    }
}
