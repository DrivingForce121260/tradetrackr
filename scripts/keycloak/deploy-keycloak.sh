#!/bin/bash
# =============================================================================
# Deploy Keycloak to Production VPS
# =============================================================================
# This script deploys Keycloak with PostgreSQL on the IONOS VPS.
# Run this on the PROD VPS (85.214.6.74) as user myvps.
#
# Prerequisites:
#   - Docker and docker compose installed
#   - User in docker group
#   - sudo access for nginx operations
#
# Usage:
#   ./deploy-keycloak.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYCLOAK_DIR="/opt/keycloak"
DOMAIN="auth.tradetrackr.de"

echo "=== Keycloak Deployment Script ==="
echo ""

# Check Docker
if ! docker --version &>/dev/null; then
    echo "ERROR: Docker not installed. Please install Docker first:"
    echo "  sudo apt update && sudo apt install -y docker.io docker-compose-v2"
    echo "  sudo usermod -aG docker \$USER"
    echo "  # Then log out and back in"
    exit 1
fi

# Check if user can run docker without sudo
if ! docker ps &>/dev/null; then
    echo "ERROR: Cannot run docker without sudo. Please add user to docker group:"
    echo "  sudo usermod -aG docker \$USER"
    echo "  # Then log out and back in"
    exit 1
fi

echo "✅ Docker available"

# Generate passwords if not set
if [ -z "${KC_ADMIN_PASSWORD:-}" ]; then
    KC_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    echo "Generated KC_ADMIN_PASSWORD"
fi

if [ -z "${KC_DB_PASSWORD:-}" ]; then
    KC_DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    echo "Generated KC_DB_PASSWORD"
fi

# Create Keycloak directory
echo ""
echo "=== Creating Keycloak directory ==="
sudo mkdir -p "$KEYCLOAK_DIR"
sudo chown "$USER:$USER" "$KEYCLOAK_DIR"

# Copy files
echo "=== Copying configuration files ==="
cp "$SCRIPT_DIR/../../infra/keycloak/docker-compose.yml" "$KEYCLOAK_DIR/"
cp "$SCRIPT_DIR/../../infra/keycloak/realm-tradetrackr.json" "$KEYCLOAK_DIR/"

# Create .env file
echo "=== Creating .env file ==="
cat > "$KEYCLOAK_DIR/.env" << EOF
# Keycloak Configuration
KC_ADMIN_USER=admin
KC_ADMIN_PASSWORD=${KC_ADMIN_PASSWORD}
KC_DB_USER=keycloak
KC_DB_PASSWORD=${KC_DB_PASSWORD}
KC_DB_DATABASE=keycloak
KC_HOSTNAME=${DOMAIN}
KC_LOG_LEVEL=info
DOCKER_NETWORK=web
EOF

chmod 600 "$KEYCLOAK_DIR/.env"
echo "✅ .env file created (permissions 600)"

# Create docker network if not exists
echo ""
echo "=== Creating Docker network ==="
docker network create web 2>/dev/null || echo "Network 'web' already exists"

# Start Keycloak
echo ""
echo "=== Starting Keycloak ==="
cd "$KEYCLOAK_DIR"
docker compose up -d

# Wait for Keycloak to be ready
echo ""
echo "=== Waiting for Keycloak to start (this may take 1-2 minutes) ==="
for i in {1..60}; do
    if curl -sf http://127.0.0.1:8080/health/ready &>/dev/null; then
        echo "✅ Keycloak is ready!"
        break
    fi
    echo -n "."
    sleep 2
done

# Check if Keycloak is running
if ! curl -sf http://127.0.0.1:8080/health/ready &>/dev/null; then
    echo ""
    echo "WARNING: Keycloak may not be fully ready yet. Check with:"
    echo "  docker logs tradetrackr-keycloak"
fi

# Install nginx config
echo ""
echo "=== Installing nginx configuration ==="
if [ -f "$SCRIPT_DIR/../../infra/keycloak/nginx-auth.tradetrackr.de.conf" ]; then
    # Copy HTTP-only version first (for certbot)
    sudo tee /etc/nginx/sites-available/auth.tradetrackr.de.conf > /dev/null << 'NGINX_HTTP'
# Temporary HTTP-only config for ACME challenge
server {
    listen 85.214.6.74:80;
    listen [::]:80;
    server_name auth.tradetrackr.de;

    location ^~ /.well-known/acme-challenge/ {
        auth_basic off;
        allow all;
        root /var/www/letsencrypt;
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
NGINX_HTTP

    sudo ln -sf /etc/nginx/sites-available/auth.tradetrackr.de.conf /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ nginx HTTP config installed"
else
    echo "WARNING: nginx config not found"
fi

# Get SSL certificate
echo ""
echo "=== Obtaining SSL certificate ==="
sudo mkdir -p /var/www/letsencrypt/.well-known/acme-challenge
sudo certbot certonly --webroot -w /var/www/letsencrypt -d "$DOMAIN" \
    --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring || {
    echo "Certbot failed. You may need to run manually:"
    echo "  sudo certbot certonly --webroot -w /var/www/letsencrypt -d $DOMAIN"
}

# Install full nginx config with SSL
echo ""
echo "=== Installing full nginx config with SSL ==="
sudo cp "$SCRIPT_DIR/../../infra/keycloak/nginx-auth.tradetrackr.de.conf" /etc/nginx/sites-available/auth.tradetrackr.de.conf
sudo nginx -t && sudo systemctl reload nginx
echo "✅ nginx HTTPS config installed"

# Final verification
echo ""
echo "=== Verification ==="
echo ""

echo "Testing OIDC discovery endpoint..."
if curl -sf "https://$DOMAIN/realms/tradetrackr/.well-known/openid-configuration" | head -c 100; then
    echo ""
    echo "✅ OIDC discovery working!"
else
    echo "⚠️  OIDC discovery not yet available. Wait a moment and check manually."
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Keycloak Admin Console: https://$DOMAIN/admin"
echo "Username: admin"
echo "Password: (saved in $KEYCLOAK_DIR/.env)"
echo ""
echo "IMPORTANT: Save these credentials securely!"
echo ""
echo "To view credentials:"
echo "  cat $KEYCLOAK_DIR/.env"
echo ""
echo "To check Keycloak logs:"
echo "  docker logs tradetrackr-keycloak"
echo ""

