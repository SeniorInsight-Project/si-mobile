import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ExclusaoError,
  rotaExclusao,
  solicitarExclusao,
  titularDaSessao,
} from '../exclusaoContaService';
import type { PedidoExclusao, SolicitarExclusaoRequest } from '../../types/api';

const SUB = '5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9';
const PERFIL_ID = '11111111-2222-4333-8444-555555555555';
const IDOSO_ID = '66666666-7777-4888-9999-aaaaaaaaaaaa';
const FAMILIAR_ID = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

/** JWT de teste (sem assinatura) com as claims pedidas. */
function jwt(claims: Record<string, unknown>): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'none' })}.${b64(claims)}.x`;
}

const sessaoDe = (papel: 'idoso' | 'familiar', extra: Record<string, unknown> = {}) => ({
  obterToken: async () => jwt({ sub: SUB, realm_access: { roles: [papel] }, ...extra }),
});

const PEDIDO: PedidoExclusao = { protocolo: 'a1b2c3d4-0000-4000-8000-000000000001', prazoDias: 15, solicitadoEm: '2026-11-10T12:00:00.000Z' };

function clienteGravador(resposta: unknown = PEDIDO) {
  const chamadas: Array<{ caminho: string; corpo: unknown }> = [];
  return {
    chamadas,
    post: (async (caminho: string, corpo: unknown) => {
      chamadas.push({ caminho, corpo });
      return resposta;
    }) as never,
  };
}

describe('titularDaSessao: o titular é o sub do token da sessão atual', () => {
  test('sessão de idoso devolve o sub', async () => {
    assert.equal(await titularDaSessao(sessaoDe('idoso')), SUB);
  });

  test('sessão de familiar devolve o sub, do mesmo jeito', async () => {
    assert.equal(await titularDaSessao(sessaoDe('familiar')), SUB);
  });

  test('ignora perfilId, idosoId e familiarId que apareçam no token', async () => {
    const extra = { perfilId: PERFIL_ID, idosoId: IDOSO_ID, familiarId: FAMILIAR_ID };
    assert.equal(await titularDaSessao(sessaoDe('idoso', extra)), SUB);
  });

  test('token sem sub lança ExclusaoError SEM_TITULAR', async () => {
    const semSub = { obterToken: async () => jwt({ realm_access: { roles: ['idoso'] } }) };
    await assert.rejects(titularDaSessao(semSub), (e: unknown) => e instanceof ExclusaoError && e.tipo === 'SEM_TITULAR');
  });

  test('sub vazio, que não é texto, token ausente ou malformado também lançam SEM_TITULAR', async () => {
    const tokens: Array<string | null> = [jwt({ sub: '' }), jwt({ sub: 42 }), null, 'isto-nao-e-jwt'];
    for (const token of tokens) {
      await assert.rejects(
        titularDaSessao({ obterToken: async () => token }),
        (e: unknown) => e instanceof ExclusaoError && e.tipo === 'SEM_TITULAR'
      );
    }
  });
});

describe('Exclusão pelo gateway (report-v1: /api/v1/report/titulares/{titularId}/exclusao)', () => {
  test('a rota passa pelo prefixo /api/v1/report e leva o titularId', () => {
    assert.equal(rotaExclusao(SUB), `/api/v1/report/titulares/${SUB}/exclusao`);
  });

  test('sessão de idoso: a rota usa o sub do token', async () => {
    const cliente = clienteGravador();
    await solicitarExclusao('EXCLUIR', { cliente, permitirSimulacao: false, ...sessaoDe('idoso') });
    assert.equal(cliente.chamadas[0].caminho, `/api/v1/report/titulares/${SUB}/exclusao`);
  });

  test('sessão de familiar: a rota usa o sub do token', async () => {
    const cliente = clienteGravador();
    await solicitarExclusao('EXCLUIR', { cliente, permitirSimulacao: false, ...sessaoDe('familiar') });
    assert.equal(cliente.chamadas[0].caminho, `/api/v1/report/titulares/${SUB}/exclusao`);
  });

  test('nunca usa perfilId, idosoId nem familiarId no path', async () => {
    const cliente = clienteGravador();
    const extra = { perfilId: PERFIL_ID, idosoId: IDOSO_ID, familiarId: FAMILIAR_ID };
    await solicitarExclusao('EXCLUIR', { cliente, permitirSimulacao: false, ...sessaoDe('idoso', extra) });
    const { caminho } = cliente.chamadas[0];
    for (const proibido of [PERFIL_ID, IDOSO_ID, FAMILIAR_ID]) assert.equal(caminho.includes(proibido), false);
  });

  test('token sem sub lança ExclusaoError e a API não é chamada', async () => {
    const cliente = clienteGravador();
    await assert.rejects(
      solicitarExclusao('EXCLUIR', {
        cliente,
        permitirSimulacao: true,
        obterToken: async () => jwt({ realm_access: { roles: ['familiar'] } }),
      }),
      (e: unknown) => e instanceof ExclusaoError && e.tipo === 'SEM_TITULAR'
    );
    assert.equal(cliente.chamadas.length, 0);
  });

  test('o corpo é o SolicitarExclusaoRequest do contrato', async () => {
    const cliente = clienteGravador();
    await solicitarExclusao('excluir', { cliente, permitirSimulacao: false, ...sessaoDe('idoso') });
    const esperado: SolicitarExclusaoRequest = { confirmacao: 'EXCLUIR' };
    assert.deepEqual(cliente.chamadas[0].corpo, esperado);
  });

  test('lê protocolo, prazoDias e solicitadoEm do PedidoExclusao', async () => {
    const comprovante = await solicitarExclusao('EXCLUIR', {
      cliente: clienteGravador(PEDIDO),
      permitirSimulacao: false,
      ...sessaoDe('idoso'),
    });
    assert.equal(comprovante.protocolo, PEDIDO.protocolo);
    assert.equal(comprovante.prazoDias, 15);
    assert.equal(comprovante.solicitadoEm, Date.parse('2026-11-10T12:00:00.000Z'));
    assert.equal(comprovante.simulado, false);
  });

  test('prazoDias vem do servidor, sem trocar por 15 quando o servidor manda outro', async () => {
    const comprovante = await solicitarExclusao('EXCLUIR', {
      cliente: clienteGravador({ ...PEDIDO, prazoDias: 10 }),
      permitirSimulacao: false,
      ...sessaoDe('idoso'),
    });
    assert.equal(comprovante.prazoDias, 10);
  });

  test('resposta sem protocolo não vira comprovante com protocolo vazio', async () => {
    const { protocolo: _omitido, ...semProtocolo } = PEDIDO;
    await assert.rejects(
      solicitarExclusao('EXCLUIR', { cliente: clienteGravador(semProtocolo), permitirSimulacao: false, ...sessaoDe('idoso') }),
      (e: unknown) => e instanceof ExclusaoError && e.tipo === 'RESPOSTA_INVALIDA'
    );
  });
});
