import { dispararSos, enviarLocalizacaoSos, type AlarmeEmergencia } from './alarmeSosService';
import { ApiError } from './apiClient';
import { listarContatos, type ContatoEmergencia } from './contatoEmergenciaService';
import { getSosDatabase, limparFilaSos } from './sosDatabase';

export interface SosQueueRecord {
  idempotencyKey: string;
  idosoId: string;
  latitude: number | null;
  longitude: number | null;
  nivelBateria: number | null;
  observacao: string;
  status: string;
  criadoEm: number;
  tentativas: number;
  ultimoErro: string | null;
  /** Id do alarme no servidor, depois que o POST deu certo (só em memória). */
  alarmeId?: string | null;
  /** A posição atual do registro já está no servidor (no POST ou no PATCH). */
  localizacaoEnviada?: boolean;
}

export interface SosQueueStatusInfo {
  status: string;
  tempoRestanteSegundos: number;
  tentativas?: number;
  idempotencyKey?: string;
  erro?: string;
}

export interface SosQueueTimeoutInfo {
  idempotencyKey: string;
  tentativas: number;
  primeiroContato: ContatoEmergencia | null;
}

export interface SosQueueCallbacks {
  onStatusChange?: (info: SosQueueStatusInfo) => void;
  onSucesso?: (alarme: AlarmeEmergencia) => void;
  onTimeout?: (info: SosQueueTimeoutInfo) => void;
}

export interface EnfileirarSosInput {
  idempotencyKey?: string;
  latitude?: number | null;
  longitude?: number | null;
  nivelBateria?: number | null;
  observacao?: string;
}

let expoCrypto: any = null;
const memoriaFila = new Map<string, SosQueueRecord>();
const activeJobs = new Map<string, { timer: ReturnType<typeof setTimeout> }>();
const jobsLocalizacao = new Map<string, ReturnType<typeof setTimeout>>();

const JANELA_MAXIMA_MS = 60000; // 60 segundos conforme HU-063 / RF-040
const INTERVALO_RETRY_MS = 5000; // Tentativas a cada 5 segundos
/** A posição que chega depois do disparo é reenviada por até 2 min. */
const JANELA_LOCALIZACAO_MS = 2 * 60 * 1000;

/** Chamadas ao servidor; trocadas só nos testes. */
const rede = { dispararSos, enviarLocalizacaoSos };

export function definirRedeFilaSosParaTestes(
  substitutos: Partial<typeof rede> | null,
  intervaloMs?: number
): void {
  rede.dispararSos = substitutos?.dispararSos ?? dispararSos;
  rede.enviarLocalizacaoSos = substitutos?.enviarLocalizacaoSos ?? enviarLocalizacaoSos;
  intervaloReenvioLocalizacaoMs = intervaloMs ?? INTERVALO_RETRY_MS;
}
let intervaloReenvioLocalizacaoMs = INTERVALO_RETRY_MS;

function getCryptoModule(): any {
  if (expoCrypto !== null) return expoCrypto;
  try {
    expoCrypto = require('expo-crypto');
  } catch (e) {
    expoCrypto = false;
  }
  return expoCrypto;
}

function gerarUUID(): string {
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
export async function enfileirarSos(
  idosoId: string,
  dados: EnfileirarSosInput = {}
): Promise<SosQueueRecord> {
  const idempotencyKey = dados.idempotencyKey || gerarUUID();
  const criadoEm = Date.now();
  const registro: SosQueueRecord = {
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
    alarmeId: null,
    localizacaoEnviada: false,
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
    } catch (err: any) {
      console.warn('[sosQueueService] Falha ao salvar no SQLite:', err?.message);
    }
  }

  return registro;
}

/**
 * Atualiza o status do registro no SQLite e memória.
 */
async function atualizarStatusRegistro(
  idempotencyKey: string,
  novoStatus: string,
  tentativas: number,
  ultimoErro: string | null = null
): Promise<void> {
  const atual = memoriaFila.get(idempotencyKey);
  if (atual) {
    const atualizado: SosQueueRecord = {
      ...atual,
      status: novoStatus,
      tentativas,
      ultimoErro,
    };
    memoriaFila.set(idempotencyKey, atualizado);
  }

  const db = await getDb();
  if (db) {
    try {
      await db.runAsync(
        `UPDATE sos_fila 
         SET status = ?, tentativas = ?, ultimo_erro = ?
         WHERE idempotency_key = ?;`,
        [novoStatus, tentativas, ultimoErro, idempotencyKey]
      );
    } catch (err: any) {
      console.warn('[sosQueueService] Falha ao atualizar SQLite:', err?.message);
    }
  }
}

