#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const WWW_DIR = path.join(ROOT_DIR, 'www');
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const ANDROID_ASSETS_DIR = path.join(ANDROID_DIR, 'app', 'src', 'main', 'assets');
const ANDROID_PUBLIC_DIR = path.join(ANDROID_ASSETS_DIR, 'public');

const MAX_WWW_SIZE_BYTES = 80 * 1024;
const HARD_GATE_WWW_SIZE_BYTES = 150 * 1024;

const FLAVORS = {
  parent: {
    flavor: 'parent',
    appId: 'online.maxp.parent',
    appName: 'بوابة ولي الأمر - MaxP',
    accentColor: '#059669',
    accentDarkColor: '#047857',
    badgeLabel: 'بوابة ولي الأمر',
    title: 'اربط حسابك بالمدرسة أو المركز',
    subtitle: 'أدخل كود المؤسسة أو ابحث باسمها للوصول الفوري لبوابة ولي الأمر.',
    defaultPortal: 'parent',
    startPath: '/parent/login',
    directPlatformPath: '/parent/login',
    directPlatformLabel: 'تسجيل الدخول عبر الرقم على المنصة مباشرة (maxp.online)',
    lookupMode: 'required',
    lookupPlaceholder: 'كود المؤسسة (مثل SWAN01) أو اسم المدرسة…',
    deepLinkHost: 'maxp.online',
    deepLinkPrefix: '/i',
    portals: [
      { key: 'parent', label: 'بوابة ولي الأمر', loginPath: '/parent/login' },
    ],
  },
  portal: {
    flavor: 'portal',
    appId: 'online.maxp.portal',
    appName: 'بوابات MaxP',
    accentColor: '#4f46e5',
    accentDarkColor: '#4338ca',
    badgeLabel: 'بوابات المؤسسات',
    title: 'اختر مؤسستك وبوابتك',
    subtitle: 'ابحث بكود المؤسسة أو اسمها ثم افتح البوابة المخصصة لك.',
    defaultPortal: 'parent',
    startPath: '/portal/login',
    directPlatformPath: '/login',
    directPlatformLabel: 'تسجيل الدخول عبر الرقم على المنصة مباشرة (maxp.online)',
    lookupMode: 'required',
    lookupPlaceholder: 'كود المؤسسة (مثل SWAN01) أو الاسم…',
    deepLinkHost: 'maxp.online',
    deepLinkPrefix: '/i',
    portals: [
      { key: 'parent', label: 'ولي الأمر', loginPath: '/parent/login' },
      { key: 'teacher', label: 'المدرس', loginPath: '/teacher/login' },
      { key: 'student', label: 'الطالب', loginPath: '/portal/login' },
      { key: 'academy', label: 'الأكاديمية', loginPath: '/academy/login' },
      { key: 'doctor', label: 'الطبيب', loginPath: '/doctor/login' },
      { key: 'patient', label: 'المريض', loginPath: '/patient/login' },
      { key: 'dental', label: 'معمل الأسنان', loginPath: '/dental-portal/login' },
      { key: 'wholesale', label: 'الموزع', loginPath: '/wholesale-portal/login' },
      { key: 'client', label: 'العميل', loginPath: '/client-portal/login' },
    ],
  },
  courier: {
    flavor: 'courier',
    appId: 'online.maxp.courier',
    appName: 'مندوب ماكس بي',
    accentColor: '#0284c7',
    accentDarkColor: '#0369a1',
    badgeLabel: 'تطبيق المندوب',
    title: 'بوابة المندوب الميداني',
    subtitle: 'افتح بوابة المندوب مباشرة أو اربط حسابك بشركة الشحن.',
    defaultPortal: 'courier',
    startPath: '/courier-portal/login',
    directPlatformPath: '/courier-portal/login',
    directPlatformLabel: 'فتح بوابة المندوب مباشرة',
    lookupMode: 'optional',
    lookupPlaceholder: 'كود شركة الشحن (اختياري) أو اسمها…',
    deepLinkHost: 'maxp.online',
    deepLinkPrefix: '/courier-portal',
    portals: [
      { key: 'courier', label: 'بوابة المندوب', loginPath: '/courier-portal/login' },
    ],
  },
  customer: {
    flavor: 'customer',
    appId: 'online.maxp.customer',
    appName: 'ماكس بي للشحن والعملاء',
    accentColor: '#0f172a',
    accentDarkColor: '#020617',
    badgeLabel: 'الشحن والعملاء',
    title: 'بوابة العملاء وتتبع الشحنات',
    subtitle: 'تتبع شحناتك عبر المنصة مباشرة أو اربط حسابك بالمتجر.',
    defaultPortal: 'client',
    startPath: '/client-portal/login',
    directPlatformPath: '/account',
    directPlatformLabel: 'تسجيل الدخول عبر الرقم على المنصة مباشرة (maxp.online)',
    lookupMode: 'optional',
    lookupPlaceholder: 'كود المتجر أو شركة الشحن (مثل SWAN01)…',
    deepLinkHost: 'maxp.online',
    deepLinkPrefix: '/client-portal',
    portals: [
      { key: 'client', label: 'بوابة العميل', loginPath: '/client-portal/login' },
      { key: 'customer', label: 'حسابي', loginPath: '/account' },
    ],
  },
};

