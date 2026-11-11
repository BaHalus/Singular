# -*- coding: utf-8 -*-
"""Compila todos os blocos <script> dos arquivos (com mascaramento de comentários) via QuickJS."""
import re, sys, quickjs

def mascara(h):
    out = list(h); i = 0
    while True:
        s = h.find("<!--", i)
        if s == -1: break
        e = h.find("-->", s+4)
        if e == -1: break
        for k in range(s, e+3): out[k] = " "
        i = e+3
    return "".join(out)

def blocos(html):
    masked = mascara(html); out = []
    for m in re.finditer(r"<script\b([^>]*)>([\s\S]*?)</script>", masked):
        gt = html.find(">", m.start()) + 1
        cl = html.find("</script>", gt)
        corpo = html[gt:cl]
        out.append((html.count("\n",0,m.start())+1, len(corpo), corpo))
    return out

def compilar(ctx, codigo):
    try:
        ctx.eval("(function(){" + codigo + "\n})"); return True
    except Exception as e:
        msg = str(e)[:90].replace("\n"," ")
        if "await" in msg or "async" in msg:
            try:
                ctx.eval("(async function(){" + codigo + "\n})"); return True
            except Exception as e2: return False
        return False

def valida(nome, path):
    bl = blocos(open(path, encoding="utf-8").read()); ctx = quickjs.Context(); okc = 0; falhas = []
    for ln, tam, body in bl:
        if tam == 0: continue
        if compilar(ctx, body): okc += 1
        else: falhas.append((ln, tam, str(falhas)))
    print(f"{nome}: {len(bl)} blocos | compiláveis OK: {okc} | falhas: {len(falhas)}")
    for f_ in falhas[:6]: print("   ✗ linha", f_)
    return not falhas

res = [valida("ORIGINAL ", "/workspace/out/Singular337.html"),
       valida("BÁSICO   ", "/workspace/out/modular/Singular-basico.html"),
       valida("MÓDULO   ", "/workspace/out/modular/Singular-modulo-avancado.html")]
print("\nResultado:", "✅ TODOS OS BLOCOS COMPILAM" if all(res) else "❌ revisar")
sys.exit(0 if all(res) else 1)
