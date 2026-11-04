import type {
  CodigoPareamento,
  GerarCodigoPareamentoRequest,
  ResgatarCodigoPareamentoRequest,
  ResultadoPareamentoApi,
} from '../types/api';
import { apiClient, ApiError, type ApiClient } from './apiClient';
import { papeisDoToken, salvarSessao, type RespostaTokens } from './authSession';
import { marcarAparelhoPareado } from './aparelhoPareadoService';

/**
 * Pareamento do celular do idoso por código ou QR (HU-007 / HU-008 / RF-006), conforme o contrato
 * identity-v1 do si-contracts:
 *
 * - POST /api/v1/identity/pareamentos/codigos  (familiar): o SERVIDOR gera o código (6 a 8 letras e números,
 *   uso único, expira em poucos minutos) e o conteúdo do QR (`seniorinsight://pareamento?codigo=...`).
 * - POST /api/v1/identity/pareamentos/resgates (idoso, rota pública): troca o código por uma sessão; os tokens
 *   devolvidos são salvos no secure store e o papel passa a vir do token.
 *
 * Não há código gerado nem validado no aparelho, nem códigos de demonstração: se o servidor não responde,
 * o app mostra o erro.
 */
export const CODIGO_MIN = 6;
export const CODIGO_MAX = 8;
export const TIMEOUT_REDE_MS = 10000;

export type ErroPareamento =
  | 'CODIGO_INCOMPLETO'
  | 'CODIGO_INVALIDO'
  | 'CODIGO_VENCIDO'
  | 'CODIGO_USADO'
  | 'TENTATIVAS'
  | 'SEM_PERMISSAO'
  | 'SEM_CONEXAO'
  | 'FALHA';

export const MENSAGENS_PAREAMENTO: Record<ErroPareamento, string> = {
  CODIGO_INCOMPLETO: 'Digite o código completo, com 6 a 8 letras e números.',
  CODIGO_INVALIDO: 'Código não encontrado',
  CODIGO_VENCIDO: 'Código vencido. Peça um novo ao seu familiar',
  CODIGO_USADO: 'Esse código já foi usado',
  TENTATIVAS: 'Muitas tentativas. Espere um pouco e tente de novo.',
  SEM_PERMISSAO: 'Só o familiar administrador pode gerar o código',
  SEM_CONEXAO: 'Sem internet. Conecte o celular ao Wi-Fi ou aos dados móveis e tente de novo.',
  FALHA: 'Não foi possível concluir agora. Tente de novo.',
};

export class PareamentoError extends Error {
  readonly tipo: ErroPareamento;
  constructor(tipo: ErroPareamento) {
    super(MENSAGENS_PAREAMENTO[tipo]);
    this.name = 'PareamentoError';
    this.tipo = tipo;
  }
}

/** Enum `Plataforma` do contrato identity-v1. */
export type PlataformaAparelho = 'ANDROID' | 'IOS';

/** `Platform.OS` -> `Plataforma` do contrato. O app só é distribuído para Android e iOS. */
export function plataformaDoContrato(os: string): PlataformaAparelho {
  return os === 'ios' ? 'IOS' : 'ANDROID';
}

export interface Aparelho {
  identificador: string;
  plataforma: PlataformaAparelho;
}

export interface ResultadoPareamento {
  perfilId: string;
  nomeIdoso: string;
  sessaoAparelhoId: string;
  /** Roles de realm lidas do access token recebido. */
  papeis: string[];
}

export interface CodigoGerado {
  codigo: string;
  qrCodeConteudo: string;
  /** Epoch ms em que o código expira. */
  expiraEm: number;
}

/** Maiúsculas, só A-Z e 0-9, no máximo 8 — usado pela máscara do campo de código. */
export function sanitizarCodigo(texto: string): string {
  return String(texto ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODIGO_MAX);
}

export function codigoValido(texto: string): boolean {
  return /^[A-Z0-9]{6,8}$/.test(texto);
}

/** "K7P2QX" -> "K7P 2QX" (exibição do código na tela do familiar). */
export function formatarCodigoExibicao(codigo: string): string {
  const limpo = sanitizarCodigo(codigo);
  return limpo.length > 3 ? `${limpo.slice(0, 3)} ${limpo.slice(3)}` : limpo;
}

