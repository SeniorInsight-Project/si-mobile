/**
 * Fallback de banco de dados para Web e ambientes não nativos (Node / Web bundler).
 * Utiliza armazenamento em memória com garantia de unicidade por ID.
 */

import type { RotinaMedicamento } from './medicamentoService';

export type RotinaCacheInput = Partial<RotinaMedicamento> & Record<string, any>;

export interface RotinaCache {
  id: string;
  idosoId: string;
  medicamentoNome: string;
  nomeMedicamento: string;
  dosagem: string;
  horario: string;
  frequencia: string;
  diasSemana: string;
  tipoFormato: string;
  instrucoes: string;
  observacoes: string;
  ativo: boolean;
  statusHoje: string;
  horarioIngestaoHoje: string | null;
  atualizadoEm?: number;
}

let memoryCache: RotinaCache[] = [];

export async function getMedicamentoDatabase(): Promise<null> {
  return null;
}

export async function salvarRotinasNoCache(
  idosoId: string,
  rotinas: RotinaCacheInput[] = []
): Promise<RotinaCache[]> {
  if (!Array.isArray(rotinas)) return [];

  const normalizados: RotinaCache[] = rotinas.map((r) => ({
    id: r.id as string,
    idosoId: r.idosoId || idosoId,
    medicamentoNome: r.medicamentoNome || r.nomeMedicamento || '',
    nomeMedicamento: r.nomeMedicamento || r.medicamentoNome || '',
    dosagem: r.dosagem || '',
    horario: r.horario || '08:00',
    frequencia: r.frequencia || '1x ao dia (Diário)',
    diasSemana: r.diasSemana || 'TODOS',
    tipoFormato: r.tipoFormato || 'comprimido',
    instrucoes: r.instrucoes || '',
    observacoes: r.observacoes || '',
    ativo: r.ativo !== false,
    statusHoje: r.statusHoje || 'PENDENTE',
    horarioIngestaoHoje: r.horarioIngestaoHoje || null,
    atualizadoEm: Date.now(),
  }));

  const map = new Map<string, RotinaCache>();
  // Preserva outros idosos
  memoryCache.filter((r) => r.idosoId !== idosoId).forEach((r) => map.set(r.id, r));
  // Sobrescreve/adiciona deduplicando por ID único
  normalizados.forEach((r) => map.set(r.id, r));

  memoryCache = Array.from(map.values());
  return memoryCache.filter((r) => r.idosoId === idosoId);
}

export async function obterRotinasDoCache(idosoId: string): Promise<RotinaCache[]> {
  const map = new Map<string, RotinaCache>();
  memoryCache
    .filter((r) => r.idosoId === idosoId)
    .forEach((r) => map.set(r.id, r));

  return Array.from(map.values()).sort((a, b) =>
    (a.horario || '').localeCompare(b.horario || '')
  );
}

export async function atualizarStatusDoseCache(
  rotinaId: string,
  status = 'TOMADO',
  horarioIngestao: string | null = null
): Promise<boolean> {
  let alterado = false;
  memoryCache = memoryCache.map((item) => {
    if (item.id === rotinaId) {
      alterado = true;
      return {
        ...item,
        statusHoje: status,
        horarioIngestaoHoje: horarioIngestao,
        atualizadoEm: Date.now(),
      };
    }
    return item;
  });
  return alterado;
}

export async function removerRotinaCache(rotinaId: string): Promise<boolean> {
  memoryCache = memoryCache.filter((r) => r.id !== rotinaId);
  return true;
}

export async function limparCacheMedicamentos(): Promise<void> {
  memoryCache = [];
}
