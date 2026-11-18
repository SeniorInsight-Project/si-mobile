import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Todos os .ts/.tsx do app (src e App.tsx). */
function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return nome === '__tests__' ? [] : arquivos(caminho);
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

describe('Expo Go sem tela vermelha do OpenWearablesHealthSDK (auditoria 2, item 4)', () => {
  test("o único carregamento do pacote é o import() do openWearablesService", () => {
    const usos = [...arquivos('src'), 'App.tsx'].filter((arquivo) => {
      const fonte = readFileSync(arquivo, 'utf8');
      return /import\(\s*['"]open-wearables['"]\s*\)|from\s+['"]open-wearables['"]|require\(\s*['"]open-wearables['"]\s*\)/.test(
        fonte.replace(/typeof import\('open-wearables'\)/g, '')
      );
    });
    assert.deepEqual(usos, [join('src', 'services', 'openWearablesService.ts')]);
  });

  test('o import() só acontece depois de checar o módulo nativo com requireOptionalNativeModule', () => {
    const fonte = readFileSync('src/services/openWearablesService.ts', 'utf8');
    const checagem = fonte.indexOf('if (!sdkNativoDisponivel()) throw');
    const importacao = fonte.indexOf("import('open-wearables').then");
    assert.ok(checagem > 0 && importacao > checagem, 'checagem antes do import()');
    assert.match(fonte, /requireOptionalNativeModule\(MODULO_NATIVO_OPEN_WEARABLES\)/);
    assert.match(fonte, /MODULO_NATIVO_OPEN_WEARABLES = 'OpenWearablesHealthSDK'/);
  });

  test('ehExpoGo aceita executionEnvironment storeClient ou appOwnership expo', () => {
    const fonte = readFileSync('src/config/expoGo.ts', 'utf8');
    assert.match(fonte, /ExecutionEnvironment\.StoreClient \|\| Constants\.appOwnership === 'expo'/);
  });
});
