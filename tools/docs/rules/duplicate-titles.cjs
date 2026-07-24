const fs = require("fs");

module.exports = function checkDuplicateTitles(files) {

    const titleMap = new Map();

    function normalize(title) {

        return title
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    }

    for (const file of files) {

        const text = fs.readFileSync(file, "utf8");

        const lines = text.split(/\r?\n/);

        const titleLine = lines.find(line => line.startsWith("# "));

        if (!titleLine)
            continue;

        const title = titleLine.substring(2).trim();

        if (!title)
            continue;

        const normalized = normalize(title);

        if (!titleMap.has(normalized)) {

            titleMap.set(normalized, {

                title,

                files: []

            });

        }

        titleMap.get(normalized).files.push(file);

    }

    const issues = [];

    for (const entry of titleMap.values()) {

        if (entry.files.length < 2)
            continue;

        issues.push({

            severity: "error",

            rule: "DUPLICATE_TITLE",

            title: entry.title,

            files: entry.files,

            recommendation:
                "Verifique se os documentos representam a mesma decisão arquitetural ou se os títulos devem ser diferenciados."

        });

    }

    return issues;

};