import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validarCadastroIdoso,
  formatarData,
  formatarCelular,
  parseDataBr,
  dataBrParaIso,
  calcularIdade,
  IDADE_MINIMA_SCORE,
} from '../cadastroIdosoValidacao';

const HOJE = new Date(2026, 10, 4); // 04/11/2026
const FORM_OK = { nome: 'Maria Aparecida Silva', dataNascimento: '14/05/1948', sexo: 'Feminino', celular: '(61) 98123-4567' };

describe('Cadastro do idoso - validação (HU-008)', () => {
  test('cenário 1: campos obrigatórios preenchidos são válidos e sem aviso de idade', () => {
    const r = validarCadastroIdoso(FORM_OK, HOJE);
    assert.equal(r.valido, true);
    assert.deepEqual(r.erros, {});
    assert.equal(r.avisoIdade, false);
  });

  test('cenário 2: data vazia mostra "Informe a data de nascimento" e não valida', () => {
    const r = validarCadastroIdoso({ ...FORM_OK, dataNascimento: '' }, HOJE);
    assert.equal(r.valido, false);
    assert.equal(r.erros.dataNascimento, 'Informe a data de nascimento');
  });

  test('cenário 3: 40 anos gera aviso do Score (49+), mas continua válido', () => {
    const r = validarCadastroIdoso({ ...FORM_OK, dataNascimento: '04/11/1986' }, HOJE);
    assert.equal(r.valido, true);
    assert.equal(r.avisoIdade, true);
    assert.equal(IDADE_MINIMA_SCORE, 49);
  });

  test('limite: 49 anos completos hoje não gera aviso; faltando 1 dia gera', () => {
    assert.equal(validarCadastroIdoso({ ...FORM_OK, dataNascimento: '04/11/1977' }, HOJE).avisoIdade, false);
    assert.equal(validarCadastroIdoso({ ...FORM_OK, dataNascimento: '05/11/1977' }, HOJE).avisoIdade, true);
  });

  test('datas impossíveis, futuras ou muito antigas são recusadas', () => {
    for (const d of ['31/02/1950', '32/01/1950', '00/01/1950', '14/13/1950', '05/11/2026', '01/01/1850', '1/1/1950']) {
      assert.equal(parseDataBr(d, HOJE), null, `deveria recusar ${d}`);
    }
    assert.equal(parseDataBr('29/02/1948', HOJE)?.getDate(), 29); // 1948 foi bissexto
  });

  test('nome curto, sexo ausente e celular inválido geram erros por campo', () => {
    const r = validarCadastroIdoso({ nome: 'Al', dataNascimento: '14/05/1948', sexo: '', celular: '1234' }, HOJE);
    assert.equal(r.valido, false);
    assert.ok(r.erros.nome && r.erros.sexo && r.erros.celular);
    assert.equal(r.erros.dataNascimento, undefined);
  });

  test('celular aceita 10 e 11 dígitos, recusa 9 e 12', () => {
    const val = (c: string) => validarCadastroIdoso({ ...FORM_OK, celular: c }, HOJE).erros.celular;
    assert.equal(val('(61) 3123-4567'), undefined);
    assert.equal(val('(61) 98123-4567'), undefined);
    assert.ok(val('(61) 8123-456'));
    assert.ok(val('611981234567'));
  });

  test('máscaras de data e celular', () => {
    assert.equal(formatarData('14051948'), '14/05/1948');
    assert.equal(formatarData('1405'), '14/05');
    assert.equal(formatarData('14/05/19489999'), '14/05/1948');
    assert.equal(formatarCelular('61981234567'), '(61) 98123-4567');
    assert.equal(formatarCelular('6131234567'), '(61) 3123-4567');
    assert.equal(formatarCelular('6'), '6');
  });

  test('calcularIdade', () => {
    assert.equal(calcularIdade('14/05/1948', HOJE), 78);
    assert.equal(calcularIdade('lixo', HOJE), null);
  });

  test('dataBrParaIso converte para o formato do contrato e recusa data inválida', () => {
    assert.equal(dataBrParaIso('14/05/1948', HOJE), '1948-05-14');
    assert.equal(dataBrParaIso('01/01/2000', HOJE), '2000-01-01');
    assert.equal(dataBrParaIso('31/02/1950', HOJE), null);
    assert.equal(dataBrParaIso('', HOJE), null);
  });
});
