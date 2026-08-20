# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['H:/maxp-platform/desktop-tasks/main.py'],
    pathex=[],
    binaries=[],
    datas=[('H:/maxp-platform/desktop-tasks/app/ui', 'app/ui')],
    hiddenimports=['app', 'app.auth', 'webview', 'requests'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['app.api'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='MaxP Tasks',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='NONE',
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='MaxP Tasks',
)
