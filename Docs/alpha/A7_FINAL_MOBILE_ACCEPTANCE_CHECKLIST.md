# A7 final mobile acceptance checklist

Este checklist registra a aceitacao manual da fatia A7 final antes de iniciar A8. Ele nao altera o status das etapas A1-A8.

## Ambiente

- Viewport mobile real ou equivalente.
- `mobile.html` servido pelo fluxo local do repositorio.
- Estado local limpo para primeira abertura, seguido de save/remount/load.

## Verificacoes

- [ ] A ficha abre sem tela branca e sem erro visivel.
- [ ] O cabecalho rapido permanece visivel e nao causa overflow horizontal critico.
- [ ] Modo Criacao mostra editores estruturais e estados vazios com orientacao de cadastro.
- [ ] Modo Mesa esconde editores estruturais e explica que cadastro permanente volta para Criacao.
- [ ] PV e PF atuais continuam ajustaveis em Mesa.
- [ ] Secoes colapsaveis preservam botao tocavel e estado expandido/colapsado.
- [ ] Textos longos em itens, detalhes e estados vazios quebram linha sem truncamento critico.
- [ ] Salvar, desmontar/remontar e carregar preservam identidade, tracos, ataques e equipamentos editados.
- [ ] Exportar/importar nao perde dados editados no fluxo de smoke.

## Registro na PR

```text
Checklist manual A7:
- Ambiente:
- Atrito visual encontrado:
- Correcao aplicada:
- Smoke Playwright:
- Save/remount/load:
- Riscos restantes:
```
