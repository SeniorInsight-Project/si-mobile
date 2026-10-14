import { dispararSos } from './alarmeSosService.js';
import { listarContatos } from './contatoEmergenciaService.js';
import { getSosDatabase } from './sosDatabase.js';

let expoCrypto = null;
const memoriaFila = new Map();
const activeJobs = new Map();

const JANELA_MAXIMA_MS = 60000; // 60 segundos conforme HU-063 / RF-040
const INTERVALO_RETRY_MS = 5000; // Tentativas a cada 5 segundos

function getCryptoModule() {
  if (expoCrypto !== null) return expoCrypto;
  try {
    expoCrypto = require('expo-crypto');
  } catch (e) {
    expoCrypto = false;
  }
  return expoCrypto;
}

function gerarUUID() {
  const mod = getCryptoModule();
  if (mod && typeof mod.randomUUID === 'function') {
    return mod.randomUUID();
  }
  try {
    const nodeCrypto = require('crypto');
    return nodeCrypto.randomUUID();
  } catch (e) {
    return 'sos-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  }
}

/**
 * Inicializa a conexão SQLite nativa ou fallback em memória.
 */
async function getDb() {
  try {
    return await getSosDatabase();
  } catch (err) {
    return null;
  }
}


/**
 * Enfileira um disparo de SOS no SQLite e memória com chave de idempotência única.
 */
export async function enfileirarSos(idosoId, dados = {}) {
  const idempotencyKey = dados.idempotencyKey || gerarUUID();
  const criadoEm = Date.now();
  const registro = {
    idempotencyKey,
    idosoId,
    latitude: dados.latitude ?? null,
    longitude: dados.longitude ?? null,
    nivelBateria: dados.nivelBateria ?? null,
    observacao: dados.observacao || 'Botão SOS acionado no aplicativo móvel.',
    status: 'PENDENTE',
    criadoEm,
    tentativas: 0,
    ultimoErro: null,
  };

  memoriaFila.set(idempotencyKey, registro);

  const db = await getDb();
  if (db) {
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO sos_fila 
         (idempotency_key, idoso_id, latitude, longitude, nivel_bateria, observacao, status, criado_em, tentativas, ultimo_erro)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          registro.idempotencyKey,
          registro.idosoId,
          registro.latitude,
          registro.longitude,
          registro.nivelBateria,
          registro.observacao,
          registro.status,
          registro.criadoEm,
          registro.tentativas,
          registro.ultimoErro,
        ]
      );
    } catch (err) {
      console.warn('[sosQueueService] Falha ao salvar no SQLite:', err.message);
    }
  }

  return registro;
}

/**
 * Atualiza o status do registro no SQLite e memória.
 */
async function atualizarStatusRegistro(idempotencyKey, novoStatus, tentativas, ultimoErro = null) {
  const atual = memoriaFila.get(idempotencyKey) || {};
  const atualizado = {
    ...atual,
    status: novoStatus,
    tentativas,
    ultimoErro,
  };
  memoriaFila.set(idempotencyKey, atualizado);

  const db = await getDb();
  if (db) {
    try {
      await db.runAsync(
        `UPDATE sos_fila 
         SET status = ?, tentativas = ?, ultimo_erro = ?
         WHERE idempotency_key = ?;`,
        [novoStatus, tentativas, ultimoErro, idempotencyKey]
      );
    } catch (err) {
      console.warn('[sosQueueService] Falha ao atualizar SQLite:', err.message);
    }
  }
}

/**
 * Inicia o ciclo de envio com reenvio contínuo por até 60 segundos com a mesma chave de idempotência.
 * 
 * @param {string} idempotencyKey
 * @param {object} callbacks
 * @param {Function} callbacks.onStatusChange - ({ status, tempoRestanteSegundos, tentativas })
 * @param {Function} callbacks.onSucesso - (alarme)
 * @param {Function} callbacks.onTimeout - ({ primeiroContato, idempotencyKey, tentativas })
 */
