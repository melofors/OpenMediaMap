#!/usr/bin/env bash
set -euo pipefail
HOST="root@64.227.9.223"
REMOTE="/var/www/openmediamap.com/html"

rsync -az --delete \
  --exclude 'node_modules/' \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude '*.tar.gz' \
  server/ "$HOST:$REMOTE/server/"

ssh "$HOST" "export NVM_DIR=/root/.nvm && [ -s \$NVM_DIR/nvm.sh ] && . \$NVM_DIR/nvm.sh && cd $REMOTE/server && npm install --omit=dev && pm2 restart ecosystem.config.js --env production --update-env && pm2 save && pm2 status"
