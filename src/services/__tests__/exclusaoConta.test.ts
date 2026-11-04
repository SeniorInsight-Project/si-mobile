import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../apiClient';
import {
  confirmacaoValida,
  solicitarExclusao,
  ExclusaoError,
  ROTA_EXCLUSAO,
  PRAZO_COMPROVANTE_DIAS,
} from '../exclusaoContaService';

const rejeita = async (p: Promise<unknown>, tipo: string) =>
  assert.rejects(p, (e: unknown) => e instanceof ExclusaoError && e.tipo === tipo);

const falha = (status: number) => ({ post: (async () => { throw new ApiError(status, null, 'u'); }) as any });
const semRede = falha(0);

describe('Exclusão da conta e dos dados (HU-022 / RN-018)', () => {
  test('a frase vale com "EXCLUIR", ignorando caixa e espaços nas pontas', () => {
    assert.equal(confirmacaoValida('EXCLUIR'), true);
    assert.equal(confirmacaoValida('  excluir '), true);
    assert.equal(confirmacaoValida('Excluir'), true);
  });

  test('qualquer outra coisa não vale', () => {
    for (const t of ['', 'EXCLUI', 'EXCLUIR TUDO', 'apagar', 'EXC LUIR', 'EXCLUÍR']) {
      assert.equal(confirmacaoValida(t), false, `"${t}" não deveria valer`);
    }
    assert.equal(confirmacaoValida(undefined as unknown as string), false);
  });

  test('frase errada nem chega a consultar o servidor', async () => {
    let chamou = false;
    const cliente = { post: (async () => { chamou = true; return {}; }) as any };
    await rejeita(solicitarExclusao('oi', { cliente }), 'FRASE_INVALIDA');
    assert.equal(chamou, false);
  });

  test('HU-022 cenário 2: assinatura ativa bloqueia a exclusão antes de enviar', async () => {
    let chamou = false;
    const cliente = { post: (async () => { chamou = true; return {}; }) as any };
    await rejeita(solicitarExclusao('EXCLUIR', { assinaturaAtiva: true, cliente }), 'ASSINATURA_ATIVA');
    assert.equal(chamou, false);
  });

  test('HU-022 cenário 1: servidor aceita; a chamada vai pela rota e devolve protocolo e prazo', async () => {
    const chamadas: any[] = [];
    const cliente = { post: (async (c: string, b: unknown) => { chamadas.push({ c, b }); return { protocolo: 'P-123', prazoDias: 15 }; }) as any };
    const r = await solicitarExclusao('excluir', { cliente, permitirSimulacao: false });
    assert.deepEqual(r, { protocolo: 'P-123', prazoDias: 15, simulado: false });
    assert.equal(chamadas[0].c, ROTA_EXCLUSAO);
    assert.deepEqual(chamadas[0].b, { confirmacao: 'EXCLUIR' });
    assert.equal(PRAZO_COMPROVANTE_DIAS, 15);
  });

  test('em produção, sem rede NÃO finge sucesso: nada é apagado', async () => {
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: semRede, permitirSimulacao: false }), 'SEM_CONEXAO');
  });

  test('em produção, erro 500 também não finge sucesso', async () => {
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: falha(500), permitirSimulacao: false }), 'SEM_CONEXAO');
  });

  test('rota inexistente (404) em produção também é erro, nunca sucesso', async () => {
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: falha(404), permitirSimulacao: false }), 'SEM_CONEXAO');
  });

  test('servidor que recusa (4xx) é tratado como recusado, até em desenvolvimento', async () => {
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: falha(403), permitirSimulacao: true }), 'RECUSADO');
  });

  test('rede travada: o timeout libera a tela e não finge sucesso', async () => {
    const travado = { post: ((_c: string, _b: unknown, op: { signal: AbortSignal }) =>
      new Promise((_r, rej) => op.signal.addEventListener('abort', () => rej(new ApiError(0, null, 'u'))))) as any };
    const inicio = Date.now();
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: travado, timeoutMs: 40, permitirSimulacao: false }), 'SEM_CONEXAO');
    assert.ok(Date.now() - inicio < 2000);
  });

  test('só em desenvolvimento a simulação é permitida, e vem marcada como simulada', async () => {
    const r = await solicitarExclusao('EXCLUIR', { cliente: semRede, permitirSimulacao: true });
    assert.equal(r.simulado, true);
    assert.match(r.protocolo, /^DEV-/);
    assert.equal(r.prazoDias, 15);
  });
});
