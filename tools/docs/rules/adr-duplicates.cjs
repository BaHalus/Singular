const path = require("path");

module.exports = function checkAdrDuplicates(files) {

    const adrMap = new Map();

    /*
     * Apenas ADRs numeradas.
     */

    for (const file of files) {

        const name = path.basename(file);

        const match = /^ADR-(\d{4})/i.exec(name);

        if (!match)
            continue;

        const number = match[1];

        if (!adrMap.has(number)) {
            adrMap.set(number, []);
        }

        adrMap.get(number).push(file);

    }

    const issues = [];

    for (const [number, occurrences] of adrMap.entries()) {

        if (occurrences.length < 2)
            continue;

        let classification;
        let recommendation;

        if (occurrences.length > 2) {

            classification = "MULTIPLE_OCCURRENCES";

            recommendation =
                "Mais de dois documentos utilizam esta numeração. Revise todas as ocorrências antes de renumerar.";

        }
        else {

            const a = occurrences[0];
            const b = occurrences[1];

            const dirA = path.dirname(a);
            const dirB = path.dirname(b);

            const fileA = path.basename(a);
            const fileB = path.basename(b);

            if (dirA === dirB) {

                classification = "SAME_DIRECTORY";

                recommendation =
                    "Os documentos estão na mesma pasta. Renumere ou elimine um deles.";

            }
            else if (fileA === fileB) {

                classification = "EXACT_COPY";

                recommendation =
                    "Mesmo nome em diretórios diferentes. Verifique se existe um backup ou cópia esquecida.";

            }
            else {

                classification = "MULTIPLE_TREES";

                recommendation =
                    "A mesma numeração aparece em árvores documentais diferentes. Confirme qual árvore é a oficial antes de renumerar.";

            }

        }

        issues.push({

            severity: "error",

            rule: "ADR_DUPLICATE",

            number,

            files: occurrences,

            classification,

            recommendation

        });

    }

    return issues;

};