/**
 * Guarda o id do alarme que o servidor devolveu. Se o registro já tem posição e o servidor não a gravou
 * (ela chegou depois do POST, ou o reenvio idempotente devolveu o alarme original sem posição), manda por PATCH.
 */
function registrarAlarmeEnviado(idempotencyKey: string, alarme: AlarmeEmergencia): void {
  const atual = memoriaFila.get(idempotencyKey);
  if (!atual || !alarme?.id) return;
  const servidorTemPosicao =
    atual.latitude !== null &&
    alarme.latitude === atual.latitude &&
    alarme.longitude === atual.longitude;
  memoriaFila.set(idempotencyKey, { ...atual, alarmeId: alarme.id, localizacaoEnviada: servidorTemPosicao });
  if (atual.latitude !== null && atual.longitude !== null && !servidorTemPosicao) {
    reenviarLocalizacao(idempotencyKey);
  }
}

function pararReenvioLocalizacao(idempotencyKey: string): void {
  const timer = jobsLocalizacao.get(idempotencyKey);
  if (timer) clearTimeout(timer);
  jobsLocalizacao.delete(idempotencyKey);
}

/**
 * PATCH /api/v1/sos/{id}/localizacao com a posição atual do registro. Sem rede ou com erro do servidor tenta
 * de novo a cada 5 s, por até 2 min desde o disparo. 4xx (rota ausente, alarme encerrado) não é repetido.
 */
async function reenviarLocalizacao(idempotencyKey: string): Promise<void> {
  pararReenvioLocalizacao(idempotencyKey);
  const atual = memoriaFila.get(idempotencyKey);
  if (!atual?.alarmeId || atual.latitude === null || atual.longitude === null) return;
  if (atual.status === 'CANCELADO') return;

  const enviada = { latitude: atual.latitude, longitude: atual.longitude };
  try {
    await rede.enviarLocalizacaoSos(atual.alarmeId, enviada);
    const depois = memoriaFila.get(idempotencyKey);
    // Se chegou uma posição mais nova durante o PATCH, ela segue no próximo envio.
    if (depois && depois.latitude === enviada.latitude && depois.longitude === enviada.longitude) {
      memoriaFila.set(idempotencyKey, { ...depois, localizacaoEnviada: true });
    } else if (depois) {
      reenviarLocalizacao(idempotencyKey);
    }
  } catch (erro: any) {
    const status = erro instanceof ApiError ? erro.status : erro?.status;
    console.warn(`[sosQueueService] Falha ao enviar a localização do SOS (HTTP ${status ?? '?'}): ${erro?.message}`);
    const definitivo = typeof status === 'number' && status >= 400 && status < 500;
    if (definitivo || Date.now() - atual.criadoEm >= JANELA_LOCALIZACAO_MS) return;
    jobsLocalizacao.set(
      idempotencyKey,
      setTimeout(() => reenviarLocalizacao(idempotencyKey), intervaloReenvioLocalizacaoMs)
    );
  }
}

/**
 * Posição do idoso que chegou depois do disparo. Grava no registro (memória e SQLite); se o SOS ainda não
 * saiu, vai no próximo POST da fila; se já saiu, vai por PATCH. Devolve false se o registro não existe.
 */
export async function atualizarLocalizacaoSos(
  idempotencyKey: string,
  { latitude, longitude }: { latitude: number; longitude: number }
): Promise<boolean> {
  const atual = memoriaFila.get(idempotencyKey);
  if (!atual) return false;
  if (atual.latitude === latitude && atual.longitude === longitude) return true;

  memoriaFila.set(idempotencyKey, { ...atual, latitude, longitude, localizacaoEnviada: false });

  const db = await getDb();
  if (db) {
    try {
      await db.runAsync(`UPDATE sos_fila SET latitude = ?, longitude = ? WHERE idempotency_key = ?;`, [
        latitude,
        longitude,
        idempotencyKey,
      ]);
    } catch (err: any) {
      console.warn('[sosQueueService] Falha ao gravar a localização no SQLite:', err?.message);
    }
  }

  if (atual.alarmeId) reenviarLocalizacao(idempotencyKey);
  return true;
}

