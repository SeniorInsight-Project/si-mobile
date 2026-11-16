import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const AVAILABLE_WEIGHTS = {
  heading: [600, 700, 800],
  body: [400, 500, 600, 700],
};

const NAMED_WEIGHTS = {
  normal: 400,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

function walkTsx(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTsx(full));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results.sort();
}

function closestWeight(kind, raw) {
  const list = AVAILABLE_WEIGHTS[kind];
  let best = list[0];
  let bestDiff = Math.abs(raw - best);
  for (const w of list) {
    const diff = Math.abs(raw - w);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = w;
    }
  }
  return best;
}

function parseStaticWeight(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    const text = node.text.trim().toLowerCase();
    if (text in NAMED_WEIGHTS) return NAMED_WEIGHTS[text];
    if (/^\d+$/.test(text)) return Number(text);
    return null;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  return null;
}

function parseTypographyFamily(node, sourceFile) {
  const text = node.getText(sourceFile).trim();
  if (text === 'typography.fontFamily.heading') return 'heading';
  if (text === 'typography.fontFamily.body') return 'body';
  return null;
}

function getPropName(prop, sourceFile) {
  if (!ts.isPropertyAssignment(prop)) return null;
  if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) {
    return prop.name.text;
  }
  return prop.name.getText(sourceFile);
}

function getLine(sourceFile, pos) {
  return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}

function computeThemeImportPath(filePath) {
  const dir = path.dirname(filePath);
  let rel = path.relative(dir, path.join(SRC_DIR, 'theme')).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function addFontImport(sourceText, sourceFile, filePath) {
  // Procura import existente de .../theme ou .../theme/index
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const mod = stmt.moduleSpecifier.text;
    if (!/(^|\/)theme(\/index)?$/.test(mod)) continue;

    const clause = stmt.importClause;
    if (!clause) continue;

    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      const hasFont = clause.namedBindings.elements.some((el) => el.name.text === 'font');
      if (hasFont) return sourceText;

      const elements = clause.namedBindings.elements;
      if (elements.length > 0) {
        const last = elements[elements.length - 1];
        const insertPos = last.getEnd();
        return `${sourceText.slice(0, insertPos)}, font${sourceText.slice(insertPos)}`;
      }
    }
  }

  // Fallback: adiciona um novo import após o último import
  const themeRel = computeThemeImportPath(filePath);
  const newImport = `import { font } from '${themeRel}';\n`;
  let lastImportEnd = 0;
  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt)) {
      lastImportEnd = stmt.getEnd();
    }
  }
  if (lastImportEnd > 0) {
    return `${sourceText.slice(0, lastImportEnd)}\n${newImport.trimEnd()}${sourceText.slice(lastImportEnd)}`;
  }
  return `${newImport}${sourceText}`;
}

