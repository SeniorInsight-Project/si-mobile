import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmacaoValida,
  solicitarExclusao,
  ExclusaoError,
  MENSAGENS_EXCLUSAO,
  PRAZO_COMPROVANTE_DIAS,
  FRASE_CONFIRMACAO,
  ROTA_EXCLUSAO,
  executarLimpezaLocalExclusao,
} from '../exclusaoContaService';
import { salvarContatosNoCache, obterContatosDoCache } from '../contatoEmergenciaDatabase';
import { salvarSyncRelogioLocal, obterSyncRelogioLocal } from '../relogioDatabase';
import { salvarTelemetriaLocal, obterTelemetriaLocal } from '../telemetryDatabase';
import { salvarTokens, obterTokens, setSecureStoreAdapter } from '../tokenStorageService';

function criarMockSecureStore() {
  const cofre = new Map<string, string>();
  return {
    cofre,
    isAvailableAsync: async () => true,
    getItemAsync: async (key: string) => (cofre.has(key) ? (cofre.get(key) as string) : null),
    setItemAsync: async (key: string, value: string) => {
      cofre.set(key, String(value));
    },
    deleteItemAsync: async (key: string) => {
      cofre.delete(key);
    },
  };
}

describe('HU-022: Excluir Minha Conta e Meus Dados (Issue #51)', () => {
  describe('Cenário 1: Confirmação com palavra "EXCLUIR" e Comprovante em até 15 dias (RF-015)', () => {
    test('deve validar estritamente a palavra EXCLUIR ignorando maiúsculas e espaços', () => {
      assert.equal(confirmacaoValida('EXCLUIR'), true);
      assert.equal(confirmacaoValida('  excluir  '), true);
      assert.equal(confirmacaoValida('Excluir'), true);
      assert.equal(FRASE_CONFIRMACAO, 'EXCLUIR');

      // Frases inválidas
      assert.equal(confirmacaoValida(''), false);
      assert.equal(confirmacaoValida('cancelar'), false);
      assert.equal(confirmacaoValida('EXCLUIR CONTA'), false);
      assert.equal(confirmacaoValida('SIM'), false);
    });

    test('ao confirmar com EXCLUIR, envia solicitação à API e recebe comprovante com prazo de 15 dias', async () => {
      const payloadEnviado: any[] = [];
      const clienteMock = {
        post: async (rota: string, payload: any) => {
          payloadEnviado.push({ rota, payload });
          return {
            protocolo: 'PROT-EXCLUSAO-20261108-999',
            prazoDias: 15,
            dataSolicitacao: new Date().toISOString(),
          };
        },
      };

      const resultado = await solicitarExclusao('EXCLUIR', {
        cliente: clienteMock as any,
        permitirSimulacao: false,
      });

      assert.equal(resultado.protocolo, 'PROT-EXCLUSAO-20261108-999');
      assert.equal(resultado.prazoDias, PRAZO_COMPROVANTE_DIAS);
      assert.equal(resultado.simulado, false);
      assert.equal(payloadEnviado[0].rota, ROTA_EXCLUSAO);
      assert.deepEqual(payloadEnviado[0].payload, { confirmacao: 'EXCLUIR' });
    });
  });

  describe('Cenário 2: Assinatura Premium Ativa (RN-018)', () => {
    test('com assinatura ativa, a exclusão é bloqueada com mensagem clara de cancelamento', async () => {
      let chamouApi = false;
      const clienteMock = {
        post: async () => {
          chamouApi = true;
          return {};
        },
      };

      await assert.rejects(
        solicitarExclusao('EXCLUIR', {
          assinaturaAtiva: true,
          cliente: clienteMock as any,
        }),
        (erro: any) => {
          assert.ok(erro instanceof ExclusaoError);
          assert.equal(erro.tipo, 'ASSINATURA_ATIVA');
          assert.equal(erro.message, MENSAGENS_EXCLUSAO.ASSINATURA_ATIVA);
          return true;
        }
      );

      assert.equal(chamouApi, false, 'API não deve ser acionada enquanto assinatura estiver ativa');
    });
  });

  describe('Limpeza Local: Apagar SQLite e Tokens após exclusão / encerramento (RN-018 / RF-015)', () => {
    test('executarLimpezaLocalExclusao deve apagar tokens e todos os caches SQLite locais', async () => {
      setSecureStoreAdapter(criarMockSecureStore());
      const idosoId = 'idoso-hu022-teste-limpeza';

      // 1. Popula dados locais simulados (tokens, contatos, relógio, telemetria)
      await salvarTokens({
        accessToken: 'token-teste-exclusao',
        refreshToken: 'refresh-teste-exclusao',
      });
      await salvarContatosNoCache(idosoId, [
        {
          id: 'c1',
          nome: 'Contato Exclusão',
          parentesco: 'Filho',
          telefone: '11999998888',
          ordem: 1,
          whatsapp: true,
          ativo: true,
        },
      ]);
      await salvarSyncRelogioLocal(idosoId, '2026-11-08T00:00:00.000Z');
      await salvarTelemetriaLocal(idosoId, {
        passosHoje: 4500,
        frequenciaCardiaca: 72,
      });

      // Valida que foram armazenados
      assert.equal((await obterTokens()).accessToken, 'token-teste-exclusao');
      assert.equal((await obterContatosDoCache(idosoId)).length, 1);
      assert.notEqual(await obterSyncRelogioLocal(idosoId), null);
      assert.notEqual(await obterTelemetriaLocal(idosoId), null);

      // 2. Executa a limpeza pós-exclusão
      await executarLimpezaLocalExclusao();

      // 3. Valida que tudo foi limpo
      assert.equal((await obterTokens()).accessToken, null);
      assert.equal((await obterTokens()).refreshToken, null);
      assert.equal((await obterContatosDoCache(idosoId)).length, 0);
      assert.equal(await obterSyncRelogioLocal(idosoId), null);
      assert.equal(await obterTelemetriaLocal(idosoId), null);
    });
  });
});
