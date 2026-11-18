import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ModalSheet from './ModalSheet';
import InitialsAvatar from './InitialsAvatar';
import Icon from './Icon';
import Button from './Button';
import { colors, font, rounded } from '../theme';

/**
 * Folha da conta (aberta pelo avatar do header), no mesmo estilo do seletor de idoso.
 * "Sair" pede confirmação dentro da própria folha, sem Alert do sistema.
 */
export interface OpcaoConta {
  id: string;
  rotulo: string;
  icone: string;
  onPress: () => void;
  destrutiva?: boolean;
}

export interface ContaSheetProps {
  visible: boolean;
  onClose: () => void;
  nomeUsuario?: string | null;
  opcoes: OpcaoConta[];
  onSair?: () => void;
}

export default function ContaSheet({ visible, onClose, nomeUsuario, opcoes, onSair }: ContaSheetProps) {
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  useEffect(() => {
    if (!visible) setConfirmandoSaida(false);
  }, [visible]);

  const escolher = (opcao: OpcaoConta) => {
    onClose();
    opcao.onPress();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Sua conta">
      <View style={styles.identidade}>
        <InitialsAvatar nome={nomeUsuario} size={48} />
        <Text style={styles.nomeUsuario} numberOfLines={2}>
          {nomeUsuario || 'Sua conta'}
        </Text>
      </View>

      {confirmandoSaida ? (
        <View style={styles.confirmacao} testID="conta-confirmar-saida">
          <Text style={styles.confirmacaoTitulo}>Sair da conta?</Text>
          <Text style={styles.confirmacaoTexto}>Os dados salvos neste aparelho serão apagados.</Text>
          <Button
            title="Sair agora"
            iconLeft="logout"
            variant="danger"
            onPress={() => {
              onClose();
              onSair?.();
            }}
          />
          <Button title="Cancelar" variant="secondary" onPress={() => setConfirmandoSaida(false)} />
        </View>
      ) : (
        <View style={styles.lista}>
          {opcoes.map((opcao) => (
            <TouchableOpacity
              key={opcao.id}
              style={styles.linha}
              onPress={() => escolher(opcao)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={opcao.rotulo}
              testID={`conta-${opcao.id}`}
            >
              <View style={[styles.icone, opcao.destrutiva && styles.iconeDestrutivo]}>
                <Icon name={opcao.icone} size={20} color={opcao.destrutiva ? colors.error : colors.primary} />
              </View>
              <Text style={[styles.rotulo, opcao.destrutiva && styles.rotuloDestrutivo]} numberOfLines={2}>
                {opcao.rotulo}
              </Text>
              <Icon name="chevron_right" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          ))}

          {onSair ? (
            <TouchableOpacity
              style={styles.linha}
              onPress={() => setConfirmandoSaida(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
              testID="conta-sair"
            >
              <View style={[styles.icone, styles.iconeDestrutivo]}>
                <Icon name="logout" size={20} color={colors.error} />
              </View>
              <Text style={[styles.rotulo, styles.rotuloDestrutivo]}>Sair</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  identidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  nomeUsuario: {
    flex: 1,
    fontSize: 18,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  lista: {
    gap: 8,
  },
  linha: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: rounded.lg,
  },
  icone: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    backgroundColor: colors.sky.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeDestrutivo: {
    backgroundColor: colors.peach.background,
  },
  rotulo: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    ...font('heading', 600),
  },
  rotuloDestrutivo: {
    color: colors.error,
  },
  confirmacao: {
    gap: 12,
  },
  confirmacaoTitulo: {
    fontSize: 18,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  confirmacaoTexto: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    ...font('body', 400),
  },
});
