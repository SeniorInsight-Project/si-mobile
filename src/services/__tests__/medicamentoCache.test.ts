import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  criarRotina,
  confirmarIngestao,
  listarRotinas,
  atualizarRotina,
  removerRotina,
} from '../medicamentoService';
import {
  obterRotinasDoCache,
  salvarRotinasNoCache,
  atualizarStatusDoseCache,
  limparCacheMedicamentos,
} from '../medicamentoDatabase';

describe('Rotina de Medicamentos & Cache SQLite (HU-056 / RF-038 / RN-004)', () => {
  const TEST_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

  beforeEach(async () => {
    await limparCacheMedicamentos();
  });

  test('criarRotina deve normalizar nomeMedicamento e medicamentoNome sem ficar em branco', async () => {
    const dados = {
      nomeMedicamento: 'Losartana Potássica 50mg',
      dosagem: '1 comprimido',
      horario: '08:00',
      frequencia: '1x ao dia (Diário)',
      tipoFormato: 'comprimido',
    };

    const criada = await criarRotina(TEST_IDOSO_ID, dados);

    assert.ok(criada.id, 'Deve gerar um ID para a rotina');
    assert.equal(
      criada.medicamentoNome,
      'Losartana Potássica 50mg',
      'medicamentoNome não pode vir em branco'
    );
    assert.equal(
      criada.nomeMedicamento,
      'Losartana Potássica 50mg',
      'nomeMedicamento deve estar alinhado'
    );
    assert.equal(criada.dosagem, '1 comprimido');
    assert.equal(criada.horario, '08:00');
    assert.equal(criada.tipoFormato, 'comprimido');
    assert.equal(criada.statusHoje, 'PENDENTE');

    // Verifica se foi salvo no cache local SQLite
    const cache = await obterRotinasDoCache(TEST_IDOSO_ID);
    assert.ok(cache.length > 0, 'Deve ter persistido no cache');
    const salvo = cache.find((r) => r.id === criada.id);
    assert.ok(salvo, 'Rotina criada deve estar no cache');
    assert.equal(salvo.medicamentoNome, 'Losartana Potássica 50mg');
  });

  test('confirmarIngestao deve funcionar com assinatura (idosoId, rotinaId, obs) e retornar sucesso', async () => {
    // Cria um medicamento para o teste
    const rotina = await criarRotina(TEST_IDOSO_ID, {
      medicamentoNome: 'Enalapril 10mg',
      dosagem: '1 comprimido',
      horario: '09:00',
    });

    // Chamada com assinatura usada no ElderlyModeScreen e MedicinesScreen:
    const resultado = await confirmarIngestao(
      TEST_IDOSO_ID,
      rotina.id,
      'Idoso confirmou com 1 toque no Modo Idoso.'
    );

    assert.equal(resultado.sucesso, true, 'Deve retornar propriedade sucesso: true');
    assert.equal(resultado.status, 'TOMADO', 'Status deve ser TOMADO');
    assert.ok(resultado.horarioIngestaoHoje, 'Deve registrar horário de ingestão');

    // Verifica persistência no cache local SQLite
    const cache = await obterRotinasDoCache(TEST_IDOSO_ID);
    const itemCache = cache.find((r) => r.id === rotina.id);
    assert.ok(itemCache);
    assert.equal(itemCache.statusHoje, 'TOMADO');
    assert.ok(itemCache.horarioIngestaoHoje);
  });

  test('confirmarIngestao deve funcionar com assinatura (rotinaId, dadosConfirmacao, token)', async () => {
    const rotina = await criarRotina(TEST_IDOSO_ID, {
      medicamentoNome: 'Sinvastatina 20mg',
      dosagem: '1 comp',
      horario: '20:00',
    });

    const resultado = await confirmarIngestao(rotina.id, {
      observacao: 'Familiar registrou pelo portal',
      status: 'TOMADO',
    });

    assert.equal(resultado.sucesso, true);
    assert.equal(resultado.status, 'TOMADO');
  });

  test('confirmarIngestao deve permitir desmarcar dose (alternar de TOMADO para PENDENTE)', async () => {
    const rotina = await criarRotina(TEST_IDOSO_ID, {
      medicamentoNome: 'Omeprazol 20mg',
      dosagem: '1 cápsula',
      horario: '07:00',
    });

    // 1. Marca como tomada
    const resTomado = await confirmarIngestao(TEST_IDOSO_ID, rotina.id, { status: 'TOMADO' });
    assert.equal(resTomado.status, 'TOMADO');
    assert.ok(resTomado.horarioIngestaoHoje);

    // 2. Desmarca (volta para PENDENTE)
    const resPendente = await confirmarIngestao(TEST_IDOSO_ID, rotina.id, { status: 'PENDENTE' });
    assert.equal(resPendente.status, 'PENDENTE');
    assert.equal(resPendente.horarioIngestaoHoje, null);

    // 3. Verifica persistência no cache SQLite
    const cache = await obterRotinasDoCache(TEST_IDOSO_ID);
    const item = cache.find((r) => r.id === rotina.id);
    assert.ok(item);
    assert.equal(item.statusHoje, 'PENDENTE');
    assert.equal(item.horarioIngestaoHoje, null);
  });

  test('listarRotinas deve retornar dados persistidos no cache SQLite em modo offline', async () => {
    // Popula diretamente o cache local
    const rotinasIniciais = [
      {
        id: 'rotina-offline-1',
        idosoId: TEST_IDOSO_ID,
        medicamentoNome: 'Insulina NPH',
        dosagem: '10 UI',
        horario: '07:30',
        tipoFormato: 'injecao',
        statusHoje: 'PENDENTE',
        ativo: true,
      },
      {
        id: 'rotina-offline-2',
        idosoId: TEST_IDOSO_ID,
        medicamentoNome: 'Atenolol 25mg',
        dosagem: '1 comprimido',
        horario: '12:00',
        tipoFormato: 'comprimido',
        statusHoje: 'TOMADO',
        ativo: true,
      },
    ];

    await salvarRotinasNoCache(TEST_IDOSO_ID, rotinasIniciais);

    // Consulta sem backend (vai usar o cache)
    const resultado = await listarRotinas(TEST_IDOSO_ID);

    assert.ok(Array.isArray(resultado));
    assert.ok(resultado.length >= 2);
    const insulina = resultado.find((r) => r.medicamentoNome === 'Insulina NPH');
    assert.ok(insulina, 'Deve encontrar Insulina NPH do cache local');
    assert.equal(insulina.tipoFormato, 'injecao');
    assert.equal(insulina.thumbEmoji, '💉', 'Deve enriquecer visualmente com emoji de injeção');
  });

  test('atualizarRotina e removerRotina devem refletir no cache local', async () => {
    const rotina = await criarRotina(TEST_IDOSO_ID, {
      medicamentoNome: 'Dipirona 500mg',
      dosagem: '1 comprimido',
      horario: '15:00',
    });

    const atualizada = await atualizarRotina(rotina.id, {
      medicamentoNome: 'Dipirona 1g',
      dosagem: '2 comprimidos',
      horario: '16:00',
    });

    assert.equal(atualizada.medicamentoNome, 'Dipirona 1g');
    assert.equal(atualizada.dosagem, '2 comprimidos');

    // Remove
    const removido = await removerRotina(rotina.id);
    assert.equal(removido, true);

    const cache = await obterRotinasDoCache(TEST_IDOSO_ID);
    const busca = cache.find((r) => r.id === rotina.id);
    assert.equal(busca, undefined, 'Item deve ter sido removido do cache');
  });
});
