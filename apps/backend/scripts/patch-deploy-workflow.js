const fs = require('fs');
const path = require('path');

const deployYmlPath = path.join(__dirname, '..', '..', '.github', 'workflows', 'deploy.yml');
let content = fs.readFileSync(deployYmlPath, 'utf8');

// Find where "Run Deployment Script on Server" step starts
const stepHeader = '      - name: Run Deployment Script on Server';
const headerIndex = content.indexOf(stepHeader);
if (headerIndex === -1) {
  console.error('Could not find step header in deploy.yml');
  process.exit(1);
}

// Find "script: |"
const scriptMarker = '          script: |';
const scriptIndex = content.indexOf(scriptMarker, headerIndex);
if (scriptIndex === -1) {
  console.error('Could not find script marker in deploy.yml');
  process.exit(1);
}

// Extract the bash script block (everything after "script: |")
// Note: each line of the script block is indented by 12 spaces. We will unindent it.
const rawScriptLines = content.substring(scriptIndex + scriptMarker.length).split('\n');
const scriptLines = [];
for (let line of rawScriptLines) {
  // If the line starts with 12 spaces, unindent it. Otherwise, keep it as is.
  if (line.startsWith('            ')) {
    scriptLines.push(line.substring(12));
  } else if (line.trim() === '') {
    scriptLines.push('');
  } else {
    scriptLines.push(line);
  }
}
const bashScriptContent = scriptLines.join('\n');

// Now rebuild the steps
const beforeStep = content.substring(0, headerIndex);

const newSteps = `      - name: Create Deploy Script File
        shell: bash
        run: |
          cat << 'EOF' > deploy_script.sh
${bashScriptContent.split('\n').map(l => '          ' + l).join('\n')}
          EOF

      - name: Run Deployment Script on Server
        shell: bash
        env:
          SERVER_HOST: \${{ secrets.SERVER_HOST }}
          SERVER_USER: \${{ secrets.SERVER_USER }}
          SERVER_SSH_PORT: \${{ env.SERVER_SSH_PORT }}
          SUPER_ADMIN_EMAIL: \${{ secrets.SUPER_ADMIN_EMAIL }}
          SUPER_ADMIN_PASSWORD: \${{ secrets.SUPER_ADMIN_PASSWORD }}
        run: |
          set -euo pipefail
          SSH_KEY_PATH="\$HOME/.ssh/maxp_deploy_key"
          ssh -i "\$SSH_KEY_PATH" -p "\$SERVER_SSH_PORT" -o StrictHostKeyChecking=accept-new "\$SERVER_USER@\$SERVER_HOST" "export GITHUB_RUN_ID='\${{ github.run_id }}' GITHUB_RUN_ATTEMPT='\${{ github.run_attempt }}' SUPER_ADMIN_EMAIL='\${{ env.SUPER_ADMIN_EMAIL }}' SUPER_ADMIN_PASSWORD='\${{ env.SUPER_ADMIN_PASSWORD }}' && bash deploy_staging_\\\${GITHUB_RUN_ID}_\\\${GITHUB_RUN_ATTEMPT}/deploy_script.sh"
`;

fs.writeFileSync(deployYmlPath, beforeStep + newSteps, 'utf8');
console.log('Successfully patched deploy.yml to use raw SSH!');
