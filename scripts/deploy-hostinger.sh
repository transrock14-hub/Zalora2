#!/usr/bin/env bash
# Sync local Zalora source to Hostinger, then redeploy via hPanel.
#
# Auth: SSH key (Hostinger → SSH Access). Do NOT put passwords in this file.
#
# Usage:
#   ./scripts/deploy-hostinger.sh          # sync only
#   ./scripts/deploy-hostinger.sh --check  # test SSH + show remote path
#
set -euo pipefail

HOST="${ZALORA_SSH_HOST:-88.223.85.38}"
PORT="${ZALORA_SSH_PORT:-65002}"
USER="${ZALORA_SSH_USER:-u611506725}"
REMOTE_DIR="domains/zalora.sbs/public_html/.builds/last-source"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${1:-}" == "--check" ]]; then
  echo "Testing SSH to ${USER}@${HOST}:${PORT} ..."
  ssh "${SSH_OPTS[@]}" -p "$PORT" "${USER}@${HOST}" "echo OK && ls -la ${REMOTE_DIR}/package.json"
  exit 0
fi

echo "==> Building locally (verify before upload) ..."
npm run build

echo "==> Syncing to Hostinger: ${USER}@${HOST}:${REMOTE_DIR}"
rsync -avz --delete \
  -e "ssh ${SSH_OPTS[*]} -p ${PORT}" \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'backupenv/' \
  --exclude 'zalora-deploy.zip' \
  --exclude 'chromewebdata.har' \
  --exclude '.DS_Store' \
  --exclude 'coverage/' \
  --exclude 'public/uploads/*' \
  --exclude '!public/uploads/.gitkeep' \
  ./ "${USER}@${HOST}:${REMOTE_DIR}/"

echo ""
echo "==> Sync complete."
echo ""
echo "Next: Hostinger hPanel → Websites → zalora.sbs → Deployments → Redeploy"
echo "      (Hostinger builds Node.js on their side; SSH shell has no npm/node.)"
echo ""
echo "After redeploy, verify: https://zalora.sbs/api/health"
