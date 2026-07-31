# GCS — Skill level update pipeline

## Escopo e evidência

**Status: Confirmada.** Evidência observada em `richardwilkes/gcs`, arquivos `model/gurps/skill.go` e `model/gurps/skill_default.go`, tipos `Skill`, `SkillDefault` e `Level`. Este documento registra somente os caminhos cuja implementação foi diretamente observada.

## Fluxo de atualização

**Confirmada.** `Skill.SetRawPoints()` grava `Points` e chama imediatamente `UpdateLevel()`.

**Confirmada.** `Skill.UpdateLevel()` salva o `LevelData` anterior, recalcula `DefaultedFrom` por `bestDefaultWithPoints(nil)`, substitui `LevelData` pelo resultado de `CalculateLevel(nil)` e retorna se o `LevelData` mudou.

**Confirmada.** `Skill.CalculateLevel()` obtém primeiro `AdjustedPoints(nil)`. Técnicas são encaminhadas a `CalculateTechniqueLevel(...)`; demais skills são encaminhadas a `CalculateSkillLevel(...)`.

## Pontos ajustados

**Confirmada.** Em skill não-container, `AdjustedPoints()` chama `AdjustedPointsForNonContainerSkillOrTechnique()`. Havendo `Entity`, essa função soma `Entity.SkillPointBonusFor(...)` aos pontos brutos e aplica piso zero. Containers retornam a soma recursiva dos pontos ajustados dos filhos.

## CalculateSkillLevel

**Confirmada.** `CalculateSkillLevel()` inicia o nível relativo em `attrDiff.Difficulty.BaseRelativeLevel()` e obtém o nível-base por `Entity.ResolveAttributeCurrent(attrDiff.Attribute)`.

**Confirmada.** Quando `SheetSettings.UseHalfStatDefaults` está ativo, o valor-base usado passa a `floor(attribute / 2) + 5`.

**Confirmada.** Para dificuldade `Wildcard`, os pontos são divididos por três. Para outra dificuldade, quando `def != nil` e `def.Points > 0`, `def.Points` é somado aos pontos. Depois os pontos são truncados por `Floor()`.

**Confirmada.** A progressão implementada é: 1 ponto mantém o `BaseRelativeLevel`; mais de 1 e menos de 4 acrescenta 1; 4 ou mais acrescenta `1 + floor(points / 4)`. Sem pontos utilizáveis, um default não-Wildcard com `def.Points < 0` define o relativo como `def.AdjLevel - level`; nos demais casos o nível passa a `fxp.Min` e o relativo a zero.

**Confirmada.** Para nível válido, o relativo é somado ao valor-base. Havendo default não-Wildcard, se o resultado ficar abaixo de `def.AdjLevel`, o nível é elevado a `def.AdjLevel`.

**Confirmada.** Havendo `Entity`, `Entity.SkillBonusFor(...)` é somado ao nível absoluto e ao relativo. Separadamente, `Entity.EncumbranceLevel(true).Penalty().Mul(encumbrancePenaltyMultiplier)` é somado apenas ao nível absoluto; quando não zero, essa parcela é registrada no tooltip.

## CalculateTechniqueLevel

**Confirmada.** `CalculateTechniqueLevel()` inicia `level` em `fxp.Min` e só tenta resolver a técnica quando `Entity` e `SkillDefault` são não nulos.

**Confirmada.** Quando `def.DefaultType == SkillID`, a função obtém candidatos por `Entity.SkillMatching(def.Name, def.Specialization, replacements, requirePoints, excludes)`. Para cada candidato, rejeita a ligação que aponta de volta à técnica corrente: em outra técnica, compara nome e especialização de `TechniqueDefault`; em skill comum, compara nome e especialização de `DefaultedFrom`.

**Confirmada.** Para cada candidato utilizável baseado em Skill, a função marca temporariamente `sk.String()` em `excludes`, calcula `sk.CalculateLevel(excludes).Level`, conserva o maior nível encontrado e depois restaura o estado anterior desse item no mapa de exclusões.

