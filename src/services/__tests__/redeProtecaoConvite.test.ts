import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  listarMembrosRede,
  gerarConvite,
  aceitarConvite,
  obterDetalhesConvite,
  listarConvitesPendentes,
  cancelarConvite,
  editarConvite,
  INITIAL_MEMBERS,
} from '../redeProtecaoService';

describe('Rede de Proteção - Gestão de Convites e Aceite (HU-012 & HU-013 / RF-008)', () => {
  const TEST_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

  test('listarMembrosRede deve retornar lista de membros normalizada com fallback resiliente', async () => {
    const membros = await listarMembrosRede(TEST_IDOSO_ID);
    assert.ok(Array.isArray(membros), 'Deve retornar um array de membros');
    assert.ok(membros.length >= 4, 'Deve conter pelo menos 4 membros do protótipo');

    const primeiro = membros[0];
    assert.ok(primeiro.nome, 'Membro deve ter propriedade nome');
    assert.ok(primeiro.iniciais, 'Membro deve ter iniciais calculadas');
    assert.ok(primeiro.badgeTipo, 'Membro deve ter badgeTipo');
    assert.ok(Array.isArray(primeiro.acoes), 'Membro deve ter lista de ações');
  });

  test('gerarConvite deve emitir token e deep link com esquema seniorinsight://convite/{token}', async () => {
    const dados = {
      email: 'novo.familiar@teste.com',
      grauParentesco: 'Neto',
      papelAcesso: 'CUIDADOR',
      mensagemPersonalizada: 'Venha acompanhar a vovó.',
    };

    const convite = await gerarConvite(TEST_IDOSO_ID, dados);

    assert.ok(convite.token, 'Deve conter um token gerado');
    assert.equal(convite.emailDestinatario, 'novo.familiar@teste.com');
    assert.ok(
      convite.linkConvite.startsWith('seniorinsight://convite/'),
      'O link deve usar o esquema seniorinsight://convite/'
    );
    assert.ok(
      convite.linkConvite.includes(convite.token),
      'O deep link deve conter o token gerado'
    );
    assert.ok(convite.dataExpiracao, 'Deve ter data de expiração calculada');
  });

  test('obterDetalhesConvite deve identificar convite ativo e dados do idoso', async () => {
    const detalhes = await obterDetalhesConvite('token-valido-123');

    assert.equal(detalhes.token, 'token-valido-123');
    assert.equal(detalhes.expirado, false);
    assert.equal(detalhes.status, 'PENDENTE');
    assert.ok(detalhes.nomeIdoso, 'Deve retornar o nome do idoso monitorado');
    assert.ok(detalhes.solicitanteNome, 'Deve retornar o nome de quem convidou');
  });

  test('obterDetalhesConvite deve identificar convite expirado (HU-013 Cenário 2)', async () => {
    const detalhes = await obterDetalhesConvite('token-expirado-48h');

    assert.equal(detalhes.expirado, true);
    assert.equal(detalhes.status, 'EXPIRADO');
    assert.ok(
      detalhes.mensagem?.includes('expirado'),
      'Deve conter mensagem de expiração'
    );
  });

  test('aceitarConvite deve lançar erro 410 quando o token estiver expirado', async () => {
    await assert.rejects(
      async () => {
        await aceitarConvite('token-expirado-72h');
      },
      (err: any) => {
        assert.equal(err.status, 410);
        assert.ok(
          err.message.includes('expirado'),
          'A mensagem de erro deve indicar expiração'
        );
        return true;
      }
    );
  });

  test('aceitarConvite deve vincular com sucesso token válido', async () => {
    const resultado = await aceitarConvite('token-valido-teste');

    assert.ok(resultado.vinculoId, 'Deve gerar vinculoId');
    assert.ok(resultado.nomeIdoso, 'Deve conter nome do idoso');
    assert.ok(resultado.mensagem.includes('sucesso'));
  });

  test('listarConvitesPendentes deve listar convites gerados e permitir edição e cancelamento', async () => {
    // 1. Gera um convite específico para teste
    const conviteCriado = await gerarConvite(TEST_IDOSO_ID, {
      email: 'pendente.teste@senior.com',
      grauParentesco: 'Primo',
      papelAcesso: 'OBSERVADOR',
    });

    const pendentes = await listarConvitesPendentes(TEST_IDOSO_ID);
    assert.ok(Array.isArray(pendentes), 'Deve retornar lista de pendentes');
    const encontrado = pendentes.find((c) => c.emailDestinatario === 'pendente.teste@senior.com');
    assert.ok(encontrado, 'Deve encontrar o convite pendente recém criado');

    // 2. Edita dados do convite pendente
    const editado = await editarConvite(TEST_IDOSO_ID, encontrado.id, {
      email: 'pendente.editado@senior.com',
      grauParentesco: 'Tio',
      papelAcesso: 'CUIDADOR',
    });
    assert.ok(editado);
    assert.equal(editado.emailDestinatario, 'pendente.editado@senior.com');
    assert.equal(editado.grauParentescoSugerido, 'Tio');

    // 3. Cancela o convite pendente
    const cancelado = await cancelarConvite(TEST_IDOSO_ID, encontrado.id);
    assert.equal(cancelado, true);

    const pendentesAposCancel = await listarConvitesPendentes(TEST_IDOSO_ID);
    assert.equal(
      pendentesAposCancel.some((c) => c.id === encontrado.id),
      false,
      'O convite cancelado não deve mais estar na lista de pendentes'
    );
  });
});
