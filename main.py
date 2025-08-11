#!/usr/bin/env python3
import http.server, socketserver, json, threading, argparse, time, os
from urllib.parse import urlparse
lock = threading.Lock()

BOARD_FILE = "board.json"
COOLDOWN_DEFAULT = 5

def make_board(width, height, default_color="#ffffff"):
    return [[default_color for _ in range(width)] for _ in range(height)]

def load_board(path, width, height):
    if not os.path.exists(path):
        return make_board(width, height)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data["pixels"]
    except:
        return make_board(width, height)

def save_board(path, board):
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"width": len(board[0]), "height": len(board), "pixels": board}, f)

class PlaceHandler(http.server.BaseHTTPRequestHandler):
    def _set_headers(self, status=200, ctype="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")  # allow cross-origin
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path).path
        if parsed == "/board":
            with lock:
                data = {"width": self.server.width, "height": self.server.height, 
                        "pixels": self.server.board, "cooldown": self.server.cooldown}
            self._set_headers()
            self.wfile.write(json.dumps(data).encode())
        else:
            self.send_error(404, "Not found")

    def do_POST(self):
        parsed = urlparse(self.path).path
        if parsed == "/set":
            length = int(self.headers.get("Content-Length", 0))
            try:
                data = json.loads(self.rfile.read(length))
            except:
                self.send_error(400, "Invalid JSON")
                return
            x, y, color = data.get("x"), data.get("y"), data.get("color")
            if not (isinstance(x, int) and isinstance(y, int) and isinstance(color, str)):
                self.send_error(400, "Bad payload")
                return
            if not (0 <= x < self.server.width and 0 <= y < self.server.height):
                self.send_error(400, "Out of bounds")
                return
            now = time.time()
            ip = self.client_address[0]
            last = self.server.rate_limit.get(ip, 0)
            if now - last < self.server.cooldown:
                self.send_error(429, f"Cooldown: wait {int(self.server.cooldown - (now-last))}s")
                return
            if not (color.startswith("#") and len(color) == 7):
                self.send_error(400, "Invalid color")
                return
            with lock:
                self.server.board[y][x] = color
                self.server.rate_limit[ip] = now
                save_board(BOARD_FILE, self.server.board)
            self._set_headers(200, "text/plain")
            self.wfile.write(b"OK")
        elif parsed == "/clear":
            with lock:
                self.server.board = make_board(self.server.width, self.server.height)
                save_board(BOARD_FILE, self.server.board)
            self._set_headers(200, "text/plain")
            self.wfile.write(b"OK")
        else:
            self.send_error(404, "Not found")

class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

def run_server(port, width, height, cooldown):
    board = load_board(BOARD_FILE, width, height)
    server = ThreadedServer(("0.0.0.0", port), PlaceHandler)
    server.width = width
    server.height = height
    server.cooldown = cooldown
    server.board = board
    server.rate_limit = {}
    print(f"Serving backend on http://0.0.0.0:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        with lock:
            save_board(BOARD_FILE, server.board)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--width", type=int, default=200)
    parser.add_argument("--height", type=int, default=100)
    parser.add_argument("--cooldown", type=int, default=COOLDOWN_DEFAULT)
    a = parser.parse_args()
    run_server(a.port, a.width, a.height, a.cooldown)
