# Singular PWA

A PWA carrega `c-Singular-v2_v0.11.2.html` e oferece instalação e funcionamento offline após o primeiro acesso.

## Publicar

1. GitHub → **Settings → Pages**.
2. Em *Build and deployment*, escolha **Deploy from a branch**.
3. Branch: `main`; pasta: `/ (root)`.
4. Salve e aguarde alguns minutos.
5. Acesse: `https://bahalus.github.io/Singular/`.

## Atualizar versão

Ao receber um novo arquivo HTML:

1. Envie-o para o repositório, por exemplo `c-Singular-v2_v0.12.0.html`.
2. Atualize o `src` do iframe em `index.html`.
3. Atualize `CACHE` e a lista `ASSETS` em `sw.js`.
4. Faça commit; o GitHub Pages publicará automaticamente.
