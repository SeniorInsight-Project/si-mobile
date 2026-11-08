import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENTIMENTO_PADRAO,
  tiposAutorizados,
  statusMonitoramento,
  mensagemParaFamilia,
  descreverAutorizados,
  obterConsentimentos,
  salvarConsentimentos,
  ConsentimentoError,
  ROTA_CONSENTIMENTOS,
  type Consentimentos,
} from '../consentimentoService';
import { ApiError } from '../apiClient';
import {
  classificarSincronizacao,
  montarPassos,
  obterEstadoConexao,
  type EstadoConexao,
} from '../relogioService';

const com = (parcial: Partial<Consentimentos>): Consentimentos => ({ ...CONSENTIMENTO_PADRAO, ...parcial });

const clienteGet = (resposta: unknown) => ({ get: (async () => resposta) as any, put: (async () => undefined) as any });
const clienteErro = (status: number) => ({
  get: (async () => { throw new ApiError(status, null, 'u'); }) as any,
  put: (async () => { throw new ApiError(status, null, 'u'); }) as any,
});

describe('Autorização de dados por tipo (HU-018 / HU-019 / RN-001)', () => {
  test('o estado inicial da tela tem tudo desligado (consentimento explícito)', () => {
    assert.ok(Object.values(CONSENTIMENTO_PADRAO).every((v) => v === false));
  });

  test('lê do servidor e normaliza: só `true` liga; campo ausente fica desligado', async () => {
    const c = await obterConsentimentos({ cliente: clienteGet({ BATIMENTOS: true, PASSOS: 'true', SONO: 1 }) });
    assert.deepEqual(c, { ...CONSENTIMENTO_PADRAO, BATIMENTOS: true });
  });

  test('HU-018 cenário 1: aceita batimentos e passos, recusa oxigenação — só 2 tipos são pedidos', () => {
    const c = com({ BATIMENTOS: true, PASSOS: true, OXIGENACAO: false });
    assert.deepEqual(tiposAutorizados(c), ['BATIMENTOS', 'PASSOS']);
  });

  test('localização não conta como dado de saúde pedido ao Health Connect', () => {
    assert.deepEqual(tiposAutorizados(com({ LOCALIZACAO: true })), []);
  });

  test('HU-019 cenário 1: desligar passos mostra "Semáforo calculado sem dados de passos"', () => {
    const c = com({ BATIMENTOS: true, PASSOS: false, SONO: true, OXIGENACAO: true });
    assert.equal(statusMonitoramento(c), 'PARCIAL');
    assert.equal(mensagemParaFamilia(c), 'Semáforo calculado sem dados de passos');
  });

  test('HU-019 cenário 2: desligar todos mostra "Monitoramento pausado pelo idoso"', () => {
    assert.equal(statusMonitoramento(CONSENTIMENTO_PADRAO), 'PAUSADO');
    assert.equal(mensagemParaFamilia(CONSENTIMENTO_PADRAO), 'Monitoramento pausado pelo idoso');
  });

  test('todos ligados: monitoramento ativo', () => {
    const c = com({ BATIMENTOS: true, PASSOS: true, SONO: true, OXIGENACAO: true });
    assert.equal(statusMonitoramento(c), 'ATIVO');
  });

  test('descreverAutorizados monta a frase do passo 2', () => {
    assert.equal(descreverAutorizados(com({ BATIMENTOS: true, PASSOS: true, SONO: true })), 'Batimentos, passos e sono');
    assert.equal(descreverAutorizados(com({ SONO: true })), 'Sono');
    assert.equal(descreverAutorizados(CONSENTIMENTO_PADRAO), 'Nenhum dado autorizado ainda');
  });

  test('salvar envia os 5 booleanos para a rota de consentimentos', async () => {
    const chamadas: any[] = [];
    const cliente = { get: (async () => ({})) as any, put: (async (c: string, b: unknown) => { chamadas.push({ c, b }); return undefined; }) as any };
    await salvarConsentimentos(com({ SONO: true }), { cliente });
    assert.equal(chamadas[0].c, ROTA_CONSENTIMENTOS);
    assert.deepEqual(Object.keys(chamadas[0].b).sort(), ['BATIMENTOS', 'LOCALIZACAO', 'OXIGENACAO', 'PASSOS', 'SONO']);
  });

  test('salvar com idosoId explícito usa a rota do idoso no care-service', async () => {
    const chamadas: any[] = [];
    const cliente = { get: (async () => ({})) as any, put: (async (c: string, b: unknown) => { chamadas.push({ c, b }); return undefined; }) as any };
    await salvarConsentimentos(com({ BATIMENTOS: true }), { cliente, idosoId: 'idoso-xyz-123' });
    assert.equal(chamadas[0].c, '/api/v1/idosos/idoso-xyz-123/consentimentos');
  });

  test('SEM fallback local: se o servidor falha, carregar e salvar lançam erro', async () => {
    await assert.rejects(obterConsentimentos({ cliente: clienteErro(500) }), ConsentimentoError);
    await assert.rejects(salvarConsentimentos(com({ PASSOS: true }), { cliente: clienteErro(500) }), /Nada foi alterado/);
    await assert.rejects(obterConsentimentos({ cliente: clienteErro(0) }), /Sem internet/);
    await assert.rejects(obterConsentimentos({ cliente: clienteErro(404) }), ConsentimentoError, 'rota inexistente é erro, não "tudo desligado"');
  });
});

