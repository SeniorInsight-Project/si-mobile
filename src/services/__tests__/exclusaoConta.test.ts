import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../apiClient';
import {
  confirmacaoValida,
  solicitarExclusao,
  ExclusaoError,
  MENSAGENS_EXCLUSAO,
  rotaExclusao,
  PRAZO_COMPROVANTE_DIAS,
} from '../exclusaoContaService';

const SUB = '5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9';
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
/** Sessão de teste: access token (sem assinatura) com o sub do titular. */
const sessao = { obterToken: async () => `${b64({ alg: 'none' })}.${b64({ sub: SUB })}.x` };

const rejeita = async (p: Promise<unknown>, tipo: string) =>
  assert.rejects(p, (e: unknown) => e instanceof ExclusaoError && e.tipo === tipo);

const falha = (status: number) => ({ post: (async () => { throw new ApiError(status, null, 'u'); }) as any });
const falhaComMensagem = (status: number, message: string) => ({
  post: (async () => { throw new ApiError(status, { status, message }, 'u'); }) as any,
});
const semRede = falha(0);

// Corpos de erro reais do report-service (ExclusaoException + TratadorErros).
const MSG_PEDIDO_EM_ANDAMENTO = 'Já existe um pedido de exclusão em andamento para o titular';
const MSG_ASSINATURA_ATIVA = 'Há uma assinatura Premium ativa: cancele a assinatura antes de pedir a exclusão';
const MSG_TITULAR_NAO_ENCONTRADO = 'Titular não encontrado';

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
    const cliente = { post: (async (c: string, b: unknown) => { chamadas.push({ c, b }); return { protocolo: 'P-123', prazoDias: 15, solicitadoEm: '2026-11-10T12:00:00.000Z' }; }) as any };
    const r = await solicitarExclusao('excluir', { cliente, permitirSimulacao: false, ...sessao });
    assert.deepEqual(r, { protocolo: 'P-123', prazoDias: 15, solicitadoEm: Date.parse('2026-11-10T12:00:00.000Z'), simulado: false });
    assert.equal(chamadas[0].c, rotaExclusao(SUB));
    assert.deepEqual(chamadas[0].b, { confirmacao: 'EXCLUIR' });
    assert.equal(PRAZO_COMPROVANTE_DIAS, 15);
  });

  test('em produção, sem rede NÃO finge sucesso: nada é apagado', async () => {
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: semRede, permitirSimulacao: false, ...sessao }), 'SEM_CONEXAO');
  });

  test('em produção, erro 500 também não finge sucesso', async () => {
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: falha(500), permitirSimulacao: false, ...sessao }), 'SEM_CONEXAO');
  });

  test('404 do report-service vira TITULAR_NAO_ENCONTRADO, sem simulação nem em desenvolvimento', async () => {
    const cliente = falhaComMensagem(404, MSG_TITULAR_NAO_ENCONTRADO);
    await rejeita(solicitarExclusao('EXCLUIR', { cliente, permitirSimulacao: false, ...sessao }), 'TITULAR_NAO_ENCONTRADO');
    await rejeita(solicitarExclusao('EXCLUIR', { cliente, permitirSimulacao: true, ...sessao }), 'TITULAR_NAO_ENCONTRADO');
  });

  test('404 sem corpo também é TITULAR_NAO_ENCONTRADO, nunca SEM_CONEXAO', async () => {
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: falha(404), permitirSimulacao: true, ...sessao }), 'TITULAR_NAO_ENCONTRADO');
  });

  test('409 de pedido em andamento vira PEDIDO_EM_ANDAMENTO e a mensagem não diz que nada foi apagado', async () => {
    const cliente = falhaComMensagem(409, MSG_PEDIDO_EM_ANDAMENTO);
    await assert.rejects(
      solicitarExclusao('EXCLUIR', { cliente, permitirSimulacao: true, ...sessao }),
      (e: unknown) => {
        assert.ok(e instanceof ExclusaoError);
        assert.equal(e.tipo, 'PEDIDO_EM_ANDAMENTO');
        assert.ok(!/Nada foi apagado/i.test(e.message));
        assert.equal(
          e.message,
          'Já existe um pedido de exclusão em andamento. Os seus dados estão sendo apagados; o prazo é de até 15 dias.'
        );
        return true;
      }
    );
  });

  test('409 de assinatura ativa vira ASSINATURA_ATIVA', async () => {
    const cliente = falhaComMensagem(409, MSG_ASSINATURA_ATIVA);
    await rejeita(solicitarExclusao('EXCLUIR', { cliente, permitirSimulacao: true, ...sessao }), 'ASSINATURA_ATIVA');
  });

  test('409 cujo corpo não distingue os casos cai em PEDIDO_EM_ANDAMENTO', async () => {
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: falha(409), permitirSimulacao: true, ...sessao }), 'PEDIDO_EM_ANDAMENTO');
  });

  test('TITULAR_NAO_ENCONTRADO diz que nada foi apagado e orienta a entrar de novo', () => {
    assert.equal(
      MENSAGENS_EXCLUSAO.TITULAR_NAO_ENCONTRADO,
      'Não encontramos a sua conta. Nada foi apagado. Entre de novo no app e, se continuar, fale com o suporte.'
    );
  });

  test('RESPOSTA_INVALIDA não manda procurar comprovante por e-mail', () => {
    assert.equal(
      MENSAGENS_EXCLUSAO.RESPOSTA_INVALIDA,
      'O pedido pode ter sido registrado, mas não recebemos o protocolo. Antes de tentar de novo, aguarde alguns minutos.'
    );
    assert.ok(!/e-?mail/i.test(MENSAGENS_EXCLUSAO.RESPOSTA_INVALIDA));
  });

  test('servidor que recusa (4xx) é tratado como recusado, até em desenvolvimento', async () => {
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: falha(403), permitirSimulacao: true, ...sessao }), 'RECUSADO');
  });

  test('rede travada: o timeout libera a tela e não finge sucesso', async () => {
    const travado = { post: ((_c: string, _b: unknown, op: { signal: AbortSignal }) =>
      new Promise((_r, rej) => op.signal.addEventListener('abort', () => rej(new ApiError(0, null, 'u'))))) as any };
    const inicio = Date.now();
    await rejeita(solicitarExclusao('EXCLUIR', { cliente: travado, timeoutMs: 40, permitirSimulacao: false, ...sessao }), 'SEM_CONEXAO');
    assert.ok(Date.now() - inicio < 2000);
  });

  test('só em desenvolvimento a simulação é permitida, e vem marcada como simulada', async () => {
    const r = await solicitarExclusao('EXCLUIR', { cliente: semRede, permitirSimulacao: true, ...sessao });
    assert.equal(r.simulado, true);
    assert.match(r.protocolo, /^DEV-/);
    assert.equal(r.prazoDias, 15);
  });
});
