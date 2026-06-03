#!/bin/sh
# Render's platform DNS fails to resolve some external hosts (e.g. HuggingFace API).
# Override /etc/resolv.conf with reliable public resolvers before starting the app.
printf 'nameserver 8.8.8.8\nnameserver 1.1.1.1\n' > /etc/resolv.conf
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
