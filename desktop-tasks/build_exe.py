import PyInstaller.__main__
import os
import sys

base = os.path.dirname(os.path.abspath(__file__))
sep = ';' if sys.platform == 'win32' else ':'

PyInstaller.__main__.run([
    os.path.join(base, 'main.py'),
    '--name=MaxP Tasks',
    '--noconfirm',
    '--onedir',
    '--windowed',
    f'--add-data={os.path.join(base, "app", "ui")}{sep}app/ui',
    '--hidden-import=app',
    '--hidden-import=app.auth',
    '--hidden-import=webview',
    '--hidden-import=requests',
    '--icon=NONE',
    '--exclude-module=app.api',
    f'--distpath={os.path.join(base, "dist")}',
    f'--workpath={os.path.join(base, "build")}',
    f'--specpath={base}',
])
