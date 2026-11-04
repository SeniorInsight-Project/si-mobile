import { apiClient, ApiClient, ApiError } from './apiClient';
import { papeisDoToken, salvarSessao, RespostaTokens } from './authSession';

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
  CODIGO_INVALIDO: 'Código não encontrado. Confira com seu familiar.',
  CODIGO_VENCIDO: 'Código vencido. Peça um novo ao seu familiar.',
  CODIGO_USADO: 'Este código já foi usado. Peça um novo ao seu familiar.',
  TENTATIVAS: 'Muitas tentativas. Espere um pouco e tente de novo.',
  SEM_PERMISSAO: 'Só o familiar pode gerar o código de pareamento.',
  SEM_CONEXAO: 'Sem internet. Conecte-se e tente de novo.',
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

export type PlataformaAparelho = 'ANDROID' | 'IOS';

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
  timeoutMs?: number;
}

interface RespostaResgate {
  perfil: { id: string; nome: string };
  sessaoAparelhoId: string;
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
}

/** Idoso: troca o código por uma sessão. Salva os tokens e devolve quem é o idoso. */
export async function parearComCodigo(
  entrada: string,
  aparelho: Aparelho,
  { cliente = apiClient, salvar = salvarSessao, timeoutMs = TIMEOUT_REDE_MS }: DependenciasPareamento = {}
): Promise<ResultadoPareamento> {
  const codigo = sanitizarCodigo(entrada);
  if (!codigoValido(codigo)) throw new PareamentoError('CODIGO_INCOMPLETO');

  const { signal, limpar } = comTimeout(timeoutMs);
  let resposta: RespostaResgate;
  try {
    resposta = await cliente.post<RespostaResgate>(
      '/api/v1/identity/pareamentos/resgates',
      { codigo, identificadorAparelho: aparelho.identificador, plataforma: aparelho.plataforma },
      { autenticado: false, signal }
    );
  } catch (erro) {
    throw traduzirErro(erro, true);
  } finally {
    limpar();
  }

  const { accessToken, refreshToken, expiresIn } = resposta.tokens;
  await salvar({ accessToken, refreshToken, expiresIn });

  return {
    perfilId: resposta.perfil.id,
    nomeIdoso: resposta.perfil.nome,
    sessaoAparelhoId: resposta.sessaoAparelhoId,
    papeis: papeisDoToken(accessToken),
  };
}

interface RespostaCodigo {
  codigo: string;
  qrCodeConteudo: string;
  expiraEm: string;
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
      { nomeIdoso: dados.nomeIdoso, ...(dados.idosoId ? { idosoId: dados.idosoId } : {}) },
      { signal }
    );
    return { codigo: r.codigo, qrCodeConteudo: r.qrCodeConteudo, expiraEm: Date.parse(r.expiraEm) };
  } catch (erro) {
    throw traduzirErro(erro, false);
  } finally {
    limpar();
  }
}
