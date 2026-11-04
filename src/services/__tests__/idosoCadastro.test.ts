import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cadastrarIdoso, CadastroIdosoError } from '../idosoCadastroService';
import { ApiError } from '../apiClient';

const DADOS = { nome: '  Maria Aparecida Silva ', dataNascimento: '14/05/1948', sexo: 'Feminino' };
const clienteOk = (resposta: unknown) => {
  const chamadas: any[] = [];
  return { chamadas, post: (async (c: string, b: unknown) => { chamadas.push({ c, b }); return resposta; }) as any };
};
const clienteFalha = (status: number) => ({ post: (async () => { throw new ApiError(status, null, 'u'); }) as any });

describe('Cadastro do idoso pelo contrato care-v1 (HU-008)', () => {
  test('envia nomeCompleto, dataNascimento em ISO e genero para POST /api/v1/idosos', async () => {
    const cliente = clienteOk({ id: 'id-1', nomeCompleto: 'Maria Aparecida Silva', dataNascimento: '1948-05-14', genero: 'Feminino', comorbidades: [] });
    const idoso = await cadastrarIdoso(DADOS, cliente);
    assert.equal(cliente.chamadas[0].c, '/api/v1/idosos');
    assert.deepEqual(cliente.chamadas[0].b, { nomeCompleto: 'Maria Aparecida Silva', dataNascimento: '1948-05-14', genero: 'Feminino' });
    assert.equal(idoso.idosoId, 'id-1');
    assert.equal(idoso.nome, 'Maria Aparecida Silva');
  });

  test('o celular não é enviado: o contrato não tem esse campo', async () => {
    const cliente = clienteOk({ id: 'id-1', nomeCompleto: 'M', dataNascimento: '1948-05-14' });
    await cadastrarIdoso({ ...DADOS, celular: '(61) 98123-4567' } as any, cliente);
    assert.ok(!('celular' in cliente.chamadas[0].b));
  });

  test('data inválida nem chega ao servidor', async () => {
    const cliente = clienteOk({});
    await assert.rejects(cadastrarIdoso({ ...DADOS, dataNascimento: '31/02/1950' }, cliente), CadastroIdosoError);
    assert.equal(cliente.chamadas.length, 0);
  });

  test('erros do servidor viram mensagens; nada é salvo localmente', async () => {
    await assert.rejects(cadastrarIdoso(DADOS, clienteFalha(0)), (e: any) => e instanceof CadastroIdosoError && e.semConexao);
    await assert.rejects(cadastrarIdoso(DADOS, clienteFalha(409)), /já está cadastrado/);
    await assert.rejects(cadastrarIdoso(DADOS, clienteFalha(400)), /Confira os dados/);
    await assert.rejects(cadastrarIdoso(DADOS, clienteFalha(403)), /permissão/);
    await assert.rejects(cadastrarIdoso(DADOS, clienteFalha(500)), /Não foi possível salvar/);
  });
});
