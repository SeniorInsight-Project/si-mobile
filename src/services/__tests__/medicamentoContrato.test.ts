import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listarRotinas,
  criarRotina,
  atualizarRotina,
  removerRotina,
  confirmarIngestao,
} from '../medicamentoService';
import { obterRotinasDoCache, salvarRotinasNoCache, limparCacheMedicamentos } from '../medicamentoDatabase';
import { ApiError } from '../apiClient';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';
const ROTINA = '11111111-1111-4111-8111-111111111111';

/** Cliente que registra as chamadas e responde por rota: { 'GET /caminho': valor | Error }. */
function cliente(rotas: Record<string, unknown> = {}) {
  const chamadas: Array<{ metodo: string; caminho: string; corpo?: any }> = [];
  const executa = (metodo: string) => async (caminho: string, corpo?: any) => {
    chamadas.push({ metodo, caminho, corpo });
    const r = rotas[`${metodo} ${caminho}`];
    if (r instanceof Error) throw r;
    return r;
  };
  return {
    chamadas,
    get: executa('GET') as any,
    post: executa('POST') as any,
    put: executa('PUT') as any,
    delete: executa('DELETE') as any,
  };
}

const rotinaApi = (p: Record<string, unknown> = {}) => ({
  id: ROTINA,
  idosoId: IDOSO,
  medicamentoId: '22222222-2222-4222-8222-222222222222',
  medicamentoNome: 'Losartana 50mg',
  dosagem: '1 comprimido',
  instrucoes: 'Após o café',
  horario: '08:00',
  frequencia: '1x ao dia',
  diasSemana: 'TODOS',
  ativo: true,
  statusHoje: 'TOMADO',
  horarioIngestaoHoje: '2026-11-11T08:05:00Z',
  ...p,
});

