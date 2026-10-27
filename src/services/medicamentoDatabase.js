/**
 * Fallback de banco de dados para Web e ambientes não nativos (Node / Web bundler).
 * Utiliza armazenamento em memória com garantia de unicidade por ID.
 */

let memoryCache = [];

export async function getMedicamentoDatabase() {
  return null;
}

export async function salvarRotinasNoCache(idosoId, rotinas = []) {
  if (!Array.isArray(rotinas)) return [];

  const normalizados = rotinas.map((r) => ({
    id: r.id,
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

  const map = new Map();
  // Preserva outros idosos
  memoryCache.filter((r) => r.idosoId !== idosoId).forEach((r) => map.set(r.id, r));
  // Sobrescreve/adiciona deduplicando por ID único
  normalizados.forEach((r) => map.set(r.id, r));

  memoryCache = Array.from(map.values());
  return memoryCache.filter((r) => r.idosoId === idosoId);
}

export async function obterRotinasDoCache(idosoId) {
  const map = new Map();
  memoryCache
    .filter((r) => r.idosoId === idosoId)
    .forEach((r) => map.set(r.id, r));

  return Array.from(map.values()).sort((a, b) =>
    (a.horario || '').localeCompare(b.horario || '')
  );
}

export async function atualizarStatusDoseCache(rotinaId, status = 'TOMADO', horarioIngestao = null) {
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

export async function removerRotinaCache(rotinaId) {
  memoryCache = memoryCache.filter((r) => r.id !== rotinaId);
  return true;
}

export async function limparCacheMedicamentos() {
  memoryCache = [];
}
