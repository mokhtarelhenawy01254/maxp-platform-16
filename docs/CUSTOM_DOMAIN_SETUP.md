# Custom Domain Setup & Infrastructure Guide

This guide explains how to configure the server to handle multiple custom domains and automate SSL certificate issuance.

## 1. Nginx Catch-All Configuration

To support custom domains, Nginx must be configured to accept traffic for domains not explicitly listed in its configuration and route them to the backend.

### Standard Catch-All Configuration
Add a new server block or modify your existing one:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _; # Catch-all

    # Frontend Static Files
    location / {
        root /var/www/frontend2/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host; # CRITICAL: Passes the custom domain to backend
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> [!IMPORTANT]
> The `proxy_set_header Host $host;` line is essential as it allows the `subdomainMiddleware.js` to identify the company based on the domain.

## 2. SSL/TLS Automation (Certbot)

For a platform supporting many custom domains, you need a way to issue SSL certificates dynamically.

### Option A: Manual HTTP-01 Challenge (Scripted)
You can run a script every time a user verifies their domain to issue a certificate:

```bash
# Example command for a new domain
sudo certbot certonly --webroot -w /var/www/frontend2/dist -d store.com -d www.store.com --non-interactive --agree-tos --email admin@maxp.online
```

### Option B: On-Demand TLS (Caddy Server)
Alternatively, using **Caddy** as a reverse proxy is highly recommended for this use case because it handles "On-Demand TLS" automatically. When a request comes in for a new domain, Caddy fetches a certificate from Let's Encrypt instantly.

**Caddyfile Example:**
```caddy
{
    on_demand_tls {
        ask http://localhost:5000/api/v1/companies/verify-ssl-eligibility
    }
}

:443 {
    tls {
        on_demand
    }
    
    # Proxy to backend
    reverse_proxy localhost:5000
    
    # Serve frontend
    root * /var/www/frontend2/dist
    file_server
}
```

## 3. DNS Instructions for Users

Users should be instructed to add a **CNAME** record:
- **Type**: CNAME
- **Host**: @ (or leave blank)
- **Value**: `mokhtarelhenawy.online` (or your platform's main domain)

If they prefer an **A Record**:
- **Type**: A
- **Host**: @
- **Value**: `[YOUR_SERVER_IP]`

## 4. Troubleshooting
- **Domain not resolving**: Check if the DNS records have propagated using `dig store.com` or `nslookup`.
- **404 in Backend**: Ensure the `customDomain` field in the `Company` table EXACTLY matches the domain (without `http://` or `www.`).
- **Mixed Content**: Ensure the `MAIN_DOMAIN` environment variable in the backend is set to the HTTPS version of your site.