function getDirectorySizeBytes(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getDirectorySizeBytes(fullPath);
    } else if (entry.isFile()) {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildCapacitorJson(flavorConfig, serverUrl = '') {
  const server = {
    ...(serverUrl ? { url: serverUrl } : {}),
    androidScheme: 'https',
    errorPath: 'index.html',
    allowNavigation: ['maxp.online', '*.maxp.online'],
  };
  return {
    appId: flavorConfig.appId,
    appName: flavorConfig.appName,
    webDir: 'www',
    server,
    android: {
      appendUserAgent: 'MaxP-Native-Android MaxP-Portal-Shell/1.0.0',
    },
    plugins: {
      PushNotifications: {
        presentationOptions: ['badge', 'sound', 'alert'],
      },
    },
  };
}

function configureShell(flavorName = 'parent', options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const wwwDir = path.join(rootDir, 'www');
  const assetsDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets');
  const publicDir = path.join(assetsDir, 'public');

  const key = String(flavorName || 'parent').trim().toLowerCase();
  const flavorConfig = FLAVORS[key];
  if (!flavorConfig) {
    throw new Error(`Unknown flavor "${flavorName}". Expected one of: ${Object.keys(FLAVORS).join(', ')}`);
  }

  const serverUrl = String(options.serverUrl || process.env.PORTAL_SERVER_URL || '').trim();
  const capJson = buildCapacitorJson(flavorConfig, serverUrl);
  const capJsonStr = JSON.stringify(capJson, null, 2) + '\n';

  fs.mkdirSync(wwwDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const shellConfigPath = path.join(wwwDir, 'shell-config.json');
  const shellConfig = {
    flavor: flavorConfig.flavor,
    appId: flavorConfig.appId,
    appName: flavorConfig.appName,
    accentColor: flavorConfig.accentColor,
    accentDarkColor: flavorConfig.accentDarkColor,
    badgeLabel: flavorConfig.badgeLabel,
    title: flavorConfig.title,
    subtitle: flavorConfig.subtitle,
    defaultPortal: flavorConfig.defaultPortal,
    startPath: flavorConfig.startPath,
    directPlatformPath: flavorConfig.directPlatformPath,
    directPlatformLabel: flavorConfig.directPlatformLabel,
    lookupMode: flavorConfig.lookupMode,
    lookupPlaceholder: flavorConfig.lookupPlaceholder,
    apiBaseUrl: 'https://maxp.online',
    portals: flavorConfig.portals,
  };
  fs.writeFileSync(shellConfigPath, JSON.stringify(shellConfig, null, 2) + '\n', 'utf8');

  fs.writeFileSync(path.join(rootDir, 'capacitor.config.json'), capJsonStr, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'capacitor.config.json'), capJsonStr, 'utf8');

  if (options.syncAssets !== false) {
    if (fs.existsSync(publicDir)) {
      fs.rmSync(publicDir, { recursive: true, force: true });
    }
    copyDirRecursive(wwwDir, publicDir);
  }

  return {
    flavor: key,
    appId: flavorConfig.appId,
    appName: flavorConfig.appName,
    shellConfig,
    capJson,
  };
}

function verifyShell(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const wwwDir = path.join(rootDir, 'www');
  const androidDir = path.join(rootDir, 'android');
  const errors = [];
  const warnings = [];

  if (fs.existsSync(path.join(rootDir, 'dist'))) {
    errors.push('Forbidden dist/ directory exists in portal-mobile (must remain thin www/ shell only).');
  }

  const requiredWwwFiles = ['index.html', 'styles.css', 'app.js', 'shell-config.json', 'icon.svg'];
  for (const file of requiredWwwFiles) {
    if (!fs.existsSync(path.join(wwwDir, file))) {
      errors.push(`Missing required www/${file}`);
    }
  }

  const wwwSizeBytes = getDirectorySizeBytes(wwwDir);
  if (wwwSizeBytes === 0) {
    errors.push('www/ directory is empty.');
  } else if (wwwSizeBytes > HARD_GATE_WWW_SIZE_BYTES) {
    errors.push(`www/ size (${wwwSizeBytes} bytes) exceeds 150 KB hard limit (${HARD_GATE_WWW_SIZE_BYTES} bytes).`);
  } else if (wwwSizeBytes > MAX_WWW_SIZE_BYTES) {
    warnings.push(`www/ size (${wwwSizeBytes} bytes) exceeds 80 KB target (${MAX_WWW_SIZE_BYTES} bytes).`);
  }

  // Validate JSON configs
  for (const rel of ['capacitor.config.json', 'www/shell-config.json', 'android/app/src/main/assets/capacitor.config.json']) {
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full)) {
      errors.push(`Missing JSON file: ${rel}`);
      continue;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (rel.endsWith('capacitor.config.json')) {
        if (parsed.webDir !== 'www') errors.push(`${rel}: webDir must be "www"`);
        if (!parsed.android?.appendUserAgent?.includes('MaxP-Native-Android')) {
          errors.push(`${rel}: android.appendUserAgent must include "MaxP-Native-Android"`);
        }
        const allowNav = parsed.server?.allowNavigation || [];
        if (!allowNav.includes('maxp.online') || !allowNav.includes('*.maxp.online')) {
          errors.push(`${rel}: server.allowNavigation must include maxp.online and *.maxp.online`);
        }
      } else {
        if (!FLAVORS[parsed.flavor]) errors.push(`${rel}: invalid flavor "${parsed.flavor}"`);
      }
    } catch (err) {
      errors.push(`Invalid JSON in ${rel}: ${err.message}`);
    }
  }

  // Validate Android Gradle flavors & config
  const appBuildGradlePath = path.join(androidDir, 'app', 'build.gradle');
  if (!fs.existsSync(appBuildGradlePath)) {
    errors.push('Missing android/app/build.gradle');
  } else {
    const gradle = fs.readFileSync(appBuildGradlePath, 'utf8');
    if (!gradle.includes('namespace = "online.maxp.portalshell"') && !gradle.includes('namespace "online.maxp.portalshell"')) {
      errors.push('android/app/build.gradle must set namespace "online.maxp.portalshell"');
    }
    if (!gradle.includes('flavorDimensions "portal"') && !gradle.includes('flavorDimensions = ["portal"]')) {
      errors.push('android/app/build.gradle must declare flavorDimensions "portal"');
    }
    for (const [key, meta] of Object.entries(FLAVORS)) {
      if (!new RegExp(`\\b${key}\\s*\\{`).test(gradle)) {
        errors.push(`android/app/build.gradle missing productFlavor "${key}"`);
      }
      if (!gradle.includes(`"${meta.appId}"`)) {
        errors.push(`android/app/build.gradle missing applicationId "${meta.appId}"`);
      }
    }
    if (!gradle.includes('google-services.json')) {
      errors.push('android/app/build.gradle missing conditional google-services.json handling');
    }
  }

  // Validate AndroidManifest.xml permissions & App Links
  const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
  if (!fs.existsSync(manifestPath)) {
    errors.push('Missing android/app/src/main/AndroidManifest.xml');
  } else {
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    const allowedPerms = new Set([
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.CAMERA',
    ]);
    const permMatches = [...manifest.matchAll(/uses-permission\s+android:name="([^"]+)"/g)].map((m) => m[1]);
    for (const perm of permMatches) {
      if (!allowedPerms.has(perm)) {
        errors.push(`Disallowed permission in AndroidManifest.xml: ${perm}`);
      }
    }
    for (const reqPerm of allowedPerms) {
      if (!permMatches.includes(reqPerm)) {
        errors.push(`Missing required permission in AndroidManifest.xml: ${reqPerm}`);
      }
    }
    if (!manifest.includes('android:autoVerify="true"')) {
      errors.push('AndroidManifest.xml missing android:autoVerify="true" for App Links');
    }
    if (!manifest.includes('${deepLinkHost}') || !manifest.includes('${deepLinkPrefix}')) {
      errors.push('AndroidManifest.xml missing ${deepLinkHost} / ${deepLinkPrefix} placeholders');
    }
  }

  const mainActivityPath = path.join(
    androidDir,
    'app',
    'src',
    'main',
    'java',
    'online',
    'maxp',
    'portalshell',
    'MainActivity.java',
  );
  if (!fs.existsSync(mainActivityPath)) {
    errors.push('Missing MainActivity.java at online/maxp/portalshell/MainActivity.java');
  } else {
    const java = fs.readFileSync(mainActivityPath, 'utf8');
    if (!java.includes('extends BridgeActivity')) {
      errors.push('MainActivity.java must extend BridgeActivity');
    }
  }

  return {
    ok: errors.length === 0,
    wwwSizeBytes,
    errors,
    warnings,
  };
}

