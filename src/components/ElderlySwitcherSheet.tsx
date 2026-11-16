import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ModalSheet from './ModalSheet';
import InitialsAvatar from './InitialsAvatar';
import Icon from './Icon';
import Button from './Button';
import { colors, font, rounded } from '../theme';
import { useIdoso } from '../context/IdosoContext';
import { Idoso, listarIdososDoFamiliar } from '../services/elderlyService';

/**
 * Folha para trocar o idoso monitorado (aberta pela seta do header).
 * Atualiza o IdosoContext; as telas que dependem de `idosoId` recarregam sozinhas.
 */
export interface ElderlySwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
  onCadastrar?: () => void;
}

export default function ElderlySwitcherSheet({ visible, onClose, onCadastrar }: ElderlySwitcherSheetProps) {
  const { idosoId, setIdosoId, setNomeIdoso } = useIdoso();
  const [idosos, setIdosos] = useState<Idoso[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = () => {
    setCarregando(true);
    setErro(null);
    listarIdososDoFamiliar()
      .then(setIdosos)
      .catch(() => setErro('Não foi possível carregar seus idosos agora.'))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    if (visible) carregar();
  }, [visible]);

  const escolher = (idoso: Idoso) => {
    setIdosoId(idoso.idosoId);
    setNomeIdoso(idoso.nome);
    onClose();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Quem você está acompanhando">
      {carregando ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : erro ? (
        <View style={styles.erroBox}>
          <Text style={styles.erroText}>{erro}</Text>
          <Button title="Tentar de novo" iconLeft="refresh" variant="secondary" fullWidth={false} onPress={carregar} />
        </View>
      ) : (
        <View style={styles.lista}>
          {idosos.map((idoso) => {
            const selecionado = idoso.idosoId === idosoId;
            return (
              <TouchableOpacity
                key={idoso.idosoId}
                style={[styles.linha, selecionado && styles.linhaSelecionada]}
                onPress={() => escolher(idoso)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: selecionado }}
                accessibilityLabel={`Acompanhar ${idoso.nome}`}
              >
                <InitialsAvatar nome={idoso.nome} size={40} />
                <Text style={[styles.nome, selecionado && styles.nomeSelecionado]} numberOfLines={1}>
                  {idoso.nome}
                </Text>
                {selecionado ? <Icon name="check" size={22} color={colors.primary} /> : null}
              </TouchableOpacity>
            );
          })}

          {onCadastrar ? (
            <TouchableOpacity
              style={styles.linha}
              onPress={() => {
                onClose();
                onCadastrar();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <View style={styles.addIcone}>
                <Icon name="add" size={20} color={colors.primary} />
              </View>
              <Text style={styles.addTexto}>Cadastrar novo idoso</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginVertical: 24,
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  linhaSelecionada: {
    backgroundColor: colors.sky.background,
    borderColor: colors.sky.border,
  },
  nome: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    ...font('heading', 600),
  },
  nomeSelecionado: {
    color: colors.primary,
    ...font('heading', 700),
  },
  addIcone: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTexto: {
    fontSize: 16,
    color: colors.primary,
    ...font('heading', 700),
  },
  erroBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  erroText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    ...font('body', 500),
  },
});
