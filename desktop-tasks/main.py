import os
import sys
import json
import time
import threading
import socket
import webview
from http.server import HTTPServer, SimpleHTTPRequestHandler
from app.auth import load_auth, save_auth, clear_auth


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

LOCAL_PORT = find_free_port()


class Api:
    def load_auth(self):
        data = load_auth()
        return json.dumps(data) if data else None

    def save_auth(self, token, email, base_url):
        save_auth(token, email, base_url)

    def clear_auth(self):
        clear_auth()


def get_ui_dir():
    if getattr(sys, 'frozen', False):
        base = sys._MEIPASS
    else:
        base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, "app", "ui")


class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=get_ui_dir(), **kwargs)
    def log_message(self, format, *args):
        pass


def start_server():
    server = HTTPServer(('127.0.0.1', LOCAL_PORT), QuietHandler)
    server.serve_forever()


def inject_saved_auth(window):
    """Inject saved auth into localStorage BEFORE Alpine initializes, then reload."""
    for i in range(80):
        time.sleep(0.1)
        try:
            result = window.evaluate_js('document.readyState')
            if result == 'complete':
                break
        except Exception:
            pass

    time.sleep(0.5)

    data = load_auth()
    if not data or not data.get('token'):
        return

    token = data['token']
    email = data.get('email', '')
    base_url = data.get('base_url', 'https://api.maxp.online')

    try:
        window.evaluate_js('''
            (function() {
                if (window.__AUTH_INJECTED__) return;
                window.__AUTH_INJECTED__ = true;
                var auth = {token: arguments[0], email: arguments[1], baseUrl: arguments[2]};
                localStorage.setItem('dt_auth', JSON.stringify(auth));
                location.reload();
            }).apply(null, arguments);
        ''', args=[token, email, base_url])
    except Exception:
        pass


def main():
    api = Api()
    ui_dir = get_ui_dir()

    if not os.path.exists(ui_dir):
        print(f"Error: UI dir not found at {ui_dir}")
        sys.exit(1)

    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    url = f"http://127.0.0.1:{LOCAL_PORT}/index.html"

    window = webview.create_window(
        title="┘à┘ç╪º┘à ╪º┘ä┘ü╪▒┘è┘é",
        url=url,
        js_api=api,
        width=1280,
        height=800,
        min_size=(900, 600),
        resizable=True,
        text_select=True,
    )

    t = threading.Thread(target=inject_saved_auth, args=(window,), daemon=True)
    t.start()

    webview.start(debug=False)


if __name__ == "__main__":
    main()
