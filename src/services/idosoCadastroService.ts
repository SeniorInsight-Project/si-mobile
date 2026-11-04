import type { IdosoApi, IdosoRequest } from '../types/api';
import { apiClient, ApiError, type ApiClient } from './apiClient';
import type { Idoso } from './elderlyService';
import { dataBrParaIso } from './cadastroIdosoValidacao';

/**
 * Cadastro do idoso pelo contrato care-v1 (POST /api/v1/idosos) — HU-008.
 *
 * O contrato só tem `nomeCompleto`, `dataNascimento` (ISO) e `genero` (além de campos de endereço e saúde
 * que esta tela não coleta). O celular do idoso que o Figma e o HU-008 pedem NÃO tem campo no contrato:
 * a tela o coleta, mas ele não é enviado até o campo existir (ver o PR).
 */
export class CadastroIdosoError extends Error {
  readonly semConexao: boolean;
  constructor(mensagem: string, semConexao = false) {
    super(mensagem);
    this.name = 'CadastroIdosoError';
    this.semConexao = semConexao;
  }
}

export interface DadosCadastroIdoso {
  nome: string;
  dataNascimento: string; // DD/MM/AAAA
  sexo: string;
}


export async function cadastrarIdoso(
  dados: DadosCadastroIdoso,
  cliente: Pick<ApiClient, 'post'> = apiClient
): Promise<Idoso> {
  const dataIso = dataBrParaIso(dados.dataNascimento);
  if (!dataIso) throw new CadastroIdosoError('Data de nascimento inválida. Use DD/MM/AAAA.');

  try {
    const corpo: IdosoRequest = {
      nomeCompleto: dados.nome.trim(),
      dataNascimento: dataIso,
      genero: dados.sexo || null,
    };
    const criado = await cliente.post<IdosoApi>('/api/v1/idosos', corpo);
    return {
      idosoId: criado.id,
      nome: criado.nomeCompleto,
      dataNascimento: dados.dataNascimento,
      sexo: criado.genero ?? dados.sexo,
      celular: '',
    };
  } catch (erro) {
    if (erro instanceof ApiError) {
      if (erro.erroDeRede) throw new CadastroIdosoError('Sem internet. Conecte-se e tente de novo.', true);
      if (erro.status === 409) throw new CadastroIdosoError('Este idoso já está cadastrado.');
      if (erro.status === 400) throw new CadastroIdosoError('Confira os dados informados e tente de novo.');
      if (erro.status === 401 || erro.status === 403) throw new CadastroIdosoError('Você não tem permissão para cadastrar.');
    }
    throw new CadastroIdosoError('Não foi possível salvar agora. Tente de novo.');
  }
}
