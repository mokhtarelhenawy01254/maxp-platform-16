"""
MaxP Tasks Uninstaller
"""
import os
import sys
import shutil
import winreg
from pathlib import Path

APP_NAME = "MaxP Tasks"
INSTALL_DIR = Path(os.environ.get("PROGRAMFILES", "C:\\Program Files")) / APP_NAME


def remove_shortcuts():
    """Remove desktop and start menu shortcuts"""
    desktop = Path(os.path.getdesktopfolder())
    shortcut = desktop / f"{APP_NAME}.lnk"
    if shortcut.exists():
        shortcut.unlink()
        print(f"  [OK] Removed desktop shortcut")

    start_menu = Path(os.environ.get("APPDATA")) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / APP_NAME
    if start_menu.exists():
        shutil.rmtree(start_menu)
        print(f"  [OK] Removed Start Menu shortcuts")


def remove_registry():
    """Remove from Add/Remove Programs"""
    try:
        key_path = f"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{APP_NAME}"
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key_path)
        print(f"  [OK] Removed from Add/Remove Programs")
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"  [WARN] Could not remove registry: {e}")


def uninstall():
    print(f"\n{'='*50}")
    print(f"  {APP_NAME} Uninstaller")
    print(f"{'='*50}\n")

    response = input(f"Are you sure you want to uninstall {APP_NAME}? (y/n): ").strip().lower()
    if response != 'y':
        print("Uninstall cancelled.")
        return

    print(f"\n[1/3] Removing shortcuts...")
    remove_shortcuts()

    print(f"[2/3] Removing registry entries...")
    remove_registry()

    print(f"[3/3] Removing files...")
    if INSTALL_DIR.exists():
        shutil.rmtree(INSTALL_DIR)
        print(f"  [OK] Removed {INSTALL_DIR}")
    else:
        print(f"  [INFO] Installation directory not found")

    # Remove config
    config_dir = Path.home() / ".desktop-tasks"
    if config_dir.exists():
        remove_config = input(f"Remove saved settings? ({config_dir}) (y/n): ").strip().lower()
        if remove_config == 'y':
            shutil.rmtree(config_dir)
            print(f"  [OK] Removed settings")

    print(f"\n{'='*50}")
    print(f"  Uninstall complete!")
    print(f"{'='*50}")
    input(f"\nPress Enter to exit...")


if __name__ == "__main__":
    uninstall()
