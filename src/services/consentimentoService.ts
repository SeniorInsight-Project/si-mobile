import { apiClient, ApiClient, ApiError } from './apiClient';

/**
 * Autorização de uso dos dados por tipo (HU-018, HU-019 / RF-010, RF-011, RF-012 / RN-001).
 *
 * - Só o idoso titular autoriza. Cada tipo é um consentimento separado e começa DESLIGADO
 *   (consentimento específico e explícito para dado de saúde — LGPD Art. 11).
 * - Localização é independente: desligada, só é enviada durante um SOS (RN-009).
 * - ROTA SEM CONTRATO AINDA: GET/PUT /api/v1/identity/me/consentimentos (proposta, a levar ao si-contracts).
 *   Até existir, a tela mostra o erro; não há estado local nem dado de exemplo.
 */
export type TipoDado = 'BATIMENTOS' | 'PASSOS' | 'SONO' | 'OXIGENACAO' | 'LOCALIZACAO';

export const TIPOS_SAUDE: readonly TipoDado[] = ['BATIMENTOS', 'PASSOS', 'SONO', 'OXIGENACAO'];

export type Consentimentos = Record<TipoDado, boolean>;

export const ROTULOS_DADO: Record<TipoDado, string> = {
  BATIMENTOS: 'Batimentos',
  PASSOS: 'Passos',
  SONO: 'Sono',
  OXIGENACAO: 'Oxigenação',
  LOCALIZACAO: 'Localização',
};

/** Estado inicial da tela enquanto carrega (nada autorizado). Não é resposta do servidor. */
export const CONSENTIMENTO_PADRAO: Consentimentos = {
  BATIMENTOS: false,
  PASSOS: false,
  SONO: false,
  OXIGENACAO: false,
  LOCALIZACAO: false,
};

export const ROTA_CONSENTIMENTOS = '/api/v1/identity/me/consentimentos';

export class ConsentimentoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ConsentimentoError';
  }
}

function traduzir(erro: unknown, acao: 'carregar' | 'salvar'): ConsentimentoError {
  if (erro instanceof ApiError && erro.erroDeRede) {
    return new ConsentimentoError('Sem internet. Conecte-se e tente de novo.');
  }
  return new ConsentimentoError(
    acao === 'carregar'
      ? 'Não foi possível carregar suas escolhas agora. Tente de novo.'
      : 'Não foi possível salvar suas escolhas agora. Nada foi alterado.'
  );
}

/** Tipos de saúde autorizados — é o que será pedido ao Health Connect (HU-018 cenário 1). */
export function tiposAutorizados(c: Consentimentos): TipoDado[] {
  return TIPOS_SAUDE.filter((tipo) => c[tipo]);
}

export type StatusMonitoramento = 'ATIVO' | 'PARCIAL' | 'PAUSADO';

/** HU-019: nenhum tipo de saúde ligado = "Monitoramento pausado pelo idoso". */
export function statusMonitoramento(c: Consentimentos): StatusMonitoramento {
  const ligados = tiposAutorizados(c).length;
  if (ligados === 0) return 'PAUSADO';
  return ligados === TIPOS_SAUDE.length ? 'ATIVO' : 'PARCIAL';
}

/** Texto que o familiar vê no semáforo conforme o que o idoso desligou (HU-019). */
export function mensagemParaFamilia(c: Consentimentos): string {
  const status = statusMonitoramento(c);
  if (status === 'PAUSADO') return 'Monitoramento pausado pelo idoso';
  if (status === 'ATIVO') return 'Semáforo calculado com todos os dados autorizados';
  const desligados = TIPOS_SAUDE.filter((t) => !c[t]).map((t) => ROTULOS_DADO[t].toLowerCase());
  return `Semáforo calculado sem dados de ${desligados.join(', ')}`;
}

/** "Batimentos, passos e sono" — usado no passo 2 da conexão do relógio. */
export function descreverAutorizados(c: Consentimentos): string {
  const nomes = tiposAutorizados(c).map((t) => ROTULOS_DADO[t].toLowerCase());
  if (nomes.length === 0) return 'Nenhum dado autorizado ainda';
  const texto = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export interface OpcoesRede {
  cliente?: Pick<ApiClient, 'get' | 'put'>;
}

function normalizar(dados: Partial<Record<TipoDado, unknown>> | null | undefined): Consentimentos {
  const base = { ...CONSENTIMENTO_PADRAO };
  (Object.keys(base) as TipoDado[]).forEach((tipo) => {
    base[tipo] = dados?.[tipo] === true;
  });
  return base;
}

export async function obterConsentimentos({ cliente = apiClient }: OpcoesRede = {}): Promise<Consentimentos> {
  try {
    return normalizar(await cliente.get<Partial<Record<TipoDado, unknown>>>(ROTA_CONSENTIMENTOS));
  } catch (erro) {
    throw traduzir(erro, 'carregar');
  }
}

export async function salvarConsentimentos(
  consentimentos: Consentimentos,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<Consentimentos> {
  try {
    const resposta = await cliente.put<Partial<Record<TipoDado, unknown>> | undefined>(ROTA_CONSENTIMENTOS, consentimentos);
    return resposta ? normalizar(resposta) : { ...consentimentos };
  } catch (erro) {
    throw traduzir(erro, 'salvar');
  }
}
