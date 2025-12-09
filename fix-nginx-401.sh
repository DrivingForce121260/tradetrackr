#!/bin/bash

# TradeTrackr - Fix 401 Error Script
# This script fixes 401 Unauthorized errors by updating Nginx configuration

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}TradeTrackr - Fix 401 Error${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/tradetrackr"
NGINX_CONFIG_ENABLED="/etc/nginx/sites-enabled/tradetrackr"
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
WEB_ROOT="/var/www/tradetrackr"

echo -e "${YELLOW}Step 1: Backup current configuration...${NC}"
if [ -f "$NGINX_CONFIG" ]; then
    cp "$NGINX_CONFIG" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠ Configuration file not found: $NGINX_CONFIG${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Remove authentication directives...${NC}"
if [ -f "$NGINX_CONFIG" ]; then
    # Remove auth_basic directives
    sed -i '/auth_basic/d' "$NGINX_CONFIG"
    sed -i '/auth_basic_user_file/d' "$NGINX_CONFIG"
    echo -e "${GREEN}✓ Removed auth_basic directives${NC}"
else
    echo -e "${RED}✗ Configuration file not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Ensure proper file permissions...${NC}"
if [ -d "$WEB_ROOT" ]; then
    chown -R www-data:www-data "$WEB_ROOT"
    find "$WEB_ROOT" -type d -exec chmod 755 {} \;
    find "$WEB_ROOT" -type f -exec chmod 644 {} \;
    echo -e "${GREEN}✓ File permissions updated${NC}"
else
    echo -e "${RED}✗ Web root not found: $WEB_ROOT${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Test Nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed!${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    if [ -f "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" "$NGINX_CONFIG"
    fi
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Reload Nginx...${NC}"
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
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the website: curl -I http://tradetrackr.de"
echo "2. Check browser: https://tradetrackr.de"
echo "3. Monitor logs: tail -f /var/log/nginx/tradetrackr-error.log"
echo ""
echo -e "${YELLOW}If you need to restore the backup:${NC}"
echo "sudo cp $BACKUP_FILE $NGINX_CONFIG"
echo "sudo nginx -t && sudo systemctl reload nginx"





