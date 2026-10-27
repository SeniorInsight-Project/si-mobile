import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import Icon from './Icon';
import {
  DadosConviteInput,
  ConvitePendente,
  ConviteResponse,
} from '../services/redeProtecaoService';

const GRAUS_SUGERIDOS = [
  'Filho(a)',
  'Neto(a)',
  'Cônjuge',
  'Cuidador(a)',
  'Médico(a)',
  'Irmão/Irmã',
];

const PAPEIS_ACESSO = [
  {
    id: 'ADMIN',
    titulo: 'Administrador',
    subtitulo: 'Acesso total à rede, dados clínicos e convites',
    badge: 'Completo',
  },
  {
    id: 'CUIDADOR',
    titulo: 'Cuidador Principal',
    subtitulo: 'Registra medicamentos, atende SOS e rotinas diárias',
    badge: 'Recomendado',
  },
  {
    id: 'OBSERVADOR',
    titulo: 'Observador / Apoio',
    subtitulo: 'Acompanhamento de rotina e alertas informativos',
    badge: 'Leitura',
  },
];

export interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSendInvite: (dados: DadosConviteInput) => Promise<ConviteResponse | void> | void;
  onEditInvite?: (conviteId: string, dados: DadosConviteInput) => Promise<unknown> | void;
  conviteParaEditar?: (ConvitePendente & { email?: string; grauParentesco?: string; papelAcesso?: string }) | null;
  loading?: boolean;
}

