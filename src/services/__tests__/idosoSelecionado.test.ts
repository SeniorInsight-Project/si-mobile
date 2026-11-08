import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  listarIdososDoFamiliar,
  obterIdosoLocalPorId,
} from '../elderlyService';

describe('Correção 3/3: Idoso selecionado e estados sem idoso (#82)', () => {
  test('listarIdososDoFamiliar deve aceitar familiarId nulo ou indefinido sem lançar erro', async () => {
    const resultado = await listarIdososDoFamiliar(null);
    assert.ok(Array.isArray(resultado), 'Deve retornar um array de idosos');
  });

  test('obterIdosoLocalPorId deve retornar null para id inexistente', () => {
    const idoso = obterIdosoLocalPorId('id-inexistente-xyz');
    assert.equal(idoso, null);
  });

  test('rotinas e contatos lidam com idosoId nulo ou vazio graciosamente', async () => {
    const { listarRotinas } = await import('../medicamentoService');
    const { listarContatos } = await import('../contatoEmergenciaService');

    // Com idosoId vazio, funções retornam lista vazia ou mock controlado sem falhar
    const rotinasVazias = await listarRotinas('');
    assert.ok(Array.isArray(rotinasVazias));

    const contatosVazios = await listarContatos('');
    assert.ok(Array.isArray(contatosVazios));
  });
});
