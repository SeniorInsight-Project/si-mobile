import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  LayoutAnimation,
  UIManager,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Icon from '../components/Icon';
import { colors, typography, rounded, shadows } from '../theme';
import {
  listarContatos,
  salvarContato,
  removerContato,
  reordenarContatos,
} from '../services/contatoEmergenciaService.js';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animarTransiçãoLista = () => {
  LayoutAnimation.configureNext({
    duration: 320,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.spring,
      springDamping: 0.82,
    },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
};

const PARENTESCO_OPCOES = [
  'Filho(a)',
  'Neto(a)',
  'Cônjuge',
  'Cuidador(a)',
  'Vizinho(a)',
  'Médico(a)',
];

function DraggableContactCard({
  contato,
  index,
  total,
  onMove,
  onCall,
  onRemove,
}) {
  const panY = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);
  const [cardSlotHeight, setCardSlotHeight] = useState(96);
  const slotHeightRef = React.useRef(96);
  slotHeightRef.current = cardSlotHeight;
  const indexRef = React.useRef(index);
  indexRef.current = index;

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          setIsDragging(true);
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch (e) {}
          Animated.spring(scale, {
            toValue: 1.025,
            friction: 7,
            tension: 140,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderMove: (_, gestureState) => {
          // O card acompanha suavemente o dedo sem alterar a ordem durante o movimento
          panY.setValue(gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          // Borda de seleção desaparece imediatamente ao soltar o dedo
          setIsDragging(false);

          // Animação de retorno elástico suave
          Animated.parallel([
            Animated.spring(panY, {
              toValue: 0,
              friction: 7,
              tension: 130,
              useNativeDriver: true,
            }),
            Animated.spring(scale, {
              toValue: 1,
              friction: 7,
              tension: 130,
              useNativeDriver: true,
            }),
          ]).start();

          // A posição só é alterada quando o card passar TOTALMENTE do outro:
          // Exige que o deslocamento ultrapasse quase por completo a altura do card vizinho (~88%)
          const slotH = slotHeightRef.current || 96;
          const PASS_THRESHOLD = slotH * 0.88;
          let slotsMoved = 0;

          if (gestureState.dy > PASS_THRESHOLD) {
            slotsMoved = Math.floor((gestureState.dy - PASS_THRESHOLD) / slotH) + 1;
          } else if (gestureState.dy < -PASS_THRESHOLD) {
            slotsMoved = -(Math.floor((Math.abs(gestureState.dy) - PASS_THRESHOLD) / slotH) + 1);
          }

          const targetIndex = Math.max(0, Math.min(total - 1, indexRef.current + slotsMoved));

          if (targetIndex !== indexRef.current) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (e) {}
            onMove(indexRef.current, targetIndex);
          }
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
          Animated.parallel([
            Animated.spring(panY, {
              toValue: 0,
              friction: 7,
              tension: 130,
              useNativeDriver: true,
            }),
            Animated.spring(scale, {
              toValue: 1,
              friction: 7,
              tension: 130,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [total, onMove]
  );

  return (
    <Animated.View
      onLayout={(e) => {
        const measured = e.nativeEvent?.layout?.height;
        if (measured && measured > 40) {
          // Altura real medida do card + 10px de margem inferior
          const totalSlot = measured + 10;
          setCardSlotHeight(totalSlot);
          slotHeightRef.current = totalSlot;
        }
      }}
      style={[
        styles.contactCard,
        isDragging && styles.contactCardDragging,
        {
          transform: [{ translateY: panY }, { scale }],
        },
      ]}
    >
      <View style={styles.contactLeft}>
        {/* ALÇA DE ARRASTO E REORDENAÇÃO (DRAG & DROP) */}
        <View style={styles.dragHandleCol}>
          {/* Caso seja do meio ou o último: seta pra cima no topo */}
          {index > 0 && (
            <TouchableOpacity
              onPress={() => onMove(index, index - 1)}
              hitSlop={{ top: 8, bottom: 4, left: 10, right: 10 }}
              style={styles.microArrowBtn}
              activeOpacity={0.7}
            >
              <Icon name="keyboard_arrow_up" size={15} color="#64748B" />
            </TouchableOpacity>
          )}

          {/* Ícone pontilhado central de arrasto */}
          <View
            style={[styles.dragGripBox, isDragging && styles.dragGripBoxActive]}
            {...panResponder.panHandlers}
          >
            <Icon
              name="drag_indicator"
              size={20}
              color={isDragging ? colors.navy : '#94A3B8'}
            />
          </View>

          {/* Caso seja o primeiro ou do meio: seta pra baixo abaixo do pontilhado */}
          {index < total - 1 && (
            <TouchableOpacity
              onPress={() => onMove(index, index + 1)}
              hitSlop={{ top: 4, bottom: 8, left: 10, right: 10 }}
              style={styles.microArrowBtn}
              activeOpacity={0.7}
            >
              <Icon name="keyboard_arrow_down" size={15} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.contactAvatar,
            { backgroundColor: contato.corAvatar || colors.skyBg },
          ]}
        >
          <Text
            style={[
              styles.contactAvatarText,
              { color: contato.corTexto || colors.skyText },
            ]}
          >
            {contato.iniciais || 'CO'}
          </Text>
        </View>

        <View style={styles.contactInfo}>
          <View style={styles.contactNameRow}>
            <Text style={styles.contactName}>{contato.nome}</Text>
            <View
              style={[
                styles.ordemBadge,
                index === 0 && styles.ordemBadgePrimeiro,
              ]}
            >
              <Icon
                name="phone"
                size={9}
                color={index === 0 ? '#B32A1E' : colors.skyText}
                style={{ marginRight: 3 }}
              />
              <Text
                style={[
                  styles.ordemBadgeText,
                  index === 0 && styles.ordemBadgeTextPrimeiro,
                ]}
              >
                {index + 1}º a ligar
              </Text>
            </View>
          </View>
          <Text style={styles.contactRole}>{contato.parentesco}</Text>
          <Text style={styles.contactPhone}>{contato.telefone}</Text>
        </View>
      </View>

      {/* Ações: Ligar e Excluir */}
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={styles.actionCallButton}
          onPress={() => onCall(contato.telefone)}
          activeOpacity={0.8}
        >
          <Icon name="phone" size={16} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionDeleteButton}
          onPress={() => onRemove(contato)}
          activeOpacity={0.8}
        >
          <Icon name="delete" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function EmergencyContactsScreen({ onNavigate, idosoId = 'e3b0c442-98fc-1c14-9afc-432100000001' }) {
  const [contatos, setContatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalNovoContatoVisible, setModalNovoContatoVisible] = useState(false);
  const [comoFuncionaAberto, setComoFuncionaAberto] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [parentesco, setParentesco] = useState('Filho(a)');

  const dispararHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Suporte gracioso
    }
  };

  const handleMoverContato = async (deIndex, paraIndex) => {
    if (paraIndex < 0 || paraIndex >= contatos.length || deIndex === paraIndex) return;
    dispararHaptic();
    animarTransiçãoLista();
    const novaLista = [...contatos];
    const [removido] = novaLista.splice(deIndex, 1);
    novaLista.splice(paraIndex, 0, removido);

    const comOrdem = novaLista.map((c, i) => ({ ...c, ordem: i + 1 }));
    setContatos(comOrdem);

    try {
      await reordenarContatos(idosoId, comOrdem);
    } catch (err) {
      console.warn('[EmergencyContactsScreen] Erro ao persistir nova ordem:', err.message);
    }
  };

  useEffect(() => {
    carregarLista();
  }, [idosoId]);

  const carregarLista = async () => {
    try {
      setLoading(true);
      const data = await listarContatos(idosoId);
      setContatos(data);
    } catch (err) {
      console.warn('[EmergencyContactsScreen] Erro ao carregar contatos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Formatação automática do telefone celular brasileiro (XX) XXXXX-XXXX
  const handleTelefoneChange = (text) => {
    const raw = text.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    } else if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setTelefone(formatted);
  };

  const handleAdicionarContato = async () => {
    if (!nome.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o nome completo do contato.');
      return;
    }

    const rawDigits = telefone.replace(/\D/g, '');
    if (rawDigits.length < 10) {
      Alert.alert('Telefone Inválido', 'Informe um telefone com DDD válido (pelo menos 10 dígitos).');
      return;
    }

    try {
      setSubmitting(true);
      const novo = await salvarContato(idosoId, {
        nome: nome.trim(),
        telefone,
        parentesco,
        ordem: contatos.length + 1,
        whatsapp: true,
      });

      setContatos((prev) => [...prev, novo]);
      setNome('');
      setTelefone('');
      setParentesco('Filho(a)');
      setModalNovoContatoVisible(false);
      Alert.alert('Sucesso!', `${novo.nome} foi adicionado à rede de socorro prioritária.`);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível cadastrar o contato. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoverContato = (contato) => {
    Alert.alert(
      'Remover Contato',
      `Deseja realmente remover ${contato.nome} da lista de socorro de emergência?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await removerContato(idosoId, contato.id);
            setContatos((prev) => prev.filter((c) => c.id !== contato.id));
          },
        },
      ]
    );
  };

  const handleLigarContato = (num) => {
    const limpo = num.replace(/\D/g, '');
    Linking.openURL(`tel:${limpo}`).catch(() => {
      Alert.alert('Discador Indisponível', `Disque ${num} manualmente.`);
    });
  };

  const handleVoltar = () => {
    if (onNavigate) {
      onNavigate('ElderlyMode');
    }
  };

  return (
    <ScreenWrapper>
      {/* HEADER PADRONIZADO */}
      <AppHeader
        title="Contatos de Emergência"
        subtitle="ESCALONAMENTO SOS"
        onNavigate={onNavigate}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Lista de Contatos Cadastrados */}
        <View style={styles.contactsListSection}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>
              Contatos Prioritários ({contatos.length})
            </Text>
            <TouchableOpacity
              style={styles.btnHeaderNovoContato}
              onPress={() => setModalNovoContatoVisible(true)}
              activeOpacity={0.85}
            >
              <Icon name="person_add" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnHeaderNovoContatoText}>Novo Contato</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.navy} style={{ marginVertical: 20 }} />
          ) : (
            contatos.map((contato, index) => (
              <DraggableContactCard
                key={contato.id}
                contato={contato}
                index={index}
                total={contatos.length}
                onMove={handleMoverContato}
                onCall={handleLigarContato}
                onRemove={handleRemoverContato}
              />
            ))
          )}
        </View>

        {/* Card do SAMU 192 de Segurança */}
        <View style={styles.samuCard}>
          <View style={styles.samuIconBox}>
            <Icon name="shield_alert" size={24} color={colors.white} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.samuTitle}>SAMU — Atendimento Móvel 192</Text>
            <Text style={styles.samuDescription}>
              Canal de emergência médica de saúde pública acionado em caso de gravidade.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.samuCallBtn}
            onPress={() => Linking.openURL('tel:192')}
            activeOpacity={0.85}
          >
            <Icon name="phone" size={16} color={colors.white} />
            <Text style={styles.samuCallText}>192</Text>
          </TouchableOpacity>
        </View>

        {/* ACCORDION COLAPSÁVEL: COMO FUNCIONA? */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setComoFuncionaAberto((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={styles.accordionIconCircle}>
                <Icon name="help_outline" size={18} color="#031753" />
              </View>
              <Text style={styles.accordionTitle}>Como funciona?</Text>
            </View>
            <Icon
              name={comoFuncionaAberto ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>

          {comoFuncionaAberto && (
            <View style={styles.accordionBody}>
              <Text style={styles.accordionBodyText}>
                Ao pressionar o <Text style={{ fontWeight: '700', color: colors.coral }}>Botão SOS por 3 segundos</Text>, o sistema notifica os contatos na ordem definida nos cards acima:
              </Text>
              <View style={styles.accordionStepRow}>
                <View style={styles.accordionStepNumber}>
                  <Text style={styles.accordionStepNumberText}>1</Text>
                </View>
                <Text style={styles.accordionStepDesc}>
                  O 1º contato prioritário recebe aviso sonoro e notificação crítica imediata.
                </Text>
              </View>
              <View style={styles.accordionStepRow}>
                <View style={styles.accordionStepNumber}>
                  <Text style={styles.accordionStepNumberText}>2</Text>
                </View>
                <Text style={styles.accordionStepDesc}>
                  Se não houver confirmação em 2 minutos, o chamado avança automaticamente para o 2º contato.
                </Text>
              </View>
              <View style={styles.accordionStepRow}>
                <View style={[styles.accordionStepNumber, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.accordionStepNumberText, { color: '#DC2626' }]}>3</Text>
                </View>
                <Text style={styles.accordionStepDesc}>
                  Em caso de ausência de resposta da rede familiar, o SAMU 192 é acionado diretamente.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL DE NOVO CONTATO DE EMERGÊNCIA */}
      <Modal
        visible={modalNovoContatoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalNovoContatoVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitles}>
                <Text style={styles.modalHeaderTitle}>Novo Contato de Emergência</Text>
                <Text style={styles.modalHeaderSubtitle}>Adicione um familiar ou cuidador à cadeia SOS</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalNovoContatoVisible(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Campo Nome */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome Completo *</Text>
                <View style={styles.inputBox}>
                  <Icon name="person" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex: Mariana Silva"
                    placeholderTextColor={colors.textMuted}
                    value={nome}
                    onChangeText={setNome}
                  />
                </View>
              </View>

              {/* Campo Telefone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefone Celular / WhatsApp *</Text>
                <View style={styles.inputBox}>
                  <Icon name="phone" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="(11) 98765-4321"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    value={telefone}
                    onChangeText={handleTelefoneChange}
                  />
                </View>
              </View>

              {/* Seletor de Parentesco */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Grau de Parentesco / Vínculo</Text>
                <View style={styles.chipsContainer}>
                  {PARENTESCO_OPCOES.map((opcao) => {
                    const isSelected = parentesco === opcao;
                    return (
                      <TouchableOpacity
                        key={opcao}
                        style={[
                          styles.chip,
                          isSelected && styles.chipSelected,
                        ]}
                        onPress={() => setParentesco(opcao)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {opcao}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Botões do Modal */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setModalNovoContatoVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    { flex: 1, marginTop: 0 },
                    submitting && { opacity: 0.7 },
                  ]}
                  onPress={handleAdicionarContato}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Icon name="add" size={18} color={colors.white} style={{ marginRight: 6 }} />
                      <Text style={styles.submitButtonText}>
                        Salvar Contato
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BottomNavBar currentScreen="ElderlyMode" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.peachBg,
    borderRadius: rounded.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
    color: colors.peachText,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 11,
    color: colors.peachText,
    lineHeight: 16,
  },
  escalonamentoSection: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.tier1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
    color: colors.navy,
    marginBottom: 12,
  },
  escalonamentoFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  escalonamentoStep: {
    alignItems: 'center',
    maxWidth: 65,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  contactsListSection: {
    marginBottom: 20,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeAtivos: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.mintBorder,
  },
  badgeAtivosText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mintText,
    marginLeft: 4,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.tier1,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginRight: 6,
  },
  ordemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.skyBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ordemBadgePrimeiro: {
    backgroundColor: '#FFEBE5',
    borderColor: '#FFCDC2',
  },
  ordemBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.skyText,
  },
  ordemBadgeTextPrimeiro: {
    color: '#B32A1E',
  },
  contactRole: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionCallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  actionDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.canvasBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  samuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peachBg,
    borderRadius: rounded.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    marginBottom: 24,
  },
  samuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.coral,
    justifyContent: 'center',
    alignItems: 'center',
  },
  samuTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.peachText,
  },
  samuDescription: {
    fontSize: 11,
    color: colors.peachText,
    marginTop: 2,
  },
  samuCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.coral,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: rounded.button,
  },
  samuCallText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.tier1,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.skyBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
    color: colors.navy,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvasBase,
    borderRadius: rounded.input,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.canvasBase,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    height: 52,
    borderRadius: rounded.button,
    marginTop: 8,
    ...shadows.tier2,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  btnHeaderNovoContato: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: rounded.full,
    ...shadows.tier1,
  },
  btnHeaderNovoContatoText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  contactCardDragging: {
    borderColor: colors.navy,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    shadowColor: '#253B80',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
  dragHandleCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    width: 30,
    paddingVertical: 2,
  },
  dragGripBox: {
    width: 30,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  dragGripBoxActive: {
    backgroundColor: '#E9EDFF',
  },
  microArrowBtn: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginTop: 16,
    ...shadows.tier1,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accordionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    fontFamily: typography.fontFamily.heading,
  },
  accordionBody: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  accordionBodyText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  accordionStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  accordionStepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  accordionStepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#031753',
  },
  accordionStepDesc: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitles: {
    flex: 1,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    fontFamily: typography.fontFamily.heading,
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: rounded.button,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
