import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  listarMembrosRede,
  gerarConviteMedico,
  listarConvitesPendentes,
  recusarConvite,
  cancelarConvite,
  obterContagemMedicos,
  LIMITE_MEDICOS_RN012,
} from '../redeProtecaoService';

describe('HU-016 & RN-012: Convidar o Médico do Idoso', () => {
  const TEST_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

  test('RN-012 define limite máximo de 2 médicos por idoso', () => {
    assert.equal(LIMITE_MEDICOS_RN012, 2, 'O limite da RN-012 deve ser exatamente 2 médicos');
  });

  test('Cenário 1: Convidar médico com nome, CRM e e-mail gera convite válido por 72h', async () => {
    const dadosMedico = {
      nome: 'Dr. Roberto Martins',
      crm: '123456/SP',
      email: 'dr.roberto@clinica.com.br',
      mensagemPersonalizada: 'Acompanhamento do quadro de hipertensão de Dona Maria.',
    };

    const convite = await gerarConviteMedico(TEST_IDOSO_ID, dadosMedico, { papelUsuario: 'ADMIN' });

    assert.ok(convite.id, 'Deve gerar um ID para o convite');
    assert.ok(convite.token, 'Deve gerar um token UUID');
    assert.equal(convite.nomeMedico, 'Dr. Roberto Martins');
    assert.equal(convite.crm, '123456/SP');
    assert.equal(convite.emailDestinatario, 'dr.roberto@clinica.com.br');
    assert.equal(convite.papelAcessoSugerido, 'MEDICO');
    assert.equal(convite.status, 'PENDENTE');
    assert.equal(convite.validadeHorasRestantes, 72, 'Validade do convite de médico deve ser de 72 horas');
    assert.ok(
      convite.linkConvite?.startsWith('seniorinsight://convite/'),
      'Deep link deve usar o esquema do SeniorInsight'
    );
  });

  test('Validações de campos obrigatórios no convite do médico', async () => {
    await assert.rejects(
      async () => {
        await gerarConviteMedico(TEST_IDOSO_ID, { nome: '', crm: '123456/SP', email: 'med@teste.com' }, { papelUsuario: 'ADMIN' });
      },
      (err) => {
        assert.ok(err.message.includes('nome'), 'Deve exigir o nome do médico');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await gerarConviteMedico(TEST_IDOSO_ID, { nome: 'Dr. Teste', crm: '', email: 'med@teste.com' }, { papelUsuario: 'ADMIN' });
      },
      (err) => {
        assert.ok(err.message.includes('CRM'), 'Deve exigir o CRM do médico');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await gerarConviteMedico(TEST_IDOSO_ID, { nome: 'Dr. Teste', crm: '123456/SP', email: 'email_invalido' }, { papelUsuario: 'ADMIN' });
      },
      (err) => {
        assert.ok(err.message.includes('e-mail') || err.message.includes('email'), 'Deve validar o formato do e-mail');
        return true;
      }
    );
  });

  test('Somente Familiar Administrador pode convidar médico (Perfil Não Autorizado)', async () => {
    const dados = {
      nome: 'Dr. Paulo Freire',
      crm: '654321/RJ',
      email: 'dr.paulo@teste.com',
    };

    await assert.rejects(
      async () => {
        await gerarConviteMedico(TEST_IDOSO_ID, dados, { papelUsuario: 'CUIDADOR' });
      },
      (err) => {
        assert.ok(
          err.message.includes('Familiar Administrador') || err.message.includes('administrador'),
          'Apenas Familiar Administrador pode convidar médico'
        );
        return true;
      }
    );
  });

  test('Cenário 2: Ao atingir o limite de 2 médicos, convidar o 3º deve retornar "Limite de 2 médicos atingido"', async () => {
    // Registra convites até atingir o limite de 2 médicos
    await gerarConviteMedico(
      TEST_IDOSO_ID,
      { nome: 'Dr. Primeiro', crm: '111111/SP', email: 'med1@teste.com' },
      { papelUsuario: 'ADMIN', ignorarLimite: true }
    );
    await gerarConviteMedico(
      TEST_IDOSO_ID,
      { nome: 'Dr. Segundo', crm: '222222/SP', email: 'med2@teste.com' },
      { papelUsuario: 'ADMIN', ignorarLimite: true }
    );

    // Tentativa de convidar o terceiro médico
    await assert.rejects(
      async () => {
        await gerarConviteMedico(
          TEST_IDOSO_ID,
          { nome: 'Dr. Terceiro', crm: '333333/SP', email: 'med3@teste.com' },
          { papelUsuario: 'ADMIN' }
        );
      },
      (err) => {
        assert.equal(
          err.message,
          'Limite de 2 médicos atingido',
          'Mensagem deve ser exatamente "Limite de 2 médicos atingido" conforme o critério de aceite'
        );
        return true;
      }
    );
  });

  test('HU-017 Cenário 2: Quando o médico recusa, a família vê "O médico recusou o convite"', async () => {
    const convite = await gerarConviteMedico(
      TEST_IDOSO_ID,
      { nome: 'Dr. Recusador', crm: '999888/SP', email: 'recusa@medico.com' },
      { papelUsuario: 'ADMIN', ignorarLimite: true }
    );

    const recusado = await recusarConvite(TEST_IDOSO_ID, convite.id);

    assert.equal(recusado.status, 'RECUSADO', 'Status do convite deve ser RECUSADO');
    assert.equal(
      recusado.mensagemRecusa,
      'O médico recusou o convite',
      'Mensagem deve ser exatamente "O médico recusou o convite"'
    );
  });

  test('Contagem de médicos na rede distingue vinculados, pendentes e recusados', async () => {
    const stats = await obterContagemMedicos(TEST_IDOSO_ID);
    assert.ok(typeof stats.totalMedicos === 'number');
    assert.ok(typeof stats.limiteAtingido === 'boolean');
    assert.ok(Array.isArray(stats.medicosPendentes));
    assert.ok(Array.isArray(stats.medicosRecusados));
  });
});
