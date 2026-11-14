import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SEM_BIOMETRIA,
  TEXTO_SEM_DADOS,
  apresentarBiometria,
  carregarBiometriaIdoso,
  type DependenciasBiometria,
} from '../elderlyTelemetryService';
import { salvarConsentimentos, ConsentimentoError, type Consentimentos } from '../consentimentoService';
import { TelemetriaError } from '../telemetriaApi';
import { limparTelemetriaLocal, obterTelemetriaLocal, salvarTelemetriaLocal } from '../telemetriaLocalDatabase';
import type { EstadoAtualLido } from '../mappers/telemetria';

const IDOSO = 'idoso-hu030';
const AGORA = new Date('2026-11-14T15:00:00');
const HOJE_12H = new Date('2026-11-14T12:00:00').toISOString();
const ONTEM_20H = new Date('2026-11-13T20:00:00').toISOString();
const HA_TRES_DIAS = new Date('2026-11-11T12:00:00').toISOString();

const consent = (passos: boolean, batimentos: boolean): Consentimentos => ({
  PASSOS: passos,
  BATIMENTOS: batimentos,
  SONO: false,
  OXIGENACAO: false,
  LOCALIZACAO: false,
});

const estado = (passosHoje: number | null, frequenciaCardiaca: number | null, coletadoEm: string | null): EstadoAtualLido => ({
  idosoId: IDOSO,
  passosHoje,
  progressoPassos: null,
  frequenciaCardiaca,
  coletadoEm,
});

const semRedeConsentimento = async (): Promise<Consentimentos> => {
  throw new ConsentimentoError('Sem internet. Conecte-se e tente de novo.', 'SEM_INTERNET');
};
const semRedeTelemetria = async (): Promise<EstadoAtualLido> => {
  throw new TelemetriaError('Sem internet. Conecte-se e tente de novo.', 'SEM_INTERNET', 0);
};

function deps(over: DependenciasBiometria): DependenciasBiometria {
  return { agora: () => AGORA, ...over };
}

async function capturarAvisos<T>(fn: () => Promise<T>): Promise<{ resultado: T; avisos: string[] }> {
  const original = console.warn;
  const avisos: string[] = [];
  console.warn = (...args: unknown[]) => { avisos.push(args.map(String).join(' ')); };
  try {
    return { resultado: await fn(), avisos };
  } finally {
    console.warn = original;
  }
}