**Confirmada.** Para defaults cujo tipo não é `SkillID`, o nível-base é obtido por `def.SkillLevelFast(e, replacements, true, nil, false) - def.Modifier`; a subtração remove o modificador do default antes das etapas seguintes.

**Confirmada.** Resolvido um nível-base válido, a função o preserva em `baseLevel` e soma `def.Modifier` a `level`. Se `diffLevel == difficulty.Hard`, subtrai 1 dos pontos recebidos. Apenas pontos restantes maiores que zero são copiados para `relativeLevel`.

**Confirmada.** Em seguida, `Entity.SkillBonusFor(name, specialization, "", tags, &tooltip)` é somado a `relativeLevel`, e o relativo resultante é somado a `level`.

**Confirmada.** Quando `limitModifier != nil`, a função calcula `maximum = baseLevel + *limitModifier`. Se o nível calculado exceder esse máximo, reduz `relativeLevel` pela diferença e fixa `level` no máximo.

**Confirmada.** O resultado é um `Level` contendo o nível final, o relativo final e o tooltip acumulado por `SkillBonusFor()`.

## Seleção de defaults

**Confirmada.** `bestDefaultWithPoints()` retorna `nil` para técnicas. Para as demais skills, chama `bestDefault()`. Quando existe default selecionado, calcula uma baseline como `floor(ResolveAttributeCurrent(AdjustedDifficulty().Attribute) + AdjustedDifficulty().Difficulty.BaseRelativeLevel())`, grava `best.AdjLevel` com `floor(best.Level)` e deriva `best.Points` comparando esse nível com a baseline: igualdade produz 1 ponto; baseline + 1 produz 2; acima disso produz `4 * (level - (baseline + 1))`; abaixo da baseline produz o negativo de `max(level, 0)`.

**Confirmada.** `bestDefault()` retorna `nil` quando `EntityFromNode(s)` é `nil`. A própria skill é inserida no mapa de exclusões antes da avaliação dos candidatos.

**Confirmada.** `bestDefault()` obtém candidatos por `resolveToSpecificDefaults()`. Candidatos equivalentes ao default explicitamente excluído ou que participem de uma cadeia de default que retorna à própria skill são ignorados. Cada candidato restante é avaliado por `calcSkillDefaultLevel()`; resultados `fxp.Min` são descartados. O maior nível encontrado é conservado em clone produzido por `CloneWithoutLevelOrPoints()`, com `Level` preenchido pelo nível calculado.

**Confirmada.** Existe uma exceção explícita à escolha dinâmica do maior nível. Quando `excluded == nil`, há `DefaultedFrom`, `AdjustedPoints(nil) > 0` e a skill declara `Defaults`, `bestDefault()` tenta conservar o default corrente se ele continuar resolvível. Se um candidato for equivalente ao `DefaultedFrom`, ele é guardado como `preferredDef`; ao final, `preferredDef` tem precedência sobre o candidato de maior nível.

**Confirmada.** `calcSkillDefaultLevel()` chama `SkillDefault.SkillLevel(...)`. Se o resultado for `fxp.Min`, devolve-o sem outro ajuste. Para default baseado em skill, procura `Entity.BestSkillMatching(...)` e, quando encontra uma skill, subtrai do nível o `Entity.SkillBonusFor(...)` aplicável à skill encontrada antes de devolver o resultado.

**Confirmada.** `inDefaultChain()` só percorre defaults baseados em skill. Ele consulta `Entity.SkillMatching(...)`, retorna verdadeiro se encontrar a própria skill e, para outros resultados ainda não visitados, percorre recursivamente `DefaultedFrom`.

**Confirmada.** `resolveToSpecificDefaults()` conserva diretamente defaults que não sejam baseados em skill ou quando não existe Entity. Para defaults baseados em skill com Entity, expande os resultados de `Entity.SkillMatching(...)` em cópias específicas do default, fixando nome e especialização com critérios `criteria.IsText`. Quando a skill correspondente possui optional specialization e o critério original de especialização casa com a especialização requerida, a cópia recebe `Modifier -= 2`.

