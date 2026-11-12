import type { ConsentimentosApi } from '../../types/api';

/**
 * Camada anticorrupção do contexto de consentimentos: traduz o DTO `Consentimentos` do care-v1
 * para o modelo do app e de volta. Só `true` vale como autorizado (LGPD Art. 11: o consentimento
 * é explícito); qualquer outra coisa recebida do servidor conta como não autorizada.
 */
export type Consentimentos = ConsentimentosApi;

export function consentimentosDoContrato(dto: ConsentimentosApi): Consentimentos {
  return {
    BATIMENTOS: dto.BATIMENTOS === true,
    PASSOS: dto.PASSOS === true,
    SONO: dto.SONO === true,
    OXIGENACAO: dto.OXIGENACAO === true,
    LOCALIZACAO: dto.LOCALIZACAO === true,
  };
}

/** Monta o corpo do PUT só com as chaves do contrato, sem repassar campo estranho. */
export function consentimentosParaContrato(consentimentos: Consentimentos): ConsentimentosApi {
  return {
    BATIMENTOS: consentimentos.BATIMENTOS,
    PASSOS: consentimentos.PASSOS,
    SONO: consentimentos.SONO,
    OXIGENACAO: consentimentos.OXIGENACAO,
    LOCALIZACAO: consentimentos.LOCALIZACAO,
  };
}
