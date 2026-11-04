import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parearComCodigo,
  gerarCodigoPareamento,
  sanitizarCodigo,
  codigoValido,
  formatarCodigoExibicao,
  extrairCodigoDoQr,
  saudacaoIdoso,
  montarMensagemCompartilhamento,
  PareamentoError,
  Aparelho,
} from '../pareamentoService';
import { ApiError } from '../apiClient';

const APARELHO: Aparelho = { identificador: 'aparelho-123', plataforma: 'ANDROID' };

/** JWT de teste (sem assinatura) com as roles pedidas. */
function jwt(roles: string[]): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'none' })}.${b64({ sub: 'u1', realm_access: { roles } })}.x`;
}

interface Chamada { caminho: string; corpo: any; opcoes: any }
function clienteFalso(resposta: unknown | (() => never)) {
  const chamadas: Chamada[] = [];
  return {
    chamadas,
    post: (async (caminho: string, corpo: unknown, opcoes: unknown) => {
      chamadas.push({ caminho, corpo, opcoes });
      if (typeof resposta === 'function') return (resposta as () => never)();
      return resposta;
    }) as any,
  };
}
const falhaCom = (status: number) => () => { throw new ApiError(status, null, 'http://x/y'); };
const rejeitaCom = async (p: Promise<unknown>, tipo: string) =>
  assert.rejects(p, (e: unknown) => e instanceof PareamentoError && e.tipo === tipo);

const RESGATE_OK = {
  perfil: { id: 'perfil-1', nome: 'Maria Aparecida Silva' },
  sessaoAparelhoId: 'sessao-9',
  tokens: { accessToken: jwt(['idoso']), refreshToken: 'r1', expiresIn: 300, tokenType: 'Bearer' },
};

describe('Pareamento do idoso pelo contrato identity-v1 (HU-007 / RF-006)', () => {
  test('o código é alfanumérico de 6 a 8 caracteres, em maiúsculas', () => {
    assert.equal(sanitizarCodigo('k7p-2qx '), 'K7P2QX');
    assert.equal(sanitizarCodigo('abcdefghij'), 'ABCDEFGH', 'corta em 8');
    assert.equal(sanitizarCodigo('***'), '');
    assert.equal(codigoValido('K7P2QX'), true);
    assert.equal(codigoValido('K7P2Q'), false);
    assert.equal(codigoValido('K7P2QX9AZ'), false);
    assert.equal(codigoValido('k7p2qx'), false, 'só maiúsculas depois de sanitizar');
  });

  test('formatarCodigoExibicao agrupa em 3', () => {
    assert.equal(formatarCodigoExibicao('K7P2QX'), 'K7P 2QX');
    assert.equal(formatarCodigoExibicao('K7P2QX9A'), 'K7P 2QX9A');
  });

  test('QR no formato seniorinsight://pareamento?codigo=...', () => {
    assert.equal(extrairCodigoDoQr('seniorinsight://pareamento?codigo=K7P2QX'), 'K7P2QX');
    assert.equal(extrairCodigoDoQr('seniorinsight://pareamento?codigo=k7p2qx'), 'K7P2QX');
    assert.equal(extrairCodigoDoQr('seniorinsight://pareamento?origem=app&codigo=K7P2QX'), 'K7P2QX');
    assert.equal(extrairCodigoDoQr('seniorinsight://pareamento?codigo=K7P2QX&x=1'), 'K7P2QX');
  });

  test('QR de outro formato, do formato antigo ou de outro site é recusado', () => {
    for (const q of [
      'seniorinsight://idoso/abc/codigo/482913',
      'seniorinsight://convite/token',
      'https://evil.example/pareamento?codigo=K7P2QX',
      'seniorinsight://pareamento?codigo=K7P2',
      'seniorinsight://pareamento',
      '',
    ]) {
      assert.equal(extrairCodigoDoQr(q), null, q);
    }
  });

  test('saudação: Dona/Seu só quando o sexo é conhecido; senão, o primeiro nome', () => {
    assert.equal(saudacaoIdoso('Maria Aparecida Silva', 'Feminino'), 'Dona Maria');
    assert.equal(saudacaoIdoso('João Souza', 'Masculino'), 'Seu João');
    assert.equal(saudacaoIdoso('Maria Aparecida Silva'), 'Maria');
    assert.equal(saudacaoIdoso('Dona Maria Aparecida', 'Feminino'), 'Dona Maria');
    assert.equal(saudacaoIdoso(''), '');
  });

  test('mensagem de compartilhamento traz o código e a validade, sem dado pessoal', () => {
    const msg = montarMensagemCompartilhamento('K7P2QX', new Date(2026, 10, 4, 15, 30).getTime());
    assert.ok(msg.includes('K7P 2QX'));
    assert.ok(msg.includes('15:30'));
    assert.ok(!/maria|silva|cpf/i.test(msg));
    assert.match(montarMensagemCompartilhamento('K7P2QX'), /pouco tempo/);
  });

  test('resgate: chama a rota do contrato, pública, com código, aparelho e plataforma', async () => {
    const cliente = clienteFalso(RESGATE_OK);
    await parearComCodigo('k7p 2qx', APARELHO, { cliente, salvar: async () => {} });
    const c = cliente.chamadas[0];
    assert.equal(c.caminho, '/api/v1/identity/pareamentos/resgates');
    assert.deepEqual(c.corpo, { codigo: 'K7P2QX', identificadorAparelho: 'aparelho-123', plataforma: 'ANDROID' });
    assert.equal(c.opcoes.autenticado, false, 'o idoso ainda não tem sessão: rota pública');
  });

  test('resgate: salva os tokens recebidos e o papel vem do token', async () => {
    let salvo: any = null;
    const r = await parearComCodigo('K7P2QX', APARELHO, {
      cliente: clienteFalso(RESGATE_OK),
      salvar: async (t) => { salvo = t; },
    });
    assert.deepEqual(salvo, { accessToken: RESGATE_OK.tokens.accessToken, refreshToken: 'r1', expiresIn: 300 });
    assert.deepEqual(r.papeis, ['idoso']);
    assert.equal(r.nomeIdoso, 'Maria Aparecida Silva');
    assert.equal(r.perfilId, 'perfil-1');
    assert.equal(r.sessaoAparelhoId, 'sessao-9');
  });

  test('o papel não é inventado: token sem a role idoso devolve papéis sem idoso', async () => {
    const r = await parearComCodigo('K7P2QX', APARELHO, {
      cliente: clienteFalso({ ...RESGATE_OK, tokens: { ...RESGATE_OK.tokens, accessToken: jwt(['familiar']) } }),
      salvar: async () => {},
    });
    assert.ok(!r.papeis.includes('idoso'));
  });

  test('código incompleto nem chega ao servidor', async () => {
    const cliente = clienteFalso(RESGATE_OK);
    await rejeitaCom(parearComCodigo('K7P2', APARELHO, { cliente }), 'CODIGO_INCOMPLETO');
    assert.equal(cliente.chamadas.length, 0);
  });

  test('erros do contrato: 404 inválido, 409 já usado, 410 vencido, 429 tentativas', async () => {
    const salvar = async () => {};
    await rejeitaCom(parearComCodigo('K7P2QX', APARELHO, { cliente: clienteFalso(falhaCom(404)), salvar }), 'CODIGO_INVALIDO');
    await rejeitaCom(parearComCodigo('K7P2QX', APARELHO, { cliente: clienteFalso(falhaCom(409)), salvar }), 'CODIGO_USADO');
    await rejeitaCom(parearComCodigo('K7P2QX', APARELHO, { cliente: clienteFalso(falhaCom(410)), salvar }), 'CODIGO_VENCIDO');
    await rejeitaCom(parearComCodigo('K7P2QX', APARELHO, { cliente: clienteFalso(falhaCom(429)), salvar }), 'TENTATIVAS');
  });

  test('sem rede dá erro de conexão: NÃO existe pareamento local nem código de demonstração', async () => {
    await rejeitaCom(parearComCodigo('K7P2QX', APARELHO, { cliente: clienteFalso(falhaCom(0)), salvar: async () => {} }), 'SEM_CONEXAO');
    await rejeitaCom(parearComCodigo('K7P2QX', APARELHO, { cliente: clienteFalso(falhaCom(500)), salvar: async () => {} }), 'FALHA');
  });

  test('os antigos códigos de demonstração (482913, 111111, 222222) não funcionam sem o servidor', async () => {
    for (const antigo of ['482913', '111111', '222222']) {
      await rejeitaCom(parearComCodigo(antigo, APARELHO, { cliente: clienteFalso(falhaCom(404)), salvar: async () => {} }), 'CODIGO_INVALIDO');
    }
  });

  test('se salvar a sessão falhar, o pareamento não é dado como feito', async () => {
    await assert.rejects(
      parearComCodigo('K7P2QX', APARELHO, {
        cliente: clienteFalso(RESGATE_OK),
        salvar: async () => { throw new Error('secure store indisponível'); },
      })
    );
  });

  test('timeout: rede travada vira erro de conexão e não prende o idoso', async () => {
    const cliente = {
      post: ((_c: string, _b: unknown, op: { signal: AbortSignal }) =>
        new Promise((_res, rej) => op.signal.addEventListener('abort', () => rej(new ApiError(0, null, 'http://x'))))) as any,
    };
    const inicio = Date.now();
    await rejeitaCom(parearComCodigo('K7P2QX', APARELHO, { cliente, salvar: async () => {}, timeoutMs: 40 }), 'SEM_CONEXAO');
    assert.ok(Date.now() - inicio < 2000);
  });

  test('gerar código (familiar): o servidor decide código, QR e validade; o app não gera nada', async () => {
    const cliente = clienteFalso({ codigo: 'K7P2QX', qrCodeConteudo: 'seniorinsight://pareamento?codigo=K7P2QX', expiraEm: '2026-11-04T18:30:00Z' });
    const g = await gerarCodigoPareamento({ nomeIdoso: 'Maria', idosoId: 'idoso-1' }, { cliente });
    assert.equal(cliente.chamadas[0].caminho, '/api/v1/identity/pareamentos/codigos');
    assert.deepEqual(cliente.chamadas[0].corpo, { nomeIdoso: 'Maria', idosoId: 'idoso-1' });
    assert.equal(g.codigo, 'K7P2QX');
    assert.equal(g.qrCodeConteudo, 'seniorinsight://pareamento?codigo=K7P2QX');
    assert.equal(g.expiraEm, Date.parse('2026-11-04T18:30:00Z'));
  });

  test('gerar código sem idosoId não envia o campo; erros viram mensagem, nunca um código local', async () => {
    const ok = clienteFalso({ codigo: 'AAAAAA', qrCodeConteudo: 'q', expiraEm: '2026-11-04T18:30:00Z' });
    await gerarCodigoPareamento({ nomeIdoso: 'Maria' }, { cliente: ok });
    assert.deepEqual(ok.chamadas[0].corpo, { nomeIdoso: 'Maria' });
    await rejeitaCom(gerarCodigoPareamento({ nomeIdoso: 'M' }, { cliente: clienteFalso(falhaCom(403)) }), 'SEM_PERMISSAO');
    await rejeitaCom(gerarCodigoPareamento({ nomeIdoso: 'M' }, { cliente: clienteFalso(falhaCom(0)) }), 'SEM_CONEXAO');
    await rejeitaCom(gerarCodigoPareamento({ nomeIdoso: 'M' }, { cliente: clienteFalso(falhaCom(500)) }), 'FALHA');
  });
});
