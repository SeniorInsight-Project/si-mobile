import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { extrairMensagemErro } from '../erroHelper';
import { ApiError } from '../apiClient';

describe('Helper de mensagens de erro do contrato (extrairMensagemErro)', () => {
  test('deve ler mensagem de objeto com campo mensagem', () => {
    assert.equal(extrairMensagemErro({ mensagem: 'Idoso não encontrado' }), 'Idoso não encontrado');
  });

  test('deve ler mensagem de objeto com campo message', () => {
    assert.equal(extrairMensagemErro({ message: 'Resource not found' }), 'Resource not found');
  });

  test('deve priorizar mensagem sobre message quando ambos existirem', () => {
    assert.equal(extrairMensagemErro({ mensagem: 'Mensagem PT', message: 'Mensagem EN' }), 'Mensagem PT');
  });

  test('deve ler campo error se mensagem/message não existirem', () => {
    assert.equal(extrairMensagemErro({ error: 'Bad Request' }), 'Bad Request');
  });

  test('deve extrair mensagem de instância ApiError', () => {
    const apiError = new ApiError(400, { mensagem: 'Código inválido' }, '/api/v1/pareamentos');
    assert.equal(extrairMensagemErro(apiError), 'Código inválido');
  });

  test('deve retornar mensagem amigável para erro de rede (status 0)', () => {
    const redeError = new ApiError(0, null, '/api/v1/qualquer');
    assert.equal(extrairMensagemErro(redeError), 'Não foi possível falar com o servidor. Verifique sua conexão.');
  });

  test('deve usar fallback para valores nulos, vazios ou indefinidos', () => {
    assert.equal(extrairMensagemErro(null, 'Falha geral'), 'Falha geral');
    assert.equal(extrairMensagemErro(undefined, 'Falha geral'), 'Falha geral');
    assert.equal(extrairMensagemErro({}, 'Falha geral'), 'Falha geral');
  });
});
