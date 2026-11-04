import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapearAlarme,
  descreverLocalizacao,
  statusDoDesfecho,
  buscarAlarme,
  buscarAlarmeAtivo,
  assumirChamado,
  encerrarChamado,
  SosError,
  AlarmeApi,
} from '../sosRecebidoService';
import { ApiError } from '../apiClient';

const criadoEm = new Date(2026, 10, 4, 14, 32).toISOString();
const alarme = (p: Partial<AlarmeApi> = {}): AlarmeApi => ({
  id: 'a-1', idosoId: 'i-1', nomeIdoso: 'Maria', latitude: -23.5614, longitude: -46.6559, status: 'DISPARADO', criadoEm, ...p,
});

/** Cliente que responde por rota: { 'GET /caminho': valor | Error } e registra as chamadas. */
function cliente(rotas: Record<string, unknown>) {
  const chamadas: Array<{ metodo: string; caminho: string; corpo?: any }> = [];
  const executa = (metodo: string) => async (caminho: string, corpo?: any) => {
    chamadas.push({ metodo, caminho, corpo });
    const r = rotas[`${metodo} ${caminho}`];
    if (r instanceof Error) throw r;
    if (r === undefined) throw new ApiError(404, null, caminho);
    return typeof r === 'function' ? (r as () => unknown)() : r;
  };
  return { chamadas, get: executa('GET') as any, put: executa('PUT') as any };
}

