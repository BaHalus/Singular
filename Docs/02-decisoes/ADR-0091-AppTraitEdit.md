# ADR-0063 — Contratos de aplicação para edição estrutural de Traits

**Status:** Aceito  
**Data:** 2026-06-27  
**Decisão:** APP-TRAIT-EDIT-1.0

## Contexto

`Character` já possui `traits` canônicos, projeções por papel para `advantages`, `perks`, `disadvantages` e `quirks`, `TraitFields` para preservar dados editoriais e `TraitPointValue` para separar autoridades de pontos.

A Alpha mobile já lê Traits, mas ainda não possui comandos de aplicação para edição estrutural segura. A interface não deve escrever diretamente no `Character`, nem calcular custo de vantagens, desvantagens ou modificadores.

## Decisão

Criar operações puras em:

```text
src/domain/character/TraitsOperations.js
```

e handlers isolados de aplicação em:

```text
src/application/traits/TraitCommandHandlers.js
```

Os comandos são:

```text
trait.add
trait.update
trait.remove
trait.reorder
```

Esta decisão não registra os comandos no bootstrap da Alpha e não altera a interface. O registro acontecerá depois, no catálogo/composição de comandos da Alpha, quando a fila estrutural chegar nessa etapa.

## Autoridade de pontos

A aplicação preserva `points` legado, `pointValue`, `source`, `modifiers`, metadados e papéis declarados. Ela não interpreta modificadores, não soma custos, não calcula custo por nível e não reconcilia divergências mecânicas.

Qualquer valor em `declaredPoints`, `importedPoints` ou `calculatedPoints` permanece apenas como autoridade já declarada no payload. O handler só troca snapshots validados pelo domínio.

## Papéis customizados

`Traits` já aceita `role` como string não vazia. A edição estrutural mantém esse comportamento e não restringe a interface aos quatro papéis projetados. Papéis conhecidos continuam sendo projetados para as coleções legadas; papéis customizados permanecem em `traits` sem virar vantagem ou desvantagem automaticamente.

## Operações

As operações usam identidade por `id`:

- adicionar Trait ao fim da coleção;
- aplicar patch permitido e validado;
- remover Trait existente;
- reordenar Trait existente para índice válido;
- buscar por ID.

`updateTrait` permite patch apenas dos campos já suportados por `TraitFields`, além de `role`, `source` e `pointValue`. `source` e `pointValue` podem ser atualizados parcialmente, sempre reconstruindo o Trait por `createTrait`.

## Fronteiras

Esta decisão não cria biblioteca de vantagens/desvantagens, não cria catálogo oficial, não integra GCS/GCA amplo e não toca `src/ui/mobile/*`, `mobile.html`, persistência concreta, `CommandRegistry.js`, `AlphaMobilePersistenceBootstrap.js` ou composition roots.

## Consequências

### Positivas

- Traits passam a ter contrato de edição estrutural portátil;
- interface futura poderá emitir intenção sem manipular Character diretamente;
- revisão, histórico, undo/redo e atomicidade continuam pertencendo ao `CommandExecutor`;
- papéis customizados não são perdidos;
- custos não são recalculados fora do motor.

### Custos

- comandos ainda não ficam disponíveis na Alpha até a etapa de catálogo/composição;
- integridade semântica de modificadores e custos continua fora da aplicação;
- bibliotecas oficiais e importadores amplos permanecem fora de escopo.

## Alternativas rejeitadas

### Editar `advantages`, `disadvantages`, `perks` e `quirks` diretamente

Rejeitado porque essas coleções são projeções de `traits` e devem continuar derivadas pelo domínio.

### Calcular custo de Traits na aplicação

Rejeitado porque violaria a regra de que o motor calcula e a aplicação apenas orquestra comandos.

### Restringir papéis aos papéis conhecidos

Rejeitado porque o domínio já preserva papéis customizados e importações externas podem carregar categorias não previstas.

## Invariantes

1. identidade sempre por `id`;
2. operações são puras e imutáveis;
3. snapshots são reconstruídos por `createCharacter`;
4. projeções legadas continuam derivadas de `traits`;
5. custos não são calculados na aplicação;
6. valores importados e declarados são preservados;
7. nenhuma interface é alterada nesta etapa;
8. registro dos handlers fica para o catálogo/composição da Alpha.