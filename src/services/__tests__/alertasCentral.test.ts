import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../apiClient';
import {
  filtrarAlertas,
  ordenarAlertas,
  deveEsperarSilencio,
  podeAlterarAvaliacao,
  aplicarAvaliacao,
  listarAlertas,
  enviarAvaliacao,
  AlertaError,
  AvaliacaoBloqueadaError,
  JANELA_ALTERAR_AVALIACAO_MS,
  AVISO_NAO_DIAGNOSTICO,
  type Alerta,
} from '../alertaService';

const AGORA = new Date(2026, 10, 4, 16, 0).getTime();
/** Alertas só para teste (a produção não tem alerta de exemplo). */
function alertasDeExemplo(agora: number): Alerta[] {
  const hoje = new Date(agora);
  const em = (h: number, m: number) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), h, m).getTime();
  return [
    { id: 'sos-1', tipo: 'SOS', titulo: 'Maria pediu ajuda', geradoEm: em(14, 32) },
    { id: 'crit-1', tipo: 'CRITICO', titulo: 'Sinais de Maria fora do padrão', geradoEm: em(2, 0) },
    { id: 'aten-1', tipo: 'ATENCAO', titulo: 'A mobilidade de Maria caiu nesta semana', geradoEm: em(15, 0) },
    { id: 'tec-3', tipo: 'TECNICO', titulo: 'Dados de Maria voltaram a chegar', geradoEm: em(12, 40) },
    { id: 'tec-1', tipo: 'TECNICO', titulo: 'Sem dados de Maria desde 09:00', geradoEm: em(12, 0) },
    { id: 'tec-2', tipo: 'TECNICO', titulo: 'Maria não confirmou a Losartana', geradoEm: em(8, 31) },
  ];
}

const base = (parcial: Partial<Alerta> = {}): Alerta => ({ id: 'a1', tipo: 'ATENCAO', titulo: 't', geradoEm: AGORA, ...parcial });

