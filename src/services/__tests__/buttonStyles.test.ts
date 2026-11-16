import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { colors, shadows, sizes } from '../../theme/index';
import {
  type ButtonSize,
  type ButtonVariant,
  resolveButtonStyle,
} from '../../components/buttonStyles';

function canalLinear(valor8bit: number): number {
  const srgb = valor8bit / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

function luminanciaRelativa(hex: string): number {
  const limpo = hex.replace('#', '');
  const r = canalLinear(parseInt(limpo.slice(0, 2), 16));
  const g = canalLinear(parseInt(limpo.slice(2, 4), 16));
  const b = canalLinear(parseInt(limpo.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function razaoContraste(hexA: string, hexB: string): number {
  const l1 = luminanciaRelativa(hexA);
  const l2 = luminanciaRelativa(hexB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const TODAS_VARIANTES: ButtonVariant[] = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'danger',
  'sos',
  'success',
];

describe('buttonStyles (resolveButtonStyle)', () => {
  test('todas as variantes atingem contraste WCAG AA (>= 4.5:1)', () => {
    for (const variant of TODAS_VARIANTES) {
      const resolved = resolveButtonStyle({ variant });
      const effectiveBg =
        resolved.backgroundColor === 'transparent' ? colors.surface : resolved.backgroundColor;
      const contraste = razaoContraste(resolved.textColor, effectiveBg);
      assert.ok(
        contraste >= 4.5,
        `Variante "${variant}" deve ter contraste >= 4.5:1 (atual: ${contraste.toFixed(2)}:1)`,
      );
    }
  });

  test('alturas e tamanhos de fonte/ícone respeitam md=52, lg=56, xl=64 e ghost>=48', () => {
    const tamanhos: Array<[ButtonSize, number, number, number]> = [
      ['md', sizes.button.md, 16, 20],
      ['lg', sizes.button.lg, 16, 20],
      ['xl', sizes.button.xl, 18, 24],
    ];

    for (const [size, alturaEsperada, fonteEsperada, iconeEsperado] of tamanhos) {
      const primary = resolveButtonStyle({ variant: 'primary', size });
      assert.equal(primary.height, alturaEsperada);
      assert.equal(primary.fontSize, fonteEsperada);
      assert.equal(primary.iconSize, iconeEsperado);
      assert.ok(primary.minHeight >= 48);

      const ghost = resolveButtonStyle({ variant: 'ghost', size });
      assert.ok(ghost.height >= 48);
      assert.ok(ghost.minHeight >= 48);
    }
  });

  test('disabled aplica opacity 0.5 sem alterar as cores da variante', () => {
    for (const variant of TODAS_VARIANTES) {
      const enabled = resolveButtonStyle({ variant, disabled: false });
      const disabled = resolveButtonStyle({ variant, disabled: true });

      assert.equal(enabled.opacity, 1);
      assert.equal(disabled.opacity, 0.5);
      assert.equal(disabled.backgroundColor, enabled.backgroundColor);
      assert.equal(disabled.textColor, enabled.textColor);
      assert.equal(disabled.borderColor, enabled.borderColor);
    }
  });

  test('variante sos usa coralDark com sombra sos', () => {
    const sos = resolveButtonStyle({ variant: 'sos' });
    assert.equal(sos.backgroundColor, colors.coralDark);
    assert.equal(sos.textColor, colors.white);
    assert.equal(sos.shadow, shadows.sos);
  });
});
