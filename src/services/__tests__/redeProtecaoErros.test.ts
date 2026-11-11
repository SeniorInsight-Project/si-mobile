import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listarMembrosRede,
  listarConvitesPendentes,
  cancelarConvite,
  editarConvite,
} from '../redeProtecaoService';

describe('Rede de Proteção - Tratamento de Erros e Regra de Mock (HU-012/HU-016)', () => {
  const TEST_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';
  const fetchOriginal = globalThis.fetch;
  const mockOriginal = process.env.EXPO_PUBLIC_USAR_MOCK;

  beforeEach(() => {
    globalThis.fetch = fetchOriginal;
    process.env.EXPO_PUBLIC_USAR_MOCK = mockOriginal;
  });

  test('Back fora: cancelarConvite rejeita quando mockPermitido() é false', async () => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
    globalThis.fetch = async () => {
      throw new Error('Falha de conexão com o servidor');
    };

    try {
      await assert.rejects(
        async () => {
          await cancelarConvite(TEST_IDOSO_ID, 'conv-123');
        },
        (err: any) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes('Falha de conexão') || err.message.includes('cancelar'));
          return true;
        }
      );
    } finally {
      globalThis.fetch = fetchOriginal;
      process.env.EXPO_PUBLIC_USAR_MOCK = mockOriginal;
    }
  });

  test('Back fora: editarConvite rejeita quando mockPermitido() é false', async () => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
    globalThis.fetch = async () => {
      throw new Error('Servidor inacessível');
    };

    try {
      await assert.rejects(
        async () => {
          await editarConvite(TEST_IDOSO_ID, 'conv-123', { email: 'novo@teste.com' });
        },
        (err: any) => {
          assert.ok(err instanceof Error);
          return true;
        }
      );
    } finally {
      globalThis.fetch = fetchOriginal;
      process.env.EXPO_PUBLIC_USAR_MOCK = mockOriginal;
    }
  });

  test('Back fora: listarConvitesPendentes rejeita quando mockPermitido() é false', async () => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
    globalThis.fetch = async () => {
      throw new Error('Network error');
    };

    try {
      await assert.rejects(
        async () => {
          await listarConvitesPendentes(TEST_IDOSO_ID);
        },
        (err: any) => {
          assert.ok(err instanceof Error);
          return true;
        }
      );
    } finally {
      globalThis.fetch = fetchOriginal;
      process.env.EXPO_PUBLIC_USAR_MOCK = mockOriginal;
    }
  });

  test('Back fora: listarMembrosRede rejeita quando mockPermitido() é false', async () => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };

    try {
      await assert.rejects(
        async () => {
          await listarMembrosRede(TEST_IDOSO_ID);
        },
        (err: any) => {
          assert.ok(err instanceof Error);
          return true;
        }
      );
    } finally {
      globalThis.fetch = fetchOriginal;
      process.env.EXPO_PUBLIC_USAR_MOCK = mockOriginal;
    }
  });

  test('Back responde 500: operações rejeitam com a mensagem de extrairMensagemErro', async () => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({ mensagem: 'Falha interna no serviço de cuidados' }),
      } as unknown as Response;
    };

    try {
      await assert.rejects(
        async () => {
          await listarMembrosRede(TEST_IDOSO_ID);
        },
        (err: any) => {
          assert.equal(err.message, 'Falha interna no serviço de cuidados');
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await cancelarConvite(TEST_IDOSO_ID, 'conv-123');
        },
        (err: any) => {
          assert.equal(err.message, 'Falha interna no serviço de cuidados');
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await editarConvite(TEST_IDOSO_ID, 'conv-123', { grauParentesco: 'Tio' });
        },
        (err: any) => {
          assert.equal(err.message, 'Falha interna no serviço de cuidados');
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await listarConvitesPendentes(TEST_IDOSO_ID);
        },
        (err: any) => {
          assert.equal(err.message, 'Falha interna no serviço de cuidados');
          return true;
        }
      );
    } finally {
      globalThis.fetch = fetchOriginal;
      process.env.EXPO_PUBLIC_USAR_MOCK = mockOriginal;
    }
  });

  test('Com mock permitido: caminho de mock continua funcionando normalmente', async () => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'true';

    // listarMembrosRede
    const membros = await listarMembrosRede(TEST_IDOSO_ID);
    assert.ok(Array.isArray(membros));
    assert.ok(membros.length >= 4);

    // listarConvitesPendentes
    const pendentes = await listarConvitesPendentes(TEST_IDOSO_ID);
    assert.ok(Array.isArray(pendentes));

    // cancelarConvite
    const sucesso = await cancelarConvite(TEST_IDOSO_ID, 'conv-inexistente');
    assert.equal(sucesso, true);
  });

  test('Membro sem telefone no back não ganha número fictício', async () => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
    const cliente = {
      get: async () => [
        { vinculoId: 'v-1', nomeCompleto: 'Ana Souza', papelAcesso: 'CUIDADOR' },
        { vinculoId: 'v-2', nomeCompleto: 'Dr. Paulo Lima', papelAcesso: 'MEDICO', crm: '123/SP' },
      ],
    } as any;

    try {
      const membros = await listarMembrosRede(TEST_IDOSO_ID, { cliente });
      assert.equal(membros.length, 2);
      for (const membro of membros) {
        assert.equal(membro.telefone, '');
        assert.ok(!membro.acoesTexto.includes('Dona Maria'));
      }
    } finally {
      globalThis.fetch = fetchOriginal;
      process.env.EXPO_PUBLIC_USAR_MOCK = mockOriginal;
    }
  });
});

