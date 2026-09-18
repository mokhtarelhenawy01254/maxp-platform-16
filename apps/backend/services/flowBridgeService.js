const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

class FlowBridgeService {
  constructor() {
    this.cliPath = this.resolveExecutable();
    this.activeProcesses = new Map();
  }

  /**
   * Locate the gflow executable on Windows or Linux
   */
  resolveExecutable() {
    const userProfile = process.env.USERPROFILE || process.env.HOME || '';
    const candidates = [
      path.join(userProfile, '.local', 'bin', process.platform === 'win32' ? 'gflow.exe' : 'gflow'),
      path.join(userProfile, 'AppData', 'Roaming', 'uv', 'tools', 'gflow-cli', 'Scripts', 'gflow.exe'),
      process.platform === 'win32' ? 'gflow.exe' : 'gflow',
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return candidates[0]; // fallback
  }

  /**
   * Check if gflow is installed and whether the session is authenticated
   */
  async checkSessionStatus() {
    if (!fs.existsSync(this.cliPath)) {
      return {
        installed: false,
        authenticated: false,
        cliPath: this.cliPath,
        message: 'gflow executable not found',
      };
    }

    return new Promise((resolve) => {
      exec(`"${this.cliPath}" auth status`, { timeout: 45000 }, (err, stdout, stderr) => {
        const fullOutput = (stdout || '') + (stderr || '');
        const isAuthenticated =
          fullOutput.includes('exists: True') &&
          !fullOutput.includes('No sign-in detected') &&
          !fullOutput.includes('AuthExpiredError');

        resolve({
          installed: true,
          authenticated: isAuthenticated,
          cliPath: this.cliPath,
          rawStatus: fullOutput.trim(),
        });
      });
    });
  }

  /**
   * Launch interactive sign-in once via browser
   */
  async triggerAuthLogin(browser = 'chrome') {
    return new Promise((resolve) => {
      const child = spawn(this.cliPath, ['auth', 'login', '--browser', browser], {
        detached: true,
        stdio: 'ignore',
      });

      child.unref();
      resolve({
        success: true,
        message: `Interactive authentication browser (${browser}) initiated. Complete login in the opened window.`,
      });
    });
  }

  /**
   * Execute Text-to-Video generation through Flow Veo
   */
  async generateVideo({
    prompt,
    aspectRatio = '9:16',
    durationSeconds = 6,
    model = 'veo-fast',
    outDir,
    taskId,
  }) {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt is required for Flow video generation');
    }

    if (!fs.existsSync(outDir)) {
      await fsPromises.mkdir(outDir, { recursive: true });
    }

    const aspect = aspectRatio === '16:9' ? '16:9' : '9:16';
    const duration = [4, 6, 8, 10].includes(Number(durationSeconds)) ? String(durationSeconds) : '6';
    const validModel = ['omni-flash', 'veo-lite', 'veo-fast', 'veo-quality'].includes(model)
      ? model
      : 'veo-fast';

    const args = [
      'video',
      't2v',
      prompt.trim(),
      '--aspect',
      aspect,
      '--duration',
      duration,
      '--model',
      validModel,
      '--out-dir',
      outDir,
      '--json',
    ];

    return new Promise((resolve, reject) => {
      console.log(`🎬 [FLOW-BRIDGE] Spawning: ${this.cliPath} ${args.join(' ')}`);
      const child = spawn(this.cliPath, args, {
        windowsHide: true,
      });

      let stdoutData = '';
      let stderrData = '';

      if (taskId) {
        this.activeProcesses.set(taskId, child);
      }

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('error', (err) => {
        if (taskId) this.activeProcesses.delete(taskId);
        reject(new Error(`Failed to execute gflow: ${err.message}`));
      });

      child.on('close', (code) => {
        if (taskId) this.activeProcesses.delete(taskId);

        if (code !== 0) {
          const errMsg = stderrData.trim() || stdoutData.trim() || `gflow exited with code ${code}`;
          console.error(`❌ [FLOW-BRIDGE] Execution failed (${code}):`, errMsg);
          return reject(new Error(`Flow generation failed: ${errMsg}`));
        }

        try {
          // Attempt to parse JSON output
          let parsed = null;
          try {
            parsed = JSON.parse(stdoutData.trim());
          } catch (e) {
            // Find JSON within stdout if mixed with logs
            const jsonMatch = stdoutData.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            }
          }

          resolve({
            success: true,
            exitCode: code,
            result: parsed,
            rawOutput: stdoutData.trim(),
          });
        } catch (parseErr) {
          resolve({
            success: true,
            exitCode: code,
            result: null,
            rawOutput: stdoutData.trim(),
          });
        }
      });
    });
  }

  /**
   * Cancel an active generation process if needed
   */
  cancelTask(taskId) {
    const process = this.activeProcesses.get(taskId);
    if (process) {
      try {
        process.kill('SIGTERM');
      } catch (e) {
        // ignore
      }
      this.activeProcesses.delete(taskId);
      return true;
    }
    return false;
  }
}

module.exports = new FlowBridgeService();
