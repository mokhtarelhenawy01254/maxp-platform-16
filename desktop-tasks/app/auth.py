import os
import json
import stat

CONFIG_DIR = os.path.join(os.path.expanduser("~"), ".desktop-tasks")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")


def ensure_config_dir():
    os.makedirs(CONFIG_DIR, exist_ok=True)
    try:
        os.chmod(CONFIG_DIR, stat.S_IRWXU)
    except (OSError, AttributeError):
        pass


def save_auth(token, user_email, base_url=None):
    ensure_config_dir()
    data = {"token": token, "email": user_email}
    if base_url:
        data["base_url"] = base_url
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f)
    try:
        os.chmod(CONFIG_FILE, stat.S_IRUSR | stat.S_IWUSR)
    except (OSError, AttributeError):
        pass


def load_auth():
    if not os.path.exists(CONFIG_FILE):
        return None
    try:
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return None


def clear_auth():
    if os.path.exists(CONFIG_FILE):
        os.remove(CONFIG_FILE)