export default function InviteMemberModal({
  visible,
  onClose,
  onSendInvite,
  onEditInvite,
  conviteParaEditar = null,
  loading = false,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState<string>('');
  const [grauParentesco, setGrauParentesco] = useState('Filho(a)');
  const [papelAcesso, setPapelAcesso] = useState('CUIDADOR');
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState('');
  const [conviteGerado, setConviteGerado] = useState<ConviteResponse | null>(null);

  const isEditing = Boolean(conviteParaEditar);

  useEffect(() => {
    if (conviteParaEditar) {
      setEmail(conviteParaEditar.emailDestinatario || conviteParaEditar.email || '');
      setGrauParentesco(conviteParaEditar.grauParentescoSugerido || conviteParaEditar.grauParentesco || 'Filho(a)');
      setPapelAcesso(conviteParaEditar.papelAcessoSugerido || conviteParaEditar.papelAcesso || 'CUIDADOR');
      setMensagemPersonalizada(conviteParaEditar.mensagemPersonalizada || '');
      setConviteGerado(null);
    } else {
      setEmail('');
      setGrauParentesco('Filho(a)');
      setPapelAcesso('CUIDADOR');
      setMensagemPersonalizada('');
      setConviteGerado(null);
    }
  }, [visible, conviteParaEditar]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o e-mail do familiar ou cuidador.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('E-mail Inválido', 'Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (!grauParentesco.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, especifique o grau de parentesco ou relação.');
      return;
    }

    try {
      if (conviteParaEditar && onEditInvite) {
        await onEditInvite(conviteParaEditar.id, {
          email: trimmedEmail,
          grauParentesco: grauParentesco.trim(),
          papelAcesso,
          mensagemPersonalizada: mensagemPersonalizada.trim(),
        });
        handleReset();
        return;
      }

      const res = await onSendInvite({
        email: trimmedEmail,
        grauParentesco: grauParentesco.trim(),
        papelAcesso,
        mensagemPersonalizada: mensagemPersonalizada.trim(),
      });
      if (res && (res.token || res.id)) {
        setConviteGerado(res);
      }
    } catch (e) {
      // Erro gerenciado no handler pai
    }
  };

  const handleShareLink = async () => {
    if (!conviteGerado) return;
    try {
      const link = conviteGerado.linkConvite || `seniorinsight://convite/${conviteGerado.token}`;
      const nomeIdoso = conviteGerado.nomeIdoso || 'Dona Maria Silva';
      await Share.share({
        title: 'Convite para Rede de Cuidados SeniorInsight',
        message: `Olá! Você foi convidado para a Rede de Cuidados de ${nomeIdoso} no aplicativo SeniorInsight.\n\nToque no link seguro para aceitar o convite: ${link}\n\n(Válido por 48 horas)`,
        url: link,
      });
    } catch (err: any) {
      Alert.alert('Erro ao compartilhar', err?.message);
    }
  };

  const handleReset = () => {
    setEmail('');
    setGrauParentesco('Filho(a)');
    setPapelAcesso('CUIDADOR');
    setMensagemPersonalizada('');
    setConviteGerado(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleReset}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          {/* HEADER DO MODAL */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitles}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Editar Convite Pendente' : 'Convidar Novo Membro'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isEditing
                  ? 'Atualize os dados e nível de acesso do convite'
                  : 'Envie um convite temporário válido por 48 horas'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Icon name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {conviteGerado ? (
            <View style={styles.successContainer}>
              <View style={styles.successBadgeCircle}>
                <Icon name="check" size={32} color="#10B981" />
              </View>

              <Text style={styles.successTitle}>Convite Gerado com Sucesso!</Text>
              <Text style={styles.successSub}>
                O convite para{' '}
                <Text style={{ fontWeight: 'bold', color: '#0F172A' }}>
                  {conviteGerado.emailDestinatario || email}
                </Text>{' '}
                foi registrado com papel de{' '}
                <Text style={{ fontWeight: 'bold', color: '#0F172A' }}>
                  {conviteGerado.papelAcessoSugerido || papelAcesso}
                </Text>{' '}
                e validade temporal de 48 horas.
              </Text>

              <View style={styles.inviteLinkCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Icon name="link" size={15} color="#031753" style={{ marginRight: 6 }} />
                  <Text style={styles.inviteLinkLabel}>Link de Acesso Único (Deep Link):</Text>
                </View>
                <Text style={styles.inviteLinkText} numberOfLines={2}>
                  {conviteGerado.linkConvite || `seniorinsight://convite/${conviteGerado.token}`}
                </Text>
              </View>

              <View style={styles.successButtonsCol}>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShareLink}
                  activeOpacity={0.85}
                >
                  <Icon name="share" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.shareButtonText}>Compartilhar Link</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleReset}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneButtonText}>Concluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* CAMPO: E-MAIL */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    E-mail do Convidado <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="mail" size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="ex: familiar@email.com"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* CAMPO: GRAU DE PARENTESCO */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Grau de Parentesco / Relação <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="family_restroom" size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="ex: Filho(a), Neto(a), Cuidador..."
                      placeholderTextColor="#94A3B8"
                      value={grauParentesco}
                      onChangeText={setGrauParentesco}
                      editable={!loading}
                    />
                  </View>

                  {/* CHIPS DE SUGESTÃO RÁPIDA */}
                  <View style={styles.chipsContainer}>
                    {GRAUS_SUGERIDOS.map((sugestao) => {
                      const isSelected = grauParentesco === sugestao;
                      return (
                        <TouchableOpacity
                          key={sugestao}
                          style={[styles.chipItem, isSelected && styles.chipItemSelected]}
                          onPress={() => setGrauParentesco(sugestao)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[styles.chipText, isSelected && styles.chipTextSelected]}
                          >
                            {sugestao}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* SELETOR DE PAPEL / PERMISSÃO */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Nível de Permissão (Papel de Acesso) <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  {PAPEIS_ACESSO.map((papel) => {
                    const isSelected = papelAcesso === papel.id;
                    return (
                      <TouchableOpacity
                        key={papel.id}
                        style={[
                          styles.roleOptionCard,
                          isSelected && styles.roleOptionCardSelected,
                        ]}
                        onPress={() => setPapelAcesso(papel.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.roleRadioCircle}>
                          {isSelected && <View style={styles.roleRadioInner} />}
                        </View>
                        <View style={styles.roleInfoCol}>
                          <View style={styles.roleTitleRow}>
                            <Text
                              style={[
                                styles.roleTitle,
                                isSelected && styles.roleTitleSelected,
                              ]}
                            >
                              {papel.titulo}
                            </Text>
                            <View style={styles.roleBadge}>
                              <Text style={styles.roleBadgeText}>{papel.badge}</Text>
                            </View>
                          </View>
                          <Text style={styles.roleSubtitle}>{papel.subtitulo}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* MENSAGEM PERSONALIZADA (OPCIONAL) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mensagem de Apresentação (Opcional)</Text>
                  <TextInput
                    style={styles.textAreaInput}
                    placeholder="Olá, gostaria de convidá-lo(a) para acompanhar a rotina de cuidados..."
                    placeholderTextColor="#94A3B8"
                    value={mensagemPersonalizada}
                    onChangeText={setMensagemPersonalizada}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!loading}
                  />
                </View>

                {/* AVISO DE SEGURANÇA E 48 HORAS */}
                <View style={styles.securityBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Icon name="schedule" size={15} color="#1D4ED8" style={{ marginRight: 6 }} />
                    <Text style={[styles.securityTitle, { marginBottom: 0 }]}>
                      Validade Temporal de 48 Horas
                    </Text>
                  </View>
                  <Text style={styles.securityText}>
                    Por segurança clínica e conformidade LGPD, um link seguro com token único será gerado e expirará após 48h.
                  </Text>
                </View>
              </ScrollView>

              {/* BOTÕES DE AÇÃO INFERIORES */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleReset}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon
                        name={isEditing ? 'check' : 'send'}
                        size={16}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.submitButtonText}>
                        {isEditing ? 'Salvar Alterações' : 'Enviar Convite'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitles: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeIcon: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#DC2626',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  chipItem: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
  },
  chipTextSelected: {
    color: '#1D4ED8',
    fontWeight: 'bold',
  },
  roleOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  roleOptionCardSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  roleRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
  },
  roleInfoCol: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleTitleSelected: {
    color: '#0369A1',
  },
  roleBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  roleSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  textAreaInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    height: 70,
  },
  securityBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 4,
    marginBottom: 8,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 11,
    color: '#3B82F6',
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  successBadgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  inviteLinkCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
  },
  inviteLinkLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#031753',
  },
  inviteLinkText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  successButtonsCol: {
    width: '100%',
    gap: 10,
  },
  shareButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#031753',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneButton: {
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
