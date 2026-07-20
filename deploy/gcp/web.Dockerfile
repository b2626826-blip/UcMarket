FROM node:24.17.0-alpine3.23 AS build

WORKDIR /workspace
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ARG FIREBASE_WEB_API
ARG FIREBASE_WEB_DOMAIN
ARG FIREBASE_WEB_PROJECT
ARG FIREBASE_WEB_APP
RUN VITE_FIREBASE_API_KEY="${FIREBASE_WEB_API}" \
    VITE_FIREBASE_AUTH_DOMAIN="${FIREBASE_WEB_DOMAIN}" \
    VITE_FIREBASE_PROJECT_ID="${FIREBASE_WEB_PROJECT}" \
    VITE_FIREBASE_APP_ID="${FIREBASE_WEB_APP}" \
    npm run build

FROM caddy:2.11.4-alpine
COPY --from=build /workspace/dist /srv
