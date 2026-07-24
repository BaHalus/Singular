// tools/docs/rules/orphan-documents.cjs

const fs = require("fs");
const path = require("path");


function normalize(file) {
    return path
        .resolve(file)
        .replace(/\\/g, "/")
        .toLowerCase();
}


/**
 * Documentos que podem existir como entradas independentes.
 *
 * A documentação da SINGULAR possui árvores documentais onde
 * o próprio arquivo é uma unidade raiz:
 *
 * - ADRs
 * - Gates
 * - Documentos arquiteturais
 * - Auditorias
 * - Registros operacionais
 *
 * Esses arquivos não precisam necessariamente ser citados
 * por outro Markdown.
 */
function isIntentionalRoot(file) {

    const normalized = normalize(file);


    return (

        // Estrutura documental principal
        normalized.includes("/docs/00/") ||
        normalized.includes("/docs/00-decisoes/") ||
        normalized.includes("/docs/00-governanca/") ||
        normalized.includes("/docs/01-arquitetura/") ||
        normalized.includes("/docs/02-decisoes/") ||
        normalized.includes("/docs/03-gates/") ||
        normalized.includes("/docs/adr/") ||

        // Estruturas operacionais independentes
        normalized.includes("/docs/alpha/") ||
        normalized.includes("/docs/application/") ||
        normalized.includes("/docs/architecture/") ||
        normalized.includes("/docs/gates/") ||
        normalized.includes("/docs/releases/") ||
        normalized.includes("/docs/audits/") ||

        // Documentos raiz conhecidos
        normalized.endsWith("/docs/readme.md") ||
        normalized.endsWith("/docs/modelodedominio.md") ||
        normalized.endsWith("/docs/tarefas.md") ||
        normalized.endsWith("/docs/filosofia.md")

    );
}


function collectMarkdownFiles(root) {

    const result = [];


    function walk(dir) {

        if (!fs.existsSync(dir)) {
            return;
        }


        for (const item of fs.readdirSync(dir)) {

            const full =
                path.join(dir, item);


            const stat =
                fs.statSync(full);


            if (stat.isDirectory()) {

                walk(full);

            } else if (
                item.toLowerCase().endsWith(".md")
            ) {

                result.push(full);

            }

        }

    }


    walk(root);

    return result;
}



function extractLinks(content) {

    const links = [];

    const regex =
        /\]\(([^)#]+)(?:#[^)]*)?\)/g;


    let match;


    while ((match = regex.exec(content)) !== null) {

        links.push(match[1]);

    }


    return links;
}



function resolveLink(baseFile, link) {

    if (
        link.startsWith("http://") ||
        link.startsWith("https://")
    ) {
        return null;
    }


    return path.resolve(
        path.dirname(baseFile),
        link
    );

}



function validateOrphans(root) {

    const files =
        collectMarkdownFiles(root);


    const referenced =
        new Set();


    for (const file of files) {

        const content =
            fs.readFileSync(
                file,
                "utf8"
            );


        const links =
            extractLinks(content);


        for (const link of links) {

            const resolved =
                resolveLink(
                    file,
                    link
                );


            if (!resolved) {
                continue;
            }


            referenced.add(
                normalize(resolved)
            );

        }

    }



    const orphans =
        files.filter(file => {

            if (isIntentionalRoot(file)) {
                return false;
            }


            return !referenced.has(
                normalize(file)
            );

        });



    return orphans.map(file => ({

        type: "ORPHAN_DOCUMENT",

        file,

        message:
            "Documento sem referência encontrada. Verifique se deve ser conectado ao índice ou a outro documento."

    }));

}



module.exports = validateOrphans;