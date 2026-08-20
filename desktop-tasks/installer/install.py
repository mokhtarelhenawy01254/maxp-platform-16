"""
MaxP Tasks Installer
Simple Python-based installer that creates shortcuts and installs the app.
"""
import os
import sys
import shutil
import winreg
from pathlib import Path

APP_NAME = "MaxP Tasks"
INSTALL_DIR = Path(os.environ.get("PROGRAMFILES", "C:\\Program Files")) / APP_NAME
SHORTCUT_DIR = Path(os.environ.get("APPDATA")) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / APP_NAME


def create_shortcut(target, shortcut_path, description="MaxP Tasks"):
    """Create a Windows shortcut (.lnk file)"""
    try:
        import win32com.client
        shell = win32com.client.Dispatch("WScript.Shell")
        shortcut = shell.CreateShortCut(str(shortcut_path))
        shortcut.Targetpath = str(target)
        shortcut.WorkingDirectory = str(target.parent)
        shortcut.Description = description
        shortcut.save()
        return True
    except ImportError:
        return create_shortcut_powershell(target, shortcut_path, description)


def create_shortcut_powershell(target, shortcut_path, description="MaxP Tasks"):
    """Create shortcut using PowerShell"""
    ps_cmd = f'''
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{shortcut_path}")
$Shortcut.TargetPath = "{target}"
$Shortcut.WorkingDirectory = "{target.parent}"
$Shortcut.Description = "{description}"
$Shortcut.Save()
'''
    result = os.popen(f'powershell -Command "{ps_cmd}"').read()
    return os.path.exists(shortcut_path)


def add_to_path(install_dir):
    """Add install directory to user PATH"""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment", 0, winreg.KEY_ALL_ACCESS)
        try:
            current_path, _ = winreg.QueryValueEx(key, "Path")
        except FileNotFoundError:
            current_path = ""
        
        if str(install_dir) not in current_path:
            new_path = f"{current_path};{install_dir}" if current_path else str(install_dir)
            winreg.SetValueEx(key, "Path", 0, winreg.REG_EXPAND_SZ, new_path)
            print(f"[OK] Added to PATH: {install_dir}")
        
        winreg.CloseKey(key)
    except Exception as e:
        print(f"[WARN] Could not add to PATH: {e}")


def register_uninstall(install_dir):
    """Register app in Windows Add/Remove Programs"""
    try:
        uninstall_key = winreg.CreateKey(
            winreg.HKEY_CURRENT_USER,
            f"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{APP_NAME}"
        )
        winreg.SetValueEx(uninstall_key, "DisplayName", 0, winreg.REG_SZ, APP_NAME)
        winreg.SetValueEx(uninstall_key, "InstallLocation", 0, winreg.REG_SZ, str(install_dir))
        winreg.SetValueEx(uninstall_key, "DisplayVersion", 0, winreg.REG_SZ, "1.0.0")
        winreg.SetValueEx(uninstall_key, "Publisher", 0, winreg.REG_SZ, "MaxP")
        winreg.SetValueEx(uninstall_key, "NoModify", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(uninstall_key, "NoRepair", 0, winreg.REG_DWORD, 1)
        winreg.CloseKey(uninstall_key)
        print(f"[OK] Registered in Add/Remove Programs")
    except Exception as e:
        print(f"[WARN] Could not register: {e}")


def install():
    print(f"\n{'='*50}")
    print(f"  {APP_NAME} Installer v1.0.0")
    print(f"{'='*50}\n")

    # Get source directory (where this script or exe is located)
    if getattr(sys, 'frozen', False):
        source_dir = Path(sys._MEIPASS).parent / "dist" / "MaxP Tasks"
    else:
        source_dir = Path(__file__).parent / "dist" / "MaxP Tasks"

    if not source_dir.exists():
        print(f"[ERROR] Source not found: {source_dir}")
        print("Please make sure the dist folder exists.")
        input("Press Enter to exit...")
        return

    # Ask for install location
    print(f"Install to: {INSTALL_DIR}")
    response = input("Press Enter to install, or type a different path: ").strip()
    if response:
        install_dir = Path(response)
    else:
        install_dir = INSTALL_DIR

    # Create install directory
    print(f"\n[1/4] Creating install directory...")
    install_dir.mkdir(parents=True, exist_ok=True)

    # Copy files
    print(f"[2/4] Copying files...")
    item_count = 0
    for item in source_dir.rglob("*"):
        if item.is_file():
            rel_path = item.relative_to(source_dir)
            dest = install_dir / rel_path
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest)
            item_count += 1
            print(f"  Copied: {rel_path}")

    print(f"  Total: {item_count} files")

    # Create shortcuts
    print(f"[3/4] Creating shortcuts...")
    exe_path = install_dir / "MaxP Tasks.exe"

    # Desktop shortcut
    desktop = Path(os.path.getdesktopfolder())
    desktop_shortcut = desktop / f"{APP_NAME}.lnk"
    if create_shortcut(exe_path, desktop_shortcut):
        print(f"  [OK] Desktop shortcut")

    # Start Menu shortcut
    SHORTCUT_DIR.mkdir(parents=True, exist_ok=True)
    start_shortcut = SHORTCUT_DIR / f"{APP_NAME}.lnk"
    if create_shortcut(exe_path, start_shortcut):
        print(f"  [OK] Start Menu shortcut")

    # Uninstall shortcut
    uninstall_shortcut = SHORTCUT_DIR / f"Uninstall {APP_NAME}.lnk"
    uninstall_exe = install_dir / "uninstall.exe"
    if uninstall_exe.exists():
        create_shortcut(uninstall_exe, uninstall_shortcut, f"Uninstall {APP_NAME}")

    # Register in Add/Remove Programs
    print(f"[4/4] Registering application...")
    register_uninstall(install_dir)

    print(f"\n{'='*50}")
    print(f"  Installation complete!")
    print(f"  Installed to: {install_dir}")
    print(f"{'='*50}")
    print(f"\n  You can now launch {APP_NAME} from:")
    print(f"  - Desktop shortcut")
    print(f"  - Start Menu")
    input(f"\nPress Enter to exit...")


if __name__ == "__main__":
    install()
