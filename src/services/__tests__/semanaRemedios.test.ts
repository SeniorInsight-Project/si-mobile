import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularProgresso,
  dataIsoLocal,
  diaDeHoje,
  gerarSemana,
  mensagemRitmo,
} from '../semanaRemedios';

describe('Semana da tela Remédios', () => {
  test('gera a semana de segunda a domingo que contém hoje, em pt-BR', () => {
    const semana = gerarSemana(new Date(2026, 10, 18, 10, 0)); // quarta, 18/11/2026
    assert.deepEqual(
      semana.map((d) => d.id),
      ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'],
    );
    assert.deepEqual(semana.map((d) => d.diaSemana), ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']);
    const hoje = diaDeHoje(semana);
    assert.equal(hoje.id, '2026-11-18');
    assert.equal(hoje.labelCompleta, 'Quarta-feira, 18 Nov');
    assert.equal(semana.filter((d) => d.ehHoje).length, 1);
  });

  test('domingo pertence à semana que começou na segunda anterior', () => {
    const semana = gerarSemana(new Date(2026, 10, 22, 23, 30));
    assert.equal(semana[0].id, '2026-11-16');
    assert.equal(diaDeHoje(semana).id, '2026-11-22');
  });

  test('semana que cruza o mês e o ano', () => {
    const semana = gerarSemana(new Date(2026, 11, 31));
    assert.deepEqual(semana.map((d) => d.id).slice(0, 2), ['2026-12-28', '2026-12-29']);
    assert.equal(semana[6].id, '2027-01-03');
    assert.equal(semana[6].labelCompleta, 'Domingo, 3 Jan');
  });

  test('a data enviada à API é a data local, não UTC', () => {
    assert.equal(dataIsoLocal(new Date(2026, 10, 18, 23, 59)), '2026-11-18');
  });
});

describe('Progresso e ritmo dos remédios', () => {
  test('sem remédio no dia: 0% e nenhuma mensagem de ritmo', () => {
    const p = calcularProgresso(0, 0);
    assert.deepEqual(p, { tomados: 0, total: 0, percentual: 0 });
    assert.equal(mensagemRitmo(p), null);
  });

  test('a mensagem acompanha o percentual', () => {
    assert.equal(mensagemRitmo(calcularProgresso(0, 3))?.texto, 'Nenhuma dose ainda');
    assert.equal(mensagemRitmo(calcularProgresso(1, 3))?.texto, 'Em andamento');
    assert.equal(mensagemRitmo(calcularProgresso(3, 4))?.texto, 'Ótimo ritmo');
    assert.equal(mensagemRitmo(calcularProgresso(4, 4))?.texto, 'Tudo tomado');
  });

  test('percentual é real (0% não vira mínimo) e nunca passa de 100%', () => {
    assert.equal(calcularProgresso(0, 5).percentual, 0);
    assert.equal(calcularProgresso(7, 5).percentual, 100);
  });
});
