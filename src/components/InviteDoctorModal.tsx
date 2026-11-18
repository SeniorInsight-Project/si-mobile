import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Share,
} from 'react-native';
import Icon from './Icon';
import ModalSheet from './ModalSheet';
import TextField from './TextField';
import Button from './Button';
import { ConvitePendente, DadosConviteMedicoInput } from '../services/redeProtecaoService';
import { useIdoso } from '../context/IdosoContext';
import { colors, font, rounded } from '../theme';

export interface InviteDoctorModalProps {
  visible: boolean;
  onClose: () => void;
  onSendDoctorInvite: (dados: DadosConviteMedicoInput) => Promise<ConvitePendente | void> | void;
  onOpenAcceptInvite?: (token: string) => void;
  onSimulateReject?: (conviteId: string) => void;
  limiteAtingido?: boolean;
  totalMedicos?: number;
  loading?: boolean;
}

export default function InviteDoctorModal({
  visible,
  onClose,
  onSendDoctorInvite,
  onOpenAcceptInvite,
  onSimulateReject,
  limiteAtingido = false,
  totalMedicos = 0,
  loading = false,
}: InviteDoctorModalProps) {
  const { nomeIdoso: nomeIdosoContexto } = useIdoso();
  const deIdoso = nomeIdosoContexto ? `de ${nomeIdosoContexto}` : 'do idoso';
  const [nome, setNome] = useState('');
  const [crm, setCrm] = useState('');
  const [email, setEmail] = useState('');
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState('');
  const [conviteGerado, setConviteGerado] = useState<ConvitePendente | null>(null);

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
      Alert.alert(
        'Limite da Rede',
        'Limite de 2 médicos atingido. Remova um vínculo ou cancele um convite pendente para convidar outro médico.'
      );
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
    } catch {
      // Erro gerenciado no pai ou via Alert
    }
  };

  const handleShareLink = async () => {
    if (!conviteGerado) return;
    try {
      const link = conviteGerado.linkConvite || `seniorinsight://convite/${conviteGerado.token}`;
      const nomeIdoso = conviteGerado.nomeIdoso || nomeIdosoContexto || null;
      const crmTexto = conviteGerado.crm ? `(CRM ${conviteGerado.crm})` : '';
      await Share.share({
        title: 'Convite para Corpo Clínico SeniorInsight',
        message: `Olá Dr(a). ${conviteGerado.nomeMedico || nome} ${crmTexto}!\n\nVocê foi convidado(a) como Médico de Referência para acompanhar os relatórios semanais de saúde de ${nomeIdoso} no aplicativo SeniorInsight.\n\nToque no link seguro de uso único para aceitar: ${link}\n\n(Válido por 72 horas)`,
        url: link,
      });
    } catch (err: any) {
      Alert.alert('Erro ao compartilhar', err?.message);
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

  const footer = conviteGerado ? (
    <View style={styles.successActionsCol}>
      <Button
        title="Compartilhar Link do Convite"
        onPress={handleShareLink}
        variant="primary"
        iconLeft="share"
      />
      {__DEV__ && onOpenAcceptInvite ? (
        <Button
          title="[Debug] Simular Aceite pelo Médico"
          onPress={() => {
            const token = conviteGerado.token ?? '';
            handleReset();
            onOpenAcceptInvite(token);
          }}
          variant="outline"
          iconLeft="bug_report"
        />
      ) : null}
      {__DEV__ && onSimulateReject ? (
        <Button
          title="[Debug] Simular Recusa do Médico"
          onPress={() => {
            const id = conviteGerado.id;
            handleReset();
            onSimulateReject(id);
          }}
          variant="outline"
          iconLeft="cancel"
        />
      ) : null}
      <Button
        title="Concluir"
        onPress={handleReset}
        variant="secondary"
      />
    </View>
  ) : (
    <View style={styles.buttonRow}>
      <View style={styles.buttonCol}>
        <Button
          title="Cancelar"
          onPress={handleReset}
          variant="secondary"
          disabled={loading}
        />
      </View>
      <View style={styles.buttonColPrimary}>
        <Button
          title={limiteAtingido ? 'Limite de 2 Atingido' : 'Enviar Convite'}
          onPress={handleSubmit}
          variant="primary"
          iconLeft="send"
          loading={loading}
          disabled={loading || limiteAtingido}
        />
      </View>
    </View>
  );

  return (
    <ModalSheet
      visible={visible}
      onClose={handleReset}
      title="Convidar Médico do Idoso"
      subtitle="Familiar Administrador • Validade 72h"
      footer={footer}
    >
      {conviteGerado ? (
        <View style={styles.successCard}>
          <View style={styles.successIconCircle}>
            <Icon name="check_circle" size={44} color={colors.successDark} />
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
              <Text style={[styles.detailValue, { color: colors.amber.textDark, ...font('body', 700) }]}>
                72 horas (Uso único)
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Permissão:</Text>
              <Text style={styles.detailValue}>Relatórios Semanais & Sinais Vitais</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.infoBanner}>
            <Icon name="health_and_safety" size={22} color={colors.sky.text} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoBannerTitle}>Acesso Clínico & Relatório Semanal</Text>
              <Text style={styles.infoBannerText}>
                O médico receberá acesso seguro aos relatórios semanais consolidados, batimentos, passos e comorbidades {deIdoso}.
              </Text>
            </View>
          </View>

          <View style={[styles.limitPillBox, limiteAtingido && styles.limitPillBoxAlert]}>
            <Icon
              name={limiteAtingido ? 'error' : 'info'}
              size={16}
              color={limiteAtingido ? colors.error : colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.limitPillText, limiteAtingido && styles.limitPillTextAlert]}>
              {limiteAtingido
                ? 'Limite de 2 médicos atingido'
                : `Médicos na rede: ${totalMedicos} de até 2 permitidos`}
            </Text>
          </View>

          <TextField
            label="Nome Completo do Médico *"
            icon="person"
            placeholder="Ex: Dr. Roberto Martins"
            value={nome}
            onChangeText={setNome}
            editable={!loading && !limiteAtingido}
            autoCapitalize="words"
            style={{ marginBottom: 0 }}
          />

          <TextField
            label="CRM com Estado/UF *"
            icon="badge"
            placeholder="Ex: 123456/SP"
            value={crm}
            onChangeText={setCrm}
            editable={!loading && !limiteAtingido}
            autoCapitalize="characters"
            helperText="Informe número e UF do Conselho Regional de Medicina"
            style={{ marginBottom: 0 }}
          />

          <TextField
            label="E-mail Profissional do Médico *"
            icon="mail"
            placeholder="Ex: dr.roberto@clinica.com.br"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading && !limiteAtingido}
            style={{ marginBottom: 0 }}
          />

          <TextField
            label="Mensagem de Apresentação (Opcional)"
            placeholder={`Ex: Olá Dr. Roberto, gostaria de convidá-lo para acompanhar o tratamento e relatórios de saúde ${deIdoso}.`}
            value={mensagemPersonalizada}
            onChangeText={setMensagemPersonalizada}
            multiline
            numberOfLines={3}
            editable={!loading && !limiteAtingido}
            style={{ marginBottom: 0 }}
          />

          <View style={styles.noticeRow}>
            <Icon name="hourglass_top" size={16} color={colors.amber.textDark} style={{ marginRight: 6 }} />
            <Text style={styles.noticeText}>
              O convite é de uso único e expira automaticamente em <Text style={{ ...font('body', 700) }}>72 horas</Text>.
            </Text>
          </View>
        </View>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 14,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sky.border,
    alignItems: 'flex-start',
  },
  infoBannerTitle: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.sky.textDark,
    marginBottom: 2,
  },
  infoBannerText: {
    fontSize: 14,
    color: colors.sky.textDark,
    lineHeight: 20,
    ...font('body', 400),
  },
  limitPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvasBase,
    borderRadius: rounded.input,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  limitPillBoxAlert: {
    backgroundColor: colors.peach.background,
    borderColor: colors.peach.border,
  },
  limitPillText: {
    fontSize: 14,
    ...font('body', 600),
    color: colors.primary,
    flex: 1,
  },
  limitPillTextAlert: {
    color: colors.error,
    ...font('body', 700),
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amber.background,
    borderRadius: rounded.input,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.amber.border,
  },
  noticeText: {
    fontSize: 14,
    color: colors.amber.textDark,
    flex: 1,
    ...font('body', 400),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonCol: {
    flex: 1,
  },
  buttonColPrimary: {
    flex: 1.5,
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: rounded.full,
    backgroundColor: colors.mint.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    ...font('heading', 700),
    color: colors.mint.textDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
    ...font('body', 400),
  },
  inviteDetailsBox: {
    width: '100%',
    backgroundColor: colors.canvasBase,
    borderRadius: rounded.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
    ...font('body', 700),
    flexShrink: 1,
  },
  successActionsCol: {
    width: '100%',
    gap: 10,
  },
});
