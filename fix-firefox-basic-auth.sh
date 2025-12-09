#!/bin/bash

# TradeTrackr - Fix Firefox Basic Auth Dialog Issue
# This script ensures Nginx sends correct headers for Basic Auth

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Fix Firefox Basic Auth Dialog${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/tradetrackr.de"
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo -e "${YELLOW}Step 1: Backup configuration...${NC}"
cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created${NC}"

echo ""
echo -e "${YELLOW}Step 2: Check current auth configuration...${NC}"
grep -A 5 "auth_basic" "$NGINX_CONFIG" || echo "No auth_basic found"

echo ""
echo -e "${YELLOW}Step 3: Ensure auth_basic is in the correct location...${NC}"

# Check if auth_basic is inside location blocks (wrong) or server block (correct)
if grep -q "location.*auth_basic" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}⚠ auth_basic found inside location block, moving to server block...${NC}"
    
    # Remove auth_basic from location blocks
    sed -i '/location/,/^[[:space:]]*}/ { /auth_basic/d; /auth_basic_user_file/d; }' "$NGINX_CONFIG"
    
    # Add auth_basic to server block (after root directive)
    sed -i '/root \/var\/www\/tradetrackr;/a\
\
    # HTTP Basic Authentication\
    auth_basic "Restricted – TradeTrackr";\
    auth_basic_user_file /etc/nginx/.htpasswd;' "$NGINX_CONFIG"
    
    echo -e "${GREEN}✓ Moved auth_basic to server block${NC}"
fi

# Ensure auth_basic is in server block, not in location blocks
# Remove from any location blocks
sed -i '/^[[:space:]]*location/,/^[[:space:]]*}/ { /auth_basic/d; /auth_basic_user_file/d; }' "$NGINX_CONFIG"

# Add to server block if not present
if ! grep -q "auth_basic" "$NGINX_CONFIG"; then
    sed -i '/root \/var\/www\/tradetrackr;/a\
\
    # HTTP Basic Authentication\
    auth_basic "Restricted – TradeTrackr";\
    auth_basic_user_file /etc/nginx/.htpasswd;' "$NGINX_CONFIG"
fi

# Ensure ACME challenge is excluded
if ! grep -q ".well-known/acme-challenge" "$NGINX_CONFIG"; then
    sed -i '/location \//i\
    # Allow ACME challenge without auth\
    location ^~ /.well-known/acme-challenge/ {\
        auth_basic off;\
        root /var/www/tradetrackr;\
    }' "$NGINX_CONFIG"
fi

echo ""
echo -e "${YELLOW}Step 4: Show updated configuration...${NC}"
echo -e "${YELLOW}Server block auth configuration:${NC}"
grep -A 3 "auth_basic" "$NGINX_CONFIG" | head -5

echo ""
echo -e "${YELLOW}Step 5: Test Nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed!${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    cp "$BACKUP_FILE" "$NGINX_CONFIG"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 6: Reload Nginx...${NC}"
if systemctl reload nginx; then
    echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}✗ Failed to reload Nginx${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Fix completed!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps for Firefox:${NC}"
echo "1. Clear Firefox cache: Ctrl+Shift+Delete → Clear cache"
echo "2. Clear saved passwords:"
echo "   - Settings → Privacy & Security → Saved Logins"
echo "   - Remove any entries for tradetrackr.de"
echo "3. Hard refresh: Ctrl+F5"
echo "4. Or use Private Window: Ctrl+Shift+P"
echo ""
echo -e "${YELLOW}Test:${NC}"
echo "curl -I https://tradetrackr.de"
echo "# Should show: WWW-Authenticate: Basic realm=\"Restricted – TradeTrackr\""





