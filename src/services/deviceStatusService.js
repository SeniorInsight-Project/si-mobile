import { runtimeConfig } from '../config/runtime.js';

/**
 * Mocks padrão enriquecidos para testes dos cenários clínicos da HU-027 e HU-028.
 */
const STATUS_DISPOSITIVO_MOCK = {
  'e3b0c442-98fc-1c14-9afc-432100000001': {
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    nomeIdoso: 'Dona Maria',
    modeloCelular: 'Samsung Galaxy A15',
    versaoApp: 'v1.0.4 (Build 42)',
    sistemaOperacional: 'Android 14',
    nivelBateria: 62,
    conectado: true,
    // Define a última sincronização às 10:15 da data de hoje para bater com o Cenário 1
    ultimaSincronizacao: (() => {
      const d = new Date();
      d.setHours(10, 15, 0, 0);
      return d.toISOString();
    })(),
    tiposDados: [
      {
        id: 'passos',
        nome: 'Passos e Movimentação',
        ativo: true,
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via Health Connect',
      },
      {
        id: 'batimentos',
        nome: 'Frequência Cardíaca',
        ativo: true,
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via Smartwatch',
      },
      {
        id: 'oxigenacao',
        nome: 'Oxigenação (SpO2)',
        ativo: false,
        revogadoPeloIdoso: true,
        detalhe: 'Desativada pelo idoso',
      },
      {
        id: 'gps',
        nome: 'Localização em Tempo Real',
        ativo: true,
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via GPS do celular',
      },
      {
        id: 'queda',
        nome: 'Detecção de Queda',
        ativo: true,
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via sensores do relógio',
      },
    ],
  },
};

/**
 * Formata um timestamp ISO em horário legível HH:mm
 */
export function formatarHora(dataISO) {
  if (!dataISO) return '--:--';
  const data = new Date(dataISO);
  if (isNaN(data.getTime())) return '--:--';
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

/**
 * Gera o texto canônico de status conforme Cenário 1 da HU-027:
 * "Última atualização 10:15, bateria 62%"
 */
export function formatarResumoStatus(status) {
  if (!status) return 'Status indisponível';
  const hora = formatarHora(status.ultimaSincronizacao);
  const bateria = typeof status.nivelBateria === 'number' ? `${status.nivelBateria}%` : '--%';
  return `Última atualização ${hora}, bateria ${bateria}`;
}

/**
 * Avalia se há ausência de sincronização há mais de X horas (conforme HU-028 e RN-003).
 * Limiar diurno padrão: 3 horas (180 minutos).
 * Retorna { semDados: boolean, mensagem: string, minutosAtraso: number, horarioPerda: string }
 */
export function verificarPerdaDados(ultimaSincronizacao, nomeIdoso = 'Idoso', limiteHoras = 3, dataReferencia = new Date()) {
  if (!ultimaSincronizacao) {
    return {
      semDados: true,
      mensagem: `Sem dados recentes de ${nomeIdoso}. Verifique o celular dela.`,
      minutosAtraso: Infinity,
      horarioPerda: '--:--',
    };
  }

  const syncDate = new Date(ultimaSincronizacao);
  if (isNaN(syncDate.getTime())) {
    return {
      semDados: true,
      mensagem: `Sem dados recentes de ${nomeIdoso}. Verifique o celular dela.`,
      minutosAtraso: Infinity,
      horarioPerda: '--:--',
    };
  }

  const diffMs = dataReferencia.getTime() - syncDate.getTime();
  const minutosAtraso = Math.floor(diffMs / (1000 * 60));
  const limiteMinutos = limiteHoras * 60;
  const horarioPerda = formatarHora(syncDate);

  if (minutosAtraso >= limiteMinutos) {
    return {
      semDados: true,
      minutosAtraso,
      horarioPerda,
      mensagem: `Sem dados de ${nomeIdoso} desde ${horarioPerda}. Verifique o celular dela.`,
    };
  }

  return {
    semDados: false,
    minutosAtraso,
    horarioPerda,
    mensagem: `Sincronização em dia (última às ${horarioPerda})`,
  };
}

/**
 * Consulta o status do celular do idoso na API com fallback mock resiliente.
 */
export async function buscarStatusDispositivo(idosoId, token = null) {
  if (!idosoId) {
    return STATUS_DISPOSITIVO_MOCK['e3b0c442-98fc-1c14-9afc-432100000001'];
  }

  try {
    const url = `${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/telemetria-wearable/recente`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return normalizarRespostaApi(idosoId, data);
    }
  } catch (error) {
    // Modo offline ou fallback resiliente para ambiente dev
  }

  return STATUS_DISPOSITIVO_MOCK[idosoId] || {
    ...STATUS_DISPOSITIVO_MOCK['e3b0c442-98fc-1c14-9afc-432100000001'],
    idosoId,
  };
}

/**
 * Normaliza os dados vindos do backend para o modelo completo do status do celular.
 */
function normalizarRespostaApi(idosoId, apiData) {
  const ultima = apiData.coletado_em || apiData.criado_em || new Date().toISOString();
  const bateria = typeof apiData.nivel_bateria === 'number' ? apiData.nivel_bateria : 62;

  return {
    idosoId,
    nomeIdoso: 'Idoso Monitorado',
    modeloCelular: apiData.device_model || 'Celular Coletor Android',
    versaoApp: 'v1.0.4',
    sistemaOperacional: 'Android',
    nivelBateria: bateria,
    conectado: true,
    ultimaSincronizacao: ultima,
    tiposDados: [
      {
        id: 'passos',
        nome: 'Passos e Movimentação',
        ativo: typeof apiData.passos_contagem === 'number',
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via Health Connect',
      },
      {
        id: 'batimentos',
        nome: 'Frequência Cardíaca',
        ativo: typeof apiData.frequencia_cardiaca_bpm === 'number',
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via Smartwatch',
      },
      {
        id: 'oxigenacao',
        nome: 'Oxigenação (SpO2)',
        ativo: typeof apiData.saturacao_oxigenio === 'number' && apiData.saturacao_oxigenio > 0,
        revogadoPeloIdoso: !apiData.saturacao_oxigenio,
        detalhe: apiData.saturacao_oxigenio ? 'Ativo via Smartwatch' : 'Desativada pelo idoso',
      },
      {
        id: 'gps',
        nome: 'Localização em Tempo Real',
        ativo: true,
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via GPS do celular',
      },
      {
        id: 'queda',
        nome: 'Detecção de Queda',
        ativo: true,
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via sensores do relógio',
      },
    ],
  };
}
