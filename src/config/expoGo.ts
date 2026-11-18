import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * true quando o app roda dentro do Expo Go (cliente da loja), e não num build instalado.
 *
 * O Expo Go não tem os módulos nativos do Open Wearables (Health Connect/HealthKit) nem o push remoto do
 * expo-notifications. Os serviços que dependem deles consultam este valor e viram no-op. Aceita os dois sinais
 * (executionEnvironment e appOwnership), porque nem toda versão do Expo Go preenche os dois.
 */
export const ehExpoGo: boolean =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.appOwnership === 'expo';

export const AVISO_EXPO_GO_RELOGIO =
  'A conexão com o relógio está disponível no app instalado. No Expo Go, esta tela só mostra os passos.';
