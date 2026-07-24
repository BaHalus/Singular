const fs = require("fs");
const path = require("path");

module.exports = function checkBrokenLinks(files) {

    const issues = [];

    const markdownLinks = /\[[^\]]+\]\(([^)]+)\)/g;

    /*
     * Índice de âncoras de todos os documentos.
     */

    const anchors = new Map();

    function slug(text) {

        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");

    }

    /*
     * Coleta todas as âncoras.
     */

    for (const file of files) {

        const content =
            fs.readFileSync(file, "utf8");

        const set = new Set();

        for (const line of content.split(/\r?\n/)) {

            const match =
                /^(#{1,6})\s+(.*)$/.exec(line);

            if (!match)
                continue;

            set.add(slug(match[2]));

        }

        anchors.set(
            path.resolve(file),
            set
        );

    }

    /*
     * Verificação.
     */

    for (const file of files) {

        const content =
            fs.readFileSync(file, "utf8");

        let match;

        while ((match = markdownLinks.exec(content)) !== null) {

            const rawLink = match[1].trim();

            if (
                rawLink.startsWith("http://") ||
                rawLink.startsWith("https://") ||
                rawLink.startsWith("mailto:")
            )
                continue;

            /*
             * Âncora interna.
             */

            if (rawLink.startsWith("#")) {

                const anchor =
                    slug(rawLink.substring(1));

                const local =
                    anchors.get(path.resolve(file));

                if (
                    !local ||
                    !local.has(anchor)
                ) {

                    issues.push({

                        severity: "error",

                        rule: "BROKEN_ANCHOR",

                        file,

                        link: rawLink,

                        recommendation:
                            "A âncora não existe neste documento."

                    });

                }

                continue;

            }

            const parts =
                rawLink.split("#");

            const relative =
                parts[0];

            const target =
                path.normalize(
                    path.resolve(
                        path.dirname(file),
                        relative
                    )
                );

            if (!fs.existsSync(target)) {

                issues.push({

                    severity: "error",

                    rule: "BROKEN_LINK",

                    file,

                    link: rawLink,

                    recommendation:
                        "O arquivo de destino não existe."

                });

                continue;

            }

            /*
             * Verifica a âncora.
             */

            if (parts.length > 1) {

                const anchor =
                    slug(parts[1]);

                const targetAnchors =
                    anchors.get(target);

                if (
                    !targetAnchors ||
                    !targetAnchors.has(anchor)
                ) {

                    issues.push({

                        severity: "error",

                        rule: "BROKEN_ANCHOR",

                        file,

                        link: rawLink,

                        recommendation:
                            "A âncora referenciada não existe no documento de destino."

                    });

                }

            }

        }

    }

    return issues;

};