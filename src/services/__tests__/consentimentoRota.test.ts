import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConsentimentoError,
  obterConsentimentos,
  rotaConsentimentos,
  salvarConsentimentos,
  type Consentimentos,
} from '../consentimentoService';
import type { ConsentimentosApi } from '../../types/api';

const IDOSO_ID = '3f2b8c1e-5d4a-4b7e-9c10-6a1d2e3f4a5b';
const PERFIL_ID = '9b7d6c5e-1a2b-4c3d-8e4f-0a1b2c3d4e5f';

const NO_CONTRATO: ConsentimentosApi = {
  BATIMENTOS: true,
  PASSOS: false,
  SONO: true,
  OXIGENACAO: false,
  LOCALIZACAO: true,
};

interface Chamada {
  metodo: 'get' | 'put';
  caminho: string;
  corpo?: unknown;
}

function clienteGravador(resposta: ConsentimentosApi | undefined) {
  const chamadas: Chamada[] = [];
  return {
    chamadas,
    get: (async (caminho: string) => {
      chamadas.push({ metodo: 'get', caminho });
      return resposta;
    }) as never,
    put: (async (caminho: string, corpo: unknown) => {
      chamadas.push({ metodo: 'put', caminho, corpo });
      return resposta;
    }) as never,
  };
}

describe('Consentimentos por idoso (care-v1: /api/v1/idosos/{idosoId}/consentimentos)', () => {
  test('a rota leva o UUID do idoso no path, sem o atalho "me"', () => {
    assert.equal(rotaConsentimentos(IDOSO_ID), `/api/v1/idosos/${IDOSO_ID}/consentimentos`);
  });

  test('leitura chama GET na rota do idoso e devolve o tipo Consentimentos do contrato', async () => {
    const cliente = clienteGravador(NO_CONTRATO);
    const lidos: Consentimentos = await obterConsentimentos(IDOSO_ID, { cliente });
    assert.deepEqual(cliente.chamadas, [{ metodo: 'get', caminho: `/api/v1/idosos/${IDOSO_ID}/consentimentos` }]);
    assert.deepEqual(lidos, NO_CONTRATO);
  });

  test('escrita chama PUT na rota do idoso com as cinco chaves do contrato e devolve o que o servidor gravou', async () => {
    const cliente = clienteGravador({ ...NO_CONTRATO, PASSOS: true });
    const gravados = await salvarConsentimentos(IDOSO_ID, { ...NO_CONTRATO, PASSOS: true }, { cliente });
    assert.deepEqual(cliente.chamadas, [
      { metodo: 'put', caminho: `/api/v1/idosos/${IDOSO_ID}/consentimentos`, corpo: { ...NO_CONTRATO, PASSOS: true } },
    ]);
    assert.deepEqual(gravados, { ...NO_CONTRATO, PASSOS: true });
  });

  test('campo que não é do contrato não vai no PUT', async () => {
    const cliente = clienteGravador(NO_CONTRATO);
    const comExtra = { ...NO_CONTRATO, ID_INTERNO: 'x' } as Consentimentos;
    await salvarConsentimentos(IDOSO_ID, comExtra, { cliente });
    assert.deepEqual(Object.keys((cliente.chamadas[0].corpo ?? {}) as object).sort(), [
      'BATIMENTOS',
      'LOCALIZACAO',
      'OXIGENACAO',
      'PASSOS',
      'SONO',
    ]);
  });

  test('sem idosoId, a leitura lança erro de domínio para pedir novo pareamento e não chama a API', async () => {
    for (const ausente of [undefined, null, '']) {
      const cliente = clienteGravador(NO_CONTRATO);
      await assert.rejects(obterConsentimentos(ausente, { cliente }), (erro: unknown) => {
        assert.ok(erro instanceof ConsentimentoError);
        assert.equal(erro.codigo, 'SEM_IDOSO');
        assert.match(erro.message, /novo pareamento|novo código/i);
        return true;
      });
      assert.equal(cliente.chamadas.length, 0);
    }
  });

  test('sem idosoId, a escrita lança o mesmo erro de domínio e não chama a API', async () => {
    const cliente = clienteGravador(NO_CONTRATO);
    await assert.rejects(
      salvarConsentimentos(undefined, NO_CONTRATO, { cliente }),
      (erro: unknown) => erro instanceof ConsentimentoError && erro.codigo === 'SEM_IDOSO'
    );
    assert.equal(cliente.chamadas.length, 0);
  });

  test('nunca usa o perfilId: o id do identity não vira path do care', async () => {
    const cliente = clienteGravador(NO_CONTRATO);
    await obterConsentimentos(IDOSO_ID, { cliente });
    await salvarConsentimentos(IDOSO_ID, NO_CONTRATO, { cliente });
    assert.ok(cliente.chamadas.every((c) => !c.caminho.includes(PERFIL_ID)));
    assert.ok(cliente.chamadas.every((c) => c.caminho.includes(IDOSO_ID)));
  });
});
