const { execSync } = require('child_process');
const https = require('https');

try { require('libsodium-wrappers'); } catch(e) {
  execSync('npm install libsodium-wrappers --no-save', { stdio: 'inherit', cwd: __dirname });
}

const _sodium = require('libsodium-wrappers');

async function run() {
  await _sodium.ready;
  const sodium = _sodium;

  const pubKeyB64 = 'IuNXJRDJ5KEH4enLDooclmzEZAzbexcKY79e1l0jsEE=';
  const keyId    = '3380204578043523366';
  const token    = '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';
  const owner    = 'elhenawym124-ops';
  const repo     = 'maxp-platform';

  function encrypt(secret) {
    const binKey    = sodium.from_base64(pubKeyB64, sodium.base64_variants.ORIGINAL);
    const binSecret = sodium.from_string(secret);
    const encBytes  = sodium.crypto_box_seal(binSecret, binKey);
    return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
  }

  const secrets = {
    DEPLOY_WEBHOOK_URL:    'http://153.92.223.119:9001',
    DEPLOY_WEBHOOK_SECRET: 'nieaG5jVsUEyw6FM29QvSC8YtgLxhDNX'
  };

  for (const [name, value] of Object.entries(secrets)) {
    const body = JSON.stringify({ encrypted_value: encrypt(value), key_id: keyId });
    const status = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/actions/secrets/${name}`,
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'maxp-deploy',
          'Content-Length': Buffer.byteLength(body)
        }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { resolve(res.statusCode); });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (status === 201 || status === 204) {
      console.log(`✅ Secret ${name} set successfully (HTTP ${status})`);
    } else {
      console.error(`❌ Failed to set ${name}: HTTP ${status}`);
      process.exit(1);
    }
  }
  console.log('\n✅ All secrets uploaded to GitHub!');
}

run().catch(e => { console.error(e); process.exit(1); });