/** Registro da fila em memória (para a tela e os testes). */
export function obterRegistroSos(idempotencyKey: string): SosQueueRecord | undefined {
  return memoriaFila.get(idempotencyKey);
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
export async function iniciarCicloEnvio(
  idempotencyKey: string,
  callbacks: SosQueueCallbacks = {}
): Promise<void> {
  const registro = memoriaFila.get(idempotencyKey);
  if (!registro) {
    console.warn(`[sosQueueService] Registro não encontrado para chave ${idempotencyKey}`);
    return;
  }

  // Cancela qualquer timer pré-existente para esta chave
  if (activeJobs.has(idempotencyKey)) {
    clearTimeout(activeJobs.get(idempotencyKey)!.timer);
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

      let primeiroContato: ContatoEmergencia | null = null;
      try {
        const contatos = await listarContatos(idosoId);
        if (contatos && contatos.length > 0) {
          primeiroContato = contatos[0];
        }
      } catch (e: any) {
        console.warn('[sosQueueService] Erro ao buscar 1º contato:', e?.message);
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

    // Sempre o registro atual: a posição pode ter chegado depois do disparo.
    const atual = memoriaFila.get(idempotencyKey) ?? registro;
    if (atual.status === 'CANCELADO') {
      activeJobs.delete(idempotencyKey);
      return;
    }

    try {
      const payloadEnvio = {
        latitude: atual.latitude,
        longitude: atual.longitude,
        nivelBateria: atual.nivelBateria,
        observacao: atual.observacao,
        idempotencyKey,
      };

      const resultado = await rede.dispararSos(idosoId, payloadEnvio);

      // Sucesso no envio (backend respondeu com 202/200 ou alarme válido)
      await atualizarStatusRegistro(idempotencyKey, 'ENVIADO', tentativas, null);
      activeJobs.delete(idempotencyKey);
      registrarAlarmeEnviado(idempotencyKey, resultado);

      if (callbacks.onSucesso) {
        callbacks.onSucesso(resultado);
      }
    } catch (erro: any) {
      console.warn(`[sosQueueService] Tentativa ${tentativas} falhou: ${erro?.message}`);
      await atualizarStatusRegistro(idempotencyKey, 'PENDENTE', tentativas, erro?.message);

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
          erro: erro?.message,
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
export async function cancelarFilaSos(idempotencyKey: string): Promise<void> {
  if (activeJobs.has(idempotencyKey)) {
    clearTimeout(activeJobs.get(idempotencyKey)!.timer);
    activeJobs.delete(idempotencyKey);
  }
  pararReenvioLocalizacao(idempotencyKey);

  await atualizarStatusRegistro(idempotencyKey, 'CANCELADO', 0, 'Cancelado pelo usuário');
}

/**
 * Retoma chamados pendentes no banco local (caso o app tenha sido reaberto durante os 60s).
 */
export async function retomarPendentes(callbacks: SosQueueCallbacks = {}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const pendentes = await db.getAllAsync<any>(
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
        ultimoErro: item.ultimo_erro ?? null,
        alarmeId: null,
        localizacaoEnviada: false,
      });

      if (agora - criadoEm >= JANELA_MAXIMA_MS) {
        await atualizarStatusRegistro(chave, 'EXPIRADO', item.tentativas, 'Timeout após reinício');
      } else {
        iniciarCicloEnvio(chave, callbacks);
      }
    }

    return pendentes;
  } catch (err: any) {
    console.warn('[sosQueueService] Erro ao retomar pendentes:', err?.message);
    return [];
  }
}

/**
 * Para os reenvios em andamento e apaga a fila local (memória e SQLite). Usado no logout.
 */
export async function limparFilaSosLocal(): Promise<void> {
  descartarFilaSosEmMemoria();
  await limparFilaSos();
}

/** Para os reenvios em andamento e esvazia a fila em memória, sem tocar no SQLite. */
export function descartarFilaSosEmMemoria(): void {
  activeJobs.forEach(({ timer }) => clearTimeout(timer));
  activeJobs.clear();
  jobsLocalizacao.forEach((timer) => clearTimeout(timer));
  jobsLocalizacao.clear();
  memoriaFila.clear();
}

/** Quantos chamados estão na fila em memória. */
export function tamanhoFilaSosEmMemoria(): number {
  return memoriaFila.size;
}
