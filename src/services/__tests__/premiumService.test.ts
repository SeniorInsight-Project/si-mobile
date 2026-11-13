import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../apiClient';
import {
  PremiumError,
  ROTA_DIREITO_PREMIUM,
  avisoFimTrial,
  comparativoPlanos,
  formatarFaixaTrial,
  obterDireitoPremium,
  recursosVitaisSempreLiberados,
  type DireitoPremium,
} from '../premiumService';

describe('Teste grátis e Premium — HU-040 a HU-042 / RN-014 (Issue #59)', () => {
  const mockOriginal = process.env.EXPO_PUBLIC_USAR_MOCK;

  test('fora do mock, falha ao consultar direito do billing lança PremiumError sem assumir PREMIUM', async () => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
    try {
      const clienteFalha = {
        get: async <T>(): Promise<T> => {
          throw new ApiError(404, 'Not Found', ROTA_DIREITO_PREMIUM);
        },
      };
      await assert.rejects(
        () => obterDireitoPremium({ cliente: clienteFalha }),
        (err: unknown) => err instanceof PremiumError && err.message.includes('Não foi possível verificar seu plano')
      );
    } finally {
      process.env.EXPO_PUBLIC_USAR_MOCK = mockOriginal;
    }
  });

  test('HU-040 Cenário 1: formata faixa "Premium grátis até DD/MM"', () => {
    const direito: DireitoPremium = {
      status: 'TRIAL',
      premiumLiberado: true,
      trialDisponivel: false,
      trialExpiraEm: '2026-11-15T12:00:00Z',
      precoMensalTexto: null,
    };
    assert.equal(formatarFaixaTrial(direito), 'Premium grátis até 15/11');
  });

  test('HU-042 Cenários 1 e 2: avisa 3 dias e 1 dia antes do fim do teste; não avisa se já assinou PREMIUM', () => {
    const expira = Date.UTC(2026, 10, 15, 12, 0, 0);
    const trial: DireitoPremium = {
      status: 'TRIAL',
      premiumLiberado: true,
      trialDisponivel: false,
      trialExpiraEm: new Date(expira).toISOString(),
      precoMensalTexto: null,
    };

    const em12Nov = Date.UTC(2026, 10, 12, 12, 0, 0);
    assert.equal(avisoFimTrial(trial, em12Nov), 'Seu Premium grátis termina em 3 dias');

    const em14Nov = Date.UTC(2026, 10, 14, 12, 0, 0);
    assert.equal(avisoFimTrial(trial, em14Nov), 'Seu Premium grátis termina em 1 dia');

    const assinado: DireitoPremium = { ...trial, status: 'PREMIUM' };
    assert.equal(avisoFimTrial(assinado, em12Nov), null);
  });

  test('HU-041 Cenário 2: beneficiário B2B exibe "Premium incluso pelo seu plano de saúde"', () => {
    const b2b: DireitoPremium = {
      status: 'BENEFICIARIO_B2B',
      premiumLiberado: true,
      trialDisponivel: false,
      trialExpiraEm: null,
      precoMensalTexto: null,
    };
    const comp = comparativoPlanos(b2b);
    assert.equal(comp.mensagemB2B, 'Premium incluso pelo seu plano de saúde');
  });

  test('RN-014: SOS, perda de dados, bateria baixa e lembrete de remédio permanecem livres em qualquer estado do plano', () => {
    const free: DireitoPremium = {
      status: 'FREE',
      premiumLiberado: false,
      trialDisponivel: false,
      trialExpiraEm: null,
      precoMensalTexto: 'R$ 29,90/mês',
    };

    for (const estado of [null, free]) {
      const vitais = recursosVitaisSempreLiberados(estado);
      assert.equal(vitais.sos, true);
      assert.equal(vitais.perdaDados, true);
      assert.equal(vitais.bateriaBaixa, true);
      assert.equal(vitais.lembreteRemedio, true);
    }
  });
});
