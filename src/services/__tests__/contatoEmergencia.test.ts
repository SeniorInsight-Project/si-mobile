import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listarContatos,
  salvarContato,
  removerContato,
  reordenarContatos,
  resetarContatos,
} from '../contatoEmergenciaService';

describe('Contatos de Emergência - Escalonamento SOS e Reordenação (RF-009 / SOS)', () => {
  const TEST_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

  beforeEach(() => {
    resetarContatos();
  });

  test('listarContatos deve retornar lista ordenada por prioridade (ordem crescente)', async () => {
    const contatos = await listarContatos(TEST_IDOSO_ID);
    assert.ok(Array.isArray(contatos), 'Deve retornar array de contatos');
    assert.ok(contatos.length >= 3, 'Deve conter pelo menos 3 contatos padrão');

    for (let i = 0; i < contatos.length - 1; i++) {
      assert.ok(
        contatos[i].ordem <= contatos[i + 1].ordem,
        'A lista deve estar estritamente ordenada por ordem crescente de prioridade'
      );
    }
  });

  test('salvarContato deve adicionar novo contato e calcular ordem e iniciais', async () => {
    const novo = await salvarContato(TEST_IDOSO_ID, {
      nome: 'Beatriz Lima',
      telefone: '(11) 91234-5678',
      parentesco: 'Sobrinha',
    });

    assert.ok(novo.id, 'Deve conter ID');
    assert.equal(novo.nome, 'Beatriz Lima');
    assert.equal(novo.iniciais, 'BL');
    assert.ok(novo.ordem >= 4, 'A ordem deve ser adicionada sequencialmente');

    const listaAtualizada = await listarContatos(TEST_IDOSO_ID);
    const salvo = listaAtualizada.find((c) => c.nome === 'Beatriz Lima');
    assert.ok(salvo, 'Novo contato deve constar na listagem');
  });

  test('reordenarContatos deve atualizar a prioridade da cadeia SOS na ordem informada', async () => {
    const listaInicial = await listarContatos(TEST_IDOSO_ID);
    assert.ok(listaInicial.length >= 3);

    // Inverte a ordem dos contatos (3º vira 1º, 2º vira 2º, 1º vira 3º)
    const invertida = [...listaInicial].reverse();
    const reordenados = await reordenarContatos(TEST_IDOSO_ID, invertida);

    assert.equal(reordenados[0].id, invertida[0].id);
    assert.equal(reordenados[0].ordem, 1);
    assert.equal(reordenados[1].ordem, 2);
    assert.equal(reordenados[2].ordem, 3);

    const doBanco = await listarContatos(TEST_IDOSO_ID);
    assert.equal(doBanco[0].id, invertida[0].id, 'Primeiro contato deve ser o que foi movido para o topo');
    assert.equal(doBanco[0].ordem, 1);
  });

  test('removerContato deve excluir o contato e reajustar a numeração das prioridades restantes', async () => {
    const lista = await listarContatos(TEST_IDOSO_ID);
    const primeiroContato = lista[0];

    const removido = await removerContato(TEST_IDOSO_ID, primeiroContato.id);
    assert.equal(removido, true);

    const listaAposRemocao = await listarContatos(TEST_IDOSO_ID);
    assert.equal(listaAposRemocao.some((c) => c.id === primeiroContato.id), false);
    assert.equal(listaAposRemocao[0].ordem, 1, 'O novo primeiro colocado deve ter ordem 1');
  });
});
