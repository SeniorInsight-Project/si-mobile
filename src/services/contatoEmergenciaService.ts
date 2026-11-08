import { mockPermitido } from '../config/ambiente';

export interface ContatoEmergencia {
  id: string;
  nome: string;
  parentesco: string;
  telefone: string;
  ordem: number;
  whatsapp: boolean;
  iniciais: string;
  corAvatar: string;
  corTexto: string;
  ativo: boolean;
}

export interface NovoContatoEmergenciaInput {
  id?: string;
  nome: string;
  parentesco?: string;
  telefone: string;
  ordem?: number;
  whatsapp?: boolean;
  iniciais?: string;
  corAvatar?: string;
  corTexto?: string;
  ativo?: boolean;
}

let contatosEmMemoria: ContatoEmergencia[] = [];
let inicializado = false;

async function garantirContatos(): Promise<void> {
  if (inicializado) return;
  inicializado = true;
  if (mockPermitido()) {
    const { CONTATOS_EMERGENCIA_PADRAO } = await import('../mocks/contatosEmergencia');
    contatosEmMemoria = [...(CONTATOS_EMERGENCIA_PADRAO as ContatoEmergencia[])];
  }
}

/**
 * Lista todos os contatos de emergência do idoso, ordenados por prioridade de acionamento.
 * @param {string} idosoId
 * @returns {Promise<Array>}
 */
export async function listarContatos(idosoId?: string): Promise<ContatoEmergencia[]> {
  await garantirContatos();
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
export async function salvarContato(
  idosoId: string,
  contato: NovoContatoEmergenciaInput
): Promise<ContatoEmergencia> {
  await garantirContatos();
  await new Promise((resolve) => setTimeout(resolve, 50));

  if (contato.id) {
    const idx = contatosEmMemoria.findIndex((c) => c.id === contato.id);
    if (idx !== -1) {
      contatosEmMemoria[idx] = { ...contatosEmMemoria[idx], ...contato };
      return contatosEmMemoria[idx];
    }
  }

  const novoContato: ContatoEmergencia = {
    id: `contato-${Date.now()}`,
    parentesco: contato.parentesco || 'Familiar',
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
export async function removerContato(idosoId: string, contatoId: string): Promise<boolean> {
  await garantirContatos();
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
export async function reordenarContatos(
  idosoId: string,
  novaListaContatos: ContatoEmergencia[]
): Promise<ContatoEmergencia[]> {
  await garantirContatos();
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
export function resetarContatos(): void {
  inicializado = false;
  contatosEmMemoria = [];
}

function gerarIniciais(nome = ''): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 0 || !partes[0]) return 'CO';
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
