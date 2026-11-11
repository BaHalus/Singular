#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verificar_versao.py — Guardião da FONTE ÚNICA DE VERSÃO do Singular-v2.

REGRA QUE ESTE SCRIPT DEFENDE
------------------------------
A versão do programa vive em UMA ÚNICA FONTE: o elemento
    <meta name="app-version" content="X.Y.Z">
do cabeçalho do HTML. Todos os lugares que exibem a versão (barra de ferramentas,
guia "?", título da aba, nome do arquivo exportado) devem puxá-la dessa meta —
nunca repetir o número digitado em outro ponto do arquivo.

O que é PERMITIDO (não é violação):
  * O conteúdo da própria <meta name="app-version"> (a fonte única);
  * Qualquer menção DENTRO DE COMENTÁRIOS (changelog, notas históricas tipo
    "corrigido na v0.0.NNN"); esses registros fazem parte da história do projeto.
  * Valores de identificadores técnicos internos escritos como literal de string —
    hoje apenas o campo `front` das bibliotecas RAW (ex.: 'singular-v0.0.65'),
    que precisa permanecer compatível byte a byte com arquivos já exportados por
    versões antigas. Não são rótulos exibidos ao usuário nem versão do programa.
O que é PROIBIDO:
  * Qualquer número X.Y.Z fora de comentário em qualquer outra parte do código
    (rótulo estático, texto escrito à mão, duplicação da meta etc.).

USO
---
    python3 verificar_versao.py <arquivo.html> [--quiet]

Saída: linha(s) com o problema encontrado e um resumo final.
Códigos de retorno: 0 = tudo certo | 1 = violações encontradas | 2 = uso incorreto.

