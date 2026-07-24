const path = require("path");

module.exports = function checkAdrSequence(files) {

    const issues = [];
    const warnings = [];

    /*
     * Apenas ADRs numeradas.
     *
     * Exemplos aceitos:
     * ADR-0001-Titulo.md
     * ADR-0123-Outro.md
     */

    const pattern = /^ADR-(\d{4})-.+\.md$/i;

    const numbers = [];

    for (const file of files) {

        const name = path.basename(file);

        const match = pattern.exec(name);

        /*
         * Ignora completamente qualquer arquivo
         * que não seja uma ADR numerada.
         */

        if (!match) {
            continue;
        }

        numbers.push(parseInt(match[1], 10));

    }

    numbers.sort((a, b) => a - b);

    for (let i = 1; i < numbers.length; i++) {

        const previous = numbers[i - 1];
        const current = numbers[i];

        if (current <= previous + 1) {
            continue;
        }

        for (let n = previous + 1; n < current; n++) {

            warnings.push({

                rule: "ADR_SEQUENCE_GAP",

                number: String(n).padStart(4, "0")

            });

        }

    }

    /*
     * Exibe warnings mas não quebra a build.
     */

    for (const warning of warnings) {

        console.log(
            `⚠ ${warning.rule}\n   ADR-${warning.number}\n`
        );

    }

    return issues;

};