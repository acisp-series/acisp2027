#!/bin/bash
# Double-click this file (macOS) to preview the ACISP 2027 site locally.
# It starts a small web server in this folder and opens your browser.
# Press Ctrl+C in this window to stop the server.

cd "$(dirname "$0")" || exit 1

PORT=8000
# If 8000 is busy, try the next few ports.
while lsof -i ":$PORT" >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://localhost:$PORT/"
echo "Serving ACISP 2027 at $URL"
echo "Keep this window open. Press Ctrl+C to stop."

# Open the browser once the server is up.
( sleep 1; open "$URL" ) &

exec python3 -m http.server "$PORT"
