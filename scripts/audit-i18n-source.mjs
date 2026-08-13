import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoots = [path.join(root, "src", "app"), path.join(root, "src", "components")];
const english = JSON.parse(fs.readFileSync(path.join(root, "messages", "en.json"), "utf8"));

const getPath = (object, dottedPath) => dottedPath.split(".").reduce(
  (value, key) => value && typeof value === "object" ? value[key] : undefined,
  object,
);

const sourceFiles = [];
const collect = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(target);
    else if (/\.(?:ts|tsx)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name)) sourceFiles.push(target);
  }
};
for (const directory of sourceRoots) collect(directory);

const missingReferences = [];
const hardcodedCandidates = [];
const canonicalText = /^(?:Trophy XI|XI|VS|FT|OVR|POS|ERA|MGR|ATK|MID|DEF|CHEM|xG|S3 \+ CLOUDFRONT|VERCEL \+ CLOUDFLARE|NEXT\.JS \+ TYPESCRIPT)$/i;

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const bindings = new Map();

  const findBindings = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      let initializer = node.initializer;
      if (initializer && ts.isAwaitExpression(initializer)) initializer = initializer.expression;
      if (initializer && ts.isCallExpression(initializer) && ts.isIdentifier(initializer.expression) && ["useTranslations", "getTranslations"].includes(initializer.expression.text)) {
        const argument = initializer.arguments[0];
        if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
          const namespaces = bindings.get(node.name.text) ?? new Set();
          namespaces.add(argument.text);
          bindings.set(node.name.text, namespaces);
        }
      }
    }
    ts.forEachChild(node, findBindings);
  };
  findBindings(ast);

  const inspect = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const namespaces = bindings.get(node.expression.text);
      const argument = node.arguments[0];
      if (namespaces && argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
        const candidates = [...namespaces].map((namespace) => `${namespace}.${argument.text}`);
        if (!candidates.some((key) => typeof getPath(english, key) === "string")) {
          const position = ast.getLineAndCharacterOfPosition(node.getStart(ast));
          missingReferences.push(`${path.relative(root, file)}:${position.line + 1} ${candidates.join(" | ")}`);
        }
      }
    }

    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, " ").trim();
      if (text && /[A-Za-z]{3}/.test(text) && !canonicalText.test(text)) {
        const position = ast.getLineAndCharacterOfPosition(node.getStart(ast));
        hardcodedCandidates.push(`${path.relative(root, file)}:${position.line + 1} ${text}`);
      }
    }
    if (ts.isJsxAttribute(node) && ["aria-label", "title", "placeholder"].includes(node.name.getText(ast)) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const text = node.initializer.text.trim();
      if (/[A-Za-z]{3}/.test(text) && !canonicalText.test(text)) {
        const position = ast.getLineAndCharacterOfPosition(node.getStart(ast));
        hardcodedCandidates.push(`${path.relative(root, file)}:${position.line + 1} ${node.name.getText(ast)}=\"${text}\"`);
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(ast);
}

if (missingReferences.length) {
  console.error(`Missing English message references (${missingReferences.length}):`);
  for (const reference of missingReferences) console.error(`  ${reference}`);
  process.exitCode = 1;
} else {
  console.log(`All statically referenced literal translation keys resolve in messages/en.json.`);
}

console.log(`Potential hard-coded user-facing strings (${hardcodedCandidates.length}):`);
for (const candidate of hardcodedCandidates.slice(0, 80)) console.log(`  ${candidate}`);
if (hardcodedCandidates.length > 80) console.log(`  …and ${hardcodedCandidates.length - 80} more`);
