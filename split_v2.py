# -*- coding: utf-8 -*-
"""Gera a versão modularizada do Singular-v2 (v2 — completa e verificada).

Do arquivo base Singular337.html produz:
  * Singular-basico.html ......... programa sem os subsistemas avançados (+ carregador e importação pelo modal Importar/Exportar)
  * Singular-modulo-avancado.html  pacote com os 6 segmentos extraídos (byte-a-byte fiéis)

Regra de ouro: nada é reescrito — só recortado e movido. Cada segmento é localizado por um
âncora textual única e recortado até o seu </script>; a fidelidade é conferida por md5.
"""
import hashlib, os, re, sys

BASE = "/workspace/out/Singular337.html"          # baseline íntegro (versão 0.0.337 unificada)
OUT_DIR = "/workspace/out/modular"
OS_BASE = os.path.join(OUT_DIR, "Singular-basico.html")
OS_MOD = os.path.join(OUT_DIR, "Singular-modulo-avancado.html")
V_NOVA = "0.0.341"                                # nova versão da linha básica/módulo (+ saneamento pós-remoção)
err = []

h = open(BASE, encoding="utf-8").read()
orig = h

# ────────────────────────────── 1) Segmentos avançados (SEIS) ──────────────────────────────
SEGMENTOS = [
    ("FAV_NUCLEO",      "<script>\n/* SINGULAR v0.0.243/245 — núcleo de dados de Favorecimento"),
    ("FAV_INTERFACE",   "<script>\n/* SINGULAR v0.0.245 — interface de Favorecimento Divino."),
    ("FEITICARIA",      "<script>\n/* SINGULAR v0.0.258 — FEITIÇARIA"),
    ("PODERES_MOTOR",   "<script>\n/* v0.0.272 — UMA FONTE SÓ DE MODIFICADORES"),
    ("HAB_MODULARES",   '<script id="hab-collection-v0284">\n/* v0.0.293 — HABILIDADES MODULARES'),
    ("PSIQUISMO",       "<script>\n/* SINGULAR v0.0.327 — Poderes Psíquicos"),
]

spans = []
for nome, anc in SEGMENTOS:
    n = h.count(anc)
    if n != 1:
        err.append(f"âncora {nome}: esperada 1 vez, encontrada {n}"); continue
    a = h.find(anc); b = h.find("</script>", a) + len("</script>")
    if b <= a: err.append(f"{nome}: </script> não achado"); continue
    spans.append((nome, a, b))
if err: print("ERROS:", *err, sep="\n "); sys.exit(1)

spans_sorted = sorted(spans, key=lambda s: s[1])
for i in range(len(spans_sorted)-1):
    if spans_sorted[i][2] > spans_sorted[i+1][1]:
        print("ERRO: segmentos se sobrepõem:", spans_sorted[i][0], spans_sorted[i+1][0]); sys.exit(1)
print("=== SEIS segmentos localizados e ordenados ===")
for nome, a, b in spans_sorted:
    l1 = orig.count("\n",0,a)+1; l2 = orig.count("\n",0,b)+1
    print(f"  {nome:16s} L{l1}-L{l2} | {b-a} bytes")

def corte(nome):
    _, a, b = next(s for s in spans_sorted if s[0] == nome)
    return orig[a:b]

# ────────────────────────────── 2) MÓDULO AVANÇADO ──────────────────────────────
mod_partes = []
for nome, a, b in spans_sorted:
    mod_partes.append(corte(nome))
mod_conteudo = "\n".join(mod_partes)

manifesto = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Singular-v2 — Módulo Avançado</title>
<!-- SINGULAR-MODULE: AVANCADO — pacote importável de subsistemas avançados (v{V_NOVA}).
     Conteúdo (na ordem): FAVORECIMENTO DIVINO (núcleo + interface), FEITIÇARIA,
     MOTOR DE PODERES (v0.0.272+), HABILIDADES MODULARES (v0.0.293+), PODERES PSÍQUICOS (v0.0.327+).
     Uso: abra o Singular-basico.html e importe este arquivo pelo botão 🧩 (ou ⋯ → Importar módulo avançado).
     Os segmentos foram recortados sem alteração (md5 conferido na geração). -->
