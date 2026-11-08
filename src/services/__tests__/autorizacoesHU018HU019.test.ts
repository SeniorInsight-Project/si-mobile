import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  statusMonitoramento,
  mensagemParaFamilia,
  tiposAutorizados,
  CONSENTIMENTO_PADRAO,
  type Consentimentos,
} from '../consentimentoService';

describe('HU-018 e HU-019: Autorizações e Revogação no App do Idoso (Issue #50)', () => {
  describe('HU-018: Autorização por tipo e Health Connect (RF-011)', () => {
    it('Cenário 1: deve retornar apenas os tipos autorizados para pedir ao Health Connect', () => {
      const consent: Consentimentos = {
        ...CONSENTIMENTO_PADRAO,
        BATIMENTOS: true,
        PASSOS: true,
        OXIGENACAO: false,
        SONO: false,
      };

      const autorizados = tiposAutorizados(consent);
      assert.deepStrictEqual(autorizados, ['BATIMENTOS', 'PASSOS']);
    });

    it('deve iniciar todos os tipos de saúde desautorizados por padrão (LGPD Art. 11)', () => {
      const autorizados = tiposAutorizados(CONSENTIMENTO_PADRAO);
      assert.strictEqual(autorizados.length, 0);
    });
  });

  describe('HU-019: Revogação e Mensagens para o Familiar', () => {
    it('Cenário 1: revogar passos deve gerar "Semáforo calculado sem dados de passos"', () => {
      const consent: Consentimentos = {
        BATIMENTOS: true,
        PASSOS: false, // Revogado
        SONO: true,
        OXIGENACAO: true,
        LOCALIZACAO: true,
      };

      const status = statusMonitoramento(consent);
      assert.strictEqual(status, 'PARCIAL');

      const msg = mensagemParaFamilia(consent);
      assert.strictEqual(msg, 'Semáforo calculado sem dados de passos');
    });

    it('Cenário 2: revogar todos os tipos deve gerar status PAUSADO e "Monitoramento pausado pelo idoso"', () => {
      const consent: Consentimentos = {
        BATIMENTOS: false,
        PASSOS: false,
        SONO: false,
        OXIGENACAO: false,
        LOCALIZACAO: true, // Localização não é tipo de saúde do semáforo
      };

      const status = statusMonitoramento(consent);
      assert.strictEqual(status, 'PAUSADO');

      const msg = mensagemParaFamilia(consent);
      assert.strictEqual(msg, 'Monitoramento pausado pelo idoso');
    });

    it('com todos os tipos autorizados, deve gerar status ATIVO', () => {
      const consent: Consentimentos = {
        BATIMENTOS: true,
        PASSOS: true,
        SONO: true,
        OXIGENACAO: true,
        LOCALIZACAO: true,
      };

      const status = statusMonitoramento(consent);
      assert.strictEqual(status, 'ATIVO');

      const msg = mensagemParaFamilia(consent);
      assert.strictEqual(msg, 'Semáforo calculado com todos os dados autorizados');
    });
  });
});
