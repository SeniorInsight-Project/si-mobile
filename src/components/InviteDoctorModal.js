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

export default function InviteDoctorModal({
  visible,
  onClose,
  onSendDoctorInvite,
  onOpenAcceptInvite,
  onSimulateReject,
  limiteAtingido = false,
  totalMedicos = 0,
  loading = false,
}) {
  const [nome, setNome] = useState('');
  const [crm, setCrm] = useState('');
  const [email, setEmail] = useState('');
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState('');
  const [conviteGerado, setConviteGerado] = useState(null);

  useEffect(() => {
    if (visible) {
      setNome('');
      setCrm('');
      setEmail('');
      setMensagemPersonalizada('');
      setConviteGerado(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (limiteAtingido) {
      Alert.alert('Limite da Rede', 'Limite de 2 médicos atingido. Remova um vínculo ou cancele um convite pendente para convidar outro médico.');
      return;
    }

    const trimmedNome = nome.trim();
    if (!trimmedNome) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o nome completo do médico.');
      return;
    }

    const trimmedCrm = crm.trim().toUpperCase();
    if (!trimmedCrm) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o CRM do médico (ex: 123456/SP).');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o e-mail do médico.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('E-mail Inválido', 'Por favor, informe um endereço de e-mail válido.');
      return;
    }

    try {
      const res = await onSendDoctorInvite({
        nome: trimmedNome,
        crm: trimmedCrm,
        email: trimmedEmail,
        mensagemPersonalizada: mensagemPersonalizada.trim(),
      });
      if (res) {
        setConviteGerado(res);
      }
    } catch (err) {
      // Erro gerenciado no pai ou via Alert
    }
  };

  const handleShareLink = async () => {
    if (!conviteGerado) return;
    try {
      const link = conviteGerado.linkConvite || `seniorinsight://convite/${conviteGerado.token}`;
      const nomeIdoso = conviteGerado.nomeIdoso || 'Dona Maria Silva';
      const crmTexto = conviteGerado.crm ? `(CRM ${conviteGerado.crm})` : '';
      await Share.share({
        title: 'Convite para Corpo Clínico SeniorInsight',
        message: `Olá Dr(a). ${conviteGerado.nomeMedico || nome} ${crmTexto}!\n\nVocê foi convidado(a) como Médico de Referência para acompanhar os relatórios semanais de saúde de ${nomeIdoso} no aplicativo SeniorInsight.\n\nToque no link seguro de uso único para aceitar: ${link}\n\n(Válido por 72 horas)`,
        url: link,
      });
    } catch (err) {
      Alert.alert('Erro ao compartilhar', err.message);
    }
  };

  const handleReset = () => {
    setNome('');
    setCrm('');
    setEmail('');
    setMensagemPersonalizada('');
    setConviteGerado(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleReset}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleReset}
        />

        <View style={styles.sheetContainer}>
          {/* Indicador de deslizar superior */}
          <View style={styles.sheetHandle} />

          {/* CABEÇALHO */}
          <View style={styles.headerRow}>
            <View style={styles.headerIconContainer}>
              <Icon name="stethoscope" size={22} color="#031753" />
            </View>
            <View style={styles.headerTexts}>
              <Text style={styles.sheetTitle}>Convidar Médico do Idoso</Text>
              <Text style={styles.sheetSubtitle}>
                HU-016 • Familiar Administrador • Validade 72h
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleReset}
              accessibilityLabel="Fechar modal"
            >
              <Icon name="close" size={20} color="#475467" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* ESTADO DE SUCESSO APÓS GERAÇÃO */}
            {conviteGerado ? (
              <View style={styles.successCard}>
                <View style={styles.successIconCircle}>
                  <Icon name="check_circle" size={44} color="#059669" />
                </View>
                <Text style={styles.successTitle}>Convite Gerado com Sucesso!</Text>
                <Text style={styles.successSub}>
                  O convite temporal de uso único foi emitido com validade de 72 horas para o médico de referência.
                </Text>

                <View style={styles.inviteDetailsBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Médico Convidado:</Text>
                    <Text style={styles.detailValue}>
                      {conviteGerado.nomeMedico || nome}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>CRM:</Text>
                    <Text style={styles.detailValue}>
                      {conviteGerado.crm || crm}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>E-mail:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {conviteGerado.emailDestinatario || email}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Validade Temporal:</Text>
                    <Text style={[styles.detailValue, { color: '#B45309', fontWeight: '800' }]}>
                      72 horas (Uso único)
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Permissão:</Text>
                    <Text style={styles.detailValue}>Relatórios Semanais & Sinais Vitais</Text>
                  </View>
                </View>

                {/* BOTÕES DE AÇÃO PÓS-ENVIO */}
                <View style={styles.successActionsCol}>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShareLink}
                    activeOpacity={0.85}
                  >
                    <Icon name="share" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.shareButtonText}>Compartilhar Link do Convite</Text>
                  </TouchableOpacity>

                  {/* BOTÕES DE DEBUG / SIMULAÇÃO */}
                  {onOpenAcceptInvite && (
                    <TouchableOpacity
                      style={styles.debugAcceptButton}
                      onPress={() => {
                        const token = conviteGerado.token;
                        handleReset();
                        onOpenAcceptInvite(token);
                      }}
                      activeOpacity={0.85}
                    >
                      <Icon name="bug_report" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.debugButtonText}>[Debug] Simular Aceite pelo Médico</Text>
                    </TouchableOpacity>
                  )}

                  {onSimulateReject && (
                    <TouchableOpacity
                      style={styles.debugRejectButton}
                      onPress={() => {
                        const id = conviteGerado.id;
                        handleReset();
                        onSimulateReject(id);
                      }}
                      activeOpacity={0.85}
                    >
                      <Icon name="cancel" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.debugButtonText}>[Debug] Simular Recusa do Médico</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.finishButton}
                    onPress={handleReset}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.finishButtonText}>Concluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* FORMULÁRIO DE PREENCHIMENTO */
              <View style={styles.formContainer}>
                {/* Banner Educativo / Permissões do Médico */}
                <View style={styles.infoBanner}>
                  <Icon name="health_and_safety" size={22} color="#0284C7" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoBannerTitle}>Acesso Clínico & Relatório Semanal</Text>
                    <Text style={styles.infoBannerText}>
                      O médico receberá acesso seguro aos relatórios semanais consolidados, batimentos, passos e comorbidades de Dona Maria.
                    </Text>
                  </View>
                </View>

                {/* Status da RN-012 */}
                <View style={[styles.limitPillBox, limiteAtingido && styles.limitPillBoxAlert]}>
                  <Icon
                    name={limiteAtingido ? 'error' : 'info'}
                    size={16}
                    color={limiteAtingido ? '#DC2626' : '#031753'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.limitPillText, limiteAtingido && styles.limitPillTextAlert]}>
                    {limiteAtingido
                      ? 'Limite de 2 médicos atingido (RN-012)'
                      : `Médicos na rede: ${totalMedicos} de até 2 permitidos (RN-012)`}
                  </Text>
                </View>

                {/* CAMPO 1: NOME DO MÉDICO */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Nome Completo do Médico <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="person" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Ex: Dr. Roberto Martins"
                      placeholderTextColor="#94A3B8"
                      value={nome}
                      onChangeText={setNome}
                      editable={!loading && !limiteAtingido}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* CAMPO 2: CRM COM UF */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    CRM com Estado/UF <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="badge" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Ex: 123456/SP"
                      placeholderTextColor="#94A3B8"
                      value={crm}
                      onChangeText={setCrm}
                      editable={!loading && !limiteAtingido}
                      autoCapitalize="characters"
                    />
                  </View>
                  <Text style={styles.fieldHelpText}>Informe número e UF do Conselho Regional de Medicina</Text>
                </View>

                {/* CAMPO 3: E-MAIL */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    E-mail Profissional do Médico <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="mail" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Ex: dr.roberto@clinica.com.br"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading && !limiteAtingido}
                    />
                  </View>
                </View>

                {/* CAMPO 4: MENSAGEM PERSONALIZADA (OPCIONAL) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mensagem de Apresentação (Opcional)</Text>
                  <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                    <TextInput
                      style={[styles.inputField, styles.textAreaField]}
                      placeholder="Ex: Olá Dr. Roberto, gostaria de convidá-lo para acompanhar o tratamento e relatórios de saúde de Dona Maria."
                      placeholderTextColor="#94A3B8"
                      value={mensagemPersonalizada}
                      onChangeText={setMensagemPersonalizada}
                      multiline
                      numberOfLines={3}
                      editable={!loading && !limiteAtingido}
                    />
                  </View>
                </View>

                {/* NOTA DE VALIDADE DE 72 HORAS */}
                <View style={styles.noticeRow}>
                  <Icon name="hourglass_top" size={15} color="#B45309" style={{ marginRight: 6 }} />
                  <Text style={styles.noticeText}>
                    O convite é de uso único e expira automaticamente em <Text style={{ fontWeight: '700' }}>72 horas</Text>.
                  </Text>
                </View>

                {/* BOTÕES INFERIORES */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleReset}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (loading || limiteAtingido) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={loading || limiteAtingido}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.submitButtonText}>
                          {limiteAtingido ? 'Limite de 2 Atingido' : 'Enviar Convite Médico'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3, 23, 83, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTexts: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#031753',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: 20,
  },
  formContainer: {
    gap: 14,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'flex-start',
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 2,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#0C4A6E',
    lineHeight: 17,
  },
  limitPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  limitPillBoxAlert: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  limitPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#031753',
  },
  limitPillTextAlert: {
    color: '#DC2626',
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  requiredMark: {
    color: '#DC2626',
  },
  fieldHelpText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52,
  },
  textAreaWrapper: {
    height: 84,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  textAreaField: {
    height: '100%',
    textAlignVertical: 'top',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noticeText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475467',
  },
  submitButton: {
    flex: 2,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#031753',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 13,
    color: '#475467',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  inviteDetailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  successActionsCol: {
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
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  debugAcceptButton: {
    height: 46,
    borderRadius: 23,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugRejectButton: {
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  finishButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475467',
  },
});
