# GATE-IMPORT-POWER-1.2 — Fechamento da importação de Powers

**Status:** Fechado  
**Data:** 2026-06-24  
**Dependência:** ADR-0043 e GATE-DOM-POWER-1.4

## Objetivo

Certificar a importação de agrupamentos de Powers do GCS para o `Character` canônico sem duplicar Traits, inventar vínculos ou calcular regras.

## Pipeline certificado

```text
GCS trait tree
↓
GcsTraitTreeNormalizer
↓
TraitsImporter
↓
PowersImporter
↓
ImportSnapshot.powers
↓
Character.powers
```

## Regras certificadas

- somente containers explicitamente classificados como `power` originam Powers;
- membros são associados pelo Power ancestral mais próximo por ID;
- talento é associado somente por ID explícito existente;
- associação por nome é proibida;
- referências explícitas de talento não resolvidas ficam em `unresolvedPowerLinks`;
- links não resolvidos não produzem referências inválidas no `Character`;
- fonte e modificador de poder permanecem declarações estruturais;
- tags internas de container não vazam para o agregado final;
- Traits não são copiados para dentro de Powers;
- Powers não cria contribuição direta ao Point Ledger;
- nenhuma regra GURPS é calculada pelo importador.

## Autoridades preservadas

- `TraitsImporter` normaliza e preserva Traits e ancestralidade;
- `PowersImporter` transforma agrupamentos explícitos;
- `ImportSnapshot` preserva resultado e diagnósticos;
- `Character` valida referências internas canônicas;
- Traits permanece autoridade mecânica e contábil;
- a aplicação orquestra;
- a UI não calcula.

## Evidências

- PR #58 integrou o importador isolado;
- Tests #723 concluiu com sucesso no head corrigido da PR #58;
- PR #59 integrou Powers ao snapshot e ao `CharacterImporter`;
- Tests #725 concluiu com sucesso no head final da PR #59;
- nenhuma revisão ou thread bloqueante permaneceu aberta;
- não foi criado normalizador ou catálogo paralelo de Traits.

## Regressões proibidas

- inferir talento ou membros por nome;
- associar um Trait a mais de um Power ancestral no mesmo caminho;
- copiar Traits completos para Powers;
- aplicar o modificador declarado durante importação;
- descartar silenciosamente referência explícita não resolvida;
- aceitar referência interna inválida no `Character`;
- calcular custo, NH, dano, ativação ou manutenção na camada de importação.

## Resultado

A importação estrutural de Powers está fechada para manutenção. Diagnósticos mecânicos, biblioteca, UI e regras de motor exigem etapas próprias.
