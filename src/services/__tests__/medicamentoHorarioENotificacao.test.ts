import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatarHorarioInput, normalizarHorario } from '../timeFormat';
import {
  agendarLembretesMedicacao,
  obterLembretesAgendados,
  cancelarTodosLembretes,
} from '../notificacaoMedicamentoService';

describe('Correção de Horário e Notificações de Medicamentos (HU-056)', () => {
  describe('formatarHorarioInput (Máscara e Sanitização)', () => {
    test('deve formatar número único maior que 2 com zero à esquerda e dois-pontos', () => {
      // Ex: usuário digita "8"
      const res = formatarHorarioInput('', '8');
      assert.equal(res, '08:');
    });

    test('deve formatar sequência contínua de 4 dígitos para HH:mm', () => {
      // Ex: usuário digita "0800"
      const res = formatarHorarioInput('08:0', '0800');
      assert.equal(res, '08:00');

      // Ex: usuário digita "1430"
      const res2 = formatarHorarioInput('', '1430');
      assert.equal(res2, '14:30');
    });

    test('deve limitar e ajustar valores fora das faixas válidas (00-23 e 00-59)', () => {
      // Ex: tentativa de digitar 29h
      const resHoras = formatarHorarioInput('', '29');
      assert.equal(resHoras, '23:');

      // Ex: tentativa de digitar 28h e 99 min
      const resTotal = formatarHorarioInput('', '2899');
      assert.equal(resTotal, '23:59');
    });

    test('deve permitir apagar (backspace) sem travar o cursor', () => {
      // Usuário apagou de "08:00" para "08:0"
      const res1 = formatarHorarioInput('08:00', '08:0');
      assert.equal(res1, '08:0');

      // Usuário apagou de "08:" para "08"
      const res2 = formatarHorarioInput('08:', '08');
      assert.equal(res2, '08');

      // Usuário apagou para string vazia
      const res3 = formatarHorarioInput('08', '');
      assert.equal(res3, '');
    });

    test('deve remover caracteres não numéricos', () => {
      const res = formatarHorarioInput('', 'abc12def34');
      assert.equal(res, '12:34');
    });
  });

  describe('normalizarHorario (Validação de Salvamento)', () => {
    test('deve padronizar horas com 1 ou 2 dígitos sem minutos para HH:00', () => {
      assert.equal(normalizarHorario('8'), '08:00');
      assert.equal(normalizarHorario('14'), '14:00');
      assert.equal(normalizarHorario('0'), '00:00');
    });

    test('deve padronizar horas e minutos incompletos (ex: 8:5)', () => {
      assert.equal(normalizarHorario('8:5'), '08:05');
      assert.equal(normalizarHorario('8:00'), '08:00');
      assert.equal(normalizarHorario('14:30'), '14:30');
    });

    test('deve retornar null para horários inválidos ou fora de faixa', () => {
      assert.equal(normalizarHorario('25:00'), null);
      assert.equal(normalizarHorario('12:65'), null);
      assert.equal(normalizarHorario(''), null);
      assert.equal(normalizarHorario('invalid'), null);
    });
  });

  describe('notificacaoMedicamentoService', () => {
    test('funções de agendamento não devem lançar erro quando executadas', async () => {
      const rotinasTeste = [
        {
          id: 'med-01',
          idosoId: 'idoso-01',
          medicamentoNome: 'Losartana 50mg',
          dosagem: '1 comprimido',
          horario: '08:00',
          ativo: true,
        },
        {
          id: 'med-02',
          idosoId: 'idoso-01',
          medicamentoNome: 'Vitamina D3',
          dosagem: '1 cápsula',
          horario: '14:30',
          ativo: true,
        },
      ];

      // Em ambiente node puro, deve retornar sem crashar
      const cancelado = await cancelarTodosLembretes();
      assert.equal(typeof cancelado, 'boolean');

      const agendados = await agendarLembretesMedicacao(rotinasTeste);
      assert.equal(typeof agendados, 'number');

      const lista = await obterLembretesAgendados();
      assert.ok(Array.isArray(lista));
    });
  });
});
