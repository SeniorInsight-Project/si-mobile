import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT, 'src', 'screens'),
  path.join(ROOT, 'src', 'components'),
];

const RULES = [
  'hex-rgba-literal',
  'font-size-min',
  'border-radius-literal',
  'font-family-literal',
  'touch-target-min',
  'emoji-ui',
  'icon-import',
];

function walkTsx(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTsx(full));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files.sort();
}

function stripLineComment(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
    return '';
  }
  return line
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|\s)\/\/.*$/, '');
}

function hasEstiloOk(line) {
  return /\/\/\s*estilo-ok:\s*\S+/.test(line);
}

function auditFile(filePath, violations) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const isIconComponent = rel === 'src/components/Icon.tsx';

  let currentStyleName = null;
  let styleBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];
    const code = stripLineComment(raw);
    if (!code.trim()) continue;

    const okOverride = hasEstiloOk(raw);

    // Track style key names inside StyleSheet.create({...})
    const styleStart = code.match(/^\s*([A-Za-z0-9_]+)\s*:\s*\{/);
    if (styleStart) {
      currentStyleName = styleStart[1];
      styleBraceDepth = 1;
      const opens = (code.match(/\{/g) || []).length;
      const closes = (code.match(/\}/g) || []).length;
      styleBraceDepth = opens - closes;
      if (styleBraceDepth <= 0) currentStyleName = null;
    } else if (currentStyleName) {
      const opens = (code.match(/\{/g) || []).length;
      const closes = (code.match(/\}/g) || []).length;
      styleBraceDepth += opens - closes;
      if (styleBraceDepth <= 0) currentStyleName = null;
    }

    // 1. hex ou rgba( literal fora de src/theme
    if (/(#[0-9A-Fa-f]{3,8}|rgba?\s*\()/i.test(code)) {
      const m = code.match(/(#[0-9A-Fa-f]{3,8}|rgba?\s*\([^)]*\))/i);
      violations.push({
        file: rel,
        line: lineNum,
        rule: 'hex-rgba-literal',
        snippet: (m ? m[0] : code.trim()).slice(0, 80),
      });
    }

    // 2. fontSize numérico < 14
    const fsMatch = code.match(/\bfontSize\s*:\s*(\d+(?:\.\d+)?)\b/);
    if (fsMatch && Number(fsMatch[1]) < 14 && !okOverride) {
      violations.push({
        file: rel,
        line: lineNum,
        rule: 'font-size-min',
        snippet: code.trim().slice(0, 80),
      });
    }

    // 3. borderRadius numérico literal
    const brMatch = code.match(
      /\b(borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)\s*:\s*(\d+(?:\.\d+)?)\b/,
    );
    if (brMatch && !okOverride) {
      violations.push({
        file: rel,
        line: lineNum,
        rule: 'border-radius-literal',
        snippet: code.trim().slice(0, 80),
      });
    }

    // 4. fontFamily string literal (exceto monospace/Menlo)
    const ffMatch = code.match(/\bfontFamily\s*:\s*['"]([^'"]+)['"]/);
    if (ffMatch && !/monospace|Menlo/i.test(ffMatch[1])) {
      violations.push({
        file: rel,
        line: lineNum,
        rule: 'font-family-literal',
        snippet: code.trim().slice(0, 80),
      });
    }

    // 5. height/width/minHeight < 48 em estilos com Button|Btn|Chip|Touch
    if (
      currentStyleName &&
      /(Button|Btn|Chip|Touch)/i.test(currentStyleName) &&
      !okOverride
    ) {
      const dimMatch = code.match(/\b(height|width|minHeight)\s*:\s*(\d+(?:\.\d+)?)\b/);
      if (dimMatch && Number(dimMatch[2]) < 48) {
        violations.push({
          file: rel,
          line: lineNum,
          rule: 'touch-target-min',
          snippet: `${currentStyleName} -> ${code.trim()}`.slice(0, 80),
        });
      }
    }

    // 6. Emoji em JSX/strings
    const emojiMatch = code.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    if (emojiMatch) {
      violations.push({
        file: rel,
        line: lineNum,
        rule: 'emoji-ui',
        snippet: code.trim().slice(0, 80),
      });
    }

    // 7. Import de ícones que não seja ../components/Icon ou ./Icon
    if (!isIconComponent) {
      const impMatch = code.match(
        /from\s+['"]([^'"]*(?:vector-icons|material-symbols|lucide|feather|ionicons|fontawesome)[^'"]*)['"]/i,
      );
      if (impMatch) {
        violations.push({
          file: rel,
          line: lineNum,
          rule: 'icon-import',
          snippet: code.trim().slice(0, 80),
        });
      }
    }
  }
}

function main() {
  const files = TARGET_DIRS.flatMap(walkTsx);
  const violations = [];

  for (const file of files) {
    auditFile(file, violations);
  }

  const counts = Object.fromEntries(RULES.map((r) => [r, 0]));
  for (const v of violations) {
    counts[v.rule] = (counts[v.rule] || 0) + 1;
    console.log(`${v.file}:${v.line} [${v.rule}] ${v.snippet}`);
  }

  console.log('');
  console.log('=== Resumo da auditoria de estilos ===');
  console.log(`Arquivos verificados: ${files.length}`);
  for (const rule of RULES) {
    console.log(`  - ${rule}: ${counts[rule]}`);
  }
  console.log(`Total de violações: ${violations.length}`);

  if (violations.length > 0) {
    process.exit(1);
  }
}

main();
