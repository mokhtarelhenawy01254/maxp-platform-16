#!/bin/bash
set -euo pipefail

# ============================================================
# Fix SSH Firewall for GitHub Actions Deployment
# ============================================================
# This script should be run ON THE SERVER via:
#   Hostinger hPanel → Terminal / VPS Console
# or via any existing SSH session.
#
# It detects the active firewall and whitelists GitHub Actions
# runner IP ranges so that CI/CD deployment can connect.
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_err()   { echo -e "${RED}[ERR]${NC}   $1"; }

SSH_PORT="${SSH_PORT:-22}"
GITHUB_META_URL="https://api.github.com/meta"

echo ""
echo "============================================================"
echo " 🔧 SSH Firewall Fix for GitHub Actions"
echo "============================================================"
echo ""

# --- Detect SSH port from sshd_config ---
detected_port=$(grep -E "^Port " /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}' || echo "")
SSH_PORT="${detected_port:-$SSH_PORT}"
log_info "SSH port: ${SSH_PORT}"

# --- 1. Check current firewall state ---
log_info "Checking current firewall configuration..."

FIREWALL_TYPE="none"
if command -v ufw &>/dev/null; then
    FIREWALL_TYPE="ufw"
    log_ok "Detected: UFW (Uncomplicated Firewall)"
elif command -v firewall-cmd &>/dev/null; then
    FIREWALL_TYPE="firewalld"
    log_ok "Detected: firewalld"
elif command -v iptables &>/dev/null; then
    FIREWALL_TYPE="iptables"
    log_info "Detected: iptables (legacy)"
else
    log_info "No active firewall detected on the server."
    log_info "The block may be at the Hostinger firewall (hPanel → Firewall)."
fi

# --- 2. Check if SSH is already listening ---
if ss -tlnp | grep -q ":${SSH_PORT} "; then
    log_ok "SSH is listening on port ${SSH_PORT}"
else
    log_err "SSH is NOT listening on port ${SSH_PORT}!"
    log_info "Check: sudo systemctl status ssh"
    log_info "Start: sudo systemctl start ssh"
fi

# --- 3. Check Hostinger Cloud Firewall via API hint ---
HOSTINGER_IP="$(curl -s ifconfig.me 2>/dev/null || echo 'unknown')"
log_info "Server public IP: ${HOSTINGER_IP}"

if echo "${HOSTINGER_IP}" | grep -q "^0\.\|^10\.\|^127\.\|^172\.1[6-9]\|^172\.2[0-9]\|^172\.3[01]\|^192\.168"; then
    log_info "Server appears to be behind NAT. Firewall is likely at the host/cloud level."
    log_info "Go to Hostinger hPanel → VPS → Firewall → add rule:"
    log_info "  - Port: ${SSH_PORT}/TCP"
    log_info "  - Source: 0.0.0.0/0 (or GitHub IP ranges)"
fi

# --- 4. Fetch GitHub Actions IP ranges ---
log_info "Fetching GitHub Actions IP ranges from ${GITHUB_META_URL}..."

