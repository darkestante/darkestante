#!/bin/zsh

set -e

if [ -z "$1" ]; then
  echo 'Uso: ./publish-site.sh "mensagem do ajuste"'
  exit 1
fi

git add -A

if git diff --cached --quiet; then
  echo "Nenhuma alteração nova para publicar."
  exit 0
fi

git commit -m "$1"
git push origin main

echo "Publicado no GitHub. A Netlify vai iniciar o deploy automático."
