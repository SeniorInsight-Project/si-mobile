export interface TipoDadoDispositivoMock {
  id: string;
  nome: string;
  ativo: boolean;
  revogadoPeloIdoso: boolean;
  detalhe: string;
}

export interface StatusDispositivoMock {
  idosoId: string;
  nomeIdoso: string;
  modeloCelular: string;
  versaoApp: string;
  sistemaOperacional: string;
  nivelBateria: number;
  conectado: boolean;
  ultimaSincronizacao: string;
  tiposDados: TipoDadoDispositivoMock[];
}

export const STATUS_DISPOSITIVO_MOCK: Record<string, StatusDispositivoMock> = {
  'e3b0c442-98fc-1c14-9afc-432100000001': {
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    nomeIdoso: 'Dona Maria',
    modeloCelular: 'Samsung Galaxy A15',
    versaoApp: 'v1.0.4 (Build 42)',
    sistemaOperacional: 'Android 14',
    nivelBateria: 62,
    conectado: true,
    ultimaSincronizacao: '2026-11-06T10:15:00.000Z',
    tiposDados: [
      {
        id: 'passos',
        nome: 'Passos e Movimentação',
        ativo: true,
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via Health Connect',
      },
      {
        id: 'batimentos',
        nome: 'Frequência Cardíaca',
        ativo: true,
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via Smartwatch',
      },
      {
        id: 'oxigenacao',
        nome: 'Oxigenação (SpO2)',
        ativo: false,
        revogadoPeloIdoso: true,
        detalhe: 'Desativada pelo idoso',
      },
      {
        id: 'gps',
        nome: 'Localização em Tempo Real',
        ativo: true,
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via GPS do celular',
      },
      {
        id: 'queda',
        nome: 'Detecção de Queda',
        ativo: true,
        revogadoPeloIdoso: false,
        detalhe: 'Ativo via sensores do relógio',
      },
    ],
  },
};
