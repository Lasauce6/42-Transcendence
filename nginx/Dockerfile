ARG CRS_TAG=nginx
FROM docker.io/owasp/modsecurity-crs:${CRS_TAG}

USER root
COPY --chown=nginx:nginx templates/ /etc/nginx/templates/
COPY --chown=nginx:nginx rules/ /etc/modsecurity.d/owasp-crs/rules/
USER nginx
