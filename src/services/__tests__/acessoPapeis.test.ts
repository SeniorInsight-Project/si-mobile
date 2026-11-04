import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  podeAcessar,
  resolverNavegacao,
  ABAS_POR_PAPEL,
  TELAS_FAMILIAR,
  TELAS_IDOSO,
  TELAS_PUBLICAS,
} from '../acessoService';

const SO_FAMILIA = ['Home', 'Family', 'EmergencyContacts', 'ElderlyProfile', 'RegisterElderly', 'PairingCode', 'Alerts', 'SosReceived'];
const SO_IDOSO = ['ElderlyData', 'ElderlyWatch', 'ElderlyConnected'];

describe('Separação de visões por papel (RN-011)', () => {
  test('idoso não acessa nenhuma tela do familiar', () => {
    for (const tela of SO_FAMILIA) {
      assert.equal(podeAcessar('IDOSO', tela), false, `idoso não deveria abrir ${tela}`);
    }
  });

  test('familiar não acessa as telas de dados e relógio do idoso (só o idoso autoriza — HU-018)', () => {
    for (const tela of ['ElderlyData', 'ElderlyWatch', 'ElderlyConnected']) {
      assert.equal(podeAcessar('FAMILIAR', tela), false, `familiar não deveria abrir ${tela}`);
    }
  });

  test('idoso acessa modo idoso, remédios, dados e relógio', () => {
    for (const tela of ['ElderlyMode', 'Medicines', 'ElderlyData', 'ElderlyWatch']) {
      assert.equal(podeAcessar('IDOSO', tela), true);
    }
  });

  test('familiar acessa painel, remédios, rede, perfil, cadastro e código', () => {
    for (const tela of ['Home', 'Medicines', 'Family', 'EmergencyContacts', 'ElderlyProfile', 'RegisterElderly', 'PairingCode', 'Alerts', 'SosReceived']) {
      assert.equal(podeAcessar('FAMILIAR', tela), true);
    }
  });

  test('telas que não existem mais (esqueci a senha, 2FA de protótipo) não estão liberadas', () => {
    for (const tela of ['ForgotPassword', 'TwoFactorAuth']) {
      assert.equal(podeAcessar(null, tela), false);
      assert.equal(podeAcessar('FAMILIAR', tela), false);
    }
  });

  test('AcessoRestrito (papel sem tela, ex.: gestor) abre sem papel de familiar nem de idoso', () => {
    assert.equal(podeAcessar(null, 'AcessoRestrito'), true);
  });

  test('sem papel (antes de entrar) só as telas públicas abrem', () => {
    for (const tela of TELAS_PUBLICAS) assert.equal(podeAcessar(null, tela), true);
    for (const tela of [...SO_FAMILIA, ...SO_IDOSO, 'ElderlyMode', 'Medicines']) {
      assert.equal(podeAcessar(null, tela), false, `${tela} exige entrar antes`);
    }
  });

  test('tela desconhecida nunca é liberada', () => {
    assert.equal(podeAcessar('FAMILIAR', 'Admin'), false);
    assert.equal(podeAcessar('IDOSO', 'Admin'), false);
  });

  test('resolverNavegacao manda o idoso de volta ao Modo Idoso e o anônimo à Entrada', () => {
    assert.equal(resolverNavegacao('IDOSO', 'Home'), 'ElderlyMode');
    assert.equal(resolverNavegacao('IDOSO', 'Family'), 'ElderlyMode');
    assert.equal(resolverNavegacao('FAMILIAR', 'ElderlyData'), 'Home');
    assert.equal(resolverNavegacao(null, 'Home'), 'EntryApp');
    assert.equal(resolverNavegacao('IDOSO', 'ElderlyWatch'), 'ElderlyWatch');
  });

  test('toda aba da barra inferior de cada papel é uma tela que o papel pode abrir', () => {
    for (const papel of ['FAMILIAR', 'IDOSO'] as const) {
      for (const aba of ABAS_POR_PAPEL[papel]) {
        assert.equal(podeAcessar(papel, aba.id), true, `${papel}: aba ${aba.id} deve ser acessível`);
      }
    }
  });

  test('as abas do idoso não incluem nada do familiar', () => {
    const ids = ABAS_POR_PAPEL.IDOSO.map((a) => a.id);
    for (const tela of SO_FAMILIA) assert.ok(!ids.includes(tela));
  });

  test('listas de telas não têm duplicatas', () => {
    for (const lista of [TELAS_FAMILIAR, TELAS_IDOSO, TELAS_PUBLICAS]) {
      assert.equal(new Set(lista).size, lista.length);
    }
  });

  test('Excluir conta (HU-022) vale para idoso e familiar, mas não para quem ainda não entrou', () => {
    assert.equal(podeAcessar('IDOSO', 'DeleteAccount'), true);
    assert.equal(podeAcessar('FAMILIAR', 'DeleteAccount'), true);
    assert.equal(podeAcessar(null, 'DeleteAccount'), false);
  });

  test('o idoso é mandado de volta ao Modo Idoso se tentar a Central de Alertas ou o SOS recebido', () => {
    assert.equal(resolverNavegacao('IDOSO', 'Alerts'), 'ElderlyMode');
    assert.equal(resolverNavegacao('IDOSO', 'SosReceived'), 'ElderlyMode');
  });
});
