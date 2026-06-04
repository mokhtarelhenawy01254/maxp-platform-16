# 1. Clone the AI service repo
cd /opt
git clone https://github.com/elhenawym124-ops/maxp-ai-service.git
cd maxp-ai-service

# 2. Make the deploy script executable
chmod +x scripts/deploy.sh

# 3. Pre-create the data directory used by docker compose
mkdir -p data

# 4. Get your server's public IP (you'll need it for DNS)
echo "================================================"
echo "Your server public IP is:"
curl -s ifconfig.me
echo ""
echo "================================================"
echo "Use this IP for the DNS A record: ai.maxp.online"
echo "================================================"

# 5. Run the deploy script (it will ask for the DB password)
# Set your API keys first as env vars (replace with real keys)
export GOOGLE_API_KEY="AIzaSy_your_google_key_here"
export ANTHROPIC_API_KEY="sk-ant_your_anthropic_key_here"

bash scripts/deploy.sh
