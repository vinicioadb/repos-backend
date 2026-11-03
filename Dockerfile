FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node app.js server.js ./
COPY --chown=node:node data ./data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/healthz >/dev/null || exit 1

CMD ["node", "server.js"]
