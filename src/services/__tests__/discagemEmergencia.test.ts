import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { destinoLigacaoEmergencia, TELEFONE_SAMU } from '../discagemEmergencia';

describe('SOS: para quem ligar (sem número fictício)', () => {
  test('com contato de emergência liga para ele, só com dígitos', () => {
    const d = destinoLigacaoEmergencia({ nome: 'Ana Lima', telefone: '(61) 99999-0000' });
    assert.equal(d.telefone, '61999990000');
    assert.equal(d.rotulo, 'Ligar para Ana Lima');
    assert.equal(d.semContato, false);
  });

  test('sem contato, sem telefone ou telefone vazio liga para o SAMU (192)', () => {
    for (const contato of [null, undefined, { nome: 'Ana' }, { nome: 'Ana', telefone: '' }, { nome: 'Ana', telefone: '()-' }]) {
      const d = destinoLigacaoEmergencia(contato as any);
      assert.equal(d.telefone, TELEFONE_SAMU);
      assert.equal(d.semContato, true);
      assert.match(d.rotulo, /SAMU \(192\)/);
    }
  });

  test('nenhum número ou nome fictício sobra no código do SOS', async () => {
    const { readFileSync } = await import('node:fs');
    for (const arquivo of ['src/screens/ElderlyModeScreen.tsx', 'src/components/SosActiveModal.tsx']) {
      const fonte = readFileSync(arquivo, 'utf8');
      assert.equal(/11987654321|98765-4321|Carlos Silva/.test(fonte), false, `${arquivo} ainda tem contato fictício`);
    }
  });
});
