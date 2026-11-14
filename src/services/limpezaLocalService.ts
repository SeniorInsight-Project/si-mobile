/**
 * Limpeza do aparelho depois que o pedido de exclusão da conta é aceito (HU-022 / RF-015 / RNF-017).
 *
 * Apaga tudo o que o app guarda localmente sobre o titular:
 * - os bancos SQLite (arquivo inteiro, não só as linhas): contatos, medicamentos, SOS e relógio;
 * - todas as chaves do `expo-secure-store`: tokens, marca de aparelho pareado e identificador do aparelho;
 * - o estado em memória dos serviços e os lembretes de remédio agendados.
 *
 * Cada etapa roda isolada: se uma falhar, a falha é registrada só com o nome da etapa (a mensagem do erro
 * pode trazer nome, telefone ou remédio) e as outras continuam.
 *
 * Banco novo com `openDatabaseSync` precisa entrar em `etapasLimpezaPadrao`.
 */
import { solicitarExclusao, type ComprovanteExclusao, type ExclusaoOptions } from './exclusaoContaService';
import { TOKEN_STORAGE_KEYS, apagarItemSeguro } from './tokenStorageService';
import { CHAVE_APARELHO_PAREADO } from './aparelhoPareadoService';
import { CHAVE_IDENTIFICADOR_APARELHO, esquecerIdentificadorAparelho } from './aparelhoService';
import { apagarBancoContatos } from './contatoEmergenciaDatabase';
import { apagarBancoMedicamentos } from './medicamentoDatabase';
import { apagarBancoSos } from './sosDatabase';
import { apagarBancoRelogio } from './relogioDatabase';
import { descartarFilaSosEmMemoria } from './sosQueueService';
import { descartarContatosEmMemoria } from './contatoEmergenciaService';
import { descartarRotinasEmMemoria } from './medicamentoService';
import { descartarIdososEmMemoria } from './elderlyService';
import { esquecerIdentificadorAparelhoPush } from './pushService';
import { limparCacheTiles } from './osmTileService';
import { cancelarTodosLembretes } from './notificacaoMedicamentoService';

export interface EtapaLimpeza {
  /** Nome sem dado pessoal; é o que vai para o log quando a etapa falha. */
  nome: string;
  executar: () => Promise<void> | void;
}

export interface ResultadoLimpeza {
  /** Nomes das etapas que falharam. */
  falhas: string[];
}

/** Todas as chaves que o app grava no `expo-secure-store`. */
export const CHAVES_SECURE_STORE: readonly string[] = [
  TOKEN_STORAGE_KEYS.ACCESS_TOKEN,
  TOKEN_STORAGE_KEYS.REFRESH_TOKEN,
  TOKEN_STORAGE_KEYS.ACCESS_TOKEN_EXPIRES_AT,
  CHAVE_APARELHO_PAREADO,
  CHAVE_IDENTIFICADOR_APARELHO,
];

export function etapasLimpezaPadrao(): EtapaLimpeza[] {
  return [
    // Memória antes dos bancos: os reenvios do SOS param antes de a fila sumir e nada reabre o SQLite.
    { nome: 'memoria:sos', executar: descartarFilaSosEmMemoria },
    { nome: 'memoria:contatos', executar: descartarContatosEmMemoria },
    { nome: 'memoria:medicamentos', executar: descartarRotinasEmMemoria },
    { nome: 'memoria:idosos', executar: descartarIdososEmMemoria },
    { nome: 'memoria:aparelho', executar: esquecerIdentificadorAparelho },
    { nome: 'memoria:push', executar: esquecerIdentificadorAparelhoPush },
    { nome: 'memoria:mapa', executar: limparCacheTiles },
    {
      nome: 'lembretes',
      executar: async () => {
        if (!(await cancelarTodosLembretes())) throw new Error('lembretes não cancelados');
      },
    },
    { nome: 'banco:contatos', executar: apagarBancoContatos },
    { nome: 'banco:medicamentos', executar: apagarBancoMedicamentos },
    { nome: 'banco:sos', executar: apagarBancoSos },
    { nome: 'banco:relogio', executar: apagarBancoRelogio },
    ...CHAVES_SECURE_STORE.map((chave) => ({ nome: `secure-store:${chave}`, executar: () => apagarItemSeguro(chave) })),
  ];
}

/** Roda todas as etapas, mesmo que alguma falhe. Não lança. */
export async function apagarDadosLocais(etapas: EtapaLimpeza[] = etapasLimpezaPadrao()): Promise<ResultadoLimpeza> {
  const falhas: string[] = [];
  for (const etapa of etapas) {
    try {
      await etapa.executar();
    } catch (erro) {
      falhas.push(etapa.nome);
      const tipo = erro instanceof Error ? erro.name : typeof erro;
      console.warn(`[limpezaLocal] Falha ao apagar ${etapa.nome} (${tipo}).`);
    }
  }
  return { falhas };
}

export interface ExclusaoNoAparelhoOptions extends ExclusaoOptions {
  etapas?: EtapaLimpeza[];
}

/**
 * Pede a exclusão ao servidor e, só se ele aceitar, apaga os dados do aparelho.
 * Se o pedido falhar, o ExclusaoError sobe e nada é apagado.
 */
export async function excluirContaEDadosLocais(
  confirmacao: string,
  { etapas, ...opcoes }: ExclusaoNoAparelhoOptions = {}
): Promise<{ comprovante: ComprovanteExclusao; limpeza: ResultadoLimpeza }> {
  const comprovante = await solicitarExclusao(confirmacao, opcoes);
  const limpeza = await apagarDadosLocais(etapas);
  return { comprovante, limpeza };
}
