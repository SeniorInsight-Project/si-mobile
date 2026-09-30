import React, { useState } from 'react';
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
} from 'react-native';

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
    badge: '🛡️ Completo',
  },
  {
    id: 'CUIDADOR',
    titulo: 'Cuidador Principal',
    subtitulo: 'Registra medicamentos, atende SOS e rotinas diárias',
    badge: '★ Recomendado',
  },
  {
    id: 'OBSERVADOR',
    titulo: 'Observador / Apoio',
    subtitulo: 'Acompanhamento de rotina e alertas informativos',
    badge: '👁️ Leitura',
  },
];

export default function InviteMemberModal({
  visible,
  onClose,
  onSendInvite,
  loading = false,
}) {
  const [email, setEmail] = useState('');
  const [grauParentesco, setGrauParentesco] = useState('Filho(a)');
  const [papelAcesso, setPapelAcesso] = useState('CUIDADOR');
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState('');

  const handleSubmit = () => {
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

    onSendInvite({
      email: trimmedEmail,
      grauParentesco: grauParentesco.trim(),
      papelAcesso,
      mensagemPersonalizada: mensagemPersonalizada.trim(),
    });
  };

  const handleReset = () => {
    setEmail('');
    setGrauParentesco('Filho(a)');
    setPapelAcesso('CUIDADOR');
    setMensagemPersonalizada('');
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
              <Text style={styles.modalTitle}>Convidar Novo Membro</Text>
              <Text style={styles.modalSubtitle}>
                Envie um convite temporário válido por 48 horas
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

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
                <Text style={styles.inputIcon}>✉️</Text>
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
                <Text style={styles.inputIcon}>👥</Text>
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
              <Text style={styles.securityTitle}>⏳ Validade Temporal de 48 Horas</Text>
              <Text style={styles.securityText}>
                Por segurança clínica e conformidade LGPD, um token único será enviado por e-mail e expirará automaticamente após 48h.
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
                <Text style={styles.submitButtonText}>✉️ Enviar Convite</Text>
              )}
            </TouchableOpacity>
          </View>
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
});
