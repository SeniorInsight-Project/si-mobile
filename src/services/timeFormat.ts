/**
 * Utilitários para formatação e validação de horários de rotina e dosagem
 */

/**
 * Converte e mascara entrada manual de texto para o formato de horário HH:mm
 *
 * @param {string} valorAtual - Valor anterior do input
 * @param {string} novoValor - Novo texto inserido pelo usuário
 * @returns {string} Texto formatado com máscara HH:mm
 */
export function formatarHorarioInput(valorAtual = '', novoValor = '') {
  if (!novoValor) return '';
  const apenasNumeros = novoValor.replace(/\D/g, '').slice(0, 4);
  if (!apenasNumeros) return '';

  // Se o usuário está apagando caracteres (backspace)
  if (novoValor.length < valorAtual.length) {
    if (apenasNumeros.length <= 2) {
      return apenasNumeros;
    }
    return `${apenasNumeros.slice(0, 2)}:${apenasNumeros.slice(2)}`;
  }

  let horas = apenasNumeros.slice(0, 2);
  let minutos = apenasNumeros.slice(2, 4);

  // Ajuste inteligente das horas (00-23)
  if (horas.length === 1 && parseInt(horas, 10) > 2) {
    horas = `0${horas}`;
  } else if (horas.length === 2 && parseInt(horas, 10) > 23) {
    horas = '23';
  }

  // Ajuste inteligente dos minutos (00-59)
  if (minutos.length === 1 && parseInt(minutos, 10) > 5) {
    minutos = '5';
  } else if (minutos.length === 2 && parseInt(minutos, 10) > 59) {
    minutos = '59';
  }

  if (apenasNumeros.length > 2 || horas.length === 2) {
    return minutos ? `${horas}:${minutos}` : `${horas}:`;
  }

  return horas;
}

/**
 * Normaliza um horário digitado para o formato padrão HH:mm (ex: "8" -> "08:00")
 *
 * @param {string} horario
 * @returns {string|null} Horário normalizado ou null se inválido
 */
export function normalizarHorario(horario = '') {
  const limpo = (horario || '').trim();
  if (!limpo) return null;

  if (/^\d{1,2}$/.test(limpo)) {
    const h = parseInt(limpo, 10);
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, '0')}:00`;
    }
  } else if (/^\d{1,2}:\d{1,2}$/.test(limpo)) {
    const [hStr, mStr] = limpo.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(limpo) ? limpo : null;
}
