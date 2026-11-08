import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
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
} from '../contatoEmergenciaDatabase';

describe('HU-011: Contatos de Emergência (Issue #25)', () => {
  const IDOSO_ID = 'idoso-teste-hu011';

  beforeEach(async () => {
    __definirContatosParaTestes([]);
    await limparContatosDoCache(IDOSO_ID);
  });

  describe('Cenário 2: Validação de telefone', () => {
    it('deve rejeitar telefone com menos de 10 dígitos', () => {
      const res = validarTelefone('119876');
      assert.strictEqual(res.valido, false);
      assert.strictEqual(res.mensagem, 'Telefone inválido');
    });

    it('deve rejeitar telefone com DDD inválido (menor que 11 ou maior que 99)', () => {
      const res1 = validarTelefone('(09) 98765-4321');
      assert.strictEqual(res1.valido, false);
      assert.strictEqual(res1.mensagem, 'Telefone inválido');

      const res2 = validarTelefone('(00) 98765-4321');
      assert.strictEqual(res2.valido, false);
      assert.strictEqual(res2.mensagem, 'Telefone inválido');
    });

    it('deve rejeitar celular de 11 dígitos que não inicia com 9 após DDD', () => {
      const res = validarTelefone('(11) 78765-4321');
      assert.strictEqual(res.valido, false);
      assert.strictEqual(res.mensagem, 'Telefone inválido');
    });

    it('deve aceitar telefone celular com 11 dígitos válido', () => {
      const res = validarTelefone('(11) 98765-4321');
      assert.strictEqual(res.valido, true);
    });

    it('deve aceitar telefone fixo com 10 dígitos válido', () => {
      const res = validarTelefone('(11) 3234-5678');
      assert.strictEqual(res.valido, true);
    });

    it('salvarContato deve lançar "Telefone inválido" ao receber telefone inconsistente', async () => {
      await assert.rejects(
        async () => {
          await salvarContato(IDOSO_ID, {
            nome: 'Contato Inválido',
            telefone: '1234',
          });
        },
        {
          message: 'Telefone inválido',
        }
      );
    });
  });

  describe('Cenário 1: Cadastro, limite de 3 contatos e persistência offline', () => {
    it('deve permitir cadastrar até 3 contatos com sucesso', async () => {
      const c1 = await salvarContato(
        IDOSO_ID,
        {
          nome: 'Carlos Filho',
          telefone: '(11) 98765-4321',
          parentesco: 'Filho(a)',
        },
        LIMITE_CONTATOS_EMERGENCIA
      );
      assert.strictEqual(c1.nome, 'Carlos Filho');
      assert.strictEqual(c1.ordem, 1);

      const c2 = await salvarContato(
        IDOSO_ID,
        {
          nome: 'Mariana Neta',
          telefone: '(11) 98888-7777',
          parentesco: 'Neto(a)',
        },
        LIMITE_CONTATOS_EMERGENCIA
      );
      assert.strictEqual(c2.nome, 'Mariana Neta');
      assert.strictEqual(c2.ordem, 2);

      const c3 = await salvarContato(
        IDOSO_ID,
        {
          nome: 'Dr. Roberto',
          telefone: '(11) 97777-6666',
          parentesco: 'Médico(a)',
        },
        LIMITE_CONTATOS_EMERGENCIA
      );
      assert.strictEqual(c3.nome, 'Dr. Roberto');
      assert.strictEqual(c3.ordem, 3);

      const lista = await listarContatos(IDOSO_ID);
      assert.strictEqual(lista.length, 3);
    });

    it('deve impedir o cadastro do 4º contato respeitando o limite de 3 (RN-002)', async () => {
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

    it('deve persistir os contatos no banco de cache para acesso 100% offline no celular do idoso', async () => {
      await salvarContato(IDOSO_ID, { nome: 'Ana Cuidadora', telefone: '(11) 98888-9999' }, LIMITE_CONTATOS_EMERGENCIA);

      const doCache = await obterContatosDoCache(IDOSO_ID);
      assert.strictEqual(doCache.length, 1);
      assert.strictEqual(doCache[0].nome, 'Ana Cuidadora');
    });

    it('removerContato deve atualizar o cache e reordenar as prioridades', async () => {
      const c1 = await salvarContato(IDOSO_ID, { nome: 'Contato 1', telefone: '(11) 91111-1111' }, LIMITE_CONTATOS_EMERGENCIA);
      const c2 = await salvarContato(IDOSO_ID, { nome: 'Contato 2', telefone: '(11) 92222-2222' }, LIMITE_CONTATOS_EMERGENCIA);

      await removerContato(IDOSO_ID, c1.id);

      const lista = await listarContatos(IDOSO_ID);
      assert.strictEqual(lista.length, 1);
      assert.strictEqual(lista[0].id, c2.id);
      assert.strictEqual(lista[0].ordem, 1); // Reordenado para 1º
    });
  });
});
