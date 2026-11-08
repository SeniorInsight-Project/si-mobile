import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  avaliarConexaoRelogio,
  mapearPermissoesPorConsentimento,
  calcularEsperaExponencial,
  descartarDuplicadas,
  sincronizarTelemetriaWearable,
  MENSAGEM_HEALTH_CONNECT_AUSENTE,
  type ConexaoRelogioInfo,
  type LeituraTelemetriaItem,
} from '../openWearablesService';
import { CONSENTIMENTO_PADRAO, type Consentimentos } from '../consentimentoService';

describe('HU-023: Conectar o App ao Relógio pelo Health Connect / Open Wearables (Issue #52)', () => {
  const AGORA = new Date(2026, 10, 8, 14, 30, 0).getTime();
  const horasAtras = (h: number) => AGORA - h * 3600 * 1000;

  describe('Cenário 1: Sucesso - Relógio Conectado com Dados Recentes (RF-016 / RF-020)', () => {
    test('deve retornar "Relógio conectado" e a hora da última medição quando há leitura recente', () => {
      const conexao: ConexaoRelogioInfo = {
        healthConnectInstalado: true,
        permissoesConcedidas: true,
        leituraSegundoPlanoAtiva: true,
        ultimaMedicaoMs: horasAtras(1), // Medição há 1 hora
      };

      const resultado = avaliarConexaoRelogio(conexao, AGORA);
      assert.equal(resultado.cenario, 1);
      assert.equal(resultado.titulo, 'Relógio conectado');
      assert.equal(resultado.cor, 'verde');
      assert.equal(resultado.icone, 'check_circle');
      assert.equal(resultado.acao, 'CONECTADO');
      assert.match(resultado.mensagem, /Última medição às 13:30/);
    });
  });

  describe('Cenário 2: Health Connect Ausente (RF-011)', () => {
    test('deve explicar o motivo e orientar instalação quando Health Connect não está instalado', () => {
      const conexao: ConexaoRelogioInfo = {
        healthConnectInstalado: false,
        permissoesConcedidas: false,
        leituraSegundoPlanoAtiva: false,
        ultimaMedicaoMs: null,
      };

      const resultado = avaliarConexaoRelogio(conexao, AGORA);
      assert.equal(resultado.cenario, 2);
      assert.equal(resultado.titulo, 'Health Connect não instalado');
      assert.equal(resultado.mensagem, MENSAGEM_HEALTH_CONNECT_AUSENTE);
      assert.equal(resultado.cor, 'laranja');
      assert.equal(resultado.acao, 'INSTALAR');
    });

    test('deve solicitar apenas os tipos que o idoso autorizou (RF-011 / HU-018)', () => {
      const consent: Consentimentos = {
        ...CONSENTIMENTO_PADRAO,
        BATIMENTOS: true,
        PASSOS: true,
        OXIGENACAO: false,
        SONO: false,
        LOCALIZACAO: true, // Localização não é permissão do Health Connect
      };

      const permissoes = mapearPermissoesPorConsentimento(consent);
      assert.equal(permissoes.length, 2);
      assert.ok(permissoes.includes('androidx.health.permission.HeartRate'));
      assert.ok(permissoes.includes('androidx.health.permission.Steps'));
      assert.ok(!permissoes.includes('androidx.health.permission.OxygenSaturation'));
      assert.ok(!permissoes.includes('androidx.health.permission.SleepSession'));
    });
  });

  describe('Cenário 3: Sem Dados Recentes nas Últimas 24 Horas', () => {
    test('deve instruir "Abra o app do seu relógio e sincronize" quando não há dados nas últimas 24h', () => {
      const conexao: ConexaoRelogioInfo = {
        healthConnectInstalado: true,
        permissoesConcedidas: true,
        leituraSegundoPlanoAtiva: true,
        ultimaMedicaoMs: horasAtras(25), // 25 horas sem dados
      };

      const resultado = avaliarConexaoRelogio(conexao, AGORA);
      assert.equal(resultado.cenario, 3);
      assert.equal(resultado.titulo, 'Abra o app do seu relógio e sincronize');
      assert.equal(resultado.cor, 'laranja');
      assert.equal(resultado.icone, 'sync_problem');
      assert.equal(resultado.acao, 'SINCRONIZAR_RELOGIO');
      assert.match(resultado.mensagem, /Sem medição nas últimas 24 h/);
    });
  });

  describe('RF-017, RF-018 & RF-020: Sincronização, Marcador, Backoff e Metadados do Coletor', () => {
    test('RF-017: marcador da última sincronização só avança após resposta 2xx da API', async () => {
      let rotaChamada = '';
      let payloadEnviado: any = null;

      const clienteSucesso = {
        post: async (rota: string, payload: any) => {
          rotaChamada = rota;
          payloadEnviado = payload;
          return { status: 201 };
        },
      };

      const payloadBase = {
        idoso_id: 'idoso-123',
        device_id: 'watch-redmi-01',
        device_model: 'Redmi Watch 4',
        provider: 'HEALTH_CONNECT',
        timestamp: new Date().toISOString(),
        steps: { count: 3500 },
        heart_rate: { bpm: 75 },
        metadata: {
          versao_app: '1.0.0',
          bateria_celular: 90,
          horario_sincronizacao: new Date().toISOString(),
        },
      };

      const res = await sincronizarTelemetriaWearable('idoso-123', payloadBase, {
        cliente: clienteSucesso,
        bateriaCelular: 85,
        versaoApp: '1.0.0',
        marcadorAnterior: '2026-11-08T10:00:00Z',
      });

      assert.equal(res.sucesso, true);
      assert.notEqual(res.novoMarcador, null);
      assert.notEqual(res.novoMarcador, '2026-11-08T10:00:00Z');
      assert.equal(rotaChamada, '/api/v1/idosos/idoso-123/telemetria-wearable');

      // RF-020: Verifica inclusão obrigatória de bateria do celular, versão do app e horário
      assert.equal(payloadEnviado.metadata.bateria_celular, 85);
      assert.equal(payloadEnviado.metadata.versao_app, '1.0.0');
      assert.ok(payloadEnviado.metadata.horario_sincronizacao);
    });

    test('RF-018: falha na sincronização não avança o marcador e agenda reenvio com espera exponencial', async () => {
      const clienteFalha = {
        post: async () => {
          throw new Error('Falha de conexão com gateway');
        },
      };

      const payloadBase = {
        idoso_id: 'idoso-123',
        device_id: 'watch-redmi-01',
        device_model: 'Redmi Watch 4',
        provider: 'HEALTH_CONNECT',
        timestamp: new Date().toISOString(),
        metadata: {
          versao_app: '1.0.0',
          bateria_celular: 80,
          horario_sincronizacao: new Date().toISOString(),
        },
      };

      const res = await sincronizarTelemetriaWearable('idoso-123', payloadBase, {
        cliente: clienteFalha,
        marcadorAnterior: 'marcador-estavel-123',
      });

      assert.equal(res.sucesso, false);
      assert.equal(res.novoMarcador, 'marcador-estavel-123'); // Marcador não avançou
      assert.equal(res.reenvioAgendado, true);
      assert.ok(res.esperaProximaTentativaMs! > 0);
    });

    test('RF-018: cálculo de espera exponencial dobra a cada tentativa com teto limite', () => {
      assert.equal(calcularEsperaExponencial(1, 1000, 30000), 1000); // 1s
      assert.equal(calcularEsperaExponencial(2, 1000, 30000), 2000); // 2s
      assert.equal(calcularEsperaExponencial(3, 1000, 30000), 4000); // 4s
      assert.equal(calcularEsperaExponencial(4, 1000, 30000), 8000); // 8s
      assert.equal(calcularEsperaExponencial(5, 1000, 30000), 16000); // 16s
      assert.equal(calcularEsperaExponencial(6, 1000, 30000), 30000); // Limite teto 30s
    });

    test('RF-019: descarta medições duplicadas pela chave idoso + tipo + horário + origem', () => {
      const idosoId = 'idoso-dedup-01';
      const leituras: LeituraTelemetriaItem[] = [
        { tipo: 'BATIMENTOS', valor: 72, timestamp: '2026-11-08T14:00:00Z', origem: 'HEALTH_CONNECT' },
        { tipo: 'BATIMENTOS', valor: 72, timestamp: '2026-11-08T14:00:00Z', origem: 'HEALTH_CONNECT' }, // Duplicada
        { tipo: 'PASSOS', valor: 120, timestamp: '2026-11-08T14:00:00Z', origem: 'HEALTH_CONNECT' },
        { tipo: 'BATIMENTOS', valor: 74, timestamp: '2026-11-08T14:01:00Z', origem: 'HEALTH_CONNECT' },
      ];

      const filtradas = descartarDuplicadas(leituras, idosoId);
      assert.equal(filtradas.length, 3);
      assert.equal(filtradas[0].valor, 72);
      assert.equal(filtradas[1].tipo, 'PASSOS');
      assert.equal(filtradas[2].valor, 74);
    });
  });
});
