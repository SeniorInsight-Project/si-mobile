export interface IdosoMock {
  idosoId: string;
  nome: string;
  dataNascimento: string;
  sexo: string;
  celular: string;
}

export const INITIAL_ELDERLIES: IdosoMock[] = [
  {
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    nome: 'Dona Maria Aparecida',
    dataNascimento: '14/05/1948',
    sexo: 'Feminino',
    celular: '(11) 98765-4321',
  },
];
