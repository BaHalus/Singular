#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function main() {

    const rl = readline.createInterface({ input, output });

    console.log("");
    console.log("==================================");
    console.log(" SINGULAR Architecture Toolkit");
    console.log("==================================");
    console.log("");

    const tipo = (await rl.question("Tipo (MOD/ATK/ADR): ")).trim().toUpperCase();
    const codigo = (await rl.question("Código (ex.: 007): ")).trim();
    const titulo = (await rl.question("Título: ")).trim();

    rl.close();

    const pasta = "Docs";
    mkdirSync(pasta, { recursive: true });

    const nomeArquivo =
        `${tipo}-${codigo}-${titulo.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-")}.md`;

    const caminho = join(pasta, nomeArquivo);

    const markdown =
`# ${tipo}-${codigo} ${titulo}

## Objetivo

Descrever o objetivo deste documento.

---

## Escopo

Descrever o escopo.

---

## Conteúdo

TODO.

---

## Referências

- TBD
`;

    writeFileSync(caminho, markdown, "utf8");

    console.log("");
    console.log("✔ Documento criado:");
    console.log(caminho);
    console.log("");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});