import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import Icon from './Icon';
import ModalSheet from './ModalSheet';
import TextField from './TextField';
import Button from './Button';
import {
  DadosConviteInput,
  ConvitePendente,
  ConviteResponse,
} from '../services/redeProtecaoService';
import { useIdoso } from '../context/IdosoContext';
import { colors, font, rounded } from '../theme';

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
  onOpenDoctorInvite?: () => void;
  conviteParaEditar?: (ConvitePendente & { email?: string; grauParentesco?: string; papelAcesso?: string }) | null;
  loading?: boolean;
}

export default function InviteMemberModal({
  visible,
  onClose,
  onSendInvite,
  onEditInvite,
  onOpenDoctorInvite,
  conviteParaEditar = null,
  loading = false,
}: InviteMemberModalProps) {
  const { nomeIdoso: nomeIdosoContexto } = useIdoso();
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
    } catch {
      // Erro gerenciado no handler pai
    }
  };

  const handleShareLink = async () => {
    if (!conviteGerado) return;
    try {
      const link = conviteGerado.linkConvite || `seniorinsight://convite/${conviteGerado.token}`;
      const nomeIdoso = conviteGerado.nomeIdoso || nomeIdosoContexto || null;
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

  const footer = conviteGerado ? (
    <View style={styles.successButtonsCol}>
      <Button
        title="Compartilhar Link"
        onPress={handleShareLink}
        variant="primary"
        iconLeft="share"
      />
      <Button
        title="Concluir"
        onPress={handleReset}
        variant="secondary"
      />
    </View>
  ) : (
    <View style={styles.modalFooter}>
      <View style={styles.footerCol}>
        <Button
          title="Cancelar"
          onPress={handleReset}
          variant="secondary"
          disabled={loading}
        />
      </View>
      <View style={styles.footerColPrimary}>
        <Button
          title={isEditing ? 'Salvar Alterações' : 'Enviar Convite'}
          onPress={handleSubmit}
          variant="primary"
          iconLeft={isEditing ? 'check' : 'send'}
          loading={loading}
          disabled={loading}
        />
      </View>
    </View>
  );

  return (
    <ModalSheet
      visible={visible}
      onClose={handleReset}
      title={isEditing ? 'Editar Convite Pendente' : 'Convidar Novo Membro'}
      subtitle={
        isEditing
          ? 'Atualize os dados e nível de acesso do convite'
          : 'Envie um convite temporário válido por 48 horas'
      }
      footer={footer}
    >
      {conviteGerado ? (
        <View style={styles.successContainer}>
          <View style={styles.successBadgeCircle}>
            <Icon name="check" size={32} color={colors.success} />
          </View>

          <Text style={styles.successTitle}>Convite Gerado com Sucesso!</Text>
          <Text style={styles.successSub}>
            O convite para{' '}
            <Text style={{ ...font('body', 700), color: colors.textPrimary }}>
              {conviteGerado.emailDestinatario || email}
            </Text>{' '}
            foi registrado com papel de{' '}
            <Text style={{ ...font('body', 700), color: colors.textPrimary }}>
              {conviteGerado.papelAcessoSugerido || papelAcesso}
            </Text>{' '}
            e validade temporal de 48 horas.
          </Text>

          <View style={styles.inviteLinkCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Icon name="link" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.inviteLinkLabel}>Link de Acesso Único (Deep Link):</Text>
            </View>
            <Text style={styles.inviteLinkText} numberOfLines={2}>
              {conviteGerado.linkConvite || `seniorinsight://convite/${conviteGerado.token}`}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.formContent}>
          <TextField
            label="E-mail do Convidado *"
            icon="mail"
            placeholder="ex: familiar@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={{ marginBottom: 14 }}
          />

          <TextField
            label="Grau de Parentesco / Relação *"
            icon="family_restroom"
            placeholder="ex: Filho(a), Neto(a), Cuidador..."
            value={grauParentesco}
            onChangeText={setGrauParentesco}
            editable={!loading}
            style={{ marginBottom: 10 }}
          />

          {/* CHIPS DE SUGESTÃO RÁPIDA */}
          <View style={styles.chipsContainer}>
            {GRAUS_SUGERIDOS.map((sugestao) => {
              const isSelected = grauParentesco === sugestao;
              return (
                <TouchableOpacity
                  key={sugestao}
                  style={[styles.chipItem, isSelected && styles.chipItemSelected]}
                  onPress={() => setGrauParentesco(sugestao)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {sugestao}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ATALHO/AVISO QUANDO SELECIONADO MÉDICO(A) */}
          {(grauParentesco === 'Médico(a)' || grauParentesco === 'Médico') && onOpenDoctorInvite && (
            <View style={styles.doctorRedirectCard}>
              <View style={styles.doctorRedirectHeader}>
                <Icon name="stethoscope" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.doctorRedirectTitle}>
                  Convidar Médico do Idoso (CRM)
                </Text>
              </View>
              <Text style={styles.doctorRedirectSub}>
                Para que o profissional acesse e visualize relatórios clínicos, utilize o formulário específico com registro CRM (HU-016).
              </Text>
              <Button
                title="Abrir Formulário do Médico"
                onPress={() => {
                  onClose?.();
                  onOpenDoctorInvite();
                }}
                variant="primary"
                iconLeft="stethoscope"
              />
            </View>
          )}

          {/* SELETOR DE PAPEL / PERMISSÃO */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nível de Permissão (Papel de Acesso) *</Text>
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
                  activeOpacity={0.85}
                  accessibilityRole="button"
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

          <TextField
            label="Mensagem de Apresentação (Opcional)"
            placeholder="Olá, gostaria de convidá-lo(a) para acompanhar a rotina de cuidados..."
            value={mensagemPersonalizada}
            onChangeText={setMensagemPersonalizada}
            multiline
            numberOfLines={3}
            editable={!loading}
            style={{ marginBottom: 14 }}
          />

          {/* AVISO DE SEGURANÇA E 48 HORAS */}
          <View style={styles.securityBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Icon name="schedule" size={16} color={colors.primaryNavy} style={{ marginRight: 6 }} />
              <Text style={styles.securityTitle}>Validade Temporal de 48 Horas</Text>
            </View>
            <Text style={styles.securityText}>
              Por segurança clínica e conformidade LGPD, um link seguro com token único será gerado e expirará após 48h.
            </Text>
          </View>
        </View>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  formContent: {
    paddingBottom: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    ...font('body', 600),
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chipItem: {
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Mesmo visual do ChoiceChip: selecionado em navy sólido com texto branco.
  chipItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    ...font('body', 600),
  },
  chipTextSelected: {
    color: colors.onPrimary,
    ...font('body', 700),
  },
  doctorRedirectCard: {
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sky.border,
    marginBottom: 16,
    gap: 10,
  },
  doctorRedirectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorRedirectTitle: {
    fontSize: 14,
    color: colors.primary,
    ...font('heading', 700),
  },
  doctorRedirectSub: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    ...font('body', 400),
  },
  roleOptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: rounded.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  roleOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.infoSurface,
  },
  roleRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: rounded.full,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  roleRadioInner: {
    width: 10,
    height: 10,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
  },
  roleInfoCol: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  roleTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  roleTitleSelected: {
    color: colors.primary,
  },
  roleBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: rounded.sm,
  },
  roleBadgeText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    ...font('body', 700),
  },
  roleSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    ...font('body', 400),
  },
  securityBox: {
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sky.border,
  },
  securityTitle: {
    fontSize: 14,
    color: colors.primaryNavy,
    ...font('heading', 700),
  },
  securityText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    ...font('body', 400),
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  footerCol: {
    flex: 1,
  },
  footerColPrimary: {
    flex: 1.5,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successBadgeCircle: {
    width: 68,
    height: 68,
    borderRadius: rounded.full,
    backgroundColor: colors.mint.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 8,
    ...font('heading', 700),
  },
  successSub: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    ...font('body', 400),
  },
  inviteLinkCard: {
    width: '100%',
    backgroundColor: colors.canvasBase,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rounded.lg,
    padding: 14,
  },
  inviteLinkLabel: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.primary,
  },
  inviteLinkText: {
    fontSize: 14,
    color: colors.primaryNavy,
    ...font('body', 600),
  },
  successButtonsCol: {
    width: '100%',
    gap: 10,
  },
});
