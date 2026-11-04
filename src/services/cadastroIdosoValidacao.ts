/**
 * Validação e máscaras do cadastro do idoso (HU-008 / RF-006, RN-012).
 * Funções puras, sem dependência de React, para serem testadas isoladamente.
 */

/** Idade mínima para a qual o Score de Risco foi calibrado (DRS, HU-008 cenário 3). */
export const IDADE_MINIMA_SCORE = 49;

export interface CadastroIdosoForm {
  nome: string;
  dataNascimento: string;
  sexo: string;
  celular: string;
}

export type CadastroIdosoErros = Partial<Record<keyof CadastroIdosoForm, string>>;

export interface ResultadoValidacaoCadastro {
  valido: boolean;
  erros: CadastroIdosoErros;
  avisoIdade: boolean;
}

export function formatarCelular(texto: string): string {
  const numeros = texto.replace(/\D/g, '').slice(0, 11);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

export function formatarData(texto: string): string {
  const numeros = texto.replace(/\D/g, '').slice(0, 8);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

export function parseDataBr(data: string, hoje: Date = new Date()): Date | null {
  const match = /^([0-3]\d)\/([0-1]\d)\/(\d{4})$/.exec(data);
  if (!match) return null;

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);
  const date = new Date(ano, mes - 1, dia);

  if (
    ano < 1900 ||
    date.getFullYear() !== ano ||
    date.getMonth() !== mes - 1 ||
    date.getDate() !== dia ||
    date > hoje
  ) {
    return null;
  }
  return date;
}

/** "14/05/1948" -> "1948-05-14" (formato do contrato); null se a data não for válida. */
export function dataBrParaIso(data: string, hoje: Date = new Date()): string | null {
  const d = parseDataBr(data, hoje);
  if (!d) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function calcularIdade(dataNascimento: string, hoje: Date = new Date()): number | null {
  const nascimento = parseDataBr(dataNascimento, hoje);
  if (!nascimento) return null;

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

export function validarCadastroIdoso(
  form: CadastroIdosoForm,
  hoje: Date = new Date()
): ResultadoValidacaoCadastro {
  const erros: CadastroIdosoErros = {};

  if (form.nome.trim().length < 3) {
    erros.nome = 'Informe o nome completo do idoso.';
  }

  if (!form.dataNascimento.trim()) {
    erros.dataNascimento = 'Informe a data de nascimento';
  } else if (!parseDataBr(form.dataNascimento, hoje)) {
    erros.dataNascimento = 'Data de nascimento inválida. Use DD/MM/AAAA.';
  }

  if (!form.sexo) {
    erros.sexo = 'Selecione o sexo.';
  }

  const celularNumeros = form.celular.replace(/\D/g, '');
  if (!form.celular.trim()) {
    erros.celular = 'Informe o celular.';
  } else if (celularNumeros.length < 10 || celularNumeros.length > 11) {
    erros.celular = 'Celular inválido. Use DDD + número.';
  }

  const idade = calcularIdade(form.dataNascimento, hoje);
  const avisoIdade = idade !== null && idade < IDADE_MINIMA_SCORE;

  return { valido: Object.keys(erros).length === 0, erros, avisoIdade };
}
