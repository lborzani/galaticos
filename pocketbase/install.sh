#!/bin/sh
# Baixa o binário do PocketBase na versão fixada (o mesmo usado na imagem de produção).
set -eu
VERSION=0.40.6
cd "$(dirname "$0")"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case $(uname -m) in x86_64) ARCH=amd64 ;; aarch64|arm64) ARCH=arm64 ;; *) echo "arquitetura não suportada" >&2; exit 1 ;; esac
curl -fsSL -o pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/pocketbase_${VERSION}_${OS}_${ARCH}.zip"
unzip -oq pb.zip pocketbase
rm pb.zip
./pocketbase --version
