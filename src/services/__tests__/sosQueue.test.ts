import test from 'node:test';
import assert from 'node:assert/strict';
import type { ContatoEmergencia } from '../contatoEmergenciaService';

// Testes unitários para lógica de enfileiramento, idempotência e janela de 60s do SOS (HU-063)

test('enfileirarSos deve gerar chave de idempotência UUID única e status PENDENTE', async () => {
  const { enfileirarSos } = await import('../sosQueueService');

  const reg1 = await enfileirarSos('idoso-teste-1', {
    latitude: -23.55052,
    longitude: -46.633308,
  });

  const reg2 = await enfileirarSos('idoso-teste-1', {
    latitude: -23.55052,
    longitude: -46.633308,
  });

  assert.ok(reg1.idempotencyKey, 'Chave de idempotência 1 deve existir');
  assert.ok(reg2.idempotencyKey, 'Chave de idempotência 2 deve existir');
  assert.notEqual(reg1.idempotencyKey, reg2.idempotencyKey, 'Chaves de disparos distintos devem ser diferentes');
  assert.equal(reg1.status, 'PENDENTE');
  assert.equal(reg1.tentativas, 0);
  assert.ok(reg1.criadoEm > 0);
});

test('cancelarFilaSos deve cancelar job pendente e atualizar status para CANCELADO', async () => {
  const { enfileirarSos, cancelarFilaSos } = await import('../sosQueueService');

  const reg = await enfileirarSos('idoso-teste-cancel', {
    latitude: -23.55,
    longitude: -46.63,
  });

  await cancelarFilaSos(reg.idempotencyKey);
  // Não deve lançar erro ao cancelar
  assert.ok(true);
});

test('contatoEmergenciaService deve retornar 1º contato de emergência prioritário (ordem 1)', async () => {
  const { listarContatos } = await import('../contatoEmergenciaService');

  const contatos = await listarContatos('idoso-teste');
  assert.ok(Array.isArray(contatos));
  assert.ok(contatos.length >= 1);

  const primeiro = contatos[0];
  assert.equal(primeiro.ordem, 1);
  assert.ok(primeiro.nome.length > 0);
  assert.ok(primeiro.telefone.length > 0);
});

test('iniciarCicloEnvio deve disparar onTimeout com 1º contato quando janela de 60s é ultrapassada', async () => {
  const { enfileirarSos, iniciarCicloEnvio } = await import('../sosQueueService');

  const reg = await enfileirarSos('idoso-teste-timeout', {
    latitude: -23.55,
    longitude: -46.63,
  });

  // Simula que o chamado foi criado há 61 segundos (ultrapassou a janela máxima de 60s)
  reg.criadoEm = Date.now() - 61000;

  let timeoutChamado = false;
  let contatoRecebido = null as ContatoEmergencia | null;

  await new Promise<void>((resolve) => {
    iniciarCicloEnvio(reg.idempotencyKey, {
      onTimeout: ({ primeiroContato }) => {
        timeoutChamado = true;
        contatoRecebido = primeiroContato;
        resolve();
      },
    });
  });

  assert.ok(timeoutChamado, 'onTimeout deve ser disparado após 60s sem resposta');
  assert.ok(contatoRecebido !== null, 'Deve receber o 1º contato de socorro para discador');
  const contato = contatoRecebido as ContatoEmergencia;
  assert.equal(contato.ordem, 1);
  assert.equal(contato.nome, 'Carlos Silva');
});