</head>
<body>
{mod_conteudo}
</body>
</html>"""

open(OS_MOD, "w", encoding="utf-8").write(manifesto)
print("\ngravado:", OS_MOD, "|", len(manifesto), "bytes")

# ────────────────────────────── 3) BÁSICO ──────────────────────────────
bas = orig
marcador = "<!-- <<<EXTRAÍDO>>> */\n"  # substitui cada segmento removido por comentário curto
for nome, a, b in spans_sorted:
    mid = orig[a:b]
    # substitui o bloco inteiro por um comentário único apontando para o módulo
    marcador = f"<!-- {nome}: segmento avançado removido deste arquivo — está em Singular-modulo-avancado.html ({len(mid)} bytes) -->\n"
    if mid not in bas or bas.count(mid) != 1:
        err.append(f"{nome}: fatia não localizável 1x no fluxo atual"); continue
    bas = bas.replace(mid, marcador, 1)

# checagens estruturais rápidas antes dos inserts
if bas.count('id="section-container"') != orig.count('id="section-container"'):
    err.append("container de seções alterado")

# 3a) Changelog novo no topo
novo_topo = ("<!" + "--" + f" v{V_NOVA} — MODULARIZAÇÃO (dois arquivos): os subsistemas avançados "
             "(Favorecimento Divino, Feitiçaria, motor de Poderes, Habilidades Modulares e Poderes "
             "Psíquicos) saem deste arquivo para o pacote “Singular-modulo-avancado.html”; importação em ⋯ → Importar / Exportar. "
             "O programa volta ao modo completo ao importar. v0.0.341: saneamento reforçado — sem botões mortos nem cascas após remover o módulo. "
             "Refaça a divisão com ferramentas/split_v2.py. --" + ">")
assert bas.startswith("<!DOCTYPE html>\n")
bas = "<!DOCTYPE html>\n" + novo_topo + "\n" + bas[len("<!DOCTYPE html>\n"):]

# 3b) Versão da fonte única
antes = bas.count('content="0.0.337"')
bas = bas.replace('content="0.0.337"', f'content="{V_NOVA}"')
if antes != 1: err.append(f"meta de versão: esperada 1 ocorrência, trocada {antes}")

# 3c) Carregador do módulo antes do ÚLTIMO </body>
LOADER = """
<script id="singular-modulo-loader">
/* Carregador do módulo avançado: se o pacote já foi importado, ele é injetado automaticamente nesta página. */
(function(){
  try {
    const salvo = localStorage.getItem('singular-modulo-avancado-html');
    if (!salvo) return;
    const doc = new DOMParser().parseFromString(salvo, 'text/html');
    doc.querySelectorAll('style').forEach(s => {
      const n = s.cloneNode(true);
      n.id = (s.id ? s.id + '-mod' : 'modulo-style-' + Math.random().toString(36).slice(2));
      document.head.appendChild(n);
    });
    doc.querySelectorAll('script').forEach(s => {
      if (!s.textContent || !s.textContent.trim()) return;
      const n = document.createElement('script');
      n.id = (s.id ? s.id + '-mod' : 'modulo-script-' + Math.random().toString(36).slice(2));
      n.textContent = s.textContent;
      document.head.appendChild(n);
    });
    window.__moduloAvancadoAtivo = true;
    setTimeout(() => { try { if (typeof updateAll === 'function') updateAll(); } catch(_){} }, 300);
  } catch (_) {}
})();
</script>
<script id="singular-modulo-loader-ui">
/* Secao "Modulo avancado" dentro do modal (o porem em "Importar / Exportar") — sem botao flutuante sobre a interface. */
(function(){
  const fb = document.getElementById('import-fb');   // ancora: fim da secao "Importar personagem"
  if (!fb) return;
  fb.insertAdjacentHTML('afterend', [
    '<hr class="mdiv">',
    '<div class="modal-label">🧩 Módulo avançado</div>',
    '<div class="modal-hint" style="margin:4px 0 8px;font-size:0.68rem;color:var(--grey);line-height:1.5;">O pacote avançado traz Favorecimento Divino, Feitiçaria, Poderes, Habilidades Modulares e Poderes Psíquicos. Sem ele, o programa abre enxuto; importando, tudo volta ao modo completo. O pacote fica guardado neste navegador.</div>',
    '<div id="modulo-av-status" style="font-size:0.68rem;margin:0 0 7px;"></div>',
    '<button class="mbtn full" onclick="moduloAvancadoPick()">📂 Importar módulo avançado (.html)</button>',
    '<button class="mbtn full" id="modulo-av-remove" style="margin-top:6px;font-size:0.68rem;display:none;" onclick="moduloAvancadoRemover()">✕ Remover o módulo desta página</button>'
  ].join(''));
  function atualizar() {
    const st = document.getElementById('modulo-av-status');
    const rm = document.getElementById('modulo-av-remove');
    let t = '';
    try { t = localStorage.getItem('singular-modulo-avancado-html') || ''; } catch (_) {}
    const ativo = !!t;
    if (st) { st.style.color = ativo ? 'var(--gold,#c9a227)' : 'var(--grey)'; st.textContent = ativo ? '✅ Módulo presente — ativo nesta página.' : '⚠️ Ainda não importado nesta página.'; }
    if (rm) rm.style.display = ativo ? '' : 'none';
  }
  window.moduloAvancadoPick = function(){
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.html,text/html';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          localStorage.setItem('singular-modulo-avancado-html', rd.result);
          location.reload();
        } catch (e) { alert('Não foi possível guardar o módulo neste aparelho.'); }
      };
      rd.readAsText(f);
    };
    inp.click();
  };
  function limparModuloDoDom() {
    // Tira do DOM vivo tudo que o pacote avançado cria (seções marcadas com data-power-section
    // e painéis soltos) e re-salva um snapshot LIMPO do estado da ficha — sem isso, o
    // autosave restauraria os painéis antigos como casca morta mesmo depois do reload.
    try {
      // Usa o saneador global do programa (v0.0.340+): remove as seções/painéis de poder vivos,
      // zera os estados residuais e normaliza sub-abas — garante remoção completa sem resetar ficha.
      if (typeof window._purgeCascasAvancadas === 'function') window._purgeCascasAvancadas(true);
      try { if (typeof updateAll === 'function') updateAll(); } catch (_) {}
      try { if (typeof _autoSaveNow === 'function') _autoSaveNow(); } catch (_) {}
    } catch (_) {}
  }
  window.moduloAvancadoRemover = function(){
    limparModuloDoDom();
    setTimeout(() => {
      try { localStorage.removeItem('singular-modulo-avancado-html'); } catch (_) {}
      location.reload();
    }, 120);
  };
  atualizar();
})();
</script>
"""

cut = bas.rfind("</body>")
if cut == -1: err.append("último </body> não achado")
else: bas = bas[:cut] + LOADER + "\n" + bas[cut:]

# 3d) Autocura para fichas antigas (v0.0.340): snapshots salvos com o módulo ativo guardam o HTML
#     das seções de poder junto à ficha (sHTML). Sem este saneador elas reaparecem como cascas
#     mortas ao abrir a ficha no modo básico. A purga só age quando o pacote NÃO está na página.
_PURGA_JS = '''
// v0.0.340 — Saneamento automático do modo básico (autocura): remove cascas mortas dos painéis
// avançados vindas de snapshots antigos e normaliza sub-abas/chaves residuais. Sem efeito com módulo ativo.
function _purgeCascasAvancadas(forcar) {
    if (!forcar && window.SINGULAR_POWER_SECTIONS) return;
    const sc = document.getElementById('section-container');
    if (sc) Array.from(sc.querySelectorAll('[data-power-section]')).forEach(el => el.remove());
    ['divine-favor-panel','sorcery-panel','powers-panel','modular-powers-panel','psiquismo-panel'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.closest('#section-container')) el.remove();
    });
    window._divineFavorState = null; window._sorceryState = null; window._powersState = null;
    window._modularState = null; window._psiState = null;
    const en = window._tracosEnabled || {};
    Object.keys(en).forEach(k => { if (String(k).indexOf('p-') === 0) delete en[k]; });
    if (typeof window._tracosSubtab === 'string' && window._tracosSubtab.indexOf('p-') === 0) window._tracosSubtab = 'vantagens';
}
window._purgeCascasAvancadas = _purgeCascasAvancadas;
'''
_ANCHOR_DEF = chr(10) + "function applyState(state) {"
if bas.count(_ANCHOR_DEF) == 1:
    bas = bas.replace(_ANCHOR_DEF, chr(10) + _PURGA_JS.strip() + chr(10) + "function applyState(state) {", 1)
    print("[ok] patch de autocura (definição) injetado")
else:
    _m = "[erro] patch de autocura: âncora def encontrada " + str(bas.count(_ANCHOR_DEF)) + "x"; err.append(_m); print(_m)
_ANCHOR_CALL = ("    setMainTab(window._mainTab);\n"
                "    setPrincipalSubtab(window._principalSubtab);\n"
                "    renderPkgLists();\n"
                "    updateAll();\n"
                "    _histUpdateUI();")
if bas.count(_ANCHOR_CALL) == 1:
    bas = bas.replace(_ANCHOR_CALL, ("    try { _purgeCascasAvancadas(false); _tracosRenderSubtabs(); } catch (e) {}\n") + _ANCHOR_CALL, 1)
    print("[ok] patch de autocura (chamada no applyState) injetado")
else:
    _m = "[erro] patch de autocura: âncora call encontrada " + str(bas.count(_ANCHOR_CALL)) + "x"; err.append(_m); print(_m)


# ──────────────────── 3e) Patches v0.0.341 — saneamento pós-remoção (botões mortos/cascas) ────────────────────
# PT1 — _tracosTypes nunca desenha tipo de poder residual quando o módulo avançado não está ativo.
_PT1_OLD = ("function _tracosTypes() {\n"
            "    const out = [];\n"
            "    document.querySelectorAll('#section-container > .section').forEach(sec => {\n"
            "        const key = sec.dataset.subTab;\n"
            "        if (sec.dataset.mainTab !== 'tracos' || !key || key === 'vantagens' || out.some(t => t.key === key)) return;")
_PT1_NEW = ("function _tracosTypes() {\n"
            "    const out = [];\n"
            "    // v0.0.341 — sem o módulo avançado ativo, nunca desenhar tipos de poder residuais (evita botões mortos):\n"
            "    const modAtivo = !!window.__moduloAvancadoAtivo;\n"
            "    const regIds = (window.SINGULAR_POWER_SECTIONS && typeof window.SINGULAR_POWER_SECTIONS.ids === 'function') ? window.SINGULAR_POWER_SECTIONS.ids() : [];\n"
            "    document.querySelectorAll('#section-container > .section').forEach(sec => {\n"
            "        const key = sec.dataset.subTab;\n"
            "        if (sec.dataset.mainTab !== 'tracos' || !key || key === 'vantagens' || out.some(t => t.key === key)) return;\n"
            "        if (String(key).indexOf('p-') === 0 && !modAtivo && !regIds.length) return;")
if bas.count(_PT1_OLD) == 1:
    bas = bas.replace(_PT1_OLD, _PT1_NEW, 1)
    print("[ok] patch PT1 (_tracosTypes: guarda anti-botão-morto) injetado")
else:
    _m = "[erro] patch PT1: âncora encontrada " + str(bas.count(_PT1_OLD)) + "x"; err.append(_m); print(_m)

# PT2 — saneamento forçado no boot (logo após a classificação das seções estáticas).
_PT2_OLD = ("    _tabAssignSections();\n"
            "    window._libraryRegistry = _libRegistryGet();")
_PT2_NEW = ("    _tabAssignSections();\n"
            "    try { if (!window.__moduloAvancadoAtivo && typeof window._purgeCascasAvancadas === 'function') window._purgeCascasAvancadas(true); } catch (e) {}\n"
            "    window._libraryRegistry = _libRegistryGet();")
if bas.count(_PT2_OLD) == 1:
    bas = bas.replace(_PT2_OLD, _PT2_NEW, 1)
    print("[ok] patch PT2 (purge no boot) injetado")
else:
    _m = "[erro] patch PT2: âncora encontrada " + str(bas.count(_PT2_OLD)) + "x"; err.append(_m); print(_m)

# PT3 — saneamento forçado na restauração automática da última ficha.
_PT3_OLD = ("        if(!st?.sHTML)return false;\n"
            "        _autoSaveSuspended=true;\n"
            "        applyState(st);\n"
            "        _autoSaveSuspended=false;\n"
            "        return true;")
_PT3_NEW = ("        if(!st?.sHTML)return false;\n"
            "        _autoSaveSuspended=true;\n"
            "        applyState(st);\n"
            "        try { if (!window.__moduloAvancadoAtivo && typeof window._purgeCascasAvancadas === 'function') window._purgeCascasAvancadas(true); } catch (_) {}\n"
            "        _autoSaveSuspended=false;\n"
            "        return true;")
if bas.count(_PT3_OLD) == 1:
    bas = bas.replace(_PT3_OLD, _PT3_NEW, 1)
    print("[ok] patch PT3 (purge no auto-restauro) injetado")
else:
    _m = "[erro] patch PT3: âncora encontrada " + str(bas.count(_PT3_OLD)) + "x"; err.append(_m); print(_m)

# PT4a — importação grava pelo multi-armazenamento (_lsSet quando disponível).
_PT4A_OLD = "          localStorage.setItem('singular-modulo-avancado-html', rd.result);"
_PT4A_NEW = "          moduloGravar(rd.result);"
if bas.count(_PT4A_OLD) == 1:
    bas = bas.replace(_PT4A_OLD, _PT4A_NEW, 1)
    print("[ok] patch PT4a (importar -> moduloGravar) injetado")
else:
    _m = "[erro] patch PT4a: âncora encontrada " + str(bas.count(_PT4A_OLD)) + "x"; err.append(_m); print(_m)

# PT4b — status lê pelo multi-armazenamento.
_PT4B_OLD = ("    let t = '';\n"
             "    try { t = localStorage.getItem('singular-modulo-avancado-html') || ''; } catch (_) {}")
_PT4B_NEW = ("    let t = '';\n"
             "    try { t = moduloLer() || ''; } catch (_) {}")
if bas.count(_PT4B_OLD) == 1:
    bas = bas.replace(_PT4B_OLD, _PT4B_NEW, 1)
    print("[ok] patch PT4b (status -> moduloLer) injetado")
else:
    _m = "[erro] patch PT4b: âncora encontrada " + str(bas.count(_PT4B_OLD)) + "x"; err.append(_m); print(_m)

# PT4c — bloco inteiro da remoção trocado pela versão reforçada (multi-store + saneamento de snapshots).
NOVO_BLOCO_FUNCOES = r"""function moduloLer() {
    try { if (typeof window._lsGet === 'function') return window._lsGet('singular-modulo-avancado-html'); } catch (_) {}
    try { return localStorage.getItem('singular-modulo-avancado-html'); } catch (_) { return null; }
}
function moduloGravar(txt) {
    let feito = false;
    try { if (typeof window._lsSet === 'function') { window._lsSet('singular-modulo-avancado-html', txt); feito = true; } } catch (_) {}
    if (!feito) { try { localStorage.setItem('singular-modulo-avancado-html', txt); } catch (_) {} }
}
function moduloApagar() {
    try { if (typeof window._lsRemove === 'function') window._lsRemove('singular-modulo-avancado-html'); } catch (_) {}
    try { localStorage.removeItem('singular-modulo-avancado-html'); } catch (_) {}
    try { sessionStorage.removeItem('singular-modulo-avancado-html'); } catch (_) {}
}
function sanearSnapshotChave(chave) {
    // v0.0.341 — nenhum caminho de restauração pode reacender cascas dos painéis avançados:
    // sana snapshots salvos (autosave/ficha rápida): tira seções [data-power-section],
    // painéis conhecidos, estados e flags residuais de sub-abas.
    let raw = null;
    try { if (typeof window._lsGet === 'function') raw = window._lsGet(chave); } catch (_) {}
    if (!raw) { try { raw = localStorage.getItem(chave); } catch (_) {} }
    if (!raw) return;
    let st;
    try { st = JSON.parse(raw); } catch (_) { return; }
    if (!st || typeof st.sHTML !== 'string') return;
    const doc = new DOMParser().parseFromString(st.sHTML, 'text/html');
    doc.querySelectorAll('[data-power-section]').forEach(el => el.remove());
    ['divine-favor-panel','sorcery-panel','powers-panel','modular-powers-panel','psiquismo-panel'].forEach(function(id) {
        const el = doc.getElementById(id); if (el) el.remove();
    });
    st.sHTML = doc.documentElement.innerHTML;
    if (typeof st.tracosSubtab === 'string' && st.tracosSubtab.indexOf('p-') === 0) st.tracosSubtab = 'vantagens';
    if (st.tracosEnabled && typeof st.tracosEnabled === 'object') {
        Object.keys(st.tracosEnabled).forEach(function(k) { if (String(k).indexOf('p-') === 0) delete st.tracosEnabled[k]; });
    }
    st.divineFavor = null; st.sorcery = null; st.powers = null; st.modular = null; st.psi = null;
    const limpo = JSON.stringify(st);
    try { if (typeof window._lsSet === 'function') window._lsSet(chave, limpo); } catch (_) {}
    try { localStorage.setItem(chave, limpo); } catch (_) {}
    // IMPORTANTE: sobrescreve TAMBÉM a cópia no IndexedDB — senão, se o localStorage
    // vier vazio/falhar, o _restoreAutoState() cai no fallback do IDB e reanima
    // o snapshot sujo (com as cascas dos painéis avançados) mesmo após remover o módulo.
    try { if (typeof window._idbSet === 'function') window._idbSet(chave, limpo); } catch (_) {}
}
function sanearCharsSalvos() {
    // v0.0.342 — personagens salvos manualmente ('gurps-chars') também carregam sHTML com
    // as seções/painéis avançados. Sana cada ficha: tira seções de poder, painéis conhecidos,
    // zera estados avançados e flags de sub-aba residuais. Sem isso, abrir uma ficha antiga
    // reacende os botões mortos (que ficam visíveis, mas sem funcionar).
    let raw = null;
    try { if (typeof window._lsGet === 'function') raw = window._lsGet('gurps-chars'); } catch (_) {}
    if (!raw) { try { raw = localStorage.getItem('gurps-chars'); } catch (_) {} }
    if (!raw) return;
    let chars;
    try { chars = JSON.parse(raw); } catch (_) { return; }
    if (!chars || typeof chars !== 'object') return;
    let mudou = false;
    Object.keys(chars).forEach(function(n) {
        const c = chars[n]; if (!c) return;
        if (typeof c.sHTML === 'string') {
            const doc = new DOMParser().parseFromString(c.sHTML, 'text/html');
            const antes = doc.querySelectorAll('[data-power-section]').length;
            doc.querySelectorAll('[data-power-section]').forEach(el => el.remove());
            ['divine-favor-panel','sorcery-panel','powers-panel','modular-powers-panel','psiquismo-panel'].forEach(function(id) {
                const el = doc.getElementById(id); if (el) el.remove();
            });
            const depois = doc.querySelectorAll('[data-power-section]').length;
            if (antes !== depois || antes > 0) { c.sHTML = doc.documentElement.innerHTML; mudou = true; }
        }
        if (c.tracosEnabled && typeof c.tracosEnabled === 'object') {
            Object.keys(c.tracosEnabled).forEach(function(k) { if (String(k).indexOf('p-') === 0) { delete c.tracosEnabled[k]; mudou = true; } });
        }
        if (typeof c.tracosSubtab === 'string' && c.tracosSubtab.indexOf('p-') === 0) { c.tracosSubtab = 'vantagens'; mudou = true; }
        if (c.divineFavor !== undefined || c.sorcery !== undefined || c.powers !== undefined || c.modular !== undefined || c.psi !== undefined) {
            c.divineFavor = null; c.sorcery = null; c.powers = null; c.modular = null; c.psi = null; mudou = true;
        }
    });
    if (mudou) {
        const limpo = JSON.stringify(chars);
        try { if (typeof window._lsSet === 'function') window._lsSet('gurps-chars', limpo); } catch (_) {}
        try { localStorage.setItem('gurps-chars', limpo); } catch (_) {}
    }
}
function limparModuloDoDom() {
    // v0.0.342 — limpeza em quatro camadas: DOM vivo desta página, snapshots salvos (autosave/ficha rápida),
    // fichas salvas manualmente e persistência final (incluindo IndexedDB). Sem isso, algum caminho de
    // restauração reanimaria as cascas dos painéis avançados (botões visíveis, mas sem funcionar).
    try { if (typeof window._purgeCascasAvancadas === 'function') window._purgeCascasAvancadas(true); } catch (_) {}
    try { if (typeof updateAll === 'function') updateAll(); } catch (_) {}
    ['singular-autosave-v2','gurps-quick-char'].forEach(function(ch) { try { sanearSnapshotChave(ch); } catch (_) {} });
    try { sanearCharsSalvos(); } catch (_) {}
    try { if (typeof _autoSaveNow === 'function') _autoSaveNow(); } catch (_) {}
}
function sanearSemModulo() {
    // v0.0.342 — cura automática: se esta página NÃO tem o módulo importado, varre os armazenamentos
    // à procura de resquícios dos painéis avançados (de versões anteriores) e limpa. Assim ninguém
    // precisa resetar a ficha manualmente para os botões mortos desaparecerem.
    try {
        let temModulo = false;
        try { temModulo = !!moduloLer(); } catch (_) {}
        if (temModulo) return;
        ['singular-autosave-v2','gurps-quick-char'].forEach(function(ch) { try { sanearSnapshotChave(ch); } catch (_) {} });
        try { sanearCharsSalvos(); } catch (_) {}
        try { if (typeof window._purgeCascasAvancadas === 'function') window._purgeCascasAvancadas(true); } catch (_) {}
        try { if (typeof _tracosRenderSubtabs === 'function') _tracosRenderSubtabs(); } catch (_) {}
        try { if (typeof applyTabVisibility === 'function') applyTabVisibility(); } catch (_) {}
    } catch (_) {}
}
try { setTimeout(sanearSemModulo, 900); } catch (_) {}
window.moduloAvancadoRemover = function(){
    limparModuloDoDom();
    setTimeout(() => {
        moduloApagar();
        location.reload();
    }, 100);
};"""

_PT4C_START = "function limparModuloDoDom() {"
_PT4C_END = "\n  atualizar();"
_i0 = bas.find(_PT4C_START)
_i1 = bas.find(_PT4C_END, _i0) if _i0 != -1 else -1
if bas.count(_PT4C_START) == 1 and _i0 != -1 and _i1 != -1:
    bas = bas[:_i0] + NOVO_BLOCO_FUNCOES + bas[_i1:]
    print("[ok] patch PT4c (remoção reforçada: moduloLer/Gravar/Apagar + saneamento de snapshots) injetado")
else:
    _m = "[erro] patch PT4c: marcadores não únicos/íntegros"; err.append(_m); print(_m)


open(OS_BASE, "w", encoding="utf-8").write(bas)
print("gravado:", OS_BASE, "|", len(bas), "bytes | delta vs original:", len(bas)-len(orig))

# ────────────────────────────── 4) VERIFICAÇÕES ──────────────────────────────
print("\n=== verificações ===")
res_ok = True
def chk(desc, cond, extra=""):
    global res_ok
    res_ok &= bool(cond)
    print(f"[{'OK' if cond else 'ERRO'}] {desc}{(' -> '+extra) if extra else ''}")

# 4a) Fidelidade byte-a-byte dos segmentos no módulo
for nome, a, b in spans_sorted:
    sp = corte(nome)
    hp = hashlib.md5(sp.encode()).hexdigest()[:12]
    hm = hashlib.md5(open(OS_MOD,"rb").read().count(sp.encode()) and sp.encode()).hexdigest()[:12]
    esta_no_mod = open(OS_MOD, encoding="utf-8").read().count(sp) == 1
    chk(f"fidelidade {nome}: md5 {hp} presente 1x no módulo", esta_no_mod)
# 4b) Nenhum resíduo dos seis segmentos fora de comentários no básico
semcom = re.sub(r"<!--[\s\S]*?-->", "", bas)
for nome, anc in SEGMENTOS:
    chk(f"resíduo {nome} no básico (fora de comentários)", anc not in semcom)
# 4c) Sem criadores órfãos de seções de poder no básico
chk("ensureSection( ausente no básico", "ensureSection(" not in semcom)
chk("renderDivineFavorUI ausente no básico", "renderDivineFavorUI" not in semcom)
chk("window.SINGULAR_POWER_SECTIONS nunca definido no básico", "window.SINGULAR_POWER_SECTIONS =" not in semcom)
# 4d) Estruturas preservadas
chk("<title> dinâmico intacto no básico", "<title>Singular-v2</title>" in bas)
chk("meta de versão nova no básico", f'content="{V_NOVA}"' in bas and bas.count(f'content="{V_NOVA}"') == 1)
chk("carregador presente", "singular-modulo-loader" in bas)
chk("módulo tem manifesto", "SINGULAR-MODULE: AVANCADO" in open(OS_MOD, encoding="utf-8").read())
chk("contagem de <script> coerente no básico (19 reais - 6 + 2 do carregador)", bas.count("<script") == orig.count("<script") - 6 + 2)
# 4e) Integridade geral do texto: mesmo número de caracteres esperado
esperado = len(orig) - sum(b-a for _,a,b in spans_sorted) + len(manifesto)*0 + 0
delta_bas = len(bas) - (len(orig) - sum(b-a for _,a,b in spans_sorted))
chk("tamanho do básico compatível (recortes + inserts)", abs(delta_bas) < 16000, f"delta={delta_bas}")

print("\nResultado das verificações:", "✅ TUDO PASSOU" if res_ok else "❌ VER ACIMA")
sys.exit(0 if res_ok else 1)
