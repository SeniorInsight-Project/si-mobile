import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { colors, typography, rounded, shadows, sizes } from '../../theme/index';

function canalLinear(valor8bit: number): number {
  const srgb = valor8bit / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

function luminanciaRelativa(hex: string): number {
  const limpo = hex.replace('#', '');
  const normalizado =
    limpo.length === 3
      ? limpo
          .split('')
          .map((c) => c + c)
          .join('')
      : limpo;
  const r = canalLinear(parseInt(normalizado.slice(0, 2), 16));
  const g = canalLinear(parseInt(normalizado.slice(2, 4), 16));
  const b = canalLinear(parseInt(normalizado.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function razaoContraste(hexA: string, hexB: string): number {
  const l1 = luminanciaRelativa(hexA);
  const l2 = luminanciaRelativa(hexB);
  const maisClara = Math.max(l1, l2);
  const maisEscura = Math.min(l1, l2);
  return (maisClara + 0.05) / (maisEscura + 0.05);
}

describe('Tokens do tema (src/theme/index.ts)', () => {
  test('nenhum fontSize de typography é menor que 14 px', () => {
    for (const [chave, estilo] of Object.entries(typography)) {
      if (chave === 'fontFamily' || !estilo || typeof estilo !== 'object') continue;
      if ('fontSize' in estilo && typeof estilo.fontSize === 'number') {
        assert.ok(
          estilo.fontSize >= 14,
          `typography.${chave}.fontSize deve ser >= 14 (atual: ${estilo.fontSize})`,
        );
      }
    }
  });

  test('pares principais de botão/texto atingem contraste WCAG AA (>= 4.5:1)', () => {
    const pares: Array<[string, string, string]> = [
      ['onPrimary sobre primary', colors.onPrimary, colors.primary],
      ['white sobre coralDark', colors.white, colors.coralDark],
      ['white sobre error', colors.white, colors.error],
      ['white sobre successDark', colors.white, colors.successDark],
    ];

    for (const [rotulo, frente, fundo] of pares) {
      const contraste = razaoContraste(frente, fundo);
      assert.ok(
        contraste >= 4.5,
        `${rotulo} deve ter contraste >= 4.5:1 (atual: ${contraste.toFixed(2)}:1)`,
      );
    }
  });

  test('cada pastel .text e .textDark atinge contraste >= 4.5:1 sobre .background', () => {
    const pasteis = [
      { nome: 'mint', token: colors.mint },
      { nome: 'peach', token: colors.peach },
      { nome: 'sky', token: colors.sky },
      { nome: 'amber', token: colors.amber },
      { nome: 'lavender', token: colors.lavender },
    ];

    for (const { nome, token } of pasteis) {
      const contrasteText = razaoContraste(token.text, token.background);
      const contrasteTextDark = razaoContraste(token.textDark, token.background);
      assert.ok(
        contrasteText >= 4.5,
        `${nome}.text (${token.text}) sobre ${nome}.background (${token.background}) deve ser >= 4.5:1 (atual: ${contrasteText.toFixed(2)}:1)`,
      );
      assert.ok(
        contrasteTextDark >= 4.5,
        `${nome}.textDark (${token.textDark}) sobre ${nome}.background (${token.background}) deve ser >= 4.5:1 (atual: ${contrasteTextDark.toFixed(2)}:1)`,
      );
    }
  });

  test('cada .text de pastel coincide com o alias plano correspondente', () => {
    assert.equal(colors.mint.text, colors.mintText);
    assert.equal(colors.peach.text, colors.peachText);
    assert.equal(colors.sky.text, colors.skyText);
    assert.equal(colors.amber.text, colors.amberText);
    assert.equal(colors.lavender.text, colors.lavenderText);
  });

  test('sizes.touchMin é >= 48 dp e raios/sombras seguem o padrão', () => {
    assert.ok(sizes.touchMin >= 48, `sizes.touchMin deve ser >= 48 (atual: ${sizes.touchMin})`);
    assert.equal(rounded.sm, 8);
    assert.equal(rounded.sheet, rounded.xl);
    assert.equal(shadows.tier1.shadowColor, colors.primary);
    assert.equal(shadows.tier2.shadowColor, colors.primary);
    assert.equal(shadows.tier3.shadowColor, colors.primary);
    assert.equal(shadows.sos.shadowColor, colors.coral);
  });
});
