import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, criarApiClient } from '../apiClient';

interface Chamada {
  url: string;
  method?: string;
  headers: Record<string, string>;
  body?: unknown;
}

function resposta(status: number, corpo?: unknown, tipo = 'application/json'): Response {
  const texto = corpo === undefined ? '' : typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (nome: string) => (nome.toLowerCase() === 'content-type' ? tipo : null) },
    text: async () => texto,
  } as unknown as Response;
}

function criarFetch(respostas: Response[]) {
  const chamadas: Chamada[] = [];
  const fetchFalso = (async (url: string, init: RequestInit = {}) => {
    chamadas.push({
      url,
      method: init.method,
      headers: { ...(init.headers as Record<string, string>) },
      body: init.body,
    });
    const proxima = respostas.shift();
    if (!proxima) throw new Error('fetch chamado mais vezes que o esperado');
    return proxima;
  }) as unknown as typeof fetch;
  return { fetchFalso, chamadas };
}

test('monta a URL a partir da baseUrl e envia Authorization: Bearer', async () => {
  const { fetchFalso, chamadas } = criarFetch([resposta(200, { id: 'p1', nome: 'Maria' })]);
  const api = criarApiClient({
    baseUrl: 'http://gateway.test/',
    fetch: fetchFalso,
    obterToken: async () => 'token-1',
    renovarToken: async () => null,
  });

  const perfil = await api.get<{ id: string; nome: string }>('/api/v1/identity/me');

  assert.deepEqual(perfil, { id: 'p1', nome: 'Maria' });
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, 'http://gateway.test/api/v1/identity/me');
  assert.equal(chamadas[0].method, 'GET');
  assert.equal(chamadas[0].headers.Authorization, 'Bearer token-1');
});

test('POST com objeto envia JSON com Content-Type', async () => {
  const { fetchFalso, chamadas } = criarFetch([resposta(201, { ok: true })]);
  const api = criarApiClient({ baseUrl: 'http://gateway.test', fetch: fetchFalso, obterToken: async () => 't' });

  await api.post('/api/v1/x', { a: 1 });

  assert.equal(chamadas[0].body, '{"a":1}');
  assert.equal(chamadas[0].headers['Content-Type'], 'application/json');
});

test('401 renova o token uma vez e repete a requisição com o token novo', async () => {
  const { fetchFalso, chamadas } = criarFetch([resposta(401), resposta(200, { ok: true })]);
  let renovacoes = 0;
  const api = criarApiClient({
    baseUrl: 'http://gateway.test',
    fetch: fetchFalso,
    obterToken: async () => 'token-velho',
    renovarToken: async () => {
      renovacoes += 1;
      return 'token-novo';
    },
  });

  assert.deepEqual(await api.get('/api/v1/identity/me'), { ok: true });
  assert.equal(renovacoes, 1);
  assert.equal(chamadas.length, 2);
  assert.equal(chamadas[0].headers.Authorization, 'Bearer token-velho');
  assert.equal(chamadas[1].headers.Authorization, 'Bearer token-novo');
});

test('401 depois da renovação não entra em loop: lança ApiError 401', async () => {
  const { fetchFalso, chamadas } = criarFetch([resposta(401), resposta(401, { mensagem: 'Não autorizado' })]);
  let renovacoes = 0;
  const api = criarApiClient({
    baseUrl: 'http://gateway.test',
    fetch: fetchFalso,
    obterToken: async () => 't',
    renovarToken: async () => {
      renovacoes += 1;
      return 't2';
    },
  });

  await assert.rejects(api.get('/api/v1/identity/me'), (err: any) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 401);
    assert.deepEqual(err.corpo, { mensagem: 'Não autorizado' });
    assert.equal(err.message, 'Não autorizado');
    return true;
  });
  assert.equal(renovacoes, 1);
  assert.equal(chamadas.length, 2);
});

test('401 com sessão que não pode ser renovada lança ApiError 401 sem repetir', async () => {
  const { fetchFalso, chamadas } = criarFetch([resposta(401)]);
  const api = criarApiClient({
    baseUrl: 'http://gateway.test',
    fetch: fetchFalso,
    obterToken: async () => 't',
    renovarToken: async () => null,
  });

  await assert.rejects(api.get('/api/v1/identity/me'), (err: any) => err instanceof ApiError && err.status === 401);
  assert.equal(chamadas.length, 1);
});

test('erros HTTP saem tipados com status e corpo', async () => {
  const corpoErro = { codigo: 'PERFIL_NAO_ENCONTRADO', mensagem: 'Usuário sem perfil' };
  const { fetchFalso } = criarFetch([resposta(404, corpoErro)]);
  const api = criarApiClient({ baseUrl: 'http://gateway.test', fetch: fetchFalso, obterToken: async () => 't' });

  await assert.rejects(api.get('/api/v1/identity/me'), (err: any) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 404);
    assert.deepEqual(err.corpo, corpoErro);
    assert.equal(err.url, 'http://gateway.test/api/v1/identity/me');
    return true;
  });
});

test('falha de rede vira ApiError com status 0', async () => {
  const api = criarApiClient({
    baseUrl: 'http://gateway.test',
    fetch: (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch,
    obterToken: async () => 't',
  });

  await assert.rejects(api.get('/api/v1/x'), (err: any) => err instanceof ApiError && err.status === 0 && err.erroDeRede);
});

test('sem sessão não envia Authorization nem tenta renovar', async () => {
  const { fetchFalso, chamadas } = criarFetch([resposta(401)]);
  let renovacoes = 0;
  const api = criarApiClient({
    baseUrl: 'http://gateway.test',
    fetch: fetchFalso,
    obterToken: async () => null,
    renovarToken: async () => {
      renovacoes += 1;
      return 'x';
    },
  });

  await assert.rejects(api.get('/api/v1/x'), (err: any) => err instanceof ApiError && err.status === 401);
  assert.equal(chamadas[0].headers.Authorization, undefined);
  assert.equal(renovacoes, 0);
});

test('204 devolve undefined', async () => {
  const { fetchFalso } = criarFetch([resposta(204)]);
  const api = criarApiClient({ baseUrl: 'http://gateway.test', fetch: fetchFalso, obterToken: async () => 't' });

  assert.equal(await api.delete('/api/v1/x/1'), undefined);
});