**Confirmada.** `resolveToSpecificDefaults()` também sintetiza defaults de `-2` para outras skills de mesmo nome e mesma especialização requerida que possuam optional specialization, mas somente quando a própria skill não possui optional specialization. Esses candidatos são obtidos por `Entity.SkillNamed(...)`; candidatos sem optional specialization ou com especialização requerida diferente são ignorados.

## SkillDefault.SkillLevel e SkillLevelFast

**Confirmada.** `SkillDefault.SkillLevel()` despacha por `DefaultType`. `ParryID` e `BlockID` obtêm o melhor nível por `best()`, dividem por dois com `Floor()`, somam 3 e respectivamente `Entity.ParryBonus` ou `Entity.BlockBonus`, e então aplicam `finalLevel()`. `SkillID` aplica `finalLevel()` diretamente ao resultado de `best()`. Outros tipos delegam a `SkillLevelFast()`.

**Confirmada.** `best()` percorre `Entity.SkillMatching(...)`, rejeita candidatos cuja TL não satisfaça `isTLPermitted()`, chama `Skill.CalculateLevel(excludes).Level` nos candidatos que podem superar o melhor valor corrente e conserva o maior resultado calculado.

**Confirmada.** `SkillLevelFast()` trata `DodgeID` usando `Entity.Dodge(Entity.EncumbranceLevel(false))`; quando `ruleOf20` é verdadeiro, limita esse valor a 20 antes de `finalLevel()`.

**Confirmada.** Em `SkillLevelFast()`, `ParryID`, `BlockID` e `SkillID` usam `bestFast()`. Diferentemente de `best()`, `bestFast()` lê diretamente `sk.LevelData.Level`, sem chamar `CalculateLevel()`, após o mesmo filtro de TL observado.

**Confirmada.** Para tipos diferentes de Dodge, Parry, Block e Skill, `SkillLevelFast()` primeiro exige `isTLPermitted()`, resolve o valor por `Entity.ResolveAttributeCurrent(s.Type())`, aplica teto 20 quando `ruleOf20` é verdadeiro e, se `SheetSettings.UseHalfStatDefaults` estiver ativo, transforma o valor em `floor(level / 2) + 5`. O resultado passa por `finalLevel()`.

**Confirmada.** `finalLevel()` soma `SkillDefault.Modifier` somente quando o nível recebido não é `fxp.Min`; `fxp.Min` é preservado.

**Confirmada.** `isTLPermitted()` aceita imediatamente `criteria.AnyNumber`. Nos demais casos usa a TL da skill recebida; se ela estiver vazia, usa `Entity.Profile.TechLevel` quando há Entity. O valor passa por `ExtractTechLevel()`, valores negativos são elevados a zero e a decisão final é `WhenTL.Compare.Matches(WhenTL.Qualifier, tl)`.

## Troca explícita de default

**Confirmada.** `resolvableDefaults()` avalia os candidatos de `resolveToSpecificDefaults()` por `calcSkillDefaultLevel()`, descarta `fxp.Min`, elimina equivalentes duplicados, clona os candidatos restantes sem nível/pontos, preenche `Level` e ordena o resultado de forma estável por nível decrescente.

**Confirmada.** `AlternateDefaultsAvailable()` exige `CanSwapDefaults()`, pelo menos um default declarado e mais de um candidato resolvível.

**Confirmada.** `SwapToNextDefault()` não faz nada com menos de dois candidatos. Caso contrário, localiza o default corrente entre os candidatos, seleciona o próximo com retorno circular ao início e grava-o em `DefaultedFrom`. Se o default recém-selecionado formar uma cadeia que retorna à própria skill, `DefaultSkill()` é consultado e o `DefaultedFrom` da skill-alvo é limpo quando ela existe e é diferente da skill corrente. Havendo Entity, o método termina chamando `Entity.Recalculate()`.

## Limites desta passagem

- **Não confirmada nesta passagem:** mecanismos internos de matching chamados por `Entity.BestSkillMatching()`, `Entity.SkillMatching()` e `Entity.SkillNamed()`.