function processFile(filePath, report) {
  const original = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const relPath = path.relative(ROOT, filePath);

  const edits = [];

  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      let fontFamilyProp = null;
      let fontWeightProp = null;

      for (const prop of node.properties) {
        const name = getPropName(prop, sourceFile);
        if (name === 'fontFamily') fontFamilyProp = prop;
        if (name === 'fontWeight') fontWeightProp = prop;
      }

      if (fontFamilyProp || fontWeightProp) {
        const familyKind = fontFamilyProp ? parseTypographyFamily(fontFamilyProp.initializer, sourceFile) : null;
        const familyIsMonospace =
          fontFamilyProp &&
          !familyKind &&
          /monospace|Menlo/i.test(fontFamilyProp.initializer.getText(sourceFile));

        if (fontFamilyProp && !familyKind && !familyIsMonospace) {
          report.ambiguous.push({
            file: relPath,
            line: getLine(sourceFile, fontFamilyProp.getStart(sourceFile)),
            reason: `fontFamily não reconhecido: ${fontFamilyProp.initializer.getText(sourceFile)}`,
          });
        } else if (familyIsMonospace && !fontWeightProp) {
          // Monospace literal permitido pelo plano
        } else if (fontWeightProp) {
          const rawWeight = parseStaticWeight(fontWeightProp.initializer);
          if (rawWeight === null) {
            report.ambiguous.push({
              file: relPath,
              line: getLine(sourceFile, fontWeightProp.getStart(sourceFile)),
              reason: `fontWeight dinâmico/ambíguo: ${fontWeightProp.initializer.getText(sourceFile)}`,
            });
          } else {
            const targetKind = familyKind ?? 'body';
            const chosen = closestWeight(targetKind, rawWeight);
            if (chosen !== rawWeight) {
              report.approximations.push({
                file: relPath,
                line: getLine(sourceFile, fontWeightProp.getStart(sourceFile)),
                from: `${targetKind}:${rawWeight}`,
                to: `${targetKind}:${chosen}`,
              });
            }

            const replacement = `...font('${targetKind}', ${chosen})`;

            if (fontFamilyProp && fontWeightProp) {
              // Substitui fontFamily por ...font(...) e remove fontWeight
              edits.push({
                start: fontFamilyProp.getStart(sourceFile),
                end: fontFamilyProp.getEnd(),
                text: replacement,
              });
              // Remove fontWeight incluindo vírgula e espaços adjacentes
              let removeStart = fontWeightProp.getStart(sourceFile);
              let removeEnd = fontWeightProp.getEnd();
              const after = original.slice(removeEnd);
              const commaAfter = after.match(/^\s*,/);
              if (commaAfter) {
                removeEnd += commaAfter[0].length;
                // remove quebra de linha/espaço à esquerda se estiver em linha própria
                const before = original.slice(0, removeStart);
                const indentBefore = before.match(/\n[ \t]*$/);
                if (indentBefore) {
                  removeStart -= indentBefore[0].length - 1; // mantém \n anterior
                  // se após vírgula tem \n, consome espaços até o \n
                  if (original[removeEnd] === '\n') {
                    removeEnd += 1;
                  } else {
                    const wsAfter = original.slice(removeEnd).match(/^[ \t]+/);
                    if (wsAfter) removeEnd += wsAfter[0].length;
                  }
                }
              } else {
                const before = original.slice(0, removeStart);
                const commaBefore = before.match(/,\s*$/);
                if (commaBefore) {
                  removeStart -= commaBefore[0].length;
                }
              }
              edits.push({ start: removeStart, end: removeEnd, text: '' });
            } else {
              // Só fontWeight (sem fontFamily) -> recebe font('body', chosen)
              edits.push({
                start: fontWeightProp.getStart(sourceFile),
                end: fontWeightProp.getEnd(),
                text: replacement,
              });
            }
            report.transformations += 1;
          }
        } else if (familyKind) {
          // Só fontFamily: typography.fontFamily.(heading|body) sem fontWeight
          const defaultWeight = familyKind === 'heading' ? 700 : 400;
          edits.push({
            start: fontFamilyProp.getStart(sourceFile),
            end: fontFamilyProp.getEnd(),
            text: `...font('${familyKind}', ${defaultWeight})`,
          });
          report.transformations += 1;
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (edits.length === 0) return;

  // Aplica do fim para o início para preservar posições
  edits.sort((a, b) => b.start - a.start);
  let updated = original;
  for (const edit of edits) {
    updated = `${updated.slice(0, edit.start)}${edit.text}${updated.slice(edit.end)}`;
  }

  const updatedSourceFile = ts.createSourceFile(filePath, updated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  updated = addFontImport(updated, updatedSourceFile, filePath);

  fs.writeFileSync(filePath, updated, 'utf8');
  report.modifiedFiles.push({ file: relPath, edits: edits.length });
}

function main() {
  const files = walkTsx(SRC_DIR);
  const report = {
    scanned: files.length,
    modifiedFiles: [],
    transformations: 0,
    approximations: [],
    ambiguous: [],
  };

  for (const file of files) {
    processFile(file, report);
  }

  console.log('=== Relatório do Codemod de Fontes ===');
  console.log(`Arquivos .tsx analisados: ${report.scanned}`);
  console.log(`Arquivos alterados: ${report.modifiedFiles.length}`);
  console.log(`Estilos transformados: ${report.transformations}`);
  console.log('');
  console.log('Arquivos alterados:');
  for (const f of report.modifiedFiles) {
    console.log(`  - ${f.file}`);
  }
  console.log('');
  console.log(`Aproximações de peso (${report.approximations.length}):`);
  for (const a of report.approximations) {
    console.log(`  - ${a.file}:${a.line} (${a.from} -> ${a.to})`);
  }
  console.log('');
  console.log(`Casos ambíguos mantidos sem mexer (${report.ambiguous.length}):`);
  for (const amb of report.ambiguous) {
    console.log(`  - ${amb.file}:${amb.line} — ${amb.reason}`);
  }
}

main();
