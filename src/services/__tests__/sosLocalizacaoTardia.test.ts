import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enfileirarSos,
  iniciarCicloEnvio,
  atualizarLocalizacaoSos,
  obterRegistroSos,
  cancelarFilaSos,
  descartarFilaSosEmMemoria,
  definirRedeFilaSosParaTestes,
} from '../sosQueueService';
import { nivelEmPercentual } from '../bateriaService';
import { ApiError } from '../apiClient';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';
const ALARME = '33333333-3333-4333-8333-333333333333';
const esperar = (ms = 5) => new Promise((r) => setTimeout(r, ms));

interface Chamada { tipo: 'POST' | 'PATCH'; corpo: any }

/** Servidor falso: o POST devolve o alarme com o que recebeu (ou o primeiro, num reenvio idempotente). */
function servidor({ postFalhas = 0, patchErros = [] as unknown[] } = {}) {
  const chamadas: Chamada[] = [];
  let primeiro: any = null;
  definirRedeFilaSosParaTestes(
    {
      dispararSos: async (_id, corpo: any) => {
        chamadas.push({ tipo: 'POST', corpo });
        if (postFalhas-- > 0) throw new ApiError(0, null, '/sos');
        primeiro ??= { id: ALARME, status: 'DISPARADO', latitude: corpo.latitude ?? null, longitude: corpo.longitude ?? null };
        return primeiro;
      },
      enviarLocalizacaoSos: async (_id, corpo) => {
        chamadas.push({ tipo: 'PATCH', corpo });
        const erro = patchErros.shift();
        if (erro) throw erro;
        return { id: ALARME, ...corpo } as any;
      },
    },
    5
  );
  return chamadas;
}

describe('SOS sai sem esperar o GPS e a posição vai depois (auditoria 2, item 1)', () => {
  beforeEach(() => descartarFilaSosEmMemoria());
  afterEach(() => {
    descartarFilaSosEmMemoria();
    definirRedeFilaSosParaTestes(null);
  });

  test('posição que chega depois do POST vai por PATCH /sos/{id}/localizacao', async () => {
    const chamadas = servidor();
    const r = await enfileirarSos(IDOSO, { nivelBateria: 77 });
    await iniciarCicloEnvio(r.idempotencyKey);
    await esperar();
    assert.deepEqual(chamadas.map((c) => c.tipo), ['POST']);
    assert.equal(chamadas[0].corpo.latitude, null);
    assert.equal(chamadas[0].corpo.nivelBateria, 77);

    await atualizarLocalizacaoSos(r.idempotencyKey, { latitude: -23.5, longitude: -46.6 });
    await esperar();
    assert.deepEqual(chamadas[1], { tipo: 'PATCH', corpo: { latitude: -23.5, longitude: -46.6 } });
    assert.equal(obterRegistroSos(r.idempotencyKey)?.localizacaoEnviada, true);
  });

  test('fila offline: posição que chega antes do reenvio vai no POST e, se o servidor devolve o alarme sem ela, por PATCH', async () => {
    const chamadas = servidor({ postFalhas: 1 });
    const r = await enfileirarSos(IDOSO, {});
    await iniciarCicloEnvio(r.idempotencyKey);
    await esperar();
    await atualizarLocalizacaoSos(r.idempotencyKey, { latitude: -22.9, longitude: -43.2 });
    // O reenvio da fila acontece em 5 s; não espera: dispara de novo manualmente com a mesma chave.
    await iniciarCicloEnvio(r.idempotencyKey);
    await esperar();
    const posts = chamadas.filter((c) => c.tipo === 'POST');
    assert.equal(posts.at(-1)?.corpo.latitude, -22.9);
    assert.equal(chamadas.filter((c) => c.tipo === 'PATCH').length, 0, 'o POST já levou a posição');
  });

  test('posição que chega durante o POST (servidor responde sem ela) vai por PATCH logo depois', async () => {
    const chamadas: Chamada[] = [];
    definirRedeFilaSosParaTestes({
      dispararSos: async (_id, corpo: any) => {
        chamadas.push({ tipo: 'POST', corpo });
        await esperar(20);
        return { id: ALARME, status: 'DISPARADO', latitude: null, longitude: null } as any;
      },
      enviarLocalizacaoSos: async (_id, corpo) => {
        chamadas.push({ tipo: 'PATCH', corpo });
        return { id: ALARME, ...corpo } as any;
      },
    });
    const r = await enfileirarSos(IDOSO, {});
    await iniciarCicloEnvio(r.idempotencyKey);
    await atualizarLocalizacaoSos(r.idempotencyKey, { latitude: 1, longitude: 2 });
    assert.deepEqual(chamadas.map((c) => c.tipo), ['POST'], 'sem id do alarme ainda, nada de PATCH');
    await esperar(40);
    assert.deepEqual(chamadas.map((c) => c.tipo), ['POST', 'PATCH']);
    assert.deepEqual(chamadas[1].corpo, { latitude: 1, longitude: 2 });
  });

  test('PATCH sem rede é repetido; 4xx (rota ainda não publicada) não', async () => {
    const chamadas = servidor({ patchErros: [new ApiError(0, null, '/x')] });
    const r = await enfileirarSos(IDOSO, {});
    await iniciarCicloEnvio(r.idempotencyKey);
    await esperar();
    await atualizarLocalizacaoSos(r.idempotencyKey, { latitude: 5, longitude: 6 });
    await esperar(30);
    assert.equal(chamadas.filter((c) => c.tipo === 'PATCH').length, 2);
    assert.equal(obterRegistroSos(r.idempotencyKey)?.localizacaoEnviada, true);

    descartarFilaSosEmMemoria();
    const c2 = servidor({ patchErros: [new ApiError(404, null, '/x')] });
    const r2 = await enfileirarSos(IDOSO, {});
    await iniciarCicloEnvio(r2.idempotencyKey);
    await esperar();
    await atualizarLocalizacaoSos(r2.idempotencyKey, { latitude: 5, longitude: 6 });
    await esperar(30);
    assert.equal(c2.filter((c) => c.tipo === 'PATCH').length, 1);
  });

  test('SOS cancelado não manda posição', async () => {
    const chamadas = servidor();
    const r = await enfileirarSos(IDOSO, {});
    await iniciarCicloEnvio(r.idempotencyKey);
    await esperar();
    await cancelarFilaSos(r.idempotencyKey);
    await atualizarLocalizacaoSos(r.idempotencyKey, { latitude: 5, longitude: 6 });
    await esperar();
    assert.equal(chamadas.filter((c) => c.tipo === 'PATCH').length, 0);
  });

  test('bateria: fração do expo-battery vira %, e -1 (desconhecido) vira null', () => {
    assert.equal(nivelEmPercentual(0.774), 77);
    assert.equal(nivelEmPercentual(1), 100);
    assert.equal(nivelEmPercentual(-1), null);
    assert.equal(nivelEmPercentual(undefined), null);
  });
});
