import type { Consentimentos } from './mappers/consentimentos';
import {
  limparTelemetriaLocal,
  obterTelemetriaLocal,
  salvarTelemetriaLocal,
  type ConsentimentoLocal,
} from './telemetriaLocalDatabase';

/**
 * Mantém o cache de telemetria (HU-030) de acordo com as autorizações do idoso (HU-018 / LGPD Art. 11).
 *
 * Ao receber autorizações confirmadas pelo servidor, guarda-as no cache (para a tela saber, sem internet,
 * o que pode mostrar) e apaga o valor de cada tipo revogado. Não importa o consentimentoService, que
 * chama este módulo depois de salvar.
 */
export function consentimentoLocalDe(c: Consentimentos): ConsentimentoLocal {
  return { passos: c.PASSOS === true, batimentos: c.BATIMENTOS === true };
}

/** Lança se o cache falhar; use `sincronizarCacheComConsentimentos` para a versão que não lança. */
export async function aplicarConsentimentosAoCache(idosoId: string, c: Consentimentos): Promise<void> {
  const consentimento = consentimentoLocalDe(c);
  const atual = await obterTelemetriaLocal(idosoId);
  const passosHoje = consentimento.passos ? atual?.passosHoje ?? null : null;
  const frequenciaCardiaca = consentimento.batimentos ? atual?.frequenciaCardiaca ?? null : null;
  const semValor = passosHoje === null && frequenciaCardiaca === null;
  await salvarTelemetriaLocal({
    idosoId,
    passosHoje,
    frequenciaCardiaca,
    coletadoEm: semValor ? null : atual?.coletadoEm ?? null,
    consentimento,
  });
}

function descrever(erro: unknown): string {
  return erro instanceof Error ? erro.name : typeof erro;
}

/**
 * Aplica as autorizações ao cache. Se não der, apaga o registro do idoso: na dúvida, o dado de um tipo
 * revogado não pode continuar no aparelho. Não lança; falhas vão para o log.
 */
export async function sincronizarCacheComConsentimentos(idosoId: string, c: Consentimentos): Promise<void> {
  try {
    await aplicarConsentimentosAoCache(idosoId, c);
  } catch (erro) {
    console.warn(`[telemetriaCache] Não foi possível atualizar o cache; apagando o registro (${descrever(erro)}).`);
    try {
      await limparTelemetriaLocal(idosoId);
    } catch (erroLimpeza) {
      console.warn(`[telemetriaCache] Não foi possível apagar o cache de telemetria (${descrever(erroLimpeza)}).`);
    }
  }
}
