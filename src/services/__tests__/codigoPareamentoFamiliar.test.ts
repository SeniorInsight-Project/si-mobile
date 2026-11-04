import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { gerarCodigoPareamento, validadeDoCodigo, PareamentoError } from '../pareamentoService';
import { ApiError } from '../apiClient';

interface Chamada {
  caminho: string;
  corpo: any;
}

function clienteFalso(respostas: Array<unknown | (() => never)>) {
  const chamadas: Chamada[] = [];
  return {
    chamadas,
    post: (async (caminho: string, corpo: unknown) => {
      chamadas.push({ caminho, corpo });
      const r = respostas[Math.min(chamadas.length - 1, respostas.length - 1)];
      return typeof r === 'function' ? (r as () => never)() : r;
    }) as any,
  };
}
const falhaCom = (status: number) => () => {
  throw new ApiError(status, null, 'http://x/y');
};
const codigoDoServidor = (codigo: string) => ({
  codigo,
  qrCodeConteudo: `seniorinsight://pareamento?codigo=${codigo}`,
  expiraEm: '2026-11-04T18:30:00Z',
});

describe('Código de pareamento do familiar (HU-008, identity-v1 POST /pareamentos/codigos)', () => {
  test('chama a rota do contrato com nomeIdoso e idosoId e devolve o que o servidor gerou', async () => {
    const cliente = clienteFalso([codigoDoServidor('K7P2QX')]);
    const g = await gerarCodigoPareamento({ nomeIdoso: 'Maria Aparecida Silva', idosoId: 'idoso-1' }, { cliente });
    assert.equal(cliente.chamadas[0].caminho, '/api/v1/identity/pareamentos/codigos');
    assert.deepEqual(cliente.chamadas[0].corpo, { nomeIdoso: 'Maria Aparecida Silva', idosoId: 'idoso-1' });
    assert.deepEqual(g, {
      codigo: 'K7P2QX',
      qrCodeConteudo: 'seniorinsight://pareamento?codigo=K7P2QX',
      expiraEm: Date.parse('2026-11-04T18:30:00Z'),
    });
  });

  test('"Gerar novo código" chama a mesma rota de novo e usa o código novo do servidor', async () => {
    const cliente = clienteFalso([codigoDoServidor('K7P2QX'), codigoDoServidor('M3N8RT')]);
    const primeiro = await gerarCodigoPareamento({ nomeIdoso: 'Maria', idosoId: 'idoso-1' }, { cliente });
    const segundo = await gerarCodigoPareamento({ nomeIdoso: 'Maria', idosoId: 'idoso-1' }, { cliente });
    assert.equal(cliente.chamadas.length, 2);
    assert.ok(cliente.chamadas.every((c) => c.caminho === '/api/v1/identity/pareamentos/codigos'));
    assert.equal(primeiro.codigo, 'K7P2QX');
    assert.equal(segundo.codigo, 'M3N8RT');
  });

  test('403 -> "Só o familiar administrador pode gerar o código"', async () => {
    await assert.rejects(
      gerarCodigoPareamento({ nomeIdoso: 'Maria', idosoId: 'idoso-1' }, { cliente: clienteFalso([falhaCom(403)]) }),
      (e: unknown) =>
        e instanceof PareamentoError &&
        e.tipo === 'SEM_PERMISSAO' &&
        e.message === 'Só o familiar administrador pode gerar o código',
    );
  });

  test('sem fallback local: erro do servidor ou de rede nunca vira um código', async () => {
    for (const [status, tipo] of [
      [0, 'SEM_CONEXAO'],
      [404, 'FALHA'],
      [500, 'FALHA'],
      [400, 'FALHA'],
    ] as const) {
      await assert.rejects(
        gerarCodigoPareamento({ nomeIdoso: 'Maria', idosoId: 'idoso-1' }, { cliente: clienteFalso([falhaCom(status)]) }),
        (e: unknown) => e instanceof PareamentoError && e.tipo === tipo,
        `status ${status}`,
      );
    }
  });

  test('resposta fora do contrato é recusada em vez de completar com dado local', async () => {
    for (const resposta of [
      {},
      { codigo: '482913' },
      { codigo: '12', qrCodeConteudo: 'q', expiraEm: '2026-11-04T18:30:00Z' },
      { codigo: 'K7P2QX', qrCodeConteudo: '', expiraEm: '2026-11-04T18:30:00Z' },
      { codigo: 'K7P2QX', qrCodeConteudo: 'seniorinsight://pareamento?codigo=K7P2QX', expiraEm: 'amanhã' },
      null,
    ]) {
      await assert.rejects(
        gerarCodigoPareamento({ nomeIdoso: 'Maria', idosoId: 'idoso-1' }, { cliente: clienteFalso([resposta]) }),
        (e: unknown) => e instanceof PareamentoError && e.tipo === 'FALHA',
        JSON.stringify(resposta),
      );
    }
  });

  test('quanto falta para vencer, a partir de expiraEm', () => {
    const expira = Date.parse('2026-11-04T18:30:00Z');
    const antes = (s: number) => expira - s * 1000;
    assert.deepEqual(validadeDoCodigo(expira, antes(605)), { vencido: false, segundos: 605, texto: 'Vence em 10 min 05 s' });
    assert.equal(validadeDoCodigo(expira, antes(59)).texto, 'Vence em 59 s');
    assert.equal(validadeDoCodigo(expira, antes(3 * 3600 + 7 * 60)).texto, 'Vence em 3 h 07 min');
    assert.equal(validadeDoCodigo(expira, antes(0.4)).texto, 'Vence em 1 s', 'arredonda para cima até vencer');
  });

  test('código vencido não é tratado como válido', () => {
    const expira = Date.parse('2026-11-04T18:30:00Z');
    assert.deepEqual(validadeDoCodigo(expira, expira), { vencido: true, segundos: 0, texto: 'Código vencido' });
    assert.equal(validadeDoCodigo(expira, expira + 60_000).vencido, true);
    assert.equal(validadeDoCodigo(NaN, expira).vencido, true);
  });
});
