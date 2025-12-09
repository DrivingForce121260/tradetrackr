#!/bin/bash

# TradeTrackr - Setup Password Protection
# This script sets up HTTP Basic Authentication for the web portal

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}TradeTrackr - Password Protection Setup${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/tradetrackr.de"
HTPASSWD_FILE="/etc/nginx/.htpasswd"

echo -e "${YELLOW}Step 1: Install htpasswd utility (if not installed)...${NC}"
if ! command -v htpasswd &> /dev/null; then
    echo "Installing apache2-utils..."
    apt-get update -qq
    apt-get install -y apache2-utils
    echo -e "${GREEN}✓ htpasswd installed${NC}"
else
    echo -e "${GREEN}✓ htpasswd already installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Create or update password file...${NC}"
if [ -f "$HTPASSWD_FILE" ]; then
    echo -e "${BLUE}Password file already exists: $HTPASSWD_FILE${NC}"
    echo -e "${YELLOW}Do you want to:${NC}"
    echo "1) Add a new user"
    echo "2) Change password for existing user"
    echo "3) Keep existing users and add new one"
    read -p "Enter choice (1/2/3): " choice
    
    case $choice in
        1)
            read -p "Enter username: " username
            htpasswd "$HTPASSWD_FILE" "$username"
            ;;
        2)
            read -p "Enter username: " username
            htpasswd "$HTPASSWD_FILE" "$username"
            ;;
        3)
            read -p "Enter new username: " username
            htpasswd "$HTPASSWD_FILE" "$username"
            ;;
        *)
            echo -e "${YELLOW}Keeping existing users${NC}"
            ;;
    esac
else
    echo -e "${BLUE}Creating new password file...${NC}"
    read -p "Enter username: " username
    htpasswd -c "$HTPASSWD_FILE" "$username"
    echo -e "${GREEN}✓ Password file created${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Set proper permissions on password file...${NC}"
chown root:www-data "$HTPASSWD_FILE"
chmod 640 "$HTPASSWD_FILE"
echo -e "${GREEN}✓ Permissions set${NC}"

echo ""
echo -e "${YELLOW}Step 4: Backup Nginx configuration...${NC}"
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"

echo ""
echo -e "${YELLOW}Step 5: Add authentication to Nginx configuration...${NC}"

# Check if SSL block exists
if grep -q "listen 443" "$NGINX_CONFIG"; then
    echo "SSL block found, adding auth to SSL block..."
    
    # Add auth to SSL server block (443)
    # Find the server block for 443 and add auth after the root directive
    if ! grep -q "auth_basic" "$NGINX_CONFIG"; then
        # Add auth directives after root/index in SSL block
        sed -i '/listen 443/,/^}/ {
            /root \/var\/www\/tradetrackr;/a\
    \
    # Password protection\
    auth_basic "Restricted – TradeTrackr";\
    auth_basic_user_file /etc/nginx/.htpasswd;
        }' "$NGINX_CONFIG"
        
        # Also add to HTTP block (80) if it exists
        sed -i '/listen 80/,/^}/ {
            /root \/var\/www\/tradetrackr;/a\
    \
    # Password protection\
    auth_basic "Restricted – TradeTrackr";\
    auth_basic_user_file /etc/nginx/.htpasswd;
        }' "$NGINX_CONFIG"
        
        echo -e "${GREEN}✓ Authentication added to configuration${NC}"
    else
        echo -e "${YELLOW}⚠ Authentication already exists in configuration${NC}"
    fi
else
    echo "No SSL block found, adding auth to HTTP block..."
    
    # Add auth to HTTP server block (80)
    if ! grep -q "auth_basic" "$NGINX_CONFIG"; then
        sed -i '/root \/var\/www\/tradetrackr;/a\
\
    # Password protection\
    auth_basic "Restricted – TradeTrackr";\
    auth_basic_user_file /etc/nginx/.htpasswd;' "$NGINX_CONFIG"
        
        echo -e "${GREEN}✓ Authentication added to configuration${NC}"
    else
        echo -e "${YELLOW}⚠ Authentication already exists in configuration${NC}"
    fi
fi

# Allow access to ACME challenge path (for Let's Encrypt)
if grep -q "listen 443" "$NGINX_CONFIG"; then
    if ! grep -q ".well-known/acme-challenge" "$NGINX_CONFIG"; then
        # Add ACME challenge location before the main location block
        sed -i '/location \//i\
    # Allow ACME challenge without auth (for Let'\''s Encrypt)\
    location ^~ /.well-known/acme-challenge/ {\
        auth_basic off;\
        root /var/www/tradetrackr;\
    }' "$NGINX_CONFIG"
        
        echo -e "${GREEN}✓ ACME challenge path configured${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}Step 6: Test Nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed!${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    cp "$BACKUP_FILE" "$NGINX_CONFIG"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 7: Reload Nginx...${NC}"
if systemctl reload nginx; then
    echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}✗ Failed to reload Nginx${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Password protection setup completed!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo "  Password file: $HTPASSWD_FILE"
echo "  Users in file:"
cat "$HTPASSWD_FILE" | cut -d: -f1 | sed 's/^/    - /'
echo ""
echo -e "${YELLOW}To add more users later:${NC}"
echo "  sudo htpasswd $HTPASSWD_FILE username"
echo ""
echo -e "${YELLOW}To remove a user:${NC}"
echo "  sudo htpasswd -D $HTPASSWD_FILE username"
echo ""
echo -e "${YELLOW}Test the protection:${NC}"
echo "  curl -I https://tradetrackr.de"
echo "  (Should return 401 Unauthorized)"
echo ""
echo -e "${YELLOW}Access with credentials:${NC}"
echo "  curl -u username:password https://tradetrackr.de"





