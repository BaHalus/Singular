ADR-0003 — Compatibilidade GCS por Preservação e Patch

Status: Aceita

Data: 2026-06-17

---

Contexto

A SINGULAR possui como objetivo secundário abrir, visualizar e editar fichas criadas no GCS (GURPS Character Sheet), especialmente em dispositivos móveis.

O GCS possui uma estrutura extremamente flexível e configurável, permitindo:

- atributos alternativos;
- características secundárias adicionais;
- sistemas personalizados;
- suplementos específicos;
- metadados próprios;
- extensões futuras.

A arquitetura inicial da SINGULAR, por outro lado, está sendo construída de forma incremental e focada inicialmente no conjunto padrão de GURPS 4ª Edição.

---

Problema

Se a SINGULAR tentar representar internamente toda a estrutura possível do GCS, a complexidade do domínio aumenta drasticamente.

Por outro lado, se a SINGULAR descartar informações que não compreende, a compatibilidade com o GCS será comprometida.

Isso inviabilizaria a edição segura de arquivos ".gcs".

---

Decisão

A SINGULAR não tentará reconstruir arquivos GCS do zero.

Ao importar um arquivo GCS, três representações poderão coexistir:

Arquivo GCS Original
        ↓
      GCS Model
        ↓
 SINGULAR Domain

---

Arquivo GCS Original

Representa o conteúdo original importado.

Objetivos:

- preservação integral;
- auditoria;
- exportação segura.

A estrutura original deve permanecer disponível enquanto possível.

---

GCS Model

Representação intermediária próxima da estrutura do GCS.

Objetivos:

- interpretar o arquivo;
- preservar campos desconhecidos;
- permitir exportação futura.

O GCS Model não precisa coincidir com o domínio da SINGULAR.

---

SINGULAR Domain

Representa apenas os conceitos efetivamente suportados pela SINGULAR.

Exemplos:

- Character;
- Attributes;
- SecondaryCharacteristics;
- Skills;
- Advantages;
- Equipment;
- State.

O domínio não deve ser inflado apenas para reproduzir todas as possibilidades do GCS.

---

Exportação

A exportação para GCS deve priorizar:

GCS Original
+
Alterações realizadas na SINGULAR
=
Novo arquivo GCS

Sempre que possível.

Essa abordagem reduz perda de informação e melhora a compatibilidade.

---

Consequências

Vantagens

- maior compatibilidade com GCS;
- preservação de dados desconhecidos;
- menor complexidade do domínio;
- evolução incremental da SINGULAR;
- menor risco de corrupção de arquivos.

Desvantagens

- necessidade de camada intermediária;
- maior complexidade do importador/exportador;
- round-trip perfeito não garantido inicialmente.

---

Compatibilidade Inicial

Objetivo da primeira implementação:

- abrir arquivos GCS;
- visualizar personagens;
- editar campos suportados;
- exportar mantendo o máximo possível da estrutura original.

Compatibilidade total com todas as extensões do GCS não é requisito inicial.

---

Status Final

A SINGULAR adota oficialmente a estratégia de:

Preservação + Patch

para interoperabilidade com arquivos GCS.
