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
} from 'react-native';
import {
  Phone,
  PhoneCall,
  User,
  Plus,
  Trash2,
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  MessageCircle,
  ChevronRight,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import {
  listarContatos,
  salvarContato,
  removerContato,
} from '../services/contatoEmergenciaService.js';

const PARENTESCO_OPCOES = [
  'Filho(a)',
  'Neto(a)',
  'Cônjuge',
  'Cuidador(a)',
  'Vizinho(a)',
  'Médico(a)',
];

export default function EmergencyContactsScreen({ onNavigate, idosoId = 'e3b0c442-98fc-1c14-9afc-432100000001' }) {
  const [contatos, setContatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [parentesco, setParentesco] = useState('Filho(a)');

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
      {/* HEADER PADRONIZADO COM BOTÃO VOLTAR */}
      <AppHeader
        isBack
        title="Contatos de Emergência"
        subtitle="ESCALONAMENTO SOS"
        onBack={handleVoltar}
        onNavigate={onNavigate}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Informativo de Escalonamento */}
        <View style={styles.infoBanner}>
          <ShieldAlert size={22} color="#DC2626" style={styles.infoIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Protocolo de Escalonamento Automático</Text>
            <Text style={styles.infoDescription}>
              Ao pressionar o Botão SOS por 3s, o sistema notificará os contatos na ordem
              definida abaixo. Se não houver confirmação em 2 minutos, o chamado avança para o próximo nível.
            </Text>
          </View>
        </View>

        {/* Ordem de Escalonamento Visual */}
        <View style={styles.escalonamentoSection}>
          <Text style={styles.sectionTitle}>Sequência de Chamada no SOS</Text>
          <View style={styles.escalonamentoFlow}>
            {contatos.map((c, index) => (
              <React.Fragment key={c.id}>
                <View style={styles.escalonamentoStep}>
                  <View style={[styles.stepCircle, { backgroundColor: c.corAvatar || '#EBF5FF' }]}>
                    <Text style={[styles.stepText, { color: c.corTexto || '#1E40AF' }]}>
                      {index + 1}º
                    </Text>
                  </View>
                  <Text style={styles.stepLabel} numberOfLines={1}>
                    {c.nome.split(' ')[0]}
                  </Text>
                </View>
                <ChevronRight size={14} color="#94A3B8" style={{ marginBottom: 16 }} />
              </React.Fragment>
            ))}

            <View style={styles.escalonamentoStep}>
              <View style={[styles.stepCircle, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.stepText, { color: '#DC2626', fontWeight: '800' }]}>
                  192
                </Text>
              </View>
              <Text style={styles.stepLabel}>SAMU</Text>
            </View>
          </View>
        </View>

        {/* Lista de Contatos Cadastrados */}
        <View style={styles.contactsListSection}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>
              Contatos Prioritários ({contatos.length})
            </Text>
            <View style={styles.badgeAtivos}>
              <CheckCircle2 size={12} color="#16A34A" />
              <Text style={styles.badgeAtivosText}>Monitoramento Ativo</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#031753" style={{ marginVertical: 20 }} />
          ) : (
            contatos.map((contato, index) => (
              <View key={contato.id} style={styles.contactCard}>
                <View style={styles.contactLeft}>
                  <View
                    style={[
                      styles.contactAvatar,
                      { backgroundColor: contato.corAvatar || '#EBF5FF' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.contactAvatarText,
                        { color: contato.corTexto || '#1E40AF' },
                      ]}
                    >
                      {contato.iniciais || 'CO'}
                    </Text>
                  </View>

                  <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                      <Text style={styles.contactName}>{contato.nome}</Text>
                      <View style={styles.ordemBadge}>
                        <Text style={styles.ordemBadgeText}>{index + 1}º a ligar</Text>
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
                    onPress={() => handleLigarContato(contato.telefone)}
                    activeOpacity={0.8}
                  >
                    <PhoneCall size={16} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionDeleteButton}
                    onPress={() => handleRemoverContato(contato)}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Card do SAMU 192 de Segurança */}
        <View style={styles.samuCard}>
          <View style={styles.samuIconBox}>
            <ShieldAlert size={24} color="#FFFFFF" />
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
            <PhoneCall size={16} color="#FFFFFF" />
            <Text style={styles.samuCallText}>192</Text>
          </TouchableOpacity>
        </View>

        {/* Formulário: Adicionar Novo Contato */}
        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <View style={styles.formIconWrapper}>
              <Plus size={18} color="#031753" />
            </View>
            <Text style={styles.formTitle}>Novo Contato de Emergência</Text>
          </View>

          {/* Campo Nome */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nome Completo *</Text>
            <View style={styles.inputBox}>
              <User size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Mariana Silva"
                placeholderTextColor="#94A3B8"
                value={nome}
                onChangeText={setNome}
              />
            </View>
          </View>

          {/* Campo Telefone */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Telefone Celular / WhatsApp *</Text>
            <View style={styles.inputBox}>
              <Phone size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="(11) 98765-4321"
                placeholderTextColor="#94A3B8"
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

          {/* Botão de Envio */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && { opacity: 0.7 },
            ]}
            onPress={handleAdicionarContato}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Plus size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>
                  Adicionar Contato de Emergência
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 11,
    color: '#7F1D1D',
    lineHeight: 16,
  },
  escalonamentoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#031753',
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
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },
  stepArrow: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
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
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeAtivosText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
    marginLeft: 4,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
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
    fontWeight: '800',
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
    fontWeight: '800',
    color: '#031753',
    marginRight: 6,
  },
  ordemBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ordemBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2563EB',
  },
  contactRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
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
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  actionDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  samuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 24,
  },
  samuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  samuTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  samuDescription: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
  },
  samuCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  samuCallText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 6,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#031753',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#031753',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  chipSelected: {
    backgroundColor: '#031753',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#031753',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
