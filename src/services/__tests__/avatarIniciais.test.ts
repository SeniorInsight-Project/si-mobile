import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { CORES_AVATAR, corDoAvatar, iniciaisDoNome } from '../../theme/avatar';

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('iniciaisDoNome', () => {
  test('usa a primeira e a última palavra, ignorando partículas', () => {
    assert.equal(iniciaisDoNome('Pedro de Sousa Lima'), 'PL');
    assert.equal(iniciaisDoNome('Dona Maria Aparecida'), 'DA');
    assert.equal(iniciaisDoNome('carlos da silva'), 'CS');
  });

  test('nome de uma palavra usa as duas primeiras letras', () => {
    assert.equal(iniciaisDoNome('Maria'), 'MA');
  });

  test('nome vazio ou ausente vira "?"', () => {
    assert.equal(iniciaisDoNome(''), '?');
    assert.equal(iniciaisDoNome(null), '?');
    assert.equal(iniciaisDoNome('   '), '?');
  });
});

describe('corDoAvatar', () => {
  test('a mesma pessoa tem sempre a mesma cor', () => {
    assert.deepEqual(corDoAvatar('Roberta Santos'), corDoAvatar('  roberta santos '));
  });

  test('nomes diferentes usam mais de uma cor da paleta', () => {
    const cores = new Set(
      ['Carlos Silva', 'Roberta Santos', 'Lucas Silva', 'Juliana Costa', 'Ricardo Silva', 'Pedro Sousa'].map(
        (n) => corDoAvatar(n).background,
      ),
    );
    assert.ok(cores.size > 1);
  });

  test('todas as cores têm contraste AA (>= 4.5:1) entre sigla e fundo', () => {
    for (const cor of CORES_AVATAR) {
      assert.ok(contraste(cor.text, cor.background) >= 4.5, `${cor.text} sobre ${cor.background}`);
    }
  });
});
