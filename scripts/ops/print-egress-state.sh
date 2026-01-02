#!/usr/bin/env bash
#
# Print Current Egress Firewall State
# 
# Detects and displays outbound firewall rules from various tools.
# Does NOT make changes - read-only audit script.
#
set -euo pipefail

echo "═══════════════════════════════════════════════════════════"
echo "  TradeTrackr Egress Firewall State Audit"
echo "  Host: $(hostname)"
echo "  Date: $(date -Iseconds)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check UFW
if command -v ufw &> /dev/null; then
  echo "▸ UFW Status:"
  sudo ufw status verbose 2>/dev/null || echo "  (requires sudo)"
  echo ""
else
  echo "▸ UFW: not installed"
  echo ""
fi

# Check iptables OUTPUT chain
if command -v iptables &> /dev/null; then
  echo "▸ iptables OUTPUT chain:"
  sudo iptables -L OUTPUT -n -v 2>/dev/null || echo "  (requires sudo)"
  echo ""
else
  echo "▸ iptables: not installed"
  echo ""
fi

# Check ip6tables OUTPUT chain
if command -v ip6tables &> /dev/null; then
  echo "▸ ip6tables OUTPUT chain:"
  sudo ip6tables -L OUTPUT -n -v 2>/dev/null || echo "  (requires sudo)"
  echo ""
else
  echo "▸ ip6tables: not installed"
  echo ""
fi

# Check nftables
if command -v nft &> /dev/null; then
  echo "▸ nftables rules (output chains):"
  sudo nft list ruleset 2>/dev/null | grep -A 20 'chain output' || echo "  (no output chain or requires sudo)"
  echo ""
else
  echo "▸ nftables: not installed"
  echo ""
fi

# Check Docker
if command -v docker &> /dev/null; then
  echo "▸ Docker networks:"
  docker network ls 2>/dev/null || echo "  (Docker not running or no access)"
  echo ""
fi

# Check listening ports for context
echo "▸ Listening TCP ports:"
ss -tlnp 2>/dev/null | head -20 || netstat -tlnp 2>/dev/null | head -20 || echo "  (ss/netstat not available)"
echo ""

# Summary
echo "═══════════════════════════════════════════════════════════"
echo "  Notes:"
echo "  - App-level egress control: services/ai-gateway/src/utils/safeFetch.ts"
echo "  - Network-level egress: configure via UFW or iptables"
echo "  - See: runbooks/egress-allowlist.md"
echo "═══════════════════════════════════════════════════════════"

