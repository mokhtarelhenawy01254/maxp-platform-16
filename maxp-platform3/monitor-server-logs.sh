#!/bin/bash
# ==============================================================================
# Script: monitor-server-logs.sh
# Description: Stream real-time logs from the production server over SSH.
# ==============================================================================

SERVER_HOST="srv974554.hstgr.cloud"
SERVER_USER="root"

clear
echo -e "\e[36m==================================================\e[0m"
echo -e "\e[36m         MaxP Server Log Monitor Bot\e[0m"
echo -e "\e[36m==================================================\e[0m"
echo ""
echo -e "\e[33mSelect which logs you want to stream:\e[0m"
echo "  [1] AI Service logs (maxp-ai-service)"
echo "  [2] Backend API logs (maxp-backend)"
echo "  [3] Webhook Worker logs (maxp-webhook-worker)"
echo "  [4] All server logs combined"
echo "  [5] Custom PM2 Command (e.g. pm2 status)"
echo "  [6] Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1) pm2_app="maxp-ai-service" ;;
    2) pm2_app="maxp-backend" ;;
    3) pm2_app="maxp-webhook-worker" ;;
    4) pm2_app="--raw" ;;
    5)
        read -p "Enter custom command (e.g. status, list, show maxp-backend): " custom_cmd
        echo -e "\e[32mExecuting 'pm2 $custom_cmd' on $SERVER_HOST...\e[0m"
        ssh -t "$SERVER_USER@$SERVER_HOST" "pm2 $custom_cmd"
        exit 0
        ;;
    6)
        echo -e "\e[33mGoodbye!\e[0m"
        exit 0
        ;;
    *)
        echo -e "\e[31mInvalid choice, exiting.\e[0m"
        exit 1
        ;;
esac

echo -e "\e[32mConnecting to $SERVER_HOST and streaming logs for '$pm2_app'...\e[0m"
echo -e "\e[33mPress Ctrl+C to stop streaming and disconnect.\e[0m"
echo ""

# Use ssh -t to allocate tty so Ctrl+C gracefully terminates the remote stream
ssh -t "$SERVER_USER@$SERVER_HOST" "pm2 logs $pm2_app --lines 50"
