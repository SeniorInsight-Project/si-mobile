import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listarMembrosRede,
  gerarConvite,
  gerarConviteMedico,
  obterDetalhesConvite,
  aceitarConvite,
  listarConvitesPendentes,
  cancelarConvite,
  editarConvite,
} from '../redeProtecaoService';
import { ApiError } from '../apiClient';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';

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
    patch: executa('PATCH') as any,
    delete: executa('DELETE') as any,
  };
}

const convite = (p: Record<string, unknown> = {}) => ({
  id: 'c-1',
  idosoId: IDOSO,
  emailDestinatario: 'ana@teste.com',
  token: 'tok-1',
  papelAcessoSugerido: 'CUIDADOR',
  grauParentescoSugerido: 'Filha',
  status: 'PENDENTE',
  dataExpiracao: new Date(Date.now() + 48 * 3_600_000).toISOString(),
  criadoEm: new Date().toISOString(),
  ...p,
});

describe('Rede de proteção pelo apiClient, contrato care-v1 (HU16 / HU-013 / HU-016)', () => {
  // cada arquivo de teste roda em um processo próprio: não precisa restaurar o ambiente
  beforeEach(() => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
  });

  test('membros: resposta do contrato vira o modelo da tela; ADMINISTRADOR é plantão', async () => {
    const c = cliente({
      [`GET /api/v1/idosos/${IDOSO}/rede`]: [
        { vinculoId: 'v-1', familiarId: 'f-1', nomeCompleto: 'Carlos Souza', papelAcesso: 'ADMINISTRADOR', vinculadoEm: '2026-11-01T10:00:00Z' },
        { vinculoId: 'v-2', familiarId: 'f-2', nomeCompleto: 'Ana Lima', papelAcesso: 'CUIDADOR', telefone: '11999990000', grauParentesco: 'Filha', vinculadoEm: '2026-11-02T10:00:00Z' },
      ],
    });
    const membros = await listarMembrosRede(IDOSO, { cliente: c });
    assert.equal(membros.length, 2);
    assert.equal(membros[0].isPlantao, true);
    assert.equal(membros[0].badgeTipo, 'plantao');
    assert.equal(membros[1].nome, 'Ana Lima');
    assert.equal(membros[1].telefone, '11999990000');
    assert.equal(c.chamadas[0].caminho, `/api/v1/idosos/${IDOSO}/rede`);
  });

  test('membros: lê usuarioId ?? keycloakSub (até o si-care-service#105)', async () => {
    const c = cliente({
      [`GET /api/v1/idosos/${IDOSO}/rede`]: [
        { vinculoId: 'v-1', nomeCompleto: 'A', papelAcesso: 'CUIDADOR', usuarioId: 'u-1', keycloakSub: 'kc-1' },
        { vinculoId: 'v-2', nomeCompleto: 'B', papelAcesso: 'CUIDADOR', usuarioId: null, keycloakSub: 'kc-2' },
        { vinculoId: 'v-3', nomeCompleto: 'C', papelAcesso: 'CUIDADOR', usuarioId: null },
      ],
    });
    const membros = await listarMembrosRede(IDOSO, { cliente: c });
    assert.deepEqual(membros.map((m) => m.usuarioId), ['u-1', 'kc-2', undefined]);
  });

  test('membros: lista vazia fica vazia; erro lança (back fora não vira dado inventado)', async () => {
    assert.deepEqual(await listarMembrosRede(IDOSO, { cliente: cliente({ [`GET /api/v1/idosos/${IDOSO}/rede`]: [] }) }), []);
    const erro = new ApiError(0, null, '/x');
    await assert.rejects(listarMembrosRede(IDOSO, { cliente: cliente({ [`GET /api/v1/idosos/${IDOSO}/rede`]: erro }) }), (e: any) => e === erro);
  });

  test('convite: corpo é só o ConviteRedeRequest e a resposta usa os campos do contrato', async () => {
    const c = cliente({ [`POST /api/v1/idosos/${IDOSO}/convites`]: convite() });
    const r = await gerarConvite(IDOSO, { email: 'ana@teste.com', papelAcesso: 'CUIDADOR', grauParentesco: 'Filha', mensagemPersonalizada: 'Oi' }, { cliente: c });
    assert.deepEqual(c.chamadas[0].corpo, { email: 'ana@teste.com', papelAcesso: 'CUIDADOR', grauParentesco: 'Filha', mensagemPersonalizada: 'Oi' });
    assert.equal(r.emailDestinatario, 'ana@teste.com');
    assert.equal((r as any).papelLabel, 'Cuidador(a)');
    assert.equal(r.grauParentescoSugerido, 'Filha');
    assert.equal((r as any).linkConvite, 'seniorinsight://convite/tok-1');
  });

  test('convite: 409 chega com status e mensagem do servidor', async () => {
    const c = cliente({ [`POST /api/v1/idosos/${IDOSO}/convites`]: new ApiError(409, { message: 'Limite de 5 familiares atingido' }, '/x') });
    await assert.rejects(gerarConvite(IDOSO, { email: 'a@b.com' }, { cliente: c }), (e: any) => e.status === 409 && e.message === 'Limite de 5 familiares atingido');
  });

  test('convite do médico: o POST leva só email, papelAcesso MEDICO, grauParentesco e mensagemPersonalizada', async () => {
    const c = cliente({
      [`GET /api/v1/idosos/${IDOSO}/rede`]: [],
      [`GET /api/v1/idosos/${IDOSO}/convites/pendentes`]: [],
      [`POST /api/v1/idosos/${IDOSO}/convites`]: convite({ papelAcessoSugerido: 'MEDICO', grauParentescoSugerido: 'Médico(a)' }),
    });
    const r = await gerarConviteMedico(IDOSO, { nome: 'Dr. Paulo', crm: '123/sp', email: ' Paulo@Clinica.com ' }, {}, { cliente: c });
    const post = c.chamadas.find((x) => x.metodo === 'POST')!;
    assert.deepEqual(Object.keys(post.corpo).sort(), ['email', 'grauParentesco', 'mensagemPersonalizada', 'papelAcesso']);
    assert.equal(post.corpo.email, 'paulo@clinica.com');
    assert.equal(post.corpo.papelAcesso, 'MEDICO');
    assert.equal(post.corpo.grauParentesco, 'Médico(a)');
    assert.ok(!post.corpo.mensagemPersonalizada.includes('Dona Maria'));
    // nome e CRM só aparecem na resposta exibida na tela
    assert.equal((r as any).nomeMedico, 'Dr. Paulo');
    assert.equal(r.crm, '123/SP');
    assert.ok((r.validadeHorasRestantes ?? 0) >= 47);
  });

  test('convite do médico: ADMINISTRADOR (contrato) e ADMIN (antigo) convidam; outros papéis não', async () => {
    const c = cliente({
      [`GET /api/v1/idosos/${IDOSO}/rede`]: [],
      [`GET /api/v1/idosos/${IDOSO}/convites/pendentes`]: [],
      [`POST /api/v1/idosos/${IDOSO}/convites`]: convite(),
    });
    const dados = { nome: 'Dr. P', crm: '1', email: 'p@c.com' };
    await gerarConviteMedico(IDOSO, dados, { papelUsuario: 'ADMINISTRADOR' }, { cliente: c });
    await gerarConviteMedico(IDOSO, dados, { papelUsuario: 'ADMIN' }, { cliente: c });
    await assert.rejects(gerarConviteMedico(IDOSO, dados, { papelUsuario: 'CUIDADOR' }, { cliente: c }), /Apenas o Familiar Administrador/);
  });

  test('detalhes do convite: GET /api/v1/convites?token= e ConvitePublico vira o modelo da tela', async () => {
    const expiraEm = new Date(Date.now() + 3_600_000).toISOString();
    const c = cliente({
      'GET /api/v1/convites?token=abc%2012': { nomeConvidante: 'Carlos', primeiroNomeIdoso: 'Maria', papelAcesso: 'CUIDADOR', grauParentesco: 'Filho', expiraEm, status: 'PENDENTE' },
    });
    const d = await obterDetalhesConvite(' abc 12 ', { cliente: c });
    assert.equal(c.chamadas[0].caminho, '/api/v1/convites?token=abc%2012');
    assert.equal(d.nomeIdoso, 'Maria');
    assert.equal(d.solicitanteNome, 'Carlos');
    assert.equal(d.papelAcessoSugerido, 'CUIDADOR');
    assert.equal(d.papelLabel, 'Cuidador(a)');
    assert.equal(d.grauParentescoSugerido, 'Filho');
    assert.equal(d.expirado, false);
  });

  test('detalhes do convite: data vencida marca expirado; 404, 409 e 410 lançam com o status', async () => {
    const c = cliente({ 'GET /api/v1/convites?token=t': { nomeConvidante: 'C', primeiroNomeIdoso: 'M', papelAcesso: 'OBSERVADOR', expiraEm: '2020-01-01T00:00:00Z', status: 'PENDENTE' } });
    assert.equal((await obterDetalhesConvite('t', { cliente: c })).expirado, true);
    for (const status of [404, 409, 410]) {
      const falha = cliente({ 'GET /api/v1/convites?token=t': new ApiError(status, null, '/x') });
      await assert.rejects(obterDetalhesConvite('t', { cliente: falha }), (e: any) => e.status === status);
    }
  });

  test('aceite: sucesso devolve o AceiteConvite do servidor (POST /convites/aceitar?token=)', async () => {
    const aceite = { vinculoId: 'v-9', idosoId: IDOSO, familiarId: 'f-9', nomeIdoso: 'Maria', criadoEm: new Date().toISOString() };
    const c = cliente({ 'POST /api/v1/convites/aceitar?token=tok': aceite });
    assert.deepEqual(await aceitarConvite('tok', { cliente: c }), aceite);
  });

  test('aceite: 400, 403, 409 e 410 lançam com status e mensagem em português, sem vínculo falso', async () => {
    const esperado: Record<number, RegExp> = { 400: /inválido/, 403: /permissão/, 409: /Já aceito/, 410: /expirado/ };
    for (const status of [400, 403, 409, 410]) {
      const c = cliente({ 'POST /api/v1/convites/aceitar?token=tok': new ApiError(status, { message: 'Já aceito' }, '/x') });
      await assert.rejects(aceitarConvite('tok', { cliente: c }), (e: any) => {
        assert.equal(e.status, status);
        assert.match(e.message, esperado[status]);
        return true;
      });
    }
  });

  test('aceite: sem rede lança o erro de rede (status 0)', async () => {
    const c = cliente({ 'POST /api/v1/convites/aceitar?token=tok': new ApiError(0, null, '/x') });
    await assert.rejects(aceitarConvite('tok', { cliente: c }), (e: any) => e.status === 0);
  });

  test('pendentes: lista vazia fica vazia; só o que o servidor mandou', async () => {
    assert.deepEqual(await listarConvitesPendentes(IDOSO, { cliente: cliente({ [`GET /api/v1/idosos/${IDOSO}/convites/pendentes`]: [] }) }), []);
    const c = cliente({ [`GET /api/v1/idosos/${IDOSO}/convites/pendentes`]: [convite()] });
    const [p] = await listarConvitesPendentes(IDOSO, { cliente: c });
    assert.equal(p.status, 'PENDENTE');
    assert.equal(p.papelAcessoSugerido, 'CUIDADOR');
  });

  test('cancelar usa DELETE /convites/{id}; editar usa PATCH só com os campos enviados', async () => {
    const c = cliente({ 'PATCH /api/v1/convites/c-1': convite({ grauParentescoSugerido: 'Tio' }) });
    assert.equal(await cancelarConvite(IDOSO, 'c-1', { cliente: c }), true);
    const r = await editarConvite(IDOSO, 'c-1', { grauParentesco: 'Tio' }, { cliente: c });
    assert.deepEqual(c.chamadas.map((x) => `${x.metodo} ${x.caminho}`), ['DELETE /api/v1/convites/c-1', 'PATCH /api/v1/convites/c-1']);
    assert.deepEqual(c.chamadas[1].corpo, { grauParentesco: 'Tio' });
    assert.equal(r?.grauParentescoSugerido, 'Tio');
  });
});
