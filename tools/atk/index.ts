#!/usr/bin/env node

import process from "node:process";

const VERSION = "0.1.0";

function banner(): void {
    console.log("");
    console.log("==================================================");
    console.log(" SINGULAR Architecture Toolkit");
    console.log(` Version ${VERSION}`);
    console.log("==================================================");
    console.log("");
}

function help(): void {
    console.log("Uso:");
    console.log("");
    console.log("  npm run atk -- <comando>");
    console.log("");
    console.log("Comandos disponíveis:");
    console.log("");
    console.log("  new        Cria um novo documento");
    console.log("  validate   Valida documentação");
    console.log("  index      Atualiza índices");
    console.log("  graph      Gera grafo Mermaid");
    console.log("");
}

function main(): void {

    banner();

    const command = process.argv[2];

    switch (command) {

        case "new":
            console.log("ATK > new");
            break;

        case "validate":
            console.log("ATK > validate");
            break;

        case "index":
            console.log("ATK > index");
            break;

        case "graph":
            console.log("ATK > graph");
            break;

        default:
            help();
            break;

    }

}

main();