import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../apiClient';
import {
  AlertaError,
  AvaliacaoBloqueadaError,
  enviarAvaliacao,
  listarAlertas,
  rotaAlertas,
  rotaAvaliacao,
  type Alerta,
} from '../alertaService';
import type { AlertaApi, AvaliarAlertaRequest } from '../../types/api';

const IDOSO = '3f2b8c1e-5d4a-4b7e-9c10-6a1d2e3f4a5b';
const ALERTA = '7c1d9e2a-0b3f-4d6e-8a5c-1f2e3d4c5b6a';
const ROTA_LISTA = `/api/v1/notification/idosos/${IDOSO}/alertas`;
const ROTA_AVALIACAO = `/api/v1/notification/idosos/${IDOSO}/alertas/${ALERTA}/avaliacao`;

const NO_CONTRATO: AlertaApi = {
  id: ALERTA,
  idosoId: IDOSO,
  tipo: 'CRITICO',
  titulo: 'Sinais fora do padrão',
  detalhe: 'Batimentos acima do normal',
  geradoEm: '2026-11-04T14:32:00.000Z',
  avaliacao: 'FALSO',
  avaliadoEm: '2026-11-04T15:00:00.000Z',
  motivoAvaliacao: 'Estava caminhando',
};

function clienteGet(resposta: unknown) {
  const chamadas: string[] = [];
  return {
    chamadas,
    get: (async (caminho: string) => {
      chamadas.push(caminho);
      if (resposta instanceof Error) throw resposta;
      return resposta;
    }) as never,
    put: (async () => undefined) as never,
  };
}

function clientePut(resultado: Error | undefined = undefined) {
  const chamadas: Array<{ caminho: string; corpo: unknown }> = [];
  return {
    chamadas,
    get: (async () => []) as never,
    put: (async (caminho: string, corpo: unknown) => {
      chamadas.push({ caminho, corpo });
      if (resultado) throw resultado;
      return undefined;
    }) as never,
  };
}

const alerta = (parcial: Partial<Alerta> = {}): Alerta => ({
  id: ALERTA,
  tipo: 'ATENCAO',
  titulo: 't',
  geradoEm: Date.parse('2026-11-04T14:32:00.000Z'),
  ...parcial,
});

describe('Alertas pelo gateway (notification-v1: /api/v1/notification/idosos/{id}/alertas)', () => {
  test('as rotas passam pelo prefixo /api/v1/notification', () => {
    assert.equal(rotaAlertas(IDOSO), ROTA_LISTA);
    assert.equal(rotaAvaliacao(IDOSO, ALERTA), ROTA_AVALIACAO);
  });

  test('a lista chama GET na rota de alertas do idoso', async () => {
    const cliente = clienteGet([NO_CONTRATO]);
    await listarAlertas(IDOSO, { cliente });
    assert.deepEqual(cliente.chamadas, [ROTA_LISTA]);
  });

  test('geradoEm e avaliadoEm saem de ISO para epoch ms', async () => {
    const [lido] = await listarAlertas(IDOSO, { cliente: clienteGet([NO_CONTRATO]) });
    assert.equal(lido.geradoEm, Date.parse('2026-11-04T14:32:00.000Z'));
    assert.equal(lido.avaliadoEm, Date.parse('2026-11-04T15:00:00.000Z'));
    assert.equal(lido.avaliacao, 'FALSO');
    assert.equal(lido.motivoAvaliacao, 'Estava caminhando');
    assert.equal(lido.detalhe, 'Batimentos acima do normal');
  });

  test('campos null do contrato ficam ausentes no modelo', async () => {
    const semAvaliacao: AlertaApi = { ...NO_CONTRATO, detalhe: null, avaliacao: null, avaliadoEm: null, motivoAvaliacao: null };
    const [lido] = await listarAlertas(IDOSO, { cliente: clienteGet([semAvaliacao]) });
    assert.equal(lido.detalhe, undefined);
    assert.equal(lido.avaliacao, undefined);
    assert.equal(lido.avaliadoEm, undefined);
    assert.equal(lido.motivoAvaliacao, undefined);
  });

  test('geradoEm inválido é dado inválido: a lista falha, sem usar a hora de agora', async () => {
    for (const geradoEm of ['ontem', '', '2026-13-45T99:00:00Z']) {
      await assert.rejects(
        listarAlertas(IDOSO, { cliente: clienteGet([{ ...NO_CONTRATO, geradoEm }]) }),
        (erro: unknown) => erro instanceof AlertaError && /inválid/i.test(erro.message)
      );
    }
    const { geradoEm: _ausente, ...semData } = NO_CONTRATO;
    await assert.rejects(listarAlertas(IDOSO, { cliente: clienteGet([semData]) }), AlertaError);
  });

  test('avaliadoEm presente e inválido também é dado inválido', async () => {
    await assert.rejects(
      listarAlertas(IDOSO, { cliente: clienteGet([{ ...NO_CONTRATO, avaliadoEm: 'quando' }]) }),
      (erro: unknown) => erro instanceof AlertaError && /inválid/i.test(erro.message)
    );
  });

  test('um alerta inválido não some em silêncio no meio dos outros', async () => {
    const lista = [NO_CONTRATO, { ...NO_CONTRATO, id: 'outro', geradoEm: 'x' }];
    await assert.rejects(listarAlertas(IDOSO, { cliente: clienteGet(lista) }), AlertaError);
  });

  test('a avaliação chama PUT na rota do alerta com AvaliarAlertaRequest', async () => {
    const cliente = clientePut();
    await enviarAvaliacao(IDOSO, alerta({ avaliacao: 'FALSO', motivoAvaliacao: 'Estava caminhando' }), { cliente });
    const esperado: AvaliarAlertaRequest = { avaliacao: 'FALSO', motivo: 'Estava caminhando' };
    assert.deepEqual(cliente.chamadas, [{ caminho: ROTA_AVALIACAO, corpo: esperado }]);
  });

  test('"Foi útil" vai sem motivo', async () => {
    const cliente = clientePut();
    await enviarAvaliacao(IDOSO, alerta({ avaliacao: 'UTIL' }), { cliente });
    assert.deepEqual(cliente.chamadas[0].corpo, { avaliacao: 'UTIL' });
  });

  test('alerta sem avaliação não vai para a API', async () => {
    const cliente = clientePut();
    await assert.rejects(enviarAvaliacao(IDOSO, alerta(), { cliente }), AlertaError);
    assert.equal(cliente.chamadas.length, 0);
  });

  test('409 (prazo de 24 h vencido) vira AvaliacaoBloqueadaError', async () => {
    const cliente = clientePut(new ApiError(409, null, ROTA_AVALIACAO));
    await assert.rejects(
      enviarAvaliacao(IDOSO, alerta({ avaliacao: 'UTIL' }), { cliente }),
      (erro: unknown) => erro instanceof AvaliacaoBloqueadaError && /24 h/.test(erro.message)
    );
  });

  test('outros erros da avaliação viram AlertaError; sem rede avisa da internet', async () => {
    await assert.rejects(
      enviarAvaliacao(IDOSO, alerta({ avaliacao: 'UTIL' }), { cliente: clientePut(new ApiError(500, null, 'u')) }),
      (erro: unknown) => erro instanceof AlertaError && !(erro instanceof AvaliacaoBloqueadaError)
    );
    await assert.rejects(
      enviarAvaliacao(IDOSO, alerta({ avaliacao: 'UTIL' }), { cliente: clientePut(new ApiError(0, null, 'u')) }),
      /Sem internet/
    );
  });
});
