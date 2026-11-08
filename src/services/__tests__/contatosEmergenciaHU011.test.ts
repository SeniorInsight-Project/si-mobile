import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  validarTelefone,
  salvarContato,
  listarContatos,
  removerContato,
  reordenarContatos,
  LIMITE_CONTATOS_EMERGENCIA,
  __definirContatosParaTestes,
} from '../contatoEmergenciaService';
import {
  obterContatosDoCache,
  limparContatosDoCache,
  __simularFalhaBanco,
} from '../contatoEmergenciaDatabase';

describe('HU-011: Contatos de Emergência (Issue #25)', () => {
  const IDOSO_ID = 'idoso-teste-hu011';

  beforeEach(async () => {
    __simularFalhaBanco(false);
    __definirContatosParaTestes([]);
    await limparContatosDoCache(IDOSO_ID);
  });


  describe('Cenário 2: Validação de telefone', () => {
    test('deve rejeitar telefone com menos de 10 dígitos', () => {
      const res = validarTelefone('119876');
      assert.equal(res.valido, false);
      assert.equal(res.mensagem, 'Telefone inválido');
    });

    test('deve rejeitar telefone com DDD inválido (menor que 11 ou maior que 99)', () => {
      const res1 = validarTelefone('(09) 98765-4321');
      assert.equal(res1.valido, false);
      assert.equal(res1.mensagem, 'Telefone inválido');

      const res2 = validarTelefone('(00) 98765-4321');
      assert.equal(res2.valido, false);
      assert.equal(res2.mensagem, 'Telefone inválido');
    });

    test('deve rejeitar celular de 11 dígitos que não inicia com 9 após DDD', () => {
      const res = validarTelefone('(11) 78765-4321');
      assert.equal(res.valido, false);
      assert.equal(res.mensagem, 'Telefone inválido');
    });

    test('deve aceitar telefone celular com 11 dígitos válido', () => {
      const res = validarTelefone('(11) 98765-4321');
      assert.equal(res.valido, true);
    });

    test('deve aceitar telefone fixo com 10 dígitos válido', () => {
      const res = validarTelefone('(11) 3234-5678');
      assert.equal(res.valido, true);
    });

    test('salvarContato deve lançar "Telefone inválido" ao receber telefone inconsistente', async () => {
      await assert.rejects(
        async () => {
          await salvarContato(IDOSO_ID, {
            nome: 'Contato Inválido',
            telefone: '1234',
          });
        },
        /Telefone inválido/
      );
    });
  });

  describe('Cenário 1: Cadastro, limite de 3 contatos e persistência offline', () => {
    test('deve permitir cadastrar até 3 contatos com sucesso', async () => {
      const c1 = await salvarContato(
        IDOSO_ID,
        {
          nome: 'Carlos Filho',
          telefone: '(11) 98765-4321',
          parentesco: 'Filho(a)',
        },
        LIMITE_CONTATOS_EMERGENCIA
      );
      assert.equal(c1.nome, 'Carlos Filho');
      assert.equal(c1.ordem, 1);

      const c2 = await salvarContato(
        IDOSO_ID,
        {
          nome: 'Mariana Neta',
          telefone: '(11) 98888-7777',
          parentesco: 'Neto(a)',
        },
        LIMITE_CONTATOS_EMERGENCIA
      );
      assert.equal(c2.nome, 'Mariana Neta');
      assert.equal(c2.ordem, 2);

      const c3 = await salvarContato(
        IDOSO_ID,
        {
          nome: 'Dr. Roberto',
          telefone: '(11) 97777-6666',
          parentesco: 'Médico(a)',
        },
        LIMITE_CONTATOS_EMERGENCIA
      );
      assert.equal(c3.nome, 'Dr. Roberto');
      assert.equal(c3.ordem, 3);

      const lista = await listarContatos(IDOSO_ID);
      assert.equal(lista.length, 3);
    });

    test('deve impedir o cadastro do 4º contato respeitando o limite de 3 (RN-002)', async () => {
      await salvarContato(IDOSO_ID, { nome: 'Contato 1', telefone: '(11) 91111-1111' }, LIMITE_CONTATOS_EMERGENCIA);
      await salvarContato(IDOSO_ID, { nome: 'Contato 2', telefone: '(11) 92222-2222' }, LIMITE_CONTATOS_EMERGENCIA);
      await salvarContato(IDOSO_ID, { nome: 'Contato 3', telefone: '(11) 93333-3333' }, LIMITE_CONTATOS_EMERGENCIA);

      await assert.rejects(
        async () => {
          await salvarContato(IDOSO_ID, { nome: 'Contato 4', telefone: '(11) 94444-4444' }, LIMITE_CONTATOS_EMERGENCIA);
        },
        (err: any) => {
          return err.message.includes(`Limite de ${LIMITE_CONTATOS_EMERGENCIA} contatos`);
        }
      );
    });

    test('deve persistir os contatos no banco de cache para acesso 100% offline no celular do idoso', async () => {
      await salvarContato(IDOSO_ID, { nome: 'Ana Cuidadora', telefone: '(11) 98888-9999' }, LIMITE_CONTATOS_EMERGENCIA);

      const doCache = await obterContatosDoCache(IDOSO_ID);
      assert.equal(doCache.length, 1);
      assert.equal(doCache[0].nome, 'Ana Cuidadora');
    });

    test('removerContato deve atualizar o cache e reordenar as prioridades', async () => {
      const c1 = await salvarContato(IDOSO_ID, { nome: 'Contato 1', telefone: '(11) 91111-1111' }, LIMITE_CONTATOS_EMERGENCIA);
      const c2 = await salvarContato(IDOSO_ID, { nome: 'Contato 2', telefone: '(11) 92222-2222' }, LIMITE_CONTATOS_EMERGENCIA);

      await removerContato(IDOSO_ID, c1.id);

      const lista = await listarContatos(IDOSO_ID);
      assert.equal(lista.length, 1);
      assert.equal(lista[0].id, c2.id);
      assert.equal(lista[0].ordem, 1); // Reordenado para 1º
    });

    test('deve rejeitar com erro tratado quando o SQLite falha', async () => {
      try {
        __simularFalhaBanco(true);
        await assert.rejects(
          async () => {
            await salvarContato(IDOSO_ID, { nome: 'Teste Falha', telefone: '(11) 98765-4321' });
          },
          (err: any) => {
            return err.message.length > 0;
          }
        );
      } finally {
        __simularFalhaBanco(false);
      }
    });
  });
});
