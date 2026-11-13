import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANAL_ALERTAS,
  CANAL_SOS,
  ROTA_PUSH_TOKENS,
  canalParaTipoAlerta,
  confirmarLeituraNotificacao,
  registrarOuvinteToqueNotificacao,
  registrarTokenPush,
  removerTokenPush,
  resolverDestinoNotificacao,
  rotaConfirmarLeitura,
  rotaRemoverPushToken,
} from '../pushService';
import { descreverLocalizacao, mapearAlarme } from '../sosRecebidoService';

function clienteMock(respostas: Record<string, unknown> = {}) {
  const chamadas: Array<{ metodo: string; caminho: string; corpo?: unknown }> = [];
  const exec = (metodo: string) => async <T>(caminho: string, corpo?: unknown): Promise<T> => {
    chamadas.push({ metodo, caminho, corpo });
    const r = respostas[`${metodo} ${caminho}`];
    if (r instanceof Error) throw r;
    return r as T;
  };
  return {
    chamadas,
    put: exec('PUT'),
    post: exec('POST'),
    delete: exec('DELETE'),
  };
}

describe('Push e Notificações — contrato notification-v1 (Issues #29 / #58)', () => {
  test('RN-017: SOS e CRITICO usam canal prioritário "sos"; ATENCAO e TECNICO usam "alertas"', () => {
    assert.equal(canalParaTipoAlerta('SOS'), CANAL_SOS);
    assert.equal(canalParaTipoAlerta('CRITICO'), CANAL_SOS);
    assert.equal(canalParaTipoAlerta('ATENCAO'), CANAL_ALERTAS);
    assert.equal(canalParaTipoAlerta('TECNICO'), CANAL_ALERTAS);
    assert.equal(canalParaTipoAlerta(null), CANAL_ALERTAS);
  });

  test('registrarTokenPush envia PUT /api/v1/notification/push-tokens com RegistrarTokenPushRequest', async () => {
    const c = clienteMock({
      [`PUT ${ROTA_PUSH_TOKENS}`]: {
        identificadorAparelho: 'device-1',
        plataforma: 'ANDROID',
        atualizadoEm: '2026-11-13T17:00:00Z',
      },
    });

    const res = await registrarTokenPush(
      { token: 'fcm-token-abc', identificadorAparelho: 'device-1', plataforma: 'ANDROID' },
      { cliente: c }
    );

    assert.equal(c.chamadas.length, 1);
    assert.equal(c.chamadas[0].metodo, 'PUT');
    assert.equal(c.chamadas[0].caminho, ROTA_PUSH_TOKENS);
    assert.deepEqual(c.chamadas[0].corpo, {
      token: 'fcm-token-abc',
      identificadorAparelho: 'device-1',
      plataforma: 'ANDROID',
    });
    assert.equal(res.identificadorAparelho, 'device-1');
  });

  test('removerTokenPush envia DELETE /api/v1/notification/push-tokens/{identificadorAparelho}', async () => {
    const c = clienteMock();
    await removerTokenPush('device/1', { cliente: c });
    assert.equal(c.chamadas.length, 1);
    assert.equal(c.chamadas[0].metodo, 'DELETE');
    assert.equal(c.chamadas[0].caminho, rotaRemoverPushToken('device/1'));
    assert.equal(c.chamadas[0].caminho, '/api/v1/notification/push-tokens/device%2F1');
  });

  test('confirmarLeituraNotificacao envia POST /api/v1/notification/notificacoes/{id}/leitura', async () => {
    const c = clienteMock();
    await confirmarLeituraNotificacao('notif-123', { cliente: c });
    assert.equal(c.chamadas.length, 1);
    assert.equal(c.chamadas[0].metodo, 'POST');
    assert.equal(c.chamadas[0].caminho, rotaConfirmarLeitura('notif-123'));
  });

  test('resolverDestinoNotificacao roteia SOS para SosReceived e alertas para Alerts', () => {
    assert.deepEqual(
      resolverDestinoNotificacao({
        tipo: 'SOS',
        alarmeId: 'alarme-1',
        idosoId: 'idoso-1',
        notificacaoId: 'n-1',
      }),
      {
        tela: 'SosReceived',
        alarmeId: 'alarme-1',
        idosoId: 'idoso-1',
        notificacaoId: 'n-1',
      }
    );

    assert.deepEqual(
      resolverDestinoNotificacao({
        tipo: 'CRITICO',
        idosoId: 'idoso-1',
        id: 'n-2',
      }),
      {
        tela: 'Alerts',
        idosoId: 'idoso-1',
        notificacaoId: 'n-2',
      }
    );

    assert.equal(resolverDestinoNotificacao(null), null);
  });

  test('registrarOuvinteToqueNotificacao confirma leitura no back e navega para a tela certa', async () => {
    const c = clienteMock();
    let listenerFn: ((res: any) => void) | undefined;
    let removido = false;
    const notifMock = {
      addNotificationResponseReceivedListener: (fn: (res: any) => void) => {
        listenerFn = fn;
        return { remove: () => { removido = true; } };
      },
    };

    const destinos: any[] = [];
    const desinscrever = registrarOuvinteToqueNotificacao(
      (d) => destinos.push(d),
      { cliente: c, notif: notifMock }
    );

    if (!listenerFn) throw new Error('listener não registrado');
    listenerFn({
      notification: {
        request: {
          content: {
            data: { tipo: 'SOS', alarmeId: 'sos-99', idosoId: 'id-1', notificacaoId: 'notif-99' },
          },
        },
      },
    });

    await new Promise((r) => setTimeout(r, 10));
    assert.equal(destinos.length, 1);
    assert.equal(destinos[0].tela, 'SosReceived');
    assert.equal(destinos[0].alarmeId, 'sos-99');
    assert.equal(c.chamadas[0].caminho, '/api/v1/notification/notificacoes/notif-99/leitura');

    desinscrever();
    assert.equal(removido, true);
  });

  test('SOS sem localização exibe "Localização indisponível" e orienta ligar para o idoso', () => {
    const alarme = mapearAlarme({
      id: 'sos-1',
      idosoId: 'idoso-1',
      nomeIdoso: 'Dona Maria',
      status: 'DISPARADO',
      criadoEm: '2026-11-13T14:00:00Z',
      latitude: null,
      longitude: null,
    });

    const desc = descreverLocalizacao(alarme);
    assert.equal(desc.disponivel, false);
    assert.equal(desc.titulo, 'Localização indisponível');
    assert.ok(desc.detalhe.includes('Dona Maria'));
  });
});
