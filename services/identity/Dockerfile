# Custom Keycloak Dockerfile for Link Wars
FROM quay.io/keycloak/keycloak:26.0.0 AS base

# Use a specific healthcheck if needed
# HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
#   CMD curl -f http://localhost:8080/health/live || exit 1

FROM base AS development
# Enable health and metrics in dev
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev"]

FROM base AS production
# Build-time optimizations for production
# RUN /opt/keycloak/bin/kc.sh build
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start"]
