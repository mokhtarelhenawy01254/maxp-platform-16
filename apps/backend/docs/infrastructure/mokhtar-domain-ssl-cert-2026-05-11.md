# Mokhtar Domain SSL Certificate Pin

Date: 2026-05-11

## Incident

`https://mokhtarelhenawy.online/` returned `NET::ERR_CERT_DATE_INVALID` after production deployment synced the repository Nginx config back onto the VPS.

The apex/www server block was pointing at:

```text
/etc/letsencrypt/live/mokhtarelhenawy.online-0001/
```

That certificate includes the wildcard host but uses manual DNS-01 renewal and expired on 2026-05-10.

## Fix

The apex/www Nginx block now points at the auto-renewing nginx-authenticated certificate:

```text
/etc/letsencrypt/live/mokhtarelhenawy.online/
```

The wildcard block remains on the `-0001` certificate until DNS automation or a manual wildcard renewal is configured.

## Verification

After deploying this config, verify:

- `nginx -t` succeeds.
- `openssl s_client -servername mokhtarelhenawy.online` serves the `mokhtarelhenawy.online` certificate.
- `curl -I https://mokhtarelhenawy.online/` returns `200 OK` without certificate expiry errors.

## Deployment Note

Keep the Nginx config comment and this infrastructure note in the same commit whenever the cert path is changed. The production workflow checks for documentation changes per commit, so a config-only correction will fail before deployment.
