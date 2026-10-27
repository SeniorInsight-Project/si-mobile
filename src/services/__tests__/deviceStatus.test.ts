import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatarHora,
  formatarResumoStatus,
  verificarPerdaDados,
  buscarStatusDispositivo,
} from '../deviceStatusService';

test('formatarHora deve formatar timestamp ISO em HH:mm com padding', () => {
  const d = new Date(2026, 9, 25, 10, 15, 0);
  assert.equal(formatarHora(d.toISOString()), '10:15');
});

test('formatarHora deve retornar --:-- para entradas nulas ou inválidas', () => {
  assert.equal(formatarHora(null), '--:--');
  assert.equal(formatarHora('invalido'), '--:--');
});

test('formatarResumoStatus deve reproduzir o Cenário 1 da HU-027 ("Última atualização 10:15, bateria 62%")', () => {
  const d = new Date(2026, 9, 25, 10, 15, 0);
  const status = {
    ultimaSincronizacao: d.toISOString(),
    nivelBateria: 62,
  };
  assert.equal(formatarResumoStatus(status), 'Última atualização 10:15, bateria 62%');
});

test('verificarPerdaDados não deve sinalizar perda quando a sincronização ocorreu há menos de 3h', () => {
  const ref = new Date(2026, 9, 25, 11, 0, 0);
  const sync = new Date(2026, 9, 25, 10, 15, 0); // 45 min atrás
  const resultado = verificarPerdaDados(sync.toISOString(), 'Maria', 3, ref);

  assert.equal(resultado.semDados, false);
  assert.equal(resultado.minutosAtraso, 45);
});

test('verificarPerdaDados deve sinalizar perda diurna após 3h sem dados (Cenário 1 da HU-028)', () => {
  // Dado que a última sincronização de Maria foi às 09:00, quando chega 12:00 sem nova...
  const sync = new Date(2026, 9, 25, 9, 0, 0);
  const agora12 = new Date(2026, 9, 25, 12, 0, 0); // Exatamente 3h depois (180 min)
  const resultado = verificarPerdaDados(sync.toISOString(), 'Maria', 3, agora12);

  assert.equal(resultado.semDados, true);
  assert.equal(resultado.minutosAtraso, 180);
  assert.equal(resultado.mensagem, 'Sem dados de Maria desde 09:00. Verifique o celular dela.');
});

test('buscarStatusDispositivo deve retornar lista de sensores contemplando Cenário 2 da HU-027 (oxigenação revogada)', async () => {
  const status = await buscarStatusDispositivo('e3b0c442-98fc-1c14-9afc-432100000001');

  assert.ok(status, 'Status deve ser retornado');
  assert.equal(status.nivelBateria, 62);
  assert.equal(typeof status.ultimaSincronizacao, 'string');

  const oxigenacao = status.tiposDados.find((t) => t.id === 'oxigenacao');
  assert.ok(oxigenacao, 'Sensor de oxigenação deve existir');
  assert.equal(oxigenacao.ativo, false);
  assert.equal(oxigenacao.revogadoPeloIdoso, true);
  assert.equal(oxigenacao.detalhe, 'Desativada pelo idoso');

  const passos = status.tiposDados.find((t) => t.id === 'passos');
  assert.ok(passos);
  assert.equal(passos.ativo, true);
});