describe('HU-030: passos e batimentos na tela do idoso', () => {
  beforeEach(async () => {
    await limparTelemetriaLocal();
  });

  describe('(a) sem consentimento registrado, nada é exibido', () => {
    test('sem resposta do servidor e sem autorização guardada: nada autorizado e o estado nem é consultado', async () => {
      let consultou = false;
      const { resultado } = await capturarAvisos(() =>
        carregarBiometriaIdoso(IDOSO, deps({
          obterConsentimentos: semRedeConsentimento,
          buscarEstadoAtual: async () => { consultou = true; return estado(2340, 72, HOJE_12H); },
        }))
      );
      assert.deepEqual(resultado, SEM_BIOMETRIA);
      assert.equal(consultou, false);
      const tela = apresentarBiometria(resultado, AGORA);
      assert.equal(tela.passos, null);
      assert.equal(tela.batimentos, null);
    });

    test('sem idoso: nada autorizado', async () => {
      assert.deepEqual(await carregarBiometriaIdoso(null), SEM_BIOMETRIA);
    });

    test('tipo não autorizado não aparece, mesmo que o estado traga o valor', async () => {
      const r = await carregarBiometriaIdoso(IDOSO, deps({
        obterConsentimentos: async () => consent(true, false),
        buscarEstadoAtual: async () => estado(2340, 72, HOJE_12H),
      }));
      assert.equal(r.passosAutorizados, true);
      assert.equal(r.batimentosAutorizados, false);
      assert.equal(r.passosHoje, 2340);
      assert.equal(r.frequenciaCardiaca, null);
      const tela = apresentarBiometria(r, AGORA);
      assert.equal(tela.passos?.valor, (2340).toLocaleString('pt-BR'));
      assert.equal(tela.batimentos, null);
    });

    test('nenhum tipo autorizado: não consulta o estado', async () => {
      let consultou = false;
      const r = await carregarBiometriaIdoso(IDOSO, deps({
        obterConsentimentos: async () => consent(false, false),
        buscarEstadoAtual: async () => { consultou = true; return estado(1, 1, HOJE_12H); },
      }));
      assert.deepEqual(r, SEM_BIOMETRIA);
      assert.equal(consultou, false);
    });

    test('sem internet, usa as últimas autorizações confirmadas e o cache', async () => {
      await carregarBiometriaIdoso(IDOSO, deps({
        obterConsentimentos: async () => consent(true, true),
        buscarEstadoAtual: async () => estado(2340, 72, HOJE_12H),
      }));
      const { resultado } = await capturarAvisos(() =>
        carregarBiometriaIdoso(IDOSO, deps({ obterConsentimentos: semRedeConsentimento, buscarEstadoAtual: semRedeTelemetria }))
      );
      assert.equal(resultado.origem, 'cache');
      assert.equal(resultado.passosHoje, 2340);
      assert.equal(resultado.frequenciaCardiaca, 72);
      assert.equal(resultado.coletadoEm, HOJE_12H);
    });
  });

  describe('(b) nenhum catch vazio', () => {
    test('os arquivos da HU-030 não têm catch vazio nem .catch que engole o erro', () => {
      const arquivos = [
        'src/services/elderlyTelemetryService.ts',
        'src/services/telemetriaCacheService.ts',
        'src/services/telemetriaLocalDatabase.ts',
        'src/services/telemetriaLocalDatabase.native.ts',
        'src/components/ElderlyMetricsCards.tsx',
        'src/screens/ElderlyModeScreen.tsx',
      ];
      const vazios = [
        /catch\s*(\([^)]*\))?\s*\{\s*\}/,
        /\.catch\(\s*\(\s*[\w\s]*\)\s*=>\s*(\{\s*\}|undefined|null)\s*\)/,
      ];
      for (const arquivo of arquivos) {
        const fonte = readFileSync(arquivo, 'utf8');
        for (const padrao of vazios) assert.equal(padrao.test(fonte), false, `${arquivo} tem ${padrao}`);
      }
    });

    test('falha de consentimento e de telemetria é registrada, só com o código do erro', async () => {
      await salvarTelemetriaLocal({
        idosoId: IDOSO, passosHoje: 2340, frequenciaCardiaca: 72, coletadoEm: HOJE_12H, consentimento: { passos: true, batimentos: true },
      });
      const { avisos } = await capturarAvisos(() =>
        carregarBiometriaIdoso(IDOSO, deps({ obterConsentimentos: semRedeConsentimento, buscarEstadoAtual: semRedeTelemetria }))
      );
      assert.equal(avisos.length, 2);
      assert.ok(avisos.every((a) => a.includes('SEM_INTERNET')));
      assert.ok(avisos.every((a) => !a.includes('2340') && !a.includes(IDOSO)));
    });
  });

  describe('(c) sem leitura, a tela mostra "Sem dados"', () => {
    test('servidor sem leitura: null, sem hora e "Sem dados" nos dois cartões', async () => {
      const r = await carregarBiometriaIdoso(IDOSO, deps({
        obterConsentimentos: async () => consent(true, true),
        buscarEstadoAtual: async () => estado(null, null, null),
      }));
      assert.equal(r.passosHoje, null);
      assert.equal(r.frequenciaCardiaca, null);
      assert.equal(r.coletadoEm, null);
      const tela = apresentarBiometria(r, AGORA);
      assert.equal(tela.passos?.valor, TEXTO_SEM_DADOS);
      assert.equal(tela.batimentos?.valor, TEXTO_SEM_DADOS);
      assert.equal(tela.batimentos?.unidade, null);
      assert.equal(tela.atualizacao, null);
    });

    test('sem internet e sem cache: nada de 0 nem de "atualizado agora"', async () => {
      await salvarTelemetriaLocal({ idosoId: IDOSO, passosHoje: null, frequenciaCardiaca: null, coletadoEm: null, consentimento: { passos: true, batimentos: true } });
      const { resultado } = await capturarAvisos(() =>
        carregarBiometriaIdoso(IDOSO, deps({ obterConsentimentos: semRedeConsentimento, buscarEstadoAtual: semRedeTelemetria }))
      );
      assert.equal(resultado.passosAutorizados, true);
      assert.equal(resultado.passosHoje, null);
      assert.equal(resultado.frequenciaCardiaca, null);
      assert.equal(resultado.coletadoEm, null);
      assert.equal(resultado.origem, 'nenhuma');
    });

    test('a hora mostrada é a da leitura, não a do aparelho', async () => {
      const r = await carregarBiometriaIdoso(IDOSO, deps({
        obterConsentimentos: async () => consent(true, true),
        buscarEstadoAtual: async () => estado(2340, 72, HOJE_12H),
      }));
      assert.equal(r.coletadoEm, HOJE_12H);
      assert.equal(apresentarBiometria(r, AGORA).atualizacao, 'Atualizado às 12:00');
    });

    test('passos guardados de ontem não viram "passos hoje"', async () => {
      await salvarTelemetriaLocal({
        idosoId: IDOSO, passosHoje: 5000, frequenciaCardiaca: 70, coletadoEm: ONTEM_20H, consentimento: { passos: true, batimentos: true },
      });
      const { resultado } = await capturarAvisos(() =>
        carregarBiometriaIdoso(IDOSO, deps({ obterConsentimentos: semRedeConsentimento, buscarEstadoAtual: semRedeTelemetria }))
      );
      assert.equal(resultado.passosHoje, null);
      assert.equal(resultado.frequenciaCardiaca, 70);
      assert.equal(apresentarBiometria(resultado, AGORA).passos?.valor, TEXTO_SEM_DADOS);
    });

    test('leitura com mais de 48 h vale como sem dados', () => {
      const tela = apresentarBiometria(
        { passosAutorizados: true, batimentosAutorizados: true, passosHoje: 100, frequenciaCardiaca: 80, coletadoEm: HA_TRES_DIAS, origem: 'cache' },
        AGORA
      );
      assert.equal(tela.passos?.valor, TEXTO_SEM_DADOS);
      assert.equal(tela.batimentos?.valor, TEXTO_SEM_DADOS);
      assert.equal(tela.atualizacao, null);
    });
  });

  describe('(d) revogar o consentimento apaga o cache', () => {
    async function popularCache() {
      await carregarBiometriaIdoso(IDOSO, deps({
        obterConsentimentos: async () => consent(true, true),
        buscarEstadoAtual: async () => estado(2340, 72, HOJE_12H),
      }));
      const antes = await obterTelemetriaLocal(IDOSO);
      assert.equal(antes?.passosHoje, 2340);
      assert.equal(antes?.frequenciaCardiaca, 72);
    }

    test('salvar com PASSOS revogado apaga os passos do cache e mantém os batimentos', async () => {
      await popularCache();
      const cliente = { get: (async () => ({})) as any, put: (async (_: string, corpo: unknown) => corpo) as any };
      await salvarConsentimentos(IDOSO, consent(false, true), { cliente });
      const depois = await obterTelemetriaLocal(IDOSO);
      assert.equal(depois?.passosHoje, null);
      assert.equal(depois?.frequenciaCardiaca, 72);
      assert.deepEqual(depois?.consentimento, { passos: false, batimentos: true });
    });

    test('revogação vinda do servidor apaga o tipo, e sem internet ele não volta do cache', async () => {
      await popularCache();
      const { resultado } = await capturarAvisos(() =>
        carregarBiometriaIdoso(IDOSO, deps({ obterConsentimentos: async () => consent(true, false), buscarEstadoAtual: semRedeTelemetria }))
      );
      assert.equal(resultado.batimentosAutorizados, false);
      assert.equal(resultado.frequenciaCardiaca, null);
      assert.equal((await obterTelemetriaLocal(IDOSO))?.frequenciaCardiaca, null);

      const offline = await capturarAvisos(() =>
        carregarBiometriaIdoso(IDOSO, deps({ obterConsentimentos: semRedeConsentimento, buscarEstadoAtual: semRedeTelemetria }))
      );
      assert.equal(offline.resultado.batimentosAutorizados, false);
      assert.equal(offline.resultado.frequenciaCardiaca, null);
      assert.equal(offline.resultado.passosHoje, 2340);
    });

    test('revogar tudo apaga os valores e a hora da leitura', async () => {
      await popularCache();
      const cliente = { get: (async () => ({})) as any, put: (async (_: string, corpo: unknown) => corpo) as any };
      await salvarConsentimentos(IDOSO, consent(false, false), { cliente });
      const depois = await obterTelemetriaLocal(IDOSO);
      assert.equal(depois?.passosHoje, null);
      assert.equal(depois?.frequenciaCardiaca, null);
      assert.equal(depois?.coletadoEm, null);
      const { resultado } = await capturarAvisos(() =>
        carregarBiometriaIdoso(IDOSO, deps({ obterConsentimentos: semRedeConsentimento, buscarEstadoAtual: semRedeTelemetria }))
      );
      assert.deepEqual(resultado, SEM_BIOMETRIA);
    });
  });
});
