import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  determinarFaixaScore,
  verificarHistoricoMinimo,
  obterExplicacaoMotivo,
  buscarScoreBemEstar,
  AVISO_MEDICO_RN017,
  FAIXAS_SCORE,
} from '../riskScoreService.js';

test('determinarFaixaScore deve classificar faixas da RN-008 corretamente', () => {
  // 0 a 39: Estável (Verde)
  const estavelZero = determinarFaixaScore(0);
  assert.equal(estavelZero.codigo, 'ESTAVEL');
  assert.equal(estavelZero.titulo, 'Tudo bem agora');

  const estavelLimite = determinarFaixaScore(39);
  assert.equal(estavelLimite.codigo, 'ESTAVEL');

  // 40 a 69: Atenção (Laranja)
  const atencaoInicio = determinarFaixaScore(40);
  assert.equal(atencaoInicio.codigo, 'ATENCAO');
  assert.equal(atencaoInicio.titulo, 'Atenção');

  const atencaoLimite = determinarFaixaScore(69);
  assert.equal(atencaoLimite.codigo, 'ATENCAO');

  // 70 a 100: Crítico (Vermelho)
  const criticoInicio = determinarFaixaScore(70);
  assert.equal(criticoInicio.codigo, 'CRITICO');
  assert.equal(criticoInicio.titulo, 'Crítico');

  const criticoCem = determinarFaixaScore(100);
  assert.equal(criticoCem.codigo, 'CRITICO');
});

test('determinarFaixaScore deve reproduzir o Cenário 1 da HU-032 (Score de Maria é 18 -> "Tudo bem agora")', () => {
  const resultado = determinarFaixaScore(18);

  assert.equal(resultado.score, 18);
  assert.equal(resultado.codigo, 'ESTAVEL');
  assert.equal(resultado.titulo, 'Tudo bem agora');
  assert.equal(resultado.cor, '#10B981');
  assert.equal(resultado.corFundo, '#E8F8F0');
});

test('verificarHistoricoMinimo deve sinalizar pouco histórico conforme Cenário 3 da HU-032 e RN-016', () => {
  // Cenário 3 da HU-032: "Dado que há só 2 dias de dados, vejo 'Conhecendo a rotina de Maria: falta 1 dia'"
  const resultado2Dias = verificarHistoricoMinimo(2, 'Maria');

  assert.equal(resultado2Dias.rotinaEmConstrucao, true);
  assert.equal(resultado2Dias.diasFaltantes, 1);
  assert.equal(resultado2Dias.mensagem, 'Conhecendo a rotina de Maria: falta 1 dia');

  // 1 dia de dados
  const resultado1Dia = verificarHistoricoMinimo(1, 'Maria');
  assert.equal(resultado1Dia.rotinaEmConstrucao, true);
  assert.equal(resultado1Dia.diasFaltantes, 2);
  assert.equal(resultado1Dia.mensagem, 'Conhecendo a rotina de Maria: falta 2 dias');

  // 3 dias de dados (atinge limite da RN-016)
  const resultado3Dias = verificarHistoricoMinimo(3, 'Maria');
  assert.equal(resultado3Dias.rotinaEmConstrucao, false);
  assert.equal(resultado3Dias.diasFaltantes, 0);
});

test('obterExplicacaoMotivo deve reproduzir Cenários 1 e 2 da HU-033 em linguagem simples', () => {
  // Cenário 1 (Atenção - Laranja)
  const explicacaoLaranja = obterExplicacaoMotivo({ score: 55, nomeIdoso: 'Maria' });
  assert.equal(explicacaoLaranja.faixaCodigo, 'ATENCAO');
  assert.ok(
    explicacaoLaranja.fatores.includes('Os passos caíram 60% em relação à semana passada'),
    'Deve conter motivo de redução de passos'
  );
  assert.ok(
    explicacaoLaranja.fatores.includes('Batimento em repouso 12% acima do normal dela'),
    'Deve conter motivo de elevação de FC repouso'
  );

  // Cenário 2 (Estável - Verde)
  const explicacaoVerde = obterExplicacaoMotivo({ score: 18, nomeIdoso: 'Maria' });
  assert.equal(explicacaoVerde.faixaCodigo, 'ESTAVEL');
  assert.ok(
    explicacaoVerde.fatores.includes('Sinais dentro do normal de Maria'),
    'Deve conter mensagem de estabilidade'
  );
});

test('obterExplicacaoMotivo deve anexar aviso médico da RN-017 e conduta de emergência se Crítico', () => {
  const explicacaoEstavel = obterExplicacaoMotivo({ score: 20 });
  assert.equal(
    explicacaoEstavel.avisoMedico,
    'Informação de apoio ao cuidado; não substitui avaliação médica.'
  );

  const explicacaoCritica = obterExplicacaoMotivo({ score: 85, nomeIdoso: 'Dona Maria' });
  assert.equal(
    explicacaoCritica.avisoMedico,
    'Informação de apoio ao cuidado; não substitui avaliação médica.'
  );
  assert.ok(
    explicacaoCritica.recomendacaoAcao.includes('SAMU (192)'),
    'Crítico deve sugerir SAMU (192) se idoso não atender'
  );
});

test('buscarScoreBemEstar deve retornar paywall para plano FREE conforme HU-034 e RN-014', async () => {
  const resultadoFree = await buscarScoreBemEstar('e3b0c442-98fc-1c14-9afc-432100000001', 'FREE');

  assert.equal(resultadoFree.requerPremium, true);
  assert.ok(resultadoFree.mensagemPaywall.includes('Premium'));
  assert.ok(resultadoFree.beneficioPaywall.includes('14 dias'));
});

test('buscarScoreBemEstar deve retornar score normalizado para plano PREMIUM', async () => {
  const resultado = await buscarScoreBemEstar('e3b0c442-98fc-1c14-9afc-432100000001', 'PREMIUM');

  assert.equal(resultado.requerPremium, false);
  assert.equal(resultado.score, 18);
  assert.equal(resultado.faixa.codigo, 'ESTAVEL');
  assert.equal(resultado.faixa.titulo, 'Tudo bem agora');
  assert.equal(resultado.rotinaEmConstrucao, false);
  assert.ok(resultado.explicacao);
  assert.equal(resultado.explicacao.avisoMedico, AVISO_MEDICO_RN017);
});
