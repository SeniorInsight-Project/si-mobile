import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const push = readFileSync('src/services/pushService.ts', 'utf8');
const medicamento = readFileSync('src/services/notificacaoMedicamentoService.ts', 'utf8');

describe('Canais de notificação no Android (auditoria 2, item 5)', () => {
  test("nenhum canal usa sound: 'default' (em canal, sound é arquivo de res/raw; omitir já dá o som padrão)", () => {
    assert.ok(!/sound:\s*'default'/.test(push));
    assert.ok(!/sound:\s*'default'/.test(medicamento));
  });

  test('configurarCanaisPush tem try/catch próprio: erro de canal não impede o registro do token', () => {
    const inicio = push.indexOf('export async function inicializarPushUsuario');
    const corpo = push.slice(inicio, push.indexOf('export function registrarOuvinteToqueNotificacao'));
    assert.match(corpo, /try \{\s*await configurarCanaisPush\(notif\);\s*\} catch/);
    assert.ok(corpo.indexOf('configurarCanaisPush') < corpo.indexOf('registrarTokenPush'));
  });
});
