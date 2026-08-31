# Build stage: install, build the static site, and run the full invariant
# suite. A broken invariant fails the image build, so nothing unverified ships.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm test

# Serve stage: Caddy serving dist/ on $PORT (clean URLs, gzip, cache headers,
# branded 404). Same proven pattern as PA-Site.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