GITHUB_ACTIONS_IPS=$(curl -sf "${GITHUB_META_URL}" 2>/dev/null | python3 -c "
import json,sys
try:
    data = json.load(sys.stdin)
    for key in ['actions', 'hooks', 'actions_macos', 'packages']:
        ips = data.get(key, [])
        for cidr in ips:
            print(cidr)
except: pass
" 2>/dev/null || echo "")

if [ -z "${GITHUB_ACTIONS_IPS}" ]; then
    log_warn "Could not fetch GitHub IP ranges (curl failed or no Python)."
    log_info "Manual list: https://api.github.com/meta"
    log_info "Using fallback common GitHub runner ranges..."
    GITHUB_ACTIONS_IPS="
140.82.112.0/20
143.55.64.0/20
192.30.252.0/22
185.199.108.0/22
13.48.0.0/16
16.170.0.0/15
"

fi

COUNT=$(echo "${GITHUB_ACTIONS_IPS}" | grep -c '/' || true)
log_info "Found ${COUNT} GitHub IP ranges to whitelist."

# --- 5. Apply firewall rules ---
echo ""
log_info "Applying firewall rules..."

RULE_ADDED=0

case "${FIREWALL_TYPE}" in
    ufw)
        if ! ufw status | grep -q "Status: active"; then
            log_info "UFW is not active. Enabling..."
            ufw --force enable
        fi

        for cidr in ${GITHUB_ACTIONS_IPS}; do
            if ufw status | grep -q "${cidr}.*${SSH_PORT}.*ALLOW"; then
                log_info "  Already allowed: ${cidr}"
            else
                ufw allow proto tcp from "${cidr}" to any port "${SSH_PORT}" comment "GitHub Actions"
                log_ok "  Allowed: ${cidr} → port ${SSH_PORT}"
                RULE_ADDED=1
            fi
        done

        if [ "${RULE_ADDED}" -eq 1 ]; then
            ufw reload
            log_ok "UFW rules reloaded"
        fi

        echo ""
        log_info "UFW summary:"
        ufw status | head -n 20
        ;;

    firewalld)
        for cidr in ${GITHUB_ACTIONS_IPS}; do
            if firewall-cmd --list-rich-rules 2>/dev/null | grep -q "${cidr}"; then
                log_info "  Already allowed: ${cidr}"
            else
                firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='${cidr}' port port='${SSH_PORT}' protocol='tcp' accept"
                RULE_ADDED=1
            fi
        done

        if [ "${RULE_ADDED}" -eq 1 ]; then
            firewall-cmd --reload
            log_ok "firewalld rules reloaded"
        fi
        ;;

    iptables)
        for cidr in ${GITHUB_ACTIONS_IPS}; do
            if iptables -C INPUT -p tcp --dport "${SSH_PORT}" -s "${cidr}" -j ACCEPT 2>/dev/null; then
                log_info "  Already allowed: ${cidr}"
            else
                iptables -I INPUT -p tcp --dport "${SSH_PORT}" -s "${cidr}" -j ACCEPT
                log_ok "  Allowed: ${cidr} → port ${SSH_PORT}"
                RULE_ADDED=1
            fi
        done

        if [ "${RULE_ADDED}" -eq 1 ]; then
            iptables-save > /etc/iptables/rules.v4 2>/dev/null || \
                log_warn "Could not persist iptables rules. Install iptables-persistent."
            log_ok "iptables rules updated"
        fi
        ;;

    none)
        log_warn "No server firewall detected."
        log_info "The block is likely at the Hostinger cloud firewall."
        log_info ""
        log_info "🔐 TO FIX VIA HOSTINGER hPanel:"
        log_info "  1. Login to hPanel → VPS → Manage"
        log_info "  2. Go to Firewall (or Security → Firewall)"
        log_info "  3. Add an INBOUND rule:"
        log_info "     - Port: ${SSH_PORT}/TCP"
        log_info "     - Source: 0.0.0.0/0 (or these GitHub ranges:)"
        for cidr in ${GITHUB_ACTIONS_IPS}; do
            echo "       ${cidr}"
        done
        log_info "  4. Save and apply"
        log_info ""
        log_info "💡 Alternative: Temporarily disable the cloud firewall:"
        log_info "     hPanel → VPS → Firewall → Disable (for testing)"
        ;;
esac

# --- 6. Verify SSH service health ---
echo ""
log_info "Verifying SSH service..."
if systemctl is-active ssh &>/dev/null; then
    log_ok "SSH service is running"
else
    log_warn "SSH service is not running. Attempting to start..."
    systemctl start ssh || log_err "Could not start SSH. Run: sudo systemctl start ssh"
fi

# --- 7. Check authorized_keys ---
echo ""
log_info "Checking SSH authorized_keys..."
if [ ! -f ~/.ssh/authorized_keys ]; then
    log_warn "~/.ssh/authorized_keys not found!"
    log_info "You need to add your public key."
    log_info "  mkdir -p ~/.ssh && chmod 700 ~/.ssh"
    log_info "  echo '<your-public-key>' >> ~/.ssh/authorized_keys"
    log_info "  chmod 600 ~/.ssh/authorized_keys"
else
    KEY_COUNT=$(grep -c "^ssh-" ~/.ssh/authorized_keys 2>/dev/null || echo 0)
    log_ok "Found ${KEY_COUNT} SSH key(s) in authorized_keys"
fi

# --- 8. Test local SSH ---
echo ""
log_info "Testing local SSH connection..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 -p "${SSH_PORT}" localhost exit 2>/dev/null; then
    log_ok "Local SSH connection works"
else
    log_warn "Local SSH connection failed (may need to check keys)"
fi

# --- 9. Final guidance ---
echo ""
echo "============================================================"
echo ""

if [ "${FIREWALL_TYPE}" != "none" ] && [ "${RULE_ADDED}" -eq 1 ]; then
    echo -e " ✅ ${GREEN}Firewall rules updated successfully${NC}"
    echo ""
    echo "   The GitHub Actions runner should now be able to"
    echo "   connect via SSH on port ${SSH_PORT}."
    echo ""
    echo "   Next step: Push to main to trigger a new deployment:"
    echo "     git push origin main"
elif [ "${FIREWALL_TYPE}" = "none" ]; then
    echo -e " ⚠️  ${YELLOW}Follow the Hostinger hPanel instructions above.${NC}"
    echo ""
    echo "   After updating the cloud firewall, push to main:"
    echo "     git push origin main"
else
    echo -e " ✅ ${GREEN}No new rules needed. All GitHub IP ranges were already allowed.${NC}"
    echo ""
    echo "   If SSH still fails, the block may be at Hostinger."
    echo "   Check: hPanel → VPS → Firewall"
fi

echo ""
echo "============================================================"
