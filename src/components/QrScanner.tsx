import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Button from './Button';
import { colors, typography, font } from '../theme';

export interface QrScannerProps {
  /** Chamado uma vez por leitura, com o texto do QR. */
  onScanned: (dados: string) => void;
  /** Pausa a leitura (ex.: enquanto valida o código). */
  pausado?: boolean;
  /** Plano B quando não há câmera/permissão. */
  onUsarCodigo: () => void;
}

/**
 * Leitor de QR Code pela câmera traseira (HU-007).
 * A câmera só lê o código: nada é gravado nem enviado (aviso da própria tela).
 */
export default function QrScanner({ onScanned, pausado = false, onUsarCodigo }: QrScannerProps) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const ultimoLido = useRef<{ dados: string; em: number } | null>(null);

  if (!permissao) {
    return (
      <View style={styles.box} accessibilityLiveRegion="polite">
        <Text style={styles.text}>Preparando a câmera...</Text>
      </View>
    );
  }

  if (!permissao.granted) {
    const podePedir = permissao.canAskAgain;
    return (
      <View style={styles.box} testID="qr-sem-permissao">
        <Text style={styles.title}>Precisamos da câmera</Text>
        <Text style={styles.text}>
          {podePedir
            ? 'Ela serve só para ler o código do seu familiar.'
            : 'A câmera está bloqueada. Libere nas configurações do celular ou digite o código.'}
        </Text>
        {podePedir && (
          <Button
            title="Permitir a câmera"
            variant="success"
            size="xl"
            onPress={pedirPermissao}
            accessibilityLabel="Permitir o uso da câmera para ler o QR Code"
            testID="qr-pedir-permissao"
          />
        )}
        <Button
          title="Digitar o código"
          variant="ghost"
          onPress={onUsarCodigo}
          accessibilityLabel="Digitar o código em vez de usar a câmera"
          testID="qr-sem-camera-digitar"
        />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        accessibilityLabel="Câmera procurando o QR Code"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          pausado
            ? undefined
            : ({ data }) => {
                const agora = Date.now();
                const anterior = ultimoLido.current;
                // a câmera dispara várias vezes por segundo: ignora a mesma leitura repetida
                if (anterior && anterior.dados === data && agora - anterior.em < 3000) return;
                ultimoLido.current = { dados: data, em: agora };
                onScanned(data);
              }
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: colors.primaryNavyDeep,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  title: { fontSize: 20,  color: colors.white, textAlign: 'center', ...font('heading', 700) },
  text: { fontSize: 18, lineHeight: 24, color: colors.outlineVariant, textAlign: 'center', ...font('body', 400) },
  button: { minHeight: 56, paddingHorizontal: 20, borderRadius: 9999, backgroundColor: colors.successDark, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 18,  color: colors.white, ...font('heading', 700) },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 18,  color: colors.white, textDecorationLine: 'underline', ...font('heading', 700) },
});
