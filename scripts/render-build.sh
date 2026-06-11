#!/usr/bin/env sh
set -eu

if [ -z "${API_URL:-}" ]; then
  echo "ERROR: Definí API_URL (ej: https://pos-backend.onrender.com/api)"
  exit 1
fi

cat > src/environments/environment.prod.ts <<EOF
export const environment = {
  production: true,
  apiUrl: '${API_URL}'
};
EOF

echo "Building frontend with apiUrl=${API_URL}"
npm ci
npm run build
