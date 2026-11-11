/**
 * Tipos das requisições e respostas da API, vindos dos contratos do si-contracts.
 *
 * src/types/contracts/ é cópia de si-contracts/generated/ts: não edite à mão. Para atualizar, rode
 * `npm run contratos:sincronizar -- <caminho do si-contracts>` (ver scripts/sincronizar-contratos.mjs).
 */
import type { Care, Identity, Notification, Telemetry, Report } from './contracts';

type CareSchemas = Care.components['schemas'];
type IdentitySchemas = Identity.components['schemas'];
type NotificationSchemas = Notification.components['schemas'];
type TelemetrySchemas = Telemetry.components['schemas'];
type ReportSchemas = Report.components['schemas'];

// Erro padronizado do GlobalExceptionHandler
export type ErroApi = CareSchemas['Erro'];

// care-v1: idosos
export type IdosoApi = CareSchemas['Idoso'];
export type IdosoRequest = CareSchemas['IdosoRequest'];

// care-v1: consentimentos
export type ConsentimentosApi = CareSchemas['Consentimentos'];

// care-v1: comorbidades
export type Comorbidades = CareSchemas['Comorbidades'];
export type ComorbidadeRequest = CareSchemas['ComorbidadeRequest'];

// care-v1: rede de proteção
export type ConviteRede = CareSchemas['ConviteRede'];
export type ConviteRedeRequest = CareSchemas['ConviteRedeRequest'];
export type ConvitePublico = CareSchemas['ConvitePublico'];
export type AtualizarConviteRequest = CareSchemas['AtualizarConviteRequest'];
export type PapelAcesso = CareSchemas['PapelAcesso'];
export type AceiteConvite = CareSchemas['AceiteConvite'];
export type MembroRedeApi = CareSchemas['MembroRede'];
export type StatusConvite = CareSchemas['StatusConvite'];

// care-v1: rotinas de medicação
export type RotinaMedicamentoApi = CareSchemas['RotinaMedicamento'];
export type RotinaMedicamentoRequest = CareSchemas['RotinaMedicamentoRequest'];
export type AtualizarRotinaRequest = CareSchemas['AtualizarRotinaRequest'];
export type ConfirmarIngestaoRequest = CareSchemas['ConfirmarIngestaoRequest'];
export type HistoricoMedicacao = CareSchemas['HistoricoMedicacao'];
export type StatusIngestao = CareSchemas['StatusIngestao'];

// care-v1: SOS
export type AlarmeEmergenciaApi = CareSchemas['AlarmeEmergencia'];
export type DispararSosRequest = CareSchemas['DispararSosRequest'];
export type AtualizarStatusAlarmeRequest = CareSchemas['AtualizarStatusAlarmeRequest'];
export type StatusAlarme = CareSchemas['StatusAlarme'];

// identity-v1: pareamento
export type GerarCodigoPareamentoRequest = IdentitySchemas['GerarCodigoPareamentoRequest'];
export type CodigoPareamento = IdentitySchemas['CodigoPareamento'];
export type ResgatarCodigoPareamentoRequest = IdentitySchemas['ResgatarCodigoPareamentoRequest'];
export type ResultadoPareamentoApi = IdentitySchemas['ResultadoPareamento'];

// notification-v1: alertas e push
export type AlertaApi = NotificationSchemas['Alerta'];
export type AvaliarAlertaRequest = NotificationSchemas['AvaliarAlertaRequest'];
export type RegistrarTokenPushRequest = NotificationSchemas['RegistrarTokenPushRequest'];
export type TokenPush = NotificationSchemas['TokenPush'];
export type LeituraNotificacao = NotificationSchemas['LeituraNotificacao'];

// telemetry-v1: telemetria wearable
export type EstadoAtualApi = TelemetrySchemas['EstadoAtual'];
export type StatusAparelhoApi = TelemetrySchemas['StatusAparelho'];
export type TipoDadoTelemetry = TelemetrySchemas['TipoDado'];

// report-v1: exclusão de conta e LGPD
export type SolicitarExclusaoRequest = ReportSchemas['SolicitarExclusaoRequest'];
export type PedidoExclusao = ReportSchemas['PedidoExclusao'];
