# Guarda executável de fronteiras arquiteturais

Esta guarda transforma a direção arquitetural da SINGULAR em uma verificação
executável pela suíte `npm test`:

> O motor calcula. O schema declara. A aplicação orquestra. A UI apresenta e
> coleta intenção. A persistência guarda snapshots.

## Inventário da árvore real

A `main` usada para criar a guarda foi
`debecc992f17c121f4f0777ba6a5c4a86ecc7008`. A produção JavaScript está
organizada assim:

- `src/domain/**`: entidades, operações, importação de dados e serviços de
  domínio;
- `src/engine/**`: resolvers e resultados mecânicos portáveis;
- `src/application/**`: comandos, sessão, histórico, projeções, ports,
  bootstrap e coordenação de persistência;
- `src/infrastructure/persistence/**`: adaptadores concretos de persistência no
  navegador;
- `src/infrastructure/runtime/**`: adaptadores concretos de clock e geração de
  IDs;
- `src/ui/**`: apresentação mobile, controles e composition root;
- `src/library/**`: definições, registro e orquestração da biblioteca modular.

Não existe um diretório `src/schema` separado. Os schemas, validadores,
serializadores e valores portáveis são declarados junto aos respectivos
contratos de domínio, engine e aplicação. A guarda preserva essa organização;
ela não cria uma camada paralela.

A persistência também não é uma camada única: ports, coordenação e repositórios
em memória pertencem à aplicação, enquanto o armazenamento concreto do
navegador fica em `src/infrastructure/persistence/**`. Por isso, a fronteira
"persistência concreta" aponta nominalmente para esse último diretório, e a
proibição `persistência -> UI` cobre ambos os diretórios de persistência.

## Padrões de importação observados

Os módulos usam ESM e imports relativos com extensão `.js`, frequentemente em
declarações multilinha. Há reexports `export ... from` em módulos de índice.
Não havia `import()` relativo na produção no momento do inventário, mas a guarda
o reconhece para impedir que uma dependência proibida seja escondida por
carregamento dinâmico. Imports de pacotes e módulos nativos não são fronteiras
relativas e ficam fora desta análise.

## Fronteiras protegidas

A guarda falha quando encontra qualquer uma destas dependências diretas:

1. domínio ou engine para UI;
2. domínio ou engine para aplicação;
3. domínio ou engine para persistência concreta;
4. aplicação para UI;
5. persistência de aplicação ou infraestrutura para UI;
6. módulo de produção cujo nome começa com `Trait` para módulo `Equipment`;
7. módulo de produção cujo nome começa com `Equipment` para módulo `Trait`.

Somente arquivos `.js` de produção sob `src/**` são analisados. Arquivos
`*.test.js`, `*.spec.js` e diretórios nomeados `test`, `tests`, `__tests__`,
`fixture` ou `fixtures` são ignorados. Documentação e scripts de build estão
fora de `src/**` e, portanto, não entram na varredura.

## Diagnóstico e exceções

Cada diagnóstico contém o arquivo e a posição de origem, o import relativo, o
alvo resolvido e o identificador da fronteira violada. A resolução aceita
caminhos com `.` e `..`, extensão omitida e `index.js`.

Nenhuma exceção foi necessária para a árvore inventariada. A guarda não mantém
baseline de violações nem lista genérica de exclusões. Uma exceção futura deve
ser nominal, justificada neste documento e coberta por regressão específica.

## Execução

Teste focal:

```bash
node --test src/architecture/ArchitectureBoundaryGuard.test.js
```

A suíte padrão também executa a guarda e inclui uma varredura da árvore real:

```bash
npm test
```
