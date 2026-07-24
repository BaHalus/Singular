const fs = require("fs");
const path = require("path");

function walk(dir) {

    let files = [];

    for (const item of fs.readdirSync(dir)) {

        const full = path.join(dir, item);

        if (fs.statSync(full).isDirectory())
            files = files.concat(walk(full));
        else if (item.toLowerCase().endsWith(".md"))
            files.push(full);

    }

    return files;

}

const roots = ["Docs"];

let allFiles = [];

for (const dir of roots)
    if (fs.existsSync(dir))
        allFiles = allFiles.concat(walk(dir));

console.log("");
console.log("======================================");
console.log(" Validação da documentação");
console.log("======================================");
console.log("");

console.log(`Documentos encontrados: ${allFiles.length}`);
console.log("");

const rulesFolder = path.join(__dirname, "rules");

const ruleFiles = fs.readdirSync(rulesFolder)
    .filter(f => f.endsWith(".cjs"))
    .sort();

let issues = [];

console.log("Executando regras...");
console.log("");

for (const file of ruleFiles) {

    const rule = require(path.join(rulesFolder, file));

    const result = rule(allFiles);

    if (Array.isArray(result))
        issues.push(...result);

}

for (const issue of issues) {

    const icon = issue.severity === "warning"
        ? "⚠"
        : "❌";

    console.log(`${icon} ${issue.rule}`);

    if (issue.number)
        console.log(`   ADR-${issue.number}`);

    if (issue.title)
        console.log(`   Título: ${issue.title}`);

    if (issue.file)
        console.log(`   Arquivo: ${issue.file}`);

    if (issue.link)
        console.log(`   Link: ${issue.link}`);

    if (issue.files)
        issue.files.forEach(f => console.log(`   ${f}`));

    if (issue.classification)
        console.log(`   Classificação: ${issue.classification}`);

    if (issue.recommendation)
        console.log(`   Sugestão: ${issue.recommendation}`);

    console.log("");

}

console.log("--------------------------------------");

const errors =
    issues.filter(i => i.severity !== "warning");

if (errors.length === 0) {

    console.log("Nenhuma inconsistência encontrada.");
    console.log("VALIDATION PASSED");
    console.log("--------------------------------------");

    process.exit(0);

}

console.log(`Foram encontradas ${errors.length} inconsistência(s).`);
console.log("VALIDATION FAILED");
console.log("--------------------------------------");

process.exit(1);