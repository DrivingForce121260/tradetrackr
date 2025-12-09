#!/bin/bash

# TradeTrackr - Fix 401 Error for tradetrackr.de
# This script fixes 401 Unauthorized errors in the correct config file

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}TradeTrackr - Fix 401 Error (tradetrackr.de)${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/tradetrackr.de"
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo -e "${YELLOW}Step 1: Backup current configuration...${NC}"
if [ -f "$NGINX_CONFIG" ]; then
    cp "$NGINX_CONFIG" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}✗ Configuration file not found: $NGINX_CONFIG${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Show current auth directives...${NC}"
grep -n "auth_basic" "$NGINX_CONFIG" || echo "No auth_basic found"

echo ""
echo -e "${YELLOW}Step 3: Remove authentication directives...${NC}"
# Remove auth_basic lines
sed -i '/auth_basic/d' "$NGINX_CONFIG"
sed -i '/auth_basic_user_file/d' "$NGINX_CONFIG"

# Also remove the comment line if it exists
sed -i '/# Basic auth for staging/d' "$NGINX_CONFIG"
sed -i '/# Allow ACME path without auth/d' "$NGINX_CONFIG"
sed -i '/location.*\.well-known.*acme-challenge.*auth_basic off/d' "$NGINX_CONFIG"

echo -e "${GREEN}✓ Removed auth directives${NC}"

echo ""
echo -e "${YELLOW}Step 4: Show updated configuration...${NC}"
echo -e "${YELLOW}Checking for remaining auth directives:${NC}"
grep -n "auth" "$NGINX_CONFIG" || echo "✓ No auth directives remaining"

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
echo -e "${GREEN}Fix completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}Test HTTPS now:${NC}"
echo "curl -I https://tradetrackr.de"
echo ""
echo -e "${YELLOW}Expected: HTTP/2 200 (not 401)${NC}"





