import { runtimeConfig } from '../config/runtime.js';
import { resolverTokenAutorizacao } from './tokenStorageService.js';

export const INITIAL_ELDERLIES = [
  {
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    nome: 'Dona Maria Aparecida',
    dataNascimento: '14/05/1948',
    sexo: 'Feminino',
    celular: '(11) 98765-4321',
  },
];

let localElderliesStore = [...INITIAL_ELDERLIES];

function normalizarIdoso(idoso) {
  return {
    idosoId: idoso.idosoId || idoso.id || `idoso-local-${Date.now()}`,
    nome: idoso.nome || idoso.nomeCompleto || '',
    dataNascimento: idoso.dataNascimento || '',
    sexo: idoso.sexo || '',
    celular: idoso.celular || idoso.telefone || '',
  };
}

export async function listarIdososDoFamiliar(familiarId = 'familiar-dev', token = null) {
  try {
    const authToken = await resolverTokenAutorizacao(token);
    const headers = { Accept: 'application/json' };
    if (authToken) headers.Authorization = 'Bearer ' + authToken;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/familiares/${familiarId}/idosos`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.warn(`[elderlyService] Falha ao listar idosos (${response.status}). Usando fallback local.`);
      return [...localElderliesStore];
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      localElderliesStore = data.map(normalizarIdoso);
      return [...localElderliesStore];
    }

    return [...localElderliesStore];
  } catch (error) {
    console.warn('[elderlyService] Backend inacessível. Ativando fallback resiliente:', error.message);
    return [...localElderliesStore];
  }
}

export async function salvarCadastroIdoso(dadosIdoso, token = null) {
  const payload = {
    nome: dadosIdoso.nome,
    dataNascimento: dadosIdoso.dataNascimento,
    sexo: dadosIdoso.sexo,
    celular: dadosIdoso.celular,
  };

  try {
    const authToken = await resolverTokenAutorizacao(token);
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (authToken) headers.Authorization = 'Bearer ' + authToken;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const criado = normalizarIdoso(await response.json());
      localElderliesStore = [
        criado,
        ...localElderliesStore.filter((idoso) => idoso.idosoId !== criado.idosoId),
      ];
      return criado;
    }
  } catch (error) {
    console.warn('[elderlyService] Falha ao salvar idoso no backend. Salvando localmente:', error.message);
  }

  const novoIdoso = {
    idosoId: dadosIdoso.idosoId || `idoso-local-${Date.now()}`,
    nome: dadosIdoso.nome,
    dataNascimento: dadosIdoso.dataNascimento,
    sexo: dadosIdoso.sexo,
    celular: dadosIdoso.celular,
  };

  localElderliesStore = [
    novoIdoso,
    ...localElderliesStore.filter((idoso) => idoso.idosoId !== novoIdoso.idosoId),
  ];

  return novoIdoso;
}

export async function atualizarDadosIdoso(idosoId, dadosIdoso, token = null) {
  const payload = {
    nome: dadosIdoso.nome,
    dataNascimento: dadosIdoso.dataNascimento,
    sexo: dadosIdoso.sexo,
    celular: dadosIdoso.celular,
  };

  try {
    const authToken = await resolverTokenAutorizacao(token);
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (authToken) headers.Authorization = 'Bearer ' + authToken;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const atualizado = normalizarIdoso(await response.json());
      localElderliesStore = localElderliesStore.map((idoso) =>
        idoso.idosoId === idosoId ? atualizado : idoso
      );
      return atualizado;
    }
  } catch (error) {
    console.warn('[elderlyService] Falha ao atualizar idoso no backend. Atualizando localmente:', error.message);
  }

  const atualizadoLocal = {
    idosoId,
    nome: dadosIdoso.nome,
    dataNascimento: dadosIdoso.dataNascimento,
    sexo: dadosIdoso.sexo,
    celular: dadosIdoso.celular,
  };

  localElderliesStore = localElderliesStore.map((idoso) =>
    idoso.idosoId === idosoId ? atualizadoLocal : idoso
  );

  return atualizadoLocal;
}

export function obterIdosoLocalPorId(idosoId) {
  return localElderliesStore.find((idoso) => idoso.idosoId === idosoId) || null;
}
