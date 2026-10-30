import http.server, functools, sys
root = sys.argv[1]; port = int(sys.argv[2])
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2'}
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory=root)).serve_forever()