describe('Relógio e Health Connect (HU-023 / HU-025)', () => {
  const AGORA = new Date(2026, 10, 4, 12, 0).getTime();
  const min = (n: number) => AGORA - n * 60000;

  test('HU-025 cenário 1: sincronizou há 10 min = verde "Relógio conectado"', () => {
    const r = classificarSincronizacao(min(10), AGORA);
    assert.equal(r.status, 'FUNCIONANDO');
    assert.equal(r.cor, 'verde');
    assert.equal(r.detalhe, 'Última medição às 11:50');
  });

  test('HU-025 cenário 2: 3 h sem sincronizar = laranja "Seu relógio parou de enviar dados"', () => {
    const r = classificarSincronizacao(min(180), AGORA);
    assert.equal(r.status, 'PARADO');
    assert.equal(r.cor, 'laranja');
    assert.equal(r.titulo, 'Seu relógio parou de enviar dados');
  });

  test('HU-023 cenário 3: sem medição em 24 h pede para abrir o app do relógio', () => {
    const r = classificarSincronizacao(min(24 * 60 + 1), AGORA);
    assert.equal(r.status, 'SEM_DADOS');
    assert.equal(r.titulo, 'Abra o app do seu relógio e sincronize');
  });

  test('limites exatos: 60 min ainda é verde; 61 min já é laranja', () => {
    assert.equal(classificarSincronizacao(min(60), AGORA).status, 'FUNCIONANDO');
    assert.equal(classificarSincronizacao(min(61), AGORA).status, 'PARADO');
    assert.equal(classificarSincronizacao(min(24 * 60), AGORA).status, 'PARADO');
  });

  test('sem nenhuma medição = não conectado', () => {
    assert.equal(classificarSincronizacao(null, AGORA).status, 'NAO_CONECTADO');
  });

  test('relógio com hora no futuro (relógio do celular errado) não quebra', () => {
    assert.equal(classificarSincronizacao(AGORA + 5 * 60000, AGORA).status, 'FUNCIONANDO');
  });

  test('passos: tudo feito com dados autorizados e Health Connect instalado', () => {
    const passos = montarPassos(obterEstadoConexao(AGORA, true), com({ BATIMENTOS: true, PASSOS: true, SONO: true }));
    assert.deepEqual(passos.map((p) => p.estado), ['FEITO', 'FEITO', 'FEITO']);
    assert.equal(passos[1].detalhe, 'Batimentos, passos e sono');
  });

  test('HU-023 cenário 2: Health Connect ausente — passo 1 é "agora" e o resto espera', () => {
    const estado: EstadoConexao = { healthConnectInstalado: false, segundoPlanoAtivo: false, ultimaMedicaoMs: null };
    const passos = montarPassos(estado, com({ PASSOS: true }));
    assert.deepEqual(passos.map((p) => p.estado), ['AGORA', 'PENDENTE', 'PENDENTE']);
  });

  test('sem nenhum dado autorizado o passo 2 fica "agora" e o 3 pendente', () => {
    const estado: EstadoConexao = { healthConnectInstalado: true, segundoPlanoAtivo: false, ultimaMedicaoMs: null };
    const passos = montarPassos(estado, CONSENTIMENTO_PADRAO);
    assert.deepEqual(passos.map((p) => p.estado), ['FEITO', 'AGORA', 'PENDENTE']);
  });

  test('segundo plano desligado deixa o passo 3 como "agora"', () => {
    const estado: EstadoConexao = { healthConnectInstalado: true, segundoPlanoAtivo: false, ultimaMedicaoMs: null };
    const passos = montarPassos(estado, com({ PASSOS: true }));
    assert.deepEqual(passos.map((p) => p.estado), ['FEITO', 'FEITO', 'AGORA']);
  });

  test('em produção NÃO há relógio simulado: Health Connect não conectado e sem medição', () => {
    const e = obterEstadoConexao(AGORA, false);
    assert.equal(e.simulado, false);
    assert.equal(e.healthConnectInstalado, false);
    assert.equal(e.ultimaMedicaoMs, null);
    assert.equal(classificarSincronizacao(e.ultimaMedicaoMs, AGORA).status, 'NAO_CONECTADO');
  });

  test('em desenvolvimento o estado simulado vem sinalizado como simulado', () => {
    const e = obterEstadoConexao(AGORA, true);
    assert.equal(e.simulado, true);
    assert.equal(classificarSincronizacao(e.ultimaMedicaoMs, AGORA).status, 'FUNCIONANDO');
  });
});
