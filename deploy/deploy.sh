#!/bin/bash
# TekstFlyt v2 deploy script
# Usage: ./deploy.sh [frontend|backend|all]

set -e

FRONTEND_HOST="lasse@frontend.lasseruud.com"
FRONTEND_PATH="/var/www/kvtas.tekstflyt.com"
BACKEND_HOST="lasse@backend.lasseruud.com"
BACKEND_PATH="/opt/kvtas.tekstflyt.com"
REPO="https://github.com/lasseruud/tekstflyt.git"

deploy_frontend() {
    echo "=== Deploying frontend ==="

    # Build locally
    echo "Building frontend..."
    cd frontend
    npm run build
    cd ..

    # Deploy dist/ to server
    echo "Uploading to $FRONTEND_HOST..."
    rsync -avz --delete frontend/dist/ "$FRONTEND_HOST:$FRONTEND_PATH/"

    echo "Frontend deployed!"
}

deploy_backend() {
    echo "=== Deploying backend ==="

    # First time: clone. After that: pull.
    ssh "$BACKEND_HOST" "
        if [ ! -d $BACKEND_PATH/.git ]; then
            git clone $REPO $BACKEND_PATH
        else
            cd $BACKEND_PATH && git pull
        fi

        cd $BACKEND_PATH/backend

        # Create venv if missing
        if [ ! -d .venv ]; then
            python3 -m venv .venv
        fi

        # Install/update dependencies
        .venv/bin/pip install -r requirements.txt -q
    "

    echo "Backend deployed! Remember to restart the service (requires sudo):"
    echo "  ssh $BACKEND_HOST 'sudo systemctl restart tekstflyt'"
}

case "${1:-all}" in
    frontend)
        deploy_frontend
        ;;
    backend)
        deploy_backend
        ;;
    all)
        deploy_frontend
        deploy_backend
        ;;
    *)
        echo "Usage: $0 [frontend|backend|all]"
        exit 1
        ;;
esac
