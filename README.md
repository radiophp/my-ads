## Health Metrics

- `health_dependency_status{component="redis"}` — gauge, `1` when the dependency is reachable, `0` when probes fail after all retries.
- `health_dependency_latency_seconds{component="rabbitmq"}` — histogram capturing probe latency (seconds) per component.

These series are available alongside existing Prometheus exports on `/metrics`; wire them into your dashboards to spot flapping services early.

The health endpoint caches negative results for a short window (`HEALTH_FAILURE_CACHE_MS`, default 5000 ms) to avoid hammering dead dependencies. Tune retry/backoff behaviour via `HEALTH_RETRY_ATTEMPTS` and `HEALTH_RETRY_BASE_DELAY_MS` if your environment needs longer pacing.