Limitações (documentadas): heurística para comentar blocos de código; não avalia
strings de terceiros (ex.: URLs de bibliotecas externas mencionando versões). A
regra prática continua valendo: versão do Singular só na meta.
"""

import re
import sys


def read_html(path: str) -> str:
    data = open(path, "rb").read()
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        print("[aviso] arquivo não é UTF-8 válido; leitura com substituição.")
        return data.decode("utf-8", errors="replace")


def blank_out(text: str) -> str:
    """Troca por espaços tudo que é comentário (para a varredura ignorar histórico),
    preservando comprimento e contagem de linhas (posições continuam válidas)."""
    out = list(text)

    # 1) Comentários HTML <!-- ... --> (blocos inteiros, inclusive multilinha)
    i = 0
    n = len(out)
    while True:
        s = text.find("<!--", i)
        if s == -1:
            break
        e = text.find("-->", s + 4)
        if e == -1:
            break
        for k in range(s, e + 3):
            if out[k] != "\n":
                out[k] = " "
        i = e + 3

    # 2) Blocos de comentário de código /* ... */
    for m in re.finditer(r"/\*.*?\*/", "".join(out), flags=re.S):
        for k in range(m.start(), m.end()):
            if out[k] != "\n":
                out[k] = " "

    # 3) Linhas de comentário de código // ... até o fim da linha
    joined = "".join(out)
    for m in re.finditer(r"(?<!:)//[^\n]*", joined):
        for k in range(m.start(), m.end()):
            if out[k] != "\n":
                out[k] = " "

    return "".join(out)


def find_meta_declarations(cleaned: str):
    """Devolve (lista_declaracoes, conteudo_da_fonte_unica, posicao_do_conteudo)."""
    decs = []
    for m in re.finditer(r"<meta\b([^>]*)>", cleaned):
        found = {}
        for g in re.findall(r"([\w-]+)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))", m.group(1)):
            found[g[0]] = g[1] or g[2] or g[3]
        if found.get("name") == "app-version":
            decs.append((m.start(), m.end(), found.get("content")))
    return decs


# Exceções estruturais documentadas: identificadores técnicos internos que podem
# carregar versões históricas no valor (não são rótulos exibidos ao usuário).
TECH_ID_PATTERNS = (
    r"\bfront\s*:\s*'[^']*'",      # campo front das bibliotecas RAW, legado
    r'\bfront\s*:\s*"[^"]*"',
)

def tech_id_spans(cleaned: str):
    spans = []
    for pat in TECH_ID_PATTERNS:
        for m in re.finditer(pat, cleaned):
            spans.append((m.start(), m.end()))
    return spans

def find_version_literals(cleaned: str, meta_spans):
    """Encontra todo X.Y.Z fora dos intervalos permitidos (metas e ids técnicos)."""
    allowed_spans = list(meta_spans) + tech_id_spans(cleaned)
    hits = []
    for m in re.finditer(r"(?<!\d)(\d+\.\d+\.\d+)(?!\d)", cleaned):
        pos = m.start()
        allowed = False
        for a, b in allowed_spans:
            if a <= pos < b:
                allowed = True
                break
        if not allowed:
            hits.append((pos, m.group(1)))
    return hits


def line_of(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def context_of(text: str, pos: int, width: int = 150) -> str:
    a = max(0, pos - width // 2)
    b = min(len(text), pos + width // 2)
    return " ".join(text[a:b].split())


def main(argv):
    args = [a for a in argv[1:] if a != "--quiet"]
    quiet = "--quiet" in argv[1:]
    if len(args) != 1:
        print("uso: python3 verificar_versao.py <arquivo.html> [--quiet]")
        return 2
    path = args[0]
    try:
        text = read_html(path)
    except FileNotFoundError:
        print("[falha] arquivo não encontrado:", path)
        return 1
    except OSError as exc:
        print("[falha] não foi possível ler:", path, "-", exc)
        return 1

    cleaned = blank_out(text)

    problems = []
    decs = find_meta_declarations(cleaned)
    if len(decs) == 0:
        problems.append(("fonte ausente", 0, "não existe <meta name=\"app-version\"> no arquivo — a versão precisa ter uma fonte única"))
        declared = None
    elif len(decs) > 1:
        for start, end, content in decs:
            problems.append(("fonte duplicada", line_of(text, start), f"<meta name=\"app-version\"> duplicada (conteúdo '{content}')"))
        declared = decs[0][2]
    else:
        declared = decs[0][2]
        if not declared:
            problems.append(("fonte vazia", line_of(text, decs[0][0]), "a <meta name=\"app-version\"> está sem atributo content"))

    # Varredura geral: qualquer X.Y.Z fora da fonte única e fora de comentários
    spans = [(a, b) for a, b, _ in decs]
    hits = find_version_literals(cleaned, spans)
    if hits:
        for pos, val in hits[:12]:
            problems.append(("cópia solta", line_of(text, pos), f"o número {val} aparece fora da fonte única: …{context_of(text, pos)}…"))
        if len(hits) > 12:
            problems.append(("cópia solta", 0, f"(mais {len(hits) - 12} ocorrências omitidas)"))

    # Checagens informativas (não derrubam o resultado)
    warns = []
    for probe, desc in [
        ('id="help-version"', "elemento #help-version (rodapé do guia)"),
        ('class="tb-version"', "elemento .tb-version (barra de ferramentas)"),
        ("window.APP_VERSION", "exposição window.APP_VERSION"),
        ('<title>Singular-v2</title>', "<title> limpo (sem número estático)"),
    ]:
        if probe not in text:
            warns.append(f"falta: {desc}")

    if not quiet:
        if declared:
            print(f"versão declarada (fonte única): {declared}")
        if problems:
            for kind, ln, msg in problems:
                tag = {"fonte ausente": "SEM FONTE", "fonte duplicada": "DUPLICADA",
                       "fonte vazia": "SEM CONTEÚDO", "cópia solta": "CÓPIA SOLTA"}[kind]
                print(f"[falha] ({tag}) linha {ln}: {msg}")
        else:
            print("nenhuma cópia solta da versão fora da fonte única.")
        if warns:
            for w in warns:
                print("[aviso]", w)

    if problems:
        print(f"\nRESULTADO: FALHOU — {len(problems)} problema(s) encontrado(s) em {path}.")
        return 1
    print(f"\nRESULTADO: OK — {path} segue a regra da fonte única.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
