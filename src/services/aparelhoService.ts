import { Platform } from 'react-native';
import type { Aparelho, PlataformaAparelho } from './pareamentoService';

/**
 * Identificação deste aparelho para o pareamento (campo `identificadorAparelho` do contrato).
 * O identificador é um UUID gerado uma vez e guardado no secure store; não é número de telefone,
 * IMEI nem nada que identifique a pessoa.
 */
const CHAVE = 'si_aparelho_id';
let emMemoria: string | null = null;

function plataformaAtual(): PlataformaAparelho {
  return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
}

export async function obterAparelho(): Promise<Aparelho> {
  if (emMemoria) return { identificador: emMemoria, plataforma: plataformaAtual() };

  let armazenado: string | null = null;
  let store: any = null;
  try {
    store = await import('expo-secure-store');
    armazenado = await store.getItemAsync(CHAVE);
  } catch {
    store = null;
  }

  if (!armazenado) {
    const { randomUUID } = await import('expo-crypto');
    armazenado = randomUUID();
    try {
      await store?.setItemAsync(CHAVE, armazenado);
    } catch {
      // sem secure store (ex.: web): vale só até fechar o app
    }
  }
  emMemoria = armazenado;
  return { identificador: armazenado, plataforma: plataformaAtual() };
}
