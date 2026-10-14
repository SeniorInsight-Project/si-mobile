// Lista padrão de contatos de emergência (cuidadores e socorristas prioritários)
export const CONTATOS_EMERGENCIA_PADRAO = [
  {
    id: 'contato-1',
    nome: 'Carlos Silva',
    parentesco: 'Filho (Cuidador Principal)',
    telefone: '(11) 98765-4321',
    ordem: 1,
    whatsapp: true,
    iniciais: 'CA',
    corAvatar: '#EBF5FF',
    corTexto: '#1E40AF',
    ativo: true,
  },
  {
    id: 'contato-2',
    nome: 'Roberta Santos',
    parentesco: 'Filha',
    telefone: '(11) 97654-3210',
    ordem: 2,
    whatsapp: true,
    iniciais: 'RO',
    corAvatar: '#E6F4EA',
    corTexto: '#137333',
    ativo: true,
  },
  {
    id: 'contato-3',
    nome: 'Dr. Ricardo Silva',
    parentesco: 'Médico Cardiologista',
    telefone: '(11) 93456-7890',
    ordem: 3,
    whatsapp: true,
    iniciais: 'DR',
    corAvatar: '#F3E8FF',
    corTexto: '#6B21A8',
    ativo: true,
  },
];

let contatosEmMemoria = [...CONTATOS_EMERGENCIA_PADRAO];

/**
 * Lista todos os contatos de emergência do idoso, ordenados por prioridade de acionamento.
 * @param {string} idosoId
 * @returns {Promise<Array>}
 */
export async function listarContatos(idosoId) {
  // Simula latência de rede/banco mínima
  await new Promise((resolve) => setTimeout(resolve, 50));
  return [...contatosEmMemoria].sort((a, b) => a.ordem - b.ordem);
}

/**
 * Adiciona ou atualiza um contato de emergência.
 * @param {string} idosoId
 * @param {object} contato
 * @returns {Promise<object>}
 */
export async function salvarContato(idosoId, contato) {
  await new Promise((resolve) => setTimeout(resolve, 50));

  if (contato.id) {
    const idx = contatosEmMemoria.findIndex((c) => c.id === contato.id);
    if (idx !== -1) {
      contatosEmMemoria[idx] = { ...contatosEmMemoria[idx], ...contato };
      return contatosEmMemoria[idx];
    }
  }

  const novoContato = {
    id: `contato-${Date.now()}`,
    nome: contato.nome,
    parentesco: contato.parentesco || 'Familiar',
    telefone: contato.telefone,
    ordem: contato.ordem || contatosEmMemoria.length + 1,
    whatsapp: contato.whatsapp ?? true,
    iniciais: gerarIniciais(contato.nome),
    corAvatar: '#EEF2FF',
    corTexto: '#4338CA',
    ativo: true,
    ...contato,
  };

  contatosEmMemoria.push(novoContato);
  return novoContato;
}

/**
 * Remove um contato de emergência pelo ID.
 * @param {string} idosoId
 * @param {string} contatoId
 * @returns {Promise<boolean>}
 */
export async function removerContato(idosoId, contatoId) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const totalAntes = contatosEmMemoria.length;
  contatosEmMemoria = contatosEmMemoria.filter((c) => c.id !== contatoId);

  // Reordena as prioridades após remoção
  contatosEmMemoria.forEach((c, idx) => {
    c.ordem = idx + 1;
  });

  return contatosEmMemoria.length < totalAntes;
}

/**
 * Atualiza a ordem de prioridade de todos os contatos de emergência (Reorder / Drag & Drop).
 * @param {string} idosoId
 * @param {Array} novaListaContatos
 * @returns {Promise<Array>}
 */
export async function reordenarContatos(idosoId, novaListaContatos) {
  await new Promise((resolve) => setTimeout(resolve, 30));
  const atualizados = novaListaContatos.map((c, idx) => ({
    ...c,
    ordem: idx + 1,
  }));
  contatosEmMemoria = [...atualizados];
  return [...contatosEmMemoria];
}

/**
 * Restaura os contatos padrão iniciais (útil para testes).
 */
export function resetarContatos() {
  contatosEmMemoria = [...CONTATOS_EMERGENCIA_PADRAO];
  return contatosEmMemoria;
}

function gerarIniciais(nome = '') {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 0 || !partes[0]) return 'CO';
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