/** Lê o conteúdo do QR (seniorinsight://pareamento?codigo=XXXXXX) e devolve o código, ou null. */
export function extrairCodigoDoQr(conteudo: string): string | null {
  const m = /^seniorinsight:\/\/pareamento\?(?:[^#]*&)?codigo=([A-Za-z0-9]{6,8})(?:&[^#]*)?$/.exec(
    String(conteudo ?? '').trim()
  );
  return m ? m[1].toUpperCase() : null;
}

/**
 * Deep link já interpretado pelo `Linking.parse` (seniorinsight://pareamento?codigo=XXXXXX): devolve o código
 * em maiúsculas, ou null se o link não é de pareamento ou o código não segue o contrato.
 */
export function codigoDoDeepLink(link: {
  hostname?: string | null;
  path?: string | null;
  queryParams?: Record<string, unknown> | null;
}): string | null {
  const destino = [link.hostname, link.path].filter(Boolean).join('/').replace(/^\/+|\/+$/g, '');
  if (destino !== 'pareamento') return null;
  const bruto = link.queryParams?.codigo;
  if (typeof bruto !== 'string') return null;
  const codigo = bruto.trim().toUpperCase();
  return codigoValido(codigo) ? codigo : null;
}

/** Texto de compartilhamento do código — sem nome nem dado de saúde (LGPD). */
export function montarMensagemCompartilhamento(codigo: string, expiraEmMs?: number): string {
  const validade = expiraEmMs
    ? `O código vale até ${new Date(expiraEmMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : 'O código vale por pouco tempo';
  return (
    `Código do SeniorInsight: ${formatarCodigoExibicao(codigo)}. ` +
    'Abra o app no celular do idoso e escolha "Sou idoso". ' +
    `${validade} e só pode ser usado uma vez.`
  );
}

/** "Dona Maria" / "Seu João" quando o sexo é conhecido; só o primeiro nome quando não é. */
export function saudacaoIdoso(nomeCompleto: string, sexo = ''): string {
  const partes = nomeCompleto
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((parte, indice) => !(indice === 0 && /^(dona|seu|sr\.?|sra\.?)$/i.test(parte)));
  const primeiroNome = partes[0] ?? '';
  if (!primeiroNome) return '';
  const s = sexo.trim().toLowerCase();
  if (s.startsWith('f')) return `Dona ${primeiroNome}`;
  if (s.startsWith('m')) return `Seu ${primeiroNome}`;
  return primeiroNome;
}

/** Boas-vindas depois do pareamento (HU-007, cenário 1): "Olá, Maria". */
export function mensagemBoasVindas(nomeCompleto: string): string {
  const nome = saudacaoIdoso(nomeCompleto);
  return nome ? `Olá, ${nome}` : 'Olá!';
}

function traduzirErro(erro: unknown, aoResgatar: boolean): PareamentoError {
  if (erro instanceof PareamentoError) return erro;
  if (erro instanceof ApiError) {
    if (erro.erroDeRede) return new PareamentoError('SEM_CONEXAO');
    switch (erro.status) {
      case 400:
      case 404:
        return new PareamentoError(aoResgatar ? 'CODIGO_INVALIDO' : 'FALHA');
      case 403:
        return new PareamentoError('SEM_PERMISSAO');
      case 409:
        return new PareamentoError('CODIGO_USADO');
      case 410:
        return new PareamentoError('CODIGO_VENCIDO');
      case 429:
        return new PareamentoError('TENTATIVAS');
    }
  }
  return new PareamentoError('FALHA');
}

function comTimeout(ms: number): { signal: AbortSignal; limpar: () => void } {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), ms);
  return { signal: controlador.signal, limpar: () => clearTimeout(temporizador) };
}

export interface DependenciasPareamento {
  cliente?: Pick<ApiClient, 'post'>;
  salvar?: (tokens: RespostaTokens) => Promise<void>;
  /** Guarda que este aparelho foi pareado (abre sempre no Modo Idoso). */
  marcarPareado?: (dados: { perfilId: string; nome: string }) => Promise<unknown>;
  timeoutMs?: number;
}

/** ResultadoPareamento do contrato identity-v1. */
type RespostaResgate = ResultadoPareamentoApi;

/** Idoso: troca o código por uma sessão. Salva os tokens e devolve quem é o idoso. */
export async function parearComCodigo(
  entrada: string,
  aparelho: Aparelho,
  {
    cliente = apiClient,
    salvar = salvarSessao,
    marcarPareado = marcarAparelhoPareado,
    timeoutMs = TIMEOUT_REDE_MS,
  }: DependenciasPareamento = {}
): Promise<ResultadoPareamento> {
  const codigo = sanitizarCodigo(entrada);
  if (!codigoValido(codigo)) throw new PareamentoError('CODIGO_INCOMPLETO');

  const { signal, limpar } = comTimeout(timeoutMs);
  let resposta: RespostaResgate;
  try {
    resposta = await cliente.post<RespostaResgate>(
      '/api/v1/identity/pareamentos/resgates',
      {
        codigo,
        identificadorAparelho: aparelho.identificador,
        plataforma: aparelho.plataforma,
      } satisfies ResgatarCodigoPareamentoRequest,
      { autenticado: false, signal }
    );
  } catch (erro) {
    throw traduzirErro(erro, true);
  } finally {
    limpar();
  }

  const { accessToken, refreshToken, expiresIn } = resposta.tokens;
  // salvarSessao grava access/refresh com salvarTokens (secure store) e a expiração.
  await salvar({ accessToken, refreshToken, expiresIn });
  await marcarPareado({ perfilId: resposta.perfil.id, nome: resposta.perfil.nome });

  return {
    perfilId: resposta.perfil.id,
    nomeIdoso: resposta.perfil.nome,
    sessaoAparelhoId: resposta.sessaoAparelhoId,
    papeis: papeisDoToken(accessToken),
  };
}

/** CodigoPareamento do contrato identity-v1. */
type RespostaCodigo = CodigoPareamento;

/** Quanto falta para o código vencer, para a tela do familiar. */
export interface Validade {
  vencido: boolean;
  /** Segundos que faltam (0 quando vencido). */
  segundos: number;
  /** "Vence em 9 min 05 s", "Vence em 45 s" ou "Código vencido". */
  texto: string;
}

export function validadeDoCodigo(expiraEmMs: number, agoraMs: number = Date.now()): Validade {
  const segundos = Math.max(0, Math.ceil((expiraEmMs - agoraMs) / 1000));
  if (!Number.isFinite(expiraEmMs) || segundos <= 0) return { vencido: true, segundos: 0, texto: 'Código vencido' };
  const h = Math.floor(segundos / 3600);
  const min = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const dois = (n: number) => String(n).padStart(2, '0');
  const texto =
    h > 0 ? `Vence em ${h} h ${dois(min)} min` : min > 0 ? `Vence em ${min} min ${dois(s)} s` : `Vence em ${s} s`;
  return { vencido: false, segundos, texto };
}

/** Familiar: pede ao servidor um novo código (o anterior deixa de valer no servidor). */
export async function gerarCodigoPareamento(
  dados: { nomeIdoso: string; idosoId?: string | null },
  { cliente = apiClient, timeoutMs = TIMEOUT_REDE_MS }: Pick<DependenciasPareamento, 'cliente' | 'timeoutMs'> = {}
): Promise<CodigoGerado> {
  const { signal, limpar } = comTimeout(timeoutMs);
  try {
    const r = await cliente.post<RespostaCodigo>(
      '/api/v1/identity/pareamentos/codigos',
      { nomeIdoso: dados.nomeIdoso, ...(dados.idosoId ? { idosoId: dados.idosoId } : {}) } satisfies GerarCodigoPareamentoRequest,
      { signal }
    );
    // Só exibe o que o servidor gerou e no formato do contrato; resposta incompleta vira erro, nunca um código local.
    const codigo = typeof r?.codigo === 'string' ? r.codigo : '';
    const qrCodeConteudo = typeof r?.qrCodeConteudo === 'string' ? r.qrCodeConteudo.trim() : '';
    const expiraEm = typeof r?.expiraEm === 'string' ? Date.parse(r.expiraEm) : NaN;
    if (!codigoValido(codigo) || !qrCodeConteudo || !Number.isFinite(expiraEm)) {
      throw new PareamentoError('FALHA');
    }
    return { codigo, qrCodeConteudo, expiraEm };
  } catch (erro) {
    throw traduzirErro(erro, false);
  } finally {
    limpar();
  }
}
