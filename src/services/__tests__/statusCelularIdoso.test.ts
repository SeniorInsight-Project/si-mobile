import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  montarStatusCelular,
  enviarStatusCelular,
  iniciarEnvioStatusCelular,
  ROTA_STATUS_CELULAR,
  type FonteEstadoApp,
} from '../statusCelularIdosoService';
import { ApiError } from '../apiClient';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';
const agora = new Date('2026-11-18T12:00:00.000Z');
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function estadoAppFalso(inicial = 'active') {
  let ouvinte: ((e: string) => void) | null = null;
  const fonte: FonteEstadoApp & { mudar(e: string): void; removido: boolean } = {
    currentState: inicial,
    removido: false,
    addEventListener: (_t, fn) => {
      ouvinte = fn;
      return { remove: () => { fonte.removido = true; ouvinte = null; } };
    },
    mudar: (e) => ouvinte?.(e),
  };
  return fonte;
}

describe('Status do celular do idoso para a família (auditoria 2, item 3b)', () => {
  test('monta o corpo de POST /aparelhos/status com os campos do telemetry', () => {
    const corpo = montarStatusCelular(IDOSO, {
      nivelBateria: 62,
      aparelho: { fabricante: 'samsung', modelo: 'SM-A515F', sistema: 'Android', versaoSistema: '14' },
      versaoApp: '1.0.0',
      agora,
    });
    assert.deepEqual(corpo, {
      idosoId: IDOSO,
      sincronizadoEm: '2026-11-18T12:00:00.000Z',
      nivelBateria: 62,
      modeloCelular: 'samsung SM-A515F',
      sistemaOperacional: 'Android 14',
      versaoApp: '1.0.0',
    });
  });

  test('não repete o fabricante e omite o que o aparelho não informa', () => {
    const corpo = montarStatusCelular(IDOSO, {
      nivelBateria: null,
      aparelho: { fabricante: 'Apple', modelo: 'Apple iPhone 15' },
      agora,
    });
    assert.deepEqual(corpo, { idosoId: IDOSO, sincronizadoEm: agora.toISOString(), modeloCelular: 'Apple iPhone 15' });
  });

  test('envia na rota do gateway e, em erro, não lança (WARN com o status HTTP)', async () => {
    const chamadas: Array<{ caminho: string; corpo: any }> = [];
    const coletar = async () => ({ nivelBateria: 50, aparelho: {}, versaoApp: '1.0.0' });
    const ok = await enviarStatusCelular(IDOSO, {
      cliente: { post: (async (caminho: string, corpo: any) => { chamadas.push({ caminho, corpo }); }) as any },
      coletar,
    });
    assert.equal(ok, true);
    assert.equal(chamadas[0].caminho, '/api/v1/telemetry/aparelhos/status');
    assert.equal(ROTA_STATUS_CELULAR, chamadas[0].caminho);
    assert.equal(chamadas[0].corpo.nivelBateria, 50);

    const falhou = await enviarStatusCelular(IDOSO, {
      cliente: { post: (async () => { throw new ApiError(403, null, '/x'); }) as any },
      coletar,
    });
    assert.equal(falhou, false);
  });

  test('envia ao abrir, a cada intervalo, ao voltar ao primeiro plano; para em segundo plano e ao encerrar', async () => {
    const envios: string[] = [];
    const app = estadoAppFalso('active');
    const parar = iniciarEnvioStatusCelular(IDOSO, {
      enviar: async (id) => { envios.push(id); },
      estadoApp: app,
      intervaloMs: 20,
    });
    assert.equal(envios.length, 1, 'ao abrir');
    await esperar(50);
    const comIntervalo = envios.length;
    assert.ok(comIntervalo >= 2, 'a cada intervalo');

    app.mudar('background');
    await esperar(50);
    assert.equal(envios.length, comIntervalo, 'nada em segundo plano');

    app.mudar('active');
    assert.equal(envios.length, comIntervalo + 1, 'ao voltar ao primeiro plano');

    parar();
    const final = envios.length;
    await esperar(50);
    assert.equal(envios.length, final);
    assert.equal(app.removido, true);
  });

  test('aberto em segundo plano não envia até ficar ativo', () => {
    const envios: string[] = [];
    const app = estadoAppFalso('background');
    const parar = iniciarEnvioStatusCelular(IDOSO, { enviar: async (id) => { envios.push(id); }, estadoApp: app });
    assert.equal(envios.length, 0);
    app.mudar('active');
    assert.equal(envios.length, 1);
    parar();
  });
});