describe('SOS recebido pelo familiar, pelo contrato care-v1 (HU-065 / HU-066 / HU-068 / RN-009)', () => {
  test('mapearAlarme: nome, hora e localização do servidor', () => {
    const a = mapearAlarme(alarme());
    assert.equal(a.idosoNome, 'Maria');
    assert.equal(a.status, 'DISPARADO');
    assert.equal(a.localizacao?.latitude, -23.5614);
    assert.equal(a.disparadoEm, Date.parse(criadoEm));
  });

  test('sem nome no alarme, não inventa nome', () => {
    assert.equal(mapearAlarme(alarme({ nomeIdoso: undefined })).idosoNome, 'O idoso');
  });

  test('HU-065 cenário 1: com localização mostra o ponto e a hora (o contrato não traz endereço)', () => {
    const r = descreverLocalizacao(mapearAlarme(alarme()));
    assert.equal(r.disponivel, true);
    assert.equal(r.titulo, 'Localização no momento do pedido');
    assert.equal(r.detalhe, '-23.5614, -46.6559 • 14:32');
  });

  test('HU-065 cenário 2: sem localização mostra "Localização indisponível" e manda ligar', () => {
    const r = descreverLocalizacao(mapearAlarme(alarme({ latitude: null, longitude: null })));
    assert.equal(r.disponivel, false);
    assert.equal(r.titulo, 'Localização indisponível');
    assert.match(r.detalhe, /Ligue para Maria/);
  });

  test('lat/long só com uma das duas = sem localização', () => {
    assert.equal(mapearAlarme(alarme({ longitude: null })).localizacao, null);
  });

  test('buscar um chamado usa GET /api/v1/sos/{id}', async () => {
    const c = cliente({ 'GET /api/v1/sos/a-1': alarme() });
    assert.equal((await buscarAlarme('a-1', { cliente: c })).id, 'a-1');
  });

  test('buscar o ativo do idoso: pega o mais recente DISPARADO ou EM_ATENDIMENTO', async () => {
    const c = cliente({ 'GET /api/v1/idosos/i-1/sos': [alarme({ id: 'velho', status: 'RESOLVIDO' }), alarme({ id: 'ativo', status: 'EM_ATENDIMENTO' }), alarme({ id: 'outro' })] });
    assert.equal((await buscarAlarmeAtivo('i-1', { cliente: c }))?.id, 'ativo');
  });

  test('sem chamado em aberto devolve null', async () => {
    const c = cliente({ 'GET /api/v1/idosos/i-1/sos': [alarme({ status: 'CANCELADO' })] });
    assert.equal(await buscarAlarmeAtivo('i-1', { cliente: c }), null);
  });

  test('HU-066 cenário 1: assumir lê o chamado, faz PUT EM_ATENDIMENTO e usa o estado devolvido pelo servidor', async () => {
    const c = cliente({
      'GET /api/v1/sos/a-1': alarme(),
      'PUT /api/v1/sos/a-1/status': alarme({ status: 'EM_ATENDIMENTO' }),
    });
    const r = await assumirChamado('a-1', { cliente: c });
    assert.equal(r.resultado, 'ASSUMIDO');
    assert.equal(r.alarme.status, 'EM_ATENDIMENTO');
    const put = c.chamadas.find((x) => x.metodo === 'PUT');
    assert.equal(put?.corpo.status, 'EM_ATENDIMENTO');
  });

  test('HU-066 cenário 2 / RN-009: se já está em atendimento, NÃO assume por cima (nem faz PUT)', async () => {
    const c = cliente({ 'GET /api/v1/sos/a-1': alarme({ status: 'EM_ATENDIMENTO' }) });
    const r = await assumirChamado('a-1', { cliente: c });
    assert.equal(r.resultado, 'JA_ASSUMIDO');
    assert.equal(c.chamadas.filter((x) => x.metodo === 'PUT').length, 0);
  });

  test('chamado já encerrado ou cancelado não pode ser assumido', async () => {
    for (const status of ['RESOLVIDO', 'CANCELADO'] as const) {
      const c = cliente({ 'GET /api/v1/sos/a-1': alarme({ status }) });
      assert.equal((await assumirChamado('a-1', { cliente: c })).resultado, 'ENCERRADO');
    }
  });

  test('assumir sem conexão lança erro e NÃO considera assumido (nada de estado só local)', async () => {
    const c = cliente({ 'GET /api/v1/sos/a-1': new ApiError(0, null, 'u') });
    await assert.rejects(assumirChamado('a-1', { cliente: c }), /Sem internet/);
    const c2 = cliente({ 'GET /api/v1/sos/a-1': alarme(), 'PUT /api/v1/sos/a-1/status': new ApiError(500, null, 'u') });
    await assert.rejects(assumirChamado('a-1', { cliente: c2 }), SosError);
  });

  test('HU-068: desfechos viram o status do contrato (Foi engano = CANCELADO; os outros = RESOLVIDO)', () => {
    assert.equal(statusDoDesfecho('ATENDIDO'), 'RESOLVIDO');
    assert.equal(statusDoDesfecho('SOCORRO_MEDICO'), 'RESOLVIDO');
    assert.equal(statusDoDesfecho('FOI_ENGANO'), 'CANCELADO');
  });

  test('HU-068: encerrar envia status e o desfecho na observação, e usa a resposta do servidor', async () => {
    const c = cliente({ 'PUT /api/v1/sos/a-1/status': alarme({ status: 'RESOLVIDO' }) });
    const r = await encerrarChamado('a-1', 'SOCORRO_MEDICO', { cliente: c });
    assert.equal(r.status, 'RESOLVIDO');
    assert.deepEqual(c.chamadas[0].corpo, { status: 'RESOLVIDO', observacao: 'Desfecho: Socorro médico' });
  });

  test('desfecho inválido nem chega ao servidor', async () => {
    const c = cliente({});
    await assert.rejects(encerrarChamado('a-1', 'QUALQUER' as never, { cliente: c }), SosError);
    assert.equal(c.chamadas.length, 0);
  });

  test('SEM dados de exemplo: chamado inexistente ou erro de servidor lançam erro', async () => {
    await assert.rejects(buscarAlarme('nao-existe', { cliente: cliente({}) }), /não foi encontrado/);
    await assert.rejects(buscarAlarmeAtivo('i-1', { cliente: cliente({ 'GET /api/v1/idosos/i-1/sos': new ApiError(500, null, 'u') }) }), SosError);
  });
});
