ADR-0001 — Character Imutável

Status: Aceita

Data: 2026-06-17

---

Contexto

A primeira implementação do Aggregate Root "Character" foi realizada utilizando uma classe mutável.

Exemplo:

const character = new Character();

character.setName("Aldric");
character.addSkill(skill);
character.addCondition(condition);

Essa abordagem permitiu validar rapidamente a estrutura inicial do domínio.

Entretanto, durante a evolução da arquitetura da SINGULAR, observou-se que esse modelo entra em conflito com diversos princípios estabelecidos pela Constituição, pelos Objetivos Arquiteturais e pelos Princípios de Design.

---

Problema

Objetos mutáveis apresentam algumas desvantagens para os objetivos da plataforma:

- aumentam efeitos colaterais;
- dificultam auditoria;
- dificultam rastreamento de alterações;
- dificultam Undo/Redo;
- dificultam testes previsíveis;
- dificultam serialização segura;
- tornam mais difícil implementar Commands e histórico.

Além disso, métodos mutáveis misturam:

- estrutura de dados;
- comportamento;
- intenção de alteração.

Essa mistura reduz a clareza do domínio.

---

Decisão

O Aggregate Root "Character" deverá evoluir para um modelo baseado em:

- objetos de dados simples;
- composição;
- funções puras;
- imutabilidade preferencial.

Em vez de métodos mutáveis internos:

character.addSkill(skill);

serão utilizadas funções explícitas:

const updatedCharacter =
  addCharacterSkill(character, skill);

---

Consequências

Vantagens

- maior previsibilidade;
- melhor compatibilidade com Commands;
- melhor compatibilidade com Undo/Redo;
- melhor auditabilidade;
- testes mais simples;
- menos efeitos colaterais;
- alinhamento com a arquitetura definida para a SINGULAR.

Desvantagens

- criação de cópias estruturais;
- maior quantidade de funções auxiliares;
- curva de aprendizado ligeiramente maior para novos contribuidores.

---

Implementação

A migração ocorrerá gradualmente.

Etapa 1:

- manter compatibilidade com a implementação atual;
- criar testes que descrevam o comportamento esperado.

Etapa 2:

- substituir métodos mutáveis por funções puras.

Etapa 3:

- remover API mutável legada.

---

Status Final

A arquitetura oficial da SINGULAR passa a considerar:

- objetos de domínio simples;
- composição;
- funções puras;
- imutabilidade preferencial;

como direção principal para evolução do Aggregate Root Character.
