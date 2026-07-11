# SINGULAR Alpha — acesso público mobile

## URL pública

Após o merge em `main`, o workflow **Publish mobile test site** publica o artefato em:

`https://bahalus.github.io/Singular/mobile.html`

O acesso usa HTTPS e caminhos relativos, portanto o manifest, o service worker, os módulos, os estilos e os ícones permanecem sob o subcaminho `/Singular/`.

## Publicação reproduzível

```bash
npm ci
npm run build:public
npx playwright install chromium
npm run test:public-deployment
```

O diretório `dist/` produzido por `npm run build:public` é o mesmo artefato enviado ao GitHub Pages. Em pull requests, o workflow apenas monta, testa e anexa o artefato; o deploy público ocorre em `main`.

## Android

1. Abra a URL no Chrome usando HTTPS.
2. Confirme que a ficha abre e restaura a última sessão.
3. No menu do navegador, toque em **Instalar app** ou **Adicionar à tela inicial**.
4. Abra o ícone instalado e confirme o modo standalone.
5. Após uma primeira carga completa, ative o modo avião e reabra o app.
6. Altere PV/PF atuais, feche e reabra; confirme a persistência local.
7. Exporte a ficha antes de trocar navegador, perfil ou aparelho.

## iPhone/iPad

1. Abra a URL no Safari usando HTTPS.
2. Confirme que a ficha abre e restaura a última sessão.
3. Toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.
4. Abra o ícone criado e confirme a abertura sem a interface normal do Safari.
5. Após uma primeira carga completa, ative o modo avião e reabra o app.
6. Altere PV/PF atuais, feche e reabra; confirme a persistência local.
7. Exporte a ficha antes de trocar navegador, perfil, aparelho ou limpar dados do Safari.

## Atualização

1. Exporte uma cópia de segurança da ficha.
2. Volte à URL pública com conexão ativa.
3. Feche todas as janelas instaladas da SINGULAR e abra novamente.
4. Caso a atualização ainda não apareça, recarregue a página no navegador e reabra o app instalado.

A atualização substitui apenas o shell em cache. Os snapshots locais permanecem no armazenamento do navegador; o workflow e o service worker não executam limpeza de `localStorage` ou IndexedDB.

## Exportação e recuperação

- Use a exportação da própria ficha para gerar o arquivo de backup.
- Guarde o arquivo fora do navegador, preferencialmente em armazenamento sincronizado.
- Para recuperar, abra a mesma URL pública e importe o arquivo exportado.
- Dados locais não são sincronizados automaticamente entre navegadores, perfis ou aparelhos.

## Rollback para `v0.9.0-alpha.1`

A tag publicada é imutável e não deve ser reescrita. Para reconstruir a baseline:

```bash
git fetch --tags --prune origin
git checkout --detach v0.9.0-alpha.1
npm ci
npm run build:public
```

Para rollback do site, crie uma branch de recuperação a partir da tag, aplique apenas o workflow e o script de empacotamento quando necessários, valide o artefato e publique por uma PR normal. Não mova a tag `v0.9.0-alpha.1` e não substitua a release já publicada.
