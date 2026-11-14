import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { mockPermitido } from '../../config/ambiente';

describe('Regra única do mock (mockPermitido)', () => {
  test('caso 1: deve retornar true apenas com __DEV__=true e EXPO_PUBLIC_USAR_MOCK=true', () => {
    assert.equal(mockPermitido(true, 'true'), true);
    assert.equal(mockPermitido(true, '1'), true);
  });

  test('caso 2: deve retornar false em dev se EXPO_PUBLIC_USAR_MOCK for false ou vazio', () => {
    assert.equal(mockPermitido(true, 'false'), false);
    assert.equal(mockPermitido(true, ''), false);
    assert.equal(mockPermitido(true, null), false);
  });

  test('caso 3: deve retornar false em produção mesmo se EXPO_PUBLIC_USAR_MOCK for true', () => {
    assert.equal(mockPermitido(false, 'true'), false);
    assert.equal(mockPermitido(false, '1'), false);
  });

  test('caso 4: deve retornar false em produção com mock desligado', () => {
    assert.equal(mockPermitido(false, 'false'), false);
    assert.equal(mockPermitido(false, null), false);
  });
});
