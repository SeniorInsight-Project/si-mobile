import { type Consentimentos, descreverAutorizados, tiposAutorizados } from './consentimentoService';

/**
 * Conexão do relógio pelo Health Connect (HU-023, HU-025 / RF-016 a RF-020).
 *
 * O Health Connect é um módulo nativo (react-native-health-connect) que não existe no Expo Go.
 * Aqui ficam o modelo de passos, a classificação da sincronização e a abertura da loja; a leitura
 * real entra num development build. Enquanto isso o estado do relógio é simulado.
 */
export const PACOTE_HEALTH_CONNECT = 'com.google.android.apps.healthdata';
export const INTERVALO_LEITURA_MIN = 15;
export const LIMITE_FUNCIONANDO_MIN = 60;
export const LIMITE_SEM_DADOS_MIN = 24 * 60;

export type StatusRelogio = 'NAO_CONECTADO' | 'FUNCIONANDO' | 'PARADO' | 'SEM_DADOS';

export interface StatusRelogioInfo {
  status: StatusRelogio;
  titulo: string;
  detalhe: string;
  cor: 'verde' | 'laranja' | 'cinza';
}

/** Ponto único de decisão do HU-025 (verde ≤ 60 min) e do HU-023 cenário 3 (sem dado em 24 h). */
export function classificarSincronizacao(ultimaMedicaoMs: number | null, agoraMs: number = Date.now()): StatusRelogioInfo {
  if (ultimaMedicaoMs === null) {
    return { status: 'NAO_CONECTADO', titulo: 'Relógio não conectado', detalhe: 'Conecte para sua família acompanhar.', cor: 'cinza' };
  }
  const minutos = Math.max(0, Math.floor((agoraMs - ultimaMedicaoMs) / 60000));
  if (minutos <= LIMITE_FUNCIONANDO_MIN) {
    return { status: 'FUNCIONANDO', titulo: 'Relógio conectado', detalhe: `Última medição às ${formatarHora(ultimaMedicaoMs)}`, cor: 'verde' };
  }
  if (minutos <= LIMITE_SEM_DADOS_MIN) {
    return { status: 'PARADO', titulo: 'Seu relógio parou de enviar dados', detalhe: `Última medição às ${formatarHora(ultimaMedicaoMs)}`, cor: 'laranja' };
  }
  return { status: 'SEM_DADOS', titulo: 'Abra o app do seu relógio e sincronize', detalhe: 'Sem medição nas últimas 24 h.', cor: 'laranja' };
}

export function formatarHora(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export type EstadoPasso = 'FEITO' | 'AGORA' | 'PENDENTE';

export interface PassoConexao {
  id: 'INSTALAR' | 'PERMITIR' | 'SEGUNDO_PLANO';
  titulo: string;
  detalhe: string;
  estado: EstadoPasso;
}

export interface EstadoConexao {
  healthConnectInstalado: boolean;
  segundoPlanoAtivo: boolean;
  ultimaMedicaoMs: number | null;
}

/**
 * Monta os 3 passos guiados. O passo 2 depende do que o idoso autorizou (HU-018):
 * sem nenhum dado autorizado não há o que pedir ao Health Connect.
 */
export function montarPassos(estado: EstadoConexao, consentimentos: Consentimentos): PassoConexao[] {
  const temPermissao = tiposAutorizados(consentimentos).length > 0;

  const instalar: EstadoPasso = estado.healthConnectInstalado ? 'FEITO' : 'AGORA';
  const permitir: EstadoPasso = !estado.healthConnectInstalado ? 'PENDENTE' : temPermissao ? 'FEITO' : 'AGORA';
  const segundoPlano: EstadoPasso =
    !estado.healthConnectInstalado || !temPermissao ? 'PENDENTE' : estado.segundoPlanoAtivo ? 'FEITO' : 'AGORA';

  return [
    { id: 'INSTALAR', titulo: '1. Instalar o Health Connect', detalhe: 'Abrimos a Play Store para você', estado: instalar },
    { id: 'PERMITIR', titulo: '2. Permitir os dados que você autorizou', detalhe: descreverAutorizados(consentimentos), estado: permitir },
    { id: 'SEGUNDO_PLANO', titulo: '3. Leitura em segundo plano', detalhe: `A cada ${INTERVALO_LEITURA_MIN} minutos`, estado: segundoPlano },
  ];
}

declare const __DEV__: boolean | undefined;

export interface EstadoConexaoInfo extends EstadoConexao {
  /** true quando os valores NÃO vêm do aparelho (só em desenvolvimento) e a tela deve sinalizar. */
  simulado: boolean;
}

/**
 * Estado da conexão com o Health Connect. Sem o módulo nativo (não existe no Expo Go) não há leitura real:
 * em produção o estado é "não conectado"; só em desenvolvimento há um estado simulado, e a tela o sinaliza.
 */
export function obterEstadoConexao(
  agoraMs: number = Date.now(),
  emDesenvolvimento: boolean = typeof __DEV__ !== 'undefined' && __DEV__ === true
): EstadoConexaoInfo {
  if (emDesenvolvimento) {
    return { healthConnectInstalado: true, segundoPlanoAtivo: true, ultimaMedicaoMs: agoraMs - 12 * 60000, simulado: true };
  }
  return { healthConnectInstalado: false, segundoPlanoAtivo: false, ultimaMedicaoMs: null, simulado: false };
}
