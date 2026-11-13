/**
 * Separação de visões por papel (RN-011 — princípio do menor privilégio).
 *
 * - FAMILIAR: painel, remédios, rede, contatos, perfil do idoso, cadastro, código de pareamento,
 *   Central de Alertas e SOS recebido.
 * - IDOSO: só o próprio Modo Idoso, a confirmação de remédios, "Meus Dados" e "Meu Relógio".
 *   Não vê painel familiar, rede, perfil/comorbidades, contatos, alertas nem cadastro de outros idosos.
 *   Excluir conta (HU-022) vale para os dois: "idoso ou familiar administrador".
 */
export type PapelApp = 'FAMILIAR' | 'IDOSO';

/** Telas abertas a qualquer pessoa antes de entrar (login, cadastro, escolha de perfil). */
export const TELAS_PUBLICAS: readonly string[] = [
  'Onboarding',
  'EntryApp',
  'Login',
  'ConfirmarEmail',
  'AcessoRestrito',
  'AcceptInvite',
  'ElderlyQrScan',
  'ElderlyEnterCode',
];

export const TELAS_IDOSO: readonly string[] = [
  'ElderlyConnected',
  'ElderlyMode',
  'Medicines',
  'ElderlyData',
  'ElderlyWatch',
  'DeleteAccount',
];

export const TELAS_FAMILIAR: readonly string[] = [
  'Home',
  'Medicines',
  'Family',
  'EmergencyContacts',
  'ElderlyProfile',
  'ElderlyMode',
  'RegisterElderly',
  'PairingCode',
  'Alerts',
  'SosReceived',
  'DeleteAccount',
  'Premium',
];

export const TELA_INICIAL: Record<PapelApp, string> = {
  FAMILIAR: 'Home',
  IDOSO: 'ElderlyMode',
};

export function podeAcessar(papel: PapelApp | null, tela: string): boolean {
  if (TELAS_PUBLICAS.includes(tela)) return true;
  if (papel === 'IDOSO') return TELAS_IDOSO.includes(tela);
  if (papel === 'FAMILIAR') return TELAS_FAMILIAR.includes(tela);
  return false;
}

/** Devolve a tela pedida se o papel puder abri-la; senão, a tela inicial do papel (ou a entrada). */
export function resolverNavegacao(papel: PapelApp | null, destino: string): string {
  if (podeAcessar(papel, destino)) return destino;
  return papel ? TELA_INICIAL[papel] : 'EntryApp';
}

/** Abas da barra inferior de cada papel. */
export interface AbaNavegacao {
  id: string;
  label: string;
  icon: string;
}

export const ABAS_POR_PAPEL: Record<PapelApp, AbaNavegacao[]> = {
  FAMILIAR: [
    { id: 'Home', label: 'Início', icon: 'vital_signs' },
    { id: 'Medicines', label: 'Remédios', icon: 'medication' },
    { id: 'ElderlyMode', label: 'SOS Idoso', icon: 'crisis_alert' },
    { id: 'Family', label: 'Família', icon: 'groups' },
  ],
  IDOSO: [
    { id: 'ElderlyMode', label: 'Início', icon: 'crisis_alert' },
    { id: 'Medicines', label: 'Remédios', icon: 'medication' },
    { id: 'ElderlyData', label: 'Meus Dados', icon: 'shield_check' },
    { id: 'ElderlyWatch', label: 'Relógio', icon: 'watch' },
  ],
};
