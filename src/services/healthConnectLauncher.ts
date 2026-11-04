import { Linking, Platform } from 'react-native';
import { PACOTE_HEALTH_CONNECT } from './relogioService';

/** Abre o Health Connect (ou a página dele na Play Store). Devolve false se não houve como abrir. */
export async function abrirHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const destinos = [
    `market://details?id=${PACOTE_HEALTH_CONNECT}`,
    `https://play.google.com/store/apps/details?id=${PACOTE_HEALTH_CONNECT}`,
  ];
  for (const url of destinos) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // tenta o próximo destino
    }
  }
  return false;
}
