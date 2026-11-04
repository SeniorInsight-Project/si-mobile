import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import QrScanner from '../components/QrScanner';
import { colors, typography } from '../theme';
import {
  PareamentoError,
  ResultadoPareamento,
  extrairCodigoDoQr,
  parearComCodigo,
} from '../services/pareamentoService';
import { obterAparelho } from '../services/aparelhoService';

export interface ElderlyQrScanScreenProps {
  onNavigate: (screen: string) => void;
  onPareado: (resultado: ResultadoPareamento) => void;
}

/** Figma: "Idoso - Entrar com QR Code" (HU-007). A câmera lê o QR e `lerPayloadQr` valida e conecta. */
export default function ElderlyQrScanScreen({ onNavigate, onPareado }: ElderlyQrScanScreenProps) {
  const [status, setStatus] = useState<'procurando' | 'validando' | 'erro'>('procurando');
  const [mensagem, setMensagem] = useState('');

  const lerPayloadQr = async (payload: string) => {
    const codigo = extrairCodigoDoQr(payload);
    if (!codigo) {
      setStatus('erro');
      setMensagem('Este QR Code não é do SeniorInsight.');
      return;
    }
    try {
      setStatus('validando');
      const resultado = await parearComCodigo(codigo, await obterAparelho());
      onPareado(resultado);
      onNavigate('ElderlyConnected');
    } catch (erro) {
      setStatus('erro');
      setMensagem(erro instanceof PareamentoError ? erro.message : 'Não foi possível conectar agora. Tente de novo.');
    }
  };

  const textoStatus =
    status === 'procurando' ? 'Procurando o código' : status === 'validando' ? 'Conectando...' : mensagem;

  return (
    <ScreenWrapper hasHeader={false} style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => onNavigate('EntryApp')}
            accessibilityRole="button"
            accessibilityLabel="Fechar a câmera e voltar"
            testID="qr-fechar"
          >
            <Icon name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.topTitle} accessibilityRole="header">
            Ler QR Code
          </Text>
        </View>

        <Text style={styles.instruction}>Aponte a câmera para o código que aparece no celular do seu familiar.</Text>

        <View style={[styles.viewfinder, status === 'erro' && styles.viewfinderError]} testID="qr-visor">
          <QrScanner
            onScanned={lerPayloadQr}
            pausado={status === 'validando'}
            onUsarCodigo={() => onNavigate('ElderlyEnterCode')}
          />
        </View>

        <View
          style={[styles.statusChip, status === 'erro' && styles.statusChipError]}
          accessibilityRole={status === 'erro' ? 'alert' : 'text'}
          accessibilityLiveRegion="polite"
          testID="qr-status"
        >
          <Icon
            name={status === 'erro' ? 'error' : 'qr_code_scanner'}
            size={22}
            color={status === 'erro' ? colors.peachBg : colors.white}
          />
          <Text style={styles.statusText}>{textoStatus}</Text>
        </View>

        <TouchableOpacity
          style={styles.codeButton}
          onPress={() => onNavigate('ElderlyEnterCode')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Digitar o código em vez de ler o QR Code"
          testID="qr-digitar-codigo"
        >
          <Icon name="dialpad" size={24} color={colors.primary} />
          <Text style={styles.codeButtonText}>Digitar o código</Text>
        </TouchableOpacity>

        <Text style={styles.privacy}>O app usa a câmera só para ler o código. Nenhuma foto é guardada.</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.navyDark },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 20, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  instruction: {
    marginTop: 12,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.white,
    fontFamily: typography.fontFamily.heading,
  },
  viewfinder: {
    marginTop: 28,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: colors.successDark,
    backgroundColor: colors.primaryNavyDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  viewfinderError: { borderColor: colors.errorBright },
  statusChip: {
    marginTop: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    maxWidth: '100%',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: colors.primaryNavyDeep,
  },
  statusChipError: { backgroundColor: colors.coralDark },
  statusText: { flexShrink: 1, fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.body },
  codeButton: {
    marginTop: 28,
    minHeight: 64,
    borderRadius: 9999,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  codeButtonText: { fontSize: 20, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  privacy: {
    marginTop: 20,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    color: colors.outlineVariant,
    fontFamily: typography.fontFamily.body,
  },
});