describe('Remédios pelo apiClient, contrato care-v1 (HU-056 / RF-038)', () => {
  // cada arquivo de teste roda em um processo próprio: não precisa restaurar o ambiente
  beforeEach(async () => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
    await limparCacheMedicamentos();
    // zera o estado em memória do service (a lista do servidor vem vazia)
    await listarRotinas(IDOSO, { cliente: cliente({ [`GET /api/v1/idosos/${IDOSO}/rotinas-medicamentos?apenasAtivos=true`]: [] }) });
  });

  test('listar: apenasAtivos vai sempre na query e a resposta do contrato vira o modelo da tela', async () => {
    const c = cliente({ [`GET /api/v1/idosos/${IDOSO}/rotinas-medicamentos?apenasAtivos=true`]: [rotinaApi()] });
    const [r] = await listarRotinas(IDOSO, { cliente: c });
    assert.equal(c.chamadas[0].caminho, `/api/v1/idosos/${IDOSO}/rotinas-medicamentos?apenasAtivos=true`);
    assert.equal(r.id, ROTINA);
    assert.equal(r.medicamentoNome, 'Losartana 50mg');
    assert.equal(r.frequencia, '1x ao dia');
    assert.equal(r.statusHoje, 'TOMADO');
    assert.equal(r.ativo, true);
  });

  test('listar: a data de referência entra na query junto com apenasAtivos', async () => {
    const c = cliente({ [`GET /api/v1/idosos/${IDOSO}/rotinas-medicamentos?apenasAtivos=true&data=2026-11-10`]: [] });
    await listarRotinas(IDOSO, { cliente: c, data: '2026-11-10' });
    assert.match(c.chamadas[0].caminho, /apenasAtivos=true&data=2026-11-10$/);
  });

  test('listar: lista vazia do servidor fica vazia e limpa o cache antigo', async () => {
    await salvarRotinasNoCache(IDOSO, [{ id: 'velha', idosoId: IDOSO, medicamentoNome: 'Antiga' }]);
    const c = cliente({ [`GET /api/v1/idosos/${IDOSO}/rotinas-medicamentos?apenasAtivos=true`]: [] });
    assert.deepEqual(await listarRotinas(IDOSO, { cliente: c }), []);
    assert.deepEqual(await obterRotinasDoCache(IDOSO), []);
  });

  test('listar: o cache guarda só o que veio do servidor', async () => {
    const c = cliente({ [`GET /api/v1/idosos/${IDOSO}/rotinas-medicamentos?apenasAtivos=true`]: [rotinaApi()] });
    await listarRotinas(IDOSO, { cliente: c });
    const cache = await obterRotinasDoCache(IDOSO);
    assert.deepEqual(cache.map((r) => r.id), [ROTINA]);
  });

  test('listar: 4xx e 5xx lançam (não caem no cache nem em dado inventado)', async () => {
    await salvarRotinasNoCache(IDOSO, [{ id: 'cache-1', idosoId: IDOSO, medicamentoNome: 'Em cache' }]);
    for (const status of [403, 404, 500]) {
      const erro = new ApiError(status, null, '/x');
      const c = cliente({ [`GET /api/v1/idosos/${IDOSO}/rotinas-medicamentos?apenasAtivos=true`]: erro });
      await assert.rejects(listarRotinas(IDOSO, { cliente: c }), (e: any) => e === erro);
    }
  });

  test('listar: sem rede usa o cache; sem rede e sem cache lança em vez de lista inventada', async () => {
    const semRede = cliente({ [`GET /api/v1/idosos/${IDOSO}/rotinas-medicamentos?apenasAtivos=true`]: new ApiError(0, null, '/x') });
    await assert.rejects(listarRotinas(IDOSO, { cliente: semRede }), (e: any) => e.status === 0);

    await salvarRotinasNoCache(IDOSO, [{ id: 'cache-1', idosoId: IDOSO, medicamentoNome: 'Em cache' }]);
    const r = await listarRotinas(IDOSO, { cliente: semRede });
    assert.deepEqual(r.map((x) => x.id), ['cache-1']);
  });

  test('criar: corpo só com campos de RotinaMedicamentoRequest (sem tipoFormato nem medicamentoNome)', async () => {
    const c = cliente({ [`POST /api/v1/idosos/${IDOSO}/rotinas-medicamentos`]: rotinaApi() });
    const criada = await criarRotina(
      IDOSO,
      { nomeMedicamento: ' Losartana 50mg ', medicamentoNome: 'Losartana 50mg', dosagem: '1 comprimido', tipoFormato: 'comprimido', horario: '08:00', frequencia: '1x ao dia', instrucoes: 'Após o café', observacoes: '' },
      { cliente: c }
    );
    const corpo = c.chamadas[0].corpo;
    assert.deepEqual(corpo, { nomeMedicamento: 'Losartana 50mg', dosagem: '1 comprimido', instrucoes: 'Após o café', horario: '08:00', frequencia: '1x ao dia' });
    assert.equal(criada.id, ROTINA);
    assert.deepEqual((await obterRotinasDoCache(IDOSO)).map((r) => r.id), [ROTINA]);
  });

  test('criar: 400 lança e nada é salvo no cache', async () => {
    const c = cliente({ [`POST /api/v1/idosos/${IDOSO}/rotinas-medicamentos`]: new ApiError(400, { message: 'Horário inválido' }, '/x') });
    await assert.rejects(criarRotina(IDOSO, { nomeMedicamento: 'X', horario: '99:99', frequencia: 'Diária' }, { cliente: c }), (e: any) => e.status === 400 && e.message === 'Horário inválido');
    assert.deepEqual(await obterRotinasDoCache(IDOSO), []);
  });

  test('criar: com o servidor fora e mock desligado lança, sem rotina local', async () => {
    const c = cliente({ [`POST /api/v1/idosos/${IDOSO}/rotinas-medicamentos`]: new ApiError(0, null, '/x') });
    await assert.rejects(criarRotina(IDOSO, { nomeMedicamento: 'X', horario: '08:00', frequencia: 'Diária' }, { cliente: c }), (e: any) => e.status === 0);
    assert.deepEqual(await obterRotinasDoCache(IDOSO), []);
  });

  test('atualizar: PUT só com campos de AtualizarRotinaRequest e só os enviados', async () => {
    const c = cliente({ [`PUT /api/v1/rotinas-medicamentos/${ROTINA}`]: rotinaApi({ ativo: false, horario: '09:00' }) });
    const r = await atualizarRotina(
      ROTINA,
      { ativo: false, horario: '09:00', medicamentoNome: 'Outro nome', tipoFormato: 'gotas' },
      { cliente: c }
    );
    assert.deepEqual(c.chamadas[0].corpo, { horario: '09:00', ativo: false });
    assert.equal(r.ativo, false);
    assert.equal(r.horario, '09:00');
  });

  test('atualizar: 404 lança', async () => {
    const c = cliente({ [`PUT /api/v1/rotinas-medicamentos/${ROTINA}`]: new ApiError(404, null, '/x') });
    await assert.rejects(atualizarRotina(ROTINA, { ativo: false }, { cliente: c }), (e: any) => e.status === 404);
  });

  test('remover: só some do cache depois que o servidor confirma', async () => {
    await salvarRotinasNoCache(IDOSO, [{ id: ROTINA, idosoId: IDOSO, medicamentoNome: 'Losartana' }]);
    const falha = cliente({ [`DELETE /api/v1/rotinas-medicamentos/${ROTINA}`]: new ApiError(403, null, '/x') });
    await assert.rejects(removerRotina(ROTINA, { cliente: falha }), (e: any) => e.status === 403);
    assert.equal((await obterRotinasDoCache(IDOSO)).length, 1);

    const ok = cliente();
    assert.equal(await removerRotina(ROTINA, { cliente: ok }), true);
    assert.equal(ok.chamadas[0].caminho, `/api/v1/rotinas-medicamentos/${ROTINA}`);
    assert.equal((await obterRotinasDoCache(IDOSO)).length, 0);
  });

  test('confirmar ingestão: POST em /confirmar-ingestao com ConfirmarIngestaoRequest', async () => {
    const c = cliente({ [`POST /api/v1/rotinas-medicamentos/${ROTINA}/confirmar-ingestao`]: { id: 'h-1', rotinaId: ROTINA, status: 'TOMADO', criadoEm: new Date().toISOString() } });
    const r = await confirmarIngestao(ROTINA, { status: 'TOMADO', observacao: 'Tomou' }, null, { cliente: c });
    const corpo = c.chamadas[0].corpo;
    assert.equal(corpo.status, 'TOMADO');
    assert.equal(corpo.observacao, 'Tomou');
    assert.ok(Date.parse(corpo.dataHoraIngestao) > 0);
    assert.deepEqual(Object.keys(corpo).sort(), ['dataHoraIngestao', 'observacao', 'status']);
    assert.equal(r.sucesso, true);
    assert.equal(r.status, 'TOMADO');
  });

  test('confirmar ingestão: erro lança e não marca a dose como tomada no cache', async () => {
    await salvarRotinasNoCache(IDOSO, [{ id: ROTINA, idosoId: IDOSO, medicamentoNome: 'Losartana', statusHoje: 'PENDENTE' }]);
    const c = cliente({ [`POST /api/v1/rotinas-medicamentos/${ROTINA}/confirmar-ingestao`]: new ApiError(404, null, '/x') });
    await assert.rejects(confirmarIngestao(ROTINA, { status: 'TOMADO' }, null, { cliente: c }), (e: any) => e.status === 404);
    const [salvo] = await obterRotinasDoCache(IDOSO);
    assert.equal(salvo.statusHoje, 'PENDENTE');
  });
});
