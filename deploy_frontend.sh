#!/usr/bin/env bash
set -euo pipefail

HOST="root@64.227.9.223"
REMOTE="/var/www/openmediamap.com/html"

ssh "$HOST" "mkdir -p /root/omm_client_backup && cp -a $REMOTE/client /root/omm_client_backup/client_$(date +%F_%H%M%S) || true"

rsync -az --delete \
  --exclude 'node_modules/' \
  --exclude '.git/' \
  --exclude '*.tar.gz' \
  client/ "$HOST:$REMOTE/client/"
