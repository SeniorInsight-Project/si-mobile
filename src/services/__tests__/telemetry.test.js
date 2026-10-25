import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  verificarDadosRecentes,
  buscarEstadoAtual,
} from '../telemetryService.js';

test('verificarDadosRecentes deve formatar "Atualizado às 14:30" conforme Cenário 1 da HU-031', () => {
  const ref = new Date(2026, 9, 25, 15, 0, 0);
  const coleta = new Date(2026, 9, 25, 14, 30, 0); // 30 min atrás

  const resultado = verificarDadosRecentes(coleta.toISOString(), 48, ref);

  assert.equal(resultado.semDadosRecentes, false);
  assert.equal(resultado.textoAtualizacao, 'Atualizado às 14:30');
});

test('verificarDadosRecentes deve exibir "Sem dados recentes" quando não chegam dados há mais de 48h (Cenário 2 da HU-031)', () => {
  const ref = new Date(2026, 9, 25, 12, 0, 0);
  // Coletado 50 horas atrás (mais de 48h)
  const coletaAntiga = new Date(ref.getTime() - 50 * 60 * 60 * 1000);

  const resultado = verificarDadosRecentes(coletaAntiga.toISOString(), 48, ref);

  assert.equal(resultado.semDadosRecentes, true);
  assert.equal(resultado.textoAtualizacao, 'Sem dados recentes');
  assert.ok(resultado.horasSemDados >= 48);
});

test('verificarDadosRecentes deve retornar "Sem dados recentes" para data nula ou inválida', () => {
  assert.equal(verificarDadosRecentes(null).semDadosRecentes, true);
  assert.equal(verificarDadosRecentes(null).textoAtualizacao, 'Sem dados recentes');
  assert.equal(verificarDadosRecentes('invalido').semDadosRecentes, true);
});

test('buscarEstadoAtual deve retornar passos e frequência cardíaca sem conter glicemia', async () => {
  const estado = await buscarEstadoAtual('e3b0c442-98fc-1c14-9afc-432100000001');

  assert.ok(estado, 'Estado atual deve ser retornado');
  assert.equal(typeof estado.passosHoje, 'number');
  assert.equal(typeof estado.frequenciaCardiaca, 'number');
  assert.equal(estado.metaPassos, 4000);
  assert.equal(typeof estado.textoAtualizacao, 'string');

  // Garante que o sinal de glicemia foi excluído do domínio conforme instrução da Issue #56
  assert.equal(estado.glicemia, undefined);
});
