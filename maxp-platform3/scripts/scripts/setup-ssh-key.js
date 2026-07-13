const { spawn } = require('child_process');

const password = process.env.SSH_SETUP_PASSWORD || '';
const publicKey = process.env.SSH_SETUP_PUBLIC_KEY || '';
const host = process.env.SSH_SETUP_HOST || '';
const user = process.env.SSH_SETUP_USER || 'root';

if (!host || !publicKey) {
    console.error('Missing SSH setup configuration.');
    console.error('Required: SSH_SETUP_HOST and SSH_SETUP_PUBLIC_KEY');
    console.error('Optional: SSH_SETUP_USER, SSH_SETUP_PASSWORD');
    process.exit(1);
}

const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
const quotedKey = shellQuote(publicKey);

const cmd = [
    'mkdir -p ~/.ssh',
    `grep -qxF ${quotedKey} ~/.ssh/authorized_keys 2>/dev/null || echo ${quotedKey} >> ~/.ssh/authorized_keys`,
    'chmod 700 ~/.ssh',
    'chmod 600 ~/.ssh/authorized_keys',
    'echo SETUP_COMPLETE',
].join(' && ');

const sshArgs = [
    '-o', password ? 'PreferredAuthentications=password' : 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=accept-new',
    `${user}@${host}`,
    cmd,
];

const ssh = spawn('ssh', sshArgs);

ssh.stdout.on('data', (data) => {
    console.log(`STDOUT: ${data}`);
});

ssh.stderr.on('data', (data) => {
    const output = data.toString();
    console.log(`STDERR: ${output}`);
    if (output.toLowerCase().includes('password:')) {
        ssh.stdin.write(password + '\n');
    }
});

ssh.on('close', (code) => {
    console.log(`SSH process exited with code ${code}`);
});
