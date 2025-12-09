#!/bin/bash

# TradeTrackr - Fix SSL 401 Error Script
# This script fixes 401 Unauthorized errors in SSL/HTTPS configuration

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}TradeTrackr - Fix SSL 401 Error${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/tradetrackr"
BACKUP_FILE="${NGINX_CONFIG}.backup.ssl.$(date +%Y%m%d_%H%M%S)"

echo -e "${YELLOW}Step 1: Backup current configuration...${NC}"
if [ -f "$NGINX_CONFIG" ]; then
    cp "$NGINX_CONFIG" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}✗ Configuration file not found: $NGINX_CONFIG${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Show current configuration...${NC}"
echo -e "${YELLOW}Full configuration:${NC}"
cat "$NGINX_CONFIG"
echo ""

echo -e "${YELLOW}Step 3: Search for all authentication directives...${NC}"
grep -n "auth\|401\|WWW-Authenticate" "$NGINX_CONFIG" || echo "No auth directives found in main config"

echo ""
echo -e "${YELLOW}Step 4: Check for separate SSL configuration files...${NC}"
find /etc/nginx -name "*.conf" -type f -exec grep -l "tradetrackr\|443" {} \; 2>/dev/null | while read file; do
    echo "Found: $file"
    grep -n "auth\|401" "$file" || echo "  No auth directives"
done

echo ""
echo -e "${YELLOW}Step 5: Check main nginx.conf for includes...${NC}"
grep -n "include\|auth" /etc/nginx/nginx.conf | head -20

echo ""
echo -e "${YELLOW}Step 6: Check sites-enabled...${NC}"
ls -la /etc/nginx/sites-enabled/
echo ""
for file in /etc/nginx/sites-enabled/*; do
    if [ -f "$file" ]; then
        echo "Checking: $file"
        grep -n "auth\|tradetrackr\|443" "$file" || echo "  No matches"
    fi
done

echo ""
echo -e "${YELLOW}Step 7: Remove ALL auth directives from SSL block...${NC}"
# Remove auth_basic from SSL block (443)
sed -i '/listen 443/,/^}/ { /auth_basic/d; /auth_basic_user_file/d; }' "$NGINX_CONFIG"

# Also remove from entire file as fallback
sed -i '/auth_basic/d' "$NGINX_CONFIG"
sed -i '/auth_basic_user_file/d' "$NGINX_CONFIG"

echo -e "${GREEN}✓ Removed auth directives${NC}"

echo ""
echo -e "${YELLOW}Step 8: Test Nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed!${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    cp "$BACKUP_FILE" "$NGINX_CONFIG"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 9: Reload Nginx...${NC}"
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
echo -e "${YELLOW}Test HTTPS now:${NC}"
echo "curl -I https://tradetrackr.de"
echo ""
echo -e "${YELLOW}If still 401, check:${NC}"
echo "1. Other nginx config files: find /etc/nginx -name '*.conf' -exec grep -l 'auth' {} \\;"
echo "2. Main config includes: grep -r 'include' /etc/nginx/nginx.conf"
echo "3. All enabled sites: ls -la /etc/nginx/sites-enabled/"





