#!/bin/zsh

set -u

REPOSITORY_ROOT="${0:A:h}"
RECIPE_MANAGER_URL="http://127.0.0.1:8000/recipemanager/index.html"

cd "$REPOSITORY_ROOT" || exit 1

clear
echo "Starting Recipe Manager..."
echo

python3 -u recipemanager/local_server.py &
server_pid=$!

stop_server() {
    if kill -0 "$server_pid" 2>/dev/null; then
        kill "$server_pid" 2>/dev/null
        wait "$server_pid" 2>/dev/null
    fi
}

trap stop_server EXIT INT TERM

for attempt in {1..30}; do
    if curl --fail --silent "$RECIPE_MANAGER_URL" >/dev/null 2>&1; then
        echo
        echo "Recipe Manager is ready. Opening Safari..."
        echo "Keep this window open while making changes."
        echo "Press Control-C here when you are finished."
        echo
        open -a Safari "$RECIPE_MANAGER_URL"
        wait "$server_pid"
        exit $?
    fi

    if ! kill -0 "$server_pid" 2>/dev/null; then
        break
    fi

    sleep 0.2
done

echo
echo "Recipe Manager could not start. Port 8000 may already be in use."
echo "Press Return to close this window."
read
exit 1
