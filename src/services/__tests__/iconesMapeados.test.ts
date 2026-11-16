import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Todo nome de ícone usado nas telas precisa existir no ICON_MAP de src/components/Icon.tsx.
 * Nome sem mapa cai no fallback "help" e aparece como "?" (ex.: "Enviar Convite", aviso do Premium).
 */
const SRC = join(process.cwd(), 'src');

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome: string) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return nome === '__tests__' ? [] : arquivos(caminho);
    return /\.(tsx|ts)$/.test(nome) ? [caminho] : [];
  });
}

test('todos os nomes de ícone usados estão mapeados no Icon.tsx', () => {
  const iconTsx = readFileSync(join(SRC, 'components', 'Icon.tsx'), 'utf8');
  const inicioMapa = iconTsx.indexOf('const ICON_MAP');
  const mapa = iconTsx.slice(inicioMapa, iconTsx.indexOf('\n};', inicioMapa));
  const mapeados = new Set([...mapa.matchAll(/^\s*'?([a-z0-9_]+)'?\s*:/gm)].map((m) => m[1]));

  const usoIcone = /(?:<Icon[^>]*?\bname=|\bicon(?:Left|Right)?=|\bicon:\s*)\{?\s*['"]([a-z0-9_]+)['"]/g;
  const faltando: string[] = [];
  for (const arquivo of arquivos(SRC)) {
    for (const m of readFileSync(arquivo, 'utf8').matchAll(usoIcone)) {
      if (!mapeados.has(m[1])) faltando.push(`${m[1]} (${arquivo.replace(SRC, 'src')})`);
    }
  }

  assert.deepEqual(faltando, [], `Ícones sem mapeamento no Icon.tsx: ${faltando.join(', ')}`);
});