describe('Central de Alertas (HU-034 / HU-035 / HU-037 / RN-010 / RN-017)', () => {
  test('filtros: Críticos inclui SOS; Atenção e Técnicos separam as categorias', () => {
    const todos = alertasDeExemplo(AGORA);
    assert.equal(filtrarAlertas(todos, 'TODOS').length, todos.length);
    assert.deepEqual(filtrarAlertas(todos, 'CRITICOS').map((a) => a.tipo).sort(), ['CRITICO', 'SOS']);
    assert.ok(filtrarAlertas(todos, 'ATENCAO').every((a) => a.tipo === 'ATENCAO'));
    assert.equal(filtrarAlertas(todos, 'TECNICOS').length, 3);
  });

  test('ordenação: SOS, crítico, atenção e, por último, técnicos do mais novo ao mais antigo', () => {
    const ord = ordenarAlertas([...alertasDeExemplo(AGORA)].reverse());
    assert.deepEqual(ord.map((a) => a.tipo), ['SOS', 'CRITICO', 'ATENCAO', 'TECNICO', 'TECNICO', 'TECNICO']);
    const tecnicos = ord.filter((a) => a.tipo === 'TECNICO');
    assert.ok(tecnicos[0].geradoEm >= tecnicos[1].geradoEm && tecnicos[1].geradoEm >= tecnicos[2].geradoEm);
  });

  test('ordenar não altera a lista original', () => {
    const original = alertasDeExemplo(AGORA);
    const copia = [...original];
    ordenarAlertas(original);
    assert.deepEqual(original, copia);
  });

  test('RN-010: crítico e SOS nunca esperam, em nenhuma hora', () => {
    for (let h = 0; h < 24; h++) {
      assert.equal(deveEsperarSilencio('CRITICO', h), false);
      assert.equal(deveEsperarSilencio('SOS', h), false);
    }
  });

  test('RN-010: atenção e técnicos esperam das 22:00 às 06:59', () => {
    for (const tipo of ['ATENCAO', 'TECNICO'] as const) {
      assert.equal(deveEsperarSilencio(tipo, 22), true);
      assert.equal(deveEsperarSilencio(tipo, 23), true);
      assert.equal(deveEsperarSilencio(tipo, 0), true);
      assert.equal(deveEsperarSilencio(tipo, 6), true);
      assert.equal(deveEsperarSilencio(tipo, 7), false);
      assert.equal(deveEsperarSilencio(tipo, 15), false);
      assert.equal(deveEsperarSilencio(tipo, 21), false);
    }
  });

  test('RN-017: o aviso de não diagnóstico existe e cita avaliação médica', () => {
    assert.match(AVISO_NAO_DIAGNOSTICO, /não substitui avaliação médica/);
  });

  test('HU-037 cenário 1: "Alarme falso" registra a resposta e o motivo', () => {
    const r = aplicarAvaliacao(base(), 'FALSO', '  Ela estava só caminhando  ', AGORA);
    assert.equal(r.avaliacao, 'FALSO');
    assert.equal(r.motivoAvaliacao, 'Ela estava só caminhando');
    assert.equal(r.avaliadoEm, AGORA);
  });

  test('"Foi útil" não guarda motivo', () => {
    const r = aplicarAvaliacao(base(), 'UTIL', 'qualquer', AGORA);
    assert.equal(r.avaliacao, 'UTIL');
    assert.equal(r.motivoAvaliacao, '');
  });

  test('HU-037 cenário 2: pode alterar até 24 h depois; depois disso, não', () => {
    const avaliado = aplicarAvaliacao(base(), 'UTIL', '', AGORA);
    const noLimite = aplicarAvaliacao(avaliado, 'FALSO', 'm', AGORA + JANELA_ALTERAR_AVALIACAO_MS);
    assert.equal(noLimite.avaliacao, 'FALSO');
    assert.equal(noLimite.avaliadoEm, AGORA, 'a data da primeira avaliação não muda');
    assert.throws(() => aplicarAvaliacao(avaliado, 'FALSO', 'm', AGORA + JANELA_ALTERAR_AVALIACAO_MS + 1), AvaliacaoBloqueadaError);
    assert.equal(podeAlterarAvaliacao(undefined, AGORA), true);
  });

  test('avaliar não altera o alerta original', () => {
    const original = base();
    aplicarAvaliacao(original, 'UTIL', '', AGORA);
    assert.equal(original.avaliacao, undefined);
  });

  test('lista: usa a rota de alertas do idoso e ordena a resposta do servidor', async () => {
    let caminho = '';
    const cliente = {
      get: (async (c: string) => { caminho = c; return [base({ id: 'x', tipo: 'TECNICO' }), base({ id: 'y', tipo: 'CRITICO' })]; }) as any,
      put: (async () => undefined) as any,
    };
    const lista = await listarAlertas('idoso-7', { cliente });
    assert.equal(caminho, '/api/v1/idosos/idoso-7/alertas');
    assert.deepEqual(lista.map((a) => a.id), ['y', 'x']);
  });

  test('resposta que não é lista vira lista vazia', async () => {
    const cliente = { get: (async () => ({ erro: true })) as any, put: (async () => undefined) as any };
    assert.deepEqual(await listarAlertas('i', { cliente }), []);
  });

  test('SEM alertas de exemplo: se o servidor falha, a lista lança erro', async () => {
    const falha = (status: number) => ({ get: (async () => { throw new ApiError(status, null, 'u'); }) as any, put: (async () => undefined) as any });
    await assert.rejects(listarAlertas('i', { cliente: falha(500) }), AlertaError);
    await assert.rejects(listarAlertas('i', { cliente: falha(0) }), /Sem internet/);
    await assert.rejects(listarAlertas('i', { cliente: falha(404) }), AlertaError, 'rota ainda inexistente = erro, não lista de exemplo');
  });

  test('avaliação: envia para a rota do alerta; se falhar, lança (a tela desfaz a marcação)', async () => {
    const chamadas: any[] = [];
    const ok = { get: (async () => []) as any, put: (async (c: string, b: unknown) => { chamadas.push({ c, b }); return undefined; }) as any };
    await enviarAvaliacao('i-1', base({ id: 'a-9', avaliacao: 'FALSO', motivoAvaliacao: 'caminhando' }), { cliente: ok });
    assert.equal(chamadas[0].c, '/api/v1/idosos/i-1/alertas/a-9/avaliacao');
    assert.deepEqual(chamadas[0].b, { avaliacao: 'FALSO', motivo: 'caminhando' });
    const falha = { get: (async () => []) as any, put: (async () => { throw new ApiError(500, null, 'u'); }) as any };
    await assert.rejects(enviarAvaliacao('i-1', base({ avaliacao: 'UTIL' }), { cliente: falha }), AlertaError);
  });
});
