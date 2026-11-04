import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, typography } from '../theme';

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
      <View style={styles.box}>
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
          <TouchableOpacity
            style={styles.button}
            onPress={pedirPermissao}
            accessibilityRole="button"
            testID="qr-pedir-permissao"
          >
            <Text style={styles.buttonText}>Permitir a câmera</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.link} onPress={onUsarCodigo} accessibilityRole="button">
          <Text style={styles.linkText}>Digitar o código</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
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
  title: { fontSize: 18, fontWeight: '700', color: colors.white, textAlign: 'center', fontFamily: typography.fontFamily.heading },
  text: { fontSize: 14, lineHeight: 20, color: colors.outlineVariant, textAlign: 'center', fontFamily: typography.fontFamily.body },
  button: { minHeight: 48, paddingHorizontal: 20, borderRadius: 9999, backgroundColor: colors.successDark, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 16, fontWeight: '700', color: colors.white, textDecorationLine: 'underline', fontFamily: typography.fontFamily.heading },
});