function parseCliArgs(argv) {
  const args = { flavor: process.env.PORTAL_FLAVOR || 'parent', verify: false };
  for (const token of argv) {
    if (token === '--verify') {
      args.verify = true;
    } else if (token.startsWith('--flavor=')) {
      args.flavor = token.slice('--flavor='.length);
    }
  }
  return args;
}

if (require.main === module) {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.verify) {
    const report = verifyShell();
    console.log(`[verify:shell] www/ size: ${report.wwwSizeBytes} bytes (${(report.wwwSizeBytes / 1024).toFixed(2)} KB)`);
    for (const w of report.warnings) {
      console.warn(`[verify:shell] WARN: ${w}`);
    }
    if (!report.ok) {
      for (const e of report.errors) {
        console.error(`[verify:shell] ERROR: ${e}`);
      }
      process.exit(1);
    }
    console.log('[verify:shell] PASS — all shell, Capacitor, Gradle flavor, and Manifest checks passed.');
  } else {
    const res = configureShell(args.flavor);
    console.log(`[configure-shell] Configured flavor="${res.flavor}" (${res.appId}) -> "${res.appName}"`);
  }
}

module.exports = {
  FLAVORS,
  MAX_WWW_SIZE_BYTES,
  HARD_GATE_WWW_SIZE_BYTES,
  buildCapacitorJson,
  configureShell,
  getDirectorySizeBytes,
  verifyShell,
};
