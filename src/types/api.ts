/**
 * Tipos das requisições e respostas da API, vindos dos contratos do si-contracts.
 *
 * src/types/contracts/ é cópia de si-contracts/generated/ts: não edite à mão. Para atualizar, rode
 * `npm run contratos:sincronizar -- <caminho do si-contracts>` (ver scripts/sincronizar-contratos.mjs).
 *
 * Só entram aqui rotas que existem no contrato. Rotas que o app usa e que ainda não têm contrato
 * (score, alertas, telemetria, convites pendentes etc.) continuam com tipos locais nos services.
 */
import type { Care, Identity } from './contracts';

type CareSchemas = Care.components['schemas'];
type IdentitySchemas = Identity.components['schemas'];

// care-v1: idosos
export type IdosoApi = CareSchemas['Idoso'];
export type IdosoRequest = CareSchemas['IdosoRequest'];

// care-v1: comorbidades
export type Comorbidades = CareSchemas['Comorbidades'];
export type ComorbidadeRequest = CareSchemas['ComorbidadeRequest'];

// care-v1: rede de proteção
export type ConviteRede = CareSchemas['ConviteRede'];
export type ConviteRedeRequest = CareSchemas['ConviteRedeRequest'];
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
