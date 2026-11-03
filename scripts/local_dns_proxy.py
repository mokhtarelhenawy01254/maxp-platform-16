import socket
import select
import threading

DNS_MAP = {
    'github.com': '140.82.121.3',
    'api.github.com': '140.82.121.6',
    'codeload.github.com': '140.82.121.9',
    'objects.githubusercontent.com': '185.199.108.133',
    'raw.githubusercontent.com': '185.199.108.133',
    'results-receiver.actions.githubusercontent.com': '140.82.114.21',
    'binaries.prisma.sh': '172.66.156.100',
    'binaries-failover.prisma.sh': '172.66.156.100',
    'r2.prisma.sh': '172.66.156.100',
    'maxp.online': '104.21.52.106',
}

def resolve_host(host):
    if host in DNS_MAP:
        return DNS_MAP[host]
    return host

def handle_client(client_sock):
    try:
        req = b''
        while b'\r\n\r\n' not in req:
            chunk = client_sock.recv(4096)
            if not chunk:
                break
            req += chunk

        first_line = req.split(b'\r\n')[0].decode('latin1')
        parts = first_line.split()
        if len(parts) >= 2 and parts[0] == 'CONNECT':
            target = parts[1]
            host, port = target.split(':')
            port = int(port)
            ip = resolve_host(host)
            remote_sock = socket.create_connection((ip, port), timeout=10)
            client_sock.sendall(b'HTTP/1.1 200 Connection Established\r\n\r\n')
            
            # Pipe data
            sockets = [client_sock, remote_sock]
            while True:
                r, _, _ = select.select(sockets, [], [], 60)
                if not r:
                    break
                for s in r:
                    other = remote_sock if s is client_sock else client_sock
                    data = s.recv(16384)
                    if not data:
                        return
                    other.sendall(data)
    except Exception:
        pass
    finally:
        try: client_sock.close()
        except: pass

def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('127.0.0.1', 8999))
    server.listen(128)
    print("Local proxy listening on 127.0.0.1:8999", flush=True)
    while True:
        client, _ = server.accept()
        t = threading.Thread(target=handle_client, args=(client,), daemon=True)
        t.start()

if __name__ == '__main__':
    main()