export async function iniciarCicloEnvio(idempotencyKey, callbacks = {}) {
  const registro = memoriaFila.get(idempotencyKey);
  if (!registro) {
    console.warn(`[sosQueueService] Registro não encontrado para chave ${idempotencyKey}`);
    return;
  }

  // Cancela qualquer timer pré-existente para esta chave
  if (activeJobs.has(idempotencyKey)) {
    clearTimeout(activeJobs.get(idempotencyKey).timer);
    activeJobs.delete(idempotencyKey);
  }

  const { idosoId, criadoEm } = registro;
  let tentativas = registro.tentativas || 0;

  const executarTentativa = async () => {
    const tempoDecorrido = Date.now() - criadoEm;
    const tempoRestante = Math.max(0, JANELA_MAXIMA_MS - tempoDecorrido);
    const tempoRestanteSegundos = Math.ceil(tempoRestante / 1000);

    // Cenário 3: 60 segundos sem sucesso -> encerra ciclo e aciona discador
    if (tempoDecorrido >= JANELA_MAXIMA_MS) {
      console.warn(`[sosQueueService] Tempo limite de 60s atingido sem resposta do servidor para ${idempotencyKey}`);
      await atualizarStatusRegistro(idempotencyKey, 'EXPIRADO', tentativas, 'Timeout de 60 segundos sem conexão');
      activeJobs.delete(idempotencyKey);

      let primeiroContato = null;
      try {
        const contatos = await listarContatos(idosoId);
        if (contatos && contatos.length > 0) {
          primeiroContato = contatos[0];
        }
      } catch (e) {
        console.warn('[sosQueueService] Erro ao buscar 1º contato:', e.message);
      }

      if (callbacks.onTimeout) {
        callbacks.onTimeout({
          idempotencyKey,
          tentativas,
          primeiroContato,
        });
      }
      return;
    }

    tentativas += 1;

    if (callbacks.onStatusChange) {
      callbacks.onStatusChange({
        status: 'ENVIANDO',
        tempoRestanteSegundos,
        tentativas,
        idempotencyKey,
      });
    }

    try {
      const payloadEnvio = {
        latitude: registro.latitude,
        longitude: registro.longitude,
        nivelBateria: registro.nivelBateria,
        observacao: registro.observacao,
        idempotencyKey,
      };

      const resultado = await dispararSos(idosoId, payloadEnvio);

      // Sucesso no envio (backend respondeu com 202/200 ou alarme válido)
      await atualizarStatusRegistro(idempotencyKey, 'ENVIADO', tentativas, null);
      activeJobs.delete(idempotencyKey);

      if (callbacks.onSucesso) {
        callbacks.onSucesso(resultado);
      }
    } catch (erro) {
      console.warn(`[sosQueueService] Tentativa ${tentativas} falhou: ${erro.message}`);
      await atualizarStatusRegistro(idempotencyKey, 'PENDENTE', tentativas, erro.message);

      const proximoDecorrido = Date.now() - criadoEm;
      const proximoRestante = JANELA_MAXIMA_MS - proximoDecorrido;

      if (proximoRestante <= 0) {
        // Expirou imediatamente após a requisição
        executarTentativa();
        return;
      }

      if (callbacks.onStatusChange) {
        callbacks.onStatusChange({
          status: 'PENDENTE_OFFLINE',
          tempoRestanteSegundos: Math.ceil(proximoRestante / 1000),
          tentativas,
          idempotencyKey,
          erro: erro.message,
        });
      }

      const delay = Math.min(INTERVALO_RETRY_MS, proximoRestante);
      const timer = setTimeout(executarTentativa, delay);
      activeJobs.set(idempotencyKey, { timer });
    }
  };

  // Inicia a primeira tentativa imediatamente
  executarTentativa();
}

/**
 * Cancela as tentativas de reenvio ativas (por exemplo, quando o idoso clica em "Foi engano").
 */
export async function cancelarFilaSos(idempotencyKey) {
  if (activeJobs.has(idempotencyKey)) {
    clearTimeout(activeJobs.get(idempotencyKey).timer);
    activeJobs.delete(idempotencyKey);
  }

  await atualizarStatusRegistro(idempotencyKey, 'CANCELADO', 0, 'Cancelado pelo usuário');
}

/**
 * Retoma chamados pendentes no banco local (caso o app tenha sido reaberto durante os 60s).
 */
export async function retomarPendentes(callbacks = {}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const pendentes = await db.getAllAsync(
      `SELECT * FROM sos_fila WHERE status = 'PENDENTE';`
    );

    const agora = Date.now();
    for (const item of pendentes) {
      const criadoEm = item.criado_em;
      const chave = item.idempotency_key;

      memoriaFila.set(chave, {
        idempotencyKey: chave,
        idosoId: item.idoso_id,
        latitude: item.latitude,
        longitude: item.longitude,
        nivelBateria: item.nivel_bateria,
        observacao: item.observacao,
        status: item.status,
        criadoEm,
        tentativas: item.tentativas,
      });

      if (agora - criadoEm >= JANELA_MAXIMA_MS) {
        await atualizarStatusRegistro(chave, 'EXPIRADO', item.tentativas, 'Timeout após reinício');
      } else {
        iniciarCicloEnvio(chave, callbacks);
      }
    }

    return pendentes;
  } catch (err) {
    console.warn('[sosQueueService] Erro ao retomar pendentes:', err.message);
    return [];
  }
}
