# Contrato de biblioteca de modificadores de Traços

`TraitModifierLibraryAdapter` é o adaptador de domínio para definições de
biblioteca com `domain=trait-modifier` e `schemaVersion=1`.

O envelope portátil continua pertencendo ao núcleo de biblioteca existente.
O payload declara apenas:

- um modificador canônico validado por `TraitModifiers`;
- compatibilidade explícita (`unrestricted` ou `declared`);
- restrições opcionais por papel, id e tags requeridas ou excluídas.

O adaptador não infere compatibilidade a partir do nome, notas, livro ou dados
`raw`. Uma declaração incompatível bloqueia a seleção. Sem um Traço-alvo, a
seleção permanece portátil, mas carrega diagnóstico de compatibilidade não
avaliada.

A seleção preserva separadamente a origem do item (`externalIds`, `version`,
`source`, `importMeta` e `raw`) e o `source` próprio do modificador. Ela não
aplica o modificador, não calcula custo e não cria catálogo, registry,
persistência ou composition root paralelo. A aplicação futura continua
responsável por transformar essa seleção em intenção canônica.
