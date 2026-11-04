import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { MembroRede } from '../services/redeProtecaoService';

export interface FamilyMemberCardProps {
  member?: MembroRede | null;
  onCall?: (member: MembroRede) => void;
  onMessage?: (member: MembroRede) => void;
  onShowHistory?: (member: MembroRede) => void;
  onMoreOptions?: (member: MembroRede) => void;
}

export default function FamilyMemberCard({
  member,
  onCall,
  onMessage,
  onShowHistory,
  onMoreOptions,
}: FamilyMemberCardProps) {
  if (!member) return null;

  // Lógica de discagem telefônica nativa
  const handleCall = () => {
    if (onCall) {
      onCall(member);
      return;
    }
    const cleanPhone = member.telefone ? member.telefone.replace(/[^\d+]/g, '') : '';
    if (!cleanPhone) {
      Alert.alert('Telefone indisponível', 'Este membro não possui telefone cadastrado.');
      return;
    }
    const url = `tel:${cleanPhone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Chamada Telefônica', `Discar para ${member.nomeCompleto}: ${member.telefone}`);
        }
      })
      .catch(() => {
        Alert.alert('Chamada Telefônica', `Discar para ${member.nomeCompleto}: ${member.telefone}`);
      });
  };

  // Lógica de mensagem instantânea nativa (SMS/WhatsApp)
  const handleMessage = () => {
    if (onMessage) {
      onMessage(member);
      return;
    }
    const cleanPhone = member.telefone ? member.telefone.replace(/[^\d+]/g, '') : '';
    if (!cleanPhone) {
      Alert.alert('Contato indisponível', 'Este membro não possui número para envio de mensagem.');
      return;
    }
    const url = `sms:${cleanPhone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Enviar Mensagem', `Iniciar conversa com ${member.nomeCompleto}: ${member.telefone}`);
        }
      })
      .catch(() => {
        Alert.alert('Enviar Mensagem', `Iniciar conversa com ${member.nomeCompleto}: ${member.telefone}`);
      });
  };

  // Histórico de intervenções ou ações recentes
  const handleShowHistory = () => {
    if (onShowHistory) {
      onShowHistory(member);
      return;
    }
    const historico =
      member.historicoRecente && member.historicoRecente.length > 0
        ? member.historicoRecente.map((h) => `• ${h.data}: ${h.descricao}`).join('\n\n')
        : 'Nenhuma ação recente registrada para este membro.';

    Alert.alert(`Histórico de ${member.nomeCompleto}`, historico, [{ text: 'OK' }]);
  };

  // Mais opções do membro
  const handleMoreOptions = () => {
    if (onMoreOptions) {
      onMoreOptions(member);
      return;
    }
    Alert.alert(
      member.nomeCompleto,
      `Papel: ${member.papelLabel}\nE-mail: ${member.email || 'Não informado'}\nTelefone: ${member.telefone || 'Não informado'}`,
      [
        { text: 'Ver Detalhes', onPress: () => handleShowHistory() },
        { text: 'Fechar', style: 'cancel' },
      ]
    );
  };

  // Estilização do badge por categoria
  const getBadgeStyle = (tipo?: string) => {
    switch (tipo) {
      case 'plantao':
        return {
          container: styles.badgePlantao,
          text: styles.badgeTextPlantao,
        };
      case 'familia':
        return {
          container: styles.badgeFamilia,
          text: styles.badgeTextFamilia,
        };
      case 'apoio':
        return {
          container: styles.badgeApoio,
          text: styles.badgeTextApoio,
        };
      case 'especialista':
        return {
          container: styles.badgeEspecialista,
          text: styles.badgeTextEspecialista,
        };
      default:
        return {
          container: styles.badgeFamilia,
          text: styles.badgeTextFamilia,
        };
    }
  };

  // Ícone de status no contexto
  const renderStatusIcon = (icone?: string) => {
    switch (icone) {
      case 'location':
        return <Text style={styles.statusContextIcon}>⌲</Text>;
      case 'clock':
        return <Text style={styles.statusContextIcon}>🕒</Text>;
      case 'bell':
        return <Text style={styles.statusContextIcon}>🔔</Text>;
      case 'calendar':
        return <Text style={styles.statusContextIcon}>📅</Text>;
      default:
        return <Text style={styles.statusContextIcon}>📍</Text>;
    }
  };

  // Ponto indicador de conexão no avatar
  const renderStatusDot = (status?: string) => {
    if (status === 'BUSY') {
      return <View style={[styles.avatarStatusDot, styles.dotBusy]} />;
    }
    if (status === 'VERIFIED') {
      return (
        <View style={[styles.avatarStatusDot, styles.dotVerified]}>
          <Text style={styles.dotVerifiedText}>✓</Text>
        </View>
      );
    }
    return <View style={[styles.avatarStatusDot, styles.dotOnline]} />;
  };

  const badgeStyles = getBadgeStyle(member.badgeTipo);

  return (
    <View style={styles.card}>
      {/* SEÇÃO SUPERIOR: AVATAR, INFOS PRINCIPAIS E BADGE */}
      <View style={styles.topRow}>
        <View style={styles.avatarWrapper}>
          {member.avatarUrl ? (
            <Image
              source={{ uri: member.avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {member.nomeCompleto ? member.nomeCompleto.charAt(0).toUpperCase() : 'M'}
              </Text>
            </View>
          )}
          {renderStatusDot(member.statusConexao)}
        </View>

        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.memberName} numberOfLines={1}>
              {member.nomeCompleto}
            </Text>
            {member.verificado && (
              <Text style={styles.verifiedIcon}>
                🛡️
              </Text>
            )}
          </View>

          <Text style={styles.roleText} numberOfLines={1}>
            {member.papelLabel || member.papelAcesso}
          </Text>

          <View style={styles.contextRow}>
            {renderStatusIcon(member.statusIcone)}
            <Text style={styles.contextText} numberOfLines={1}>
              {member.statusLabel}
            </Text>
          </View>
        </View>

        {/* BADGE CATEGORIA NO CANTO SUPERIOR DIREITO */}
        <View style={[styles.badgeBase, badgeStyles.container]}>
          <Text style={[styles.badgeTextBase, badgeStyles.text]}>
            {member.badgeTexto}
          </Text>
        </View>
      </View>

      {/* SEÇÃO INFERIOR: RESUMO DA ATIVIDADE + BOTÕES DE AÇÃO */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText} numberOfLines={2}>
          {member.acoesTexto}
        </Text>

        <View style={styles.actionButtonsGroup}>
          {/* BOTÃO TELEFONE NATIVO (Presente em todos os cards) */}
          <TouchableOpacity
            style={styles.circleActionButton}
            onPress={handleCall}
            activeOpacity={0.7}
            accessibilityLabel={`Ligar para ${member.nomeCompleto}`}
          >
            <Text style={styles.circleActionIcon}>📞</Text>
          </TouchableOpacity>

          {/* BOTÃO SECUNDÁRIO CONFORME O TIPO DO CARD */}
          {member.badgeTipo === 'plantao' && (
            <>
              <TouchableOpacity
                style={[styles.circleActionButton, styles.chatButton]}
                onPress={handleMessage}
                activeOpacity={0.7}
                accessibilityLabel="Enviar mensagem"
              >
                <Text style={styles.chatActionIcon}>💬</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.circleActionButton}
                onPress={handleShowHistory}
                activeOpacity={0.7}
                accessibilityLabel="Ver histórico recente"
              >
                <Text style={styles.circleActionIcon}>🕒</Text>
              </TouchableOpacity>
            </>
          )}

          {member.badgeTipo === 'familia' && (
            <TouchableOpacity
              style={[styles.circleActionButton, styles.chatButton]}
              onPress={handleMessage}
              activeOpacity={0.7}
              accessibilityLabel="Enviar mensagem"
            >
              <Text style={styles.chatActionIcon}>💬</Text>
            </TouchableOpacity>
          )}

          {member.badgeTipo === 'apoio' && (
            <TouchableOpacity
              style={styles.circleActionButton}
              onPress={handleMoreOptions}
              activeOpacity={0.7}
              accessibilityLabel="Mais opções"
            >
              <Text style={styles.circleActionIcon}>⋮</Text>
            </TouchableOpacity>
          )}

          {member.badgeTipo === 'especialista' && (
            <TouchableOpacity
              style={styles.circleActionButton}
              onPress={handleShowHistory}
              activeOpacity={0.7}
              accessibilityLabel="Ver prontuário e anotações médicas"
            >
              <Text style={styles.circleActionIcon}>📑</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#475569',
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotBusy: {
    backgroundColor: '#F59E0B',
  },
  dotVerified: {
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotVerifiedText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 5,
  },
  verifiedIcon: {
    fontSize: 13,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A', // Tom azul escuro de destaque
    marginTop: 2,
    marginBottom: 4,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusContextIcon: {
    fontSize: 11,
    marginRight: 4,
    color: '#10B981',
  },
  contextText: {
    fontSize: 12,
    color: '#64748B',
    flexShrink: 1,
  },
  badgeBase: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeTextBase: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgePlantao: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  badgeTextPlantao: {
    color: '#DC2626',
  },
  badgeFamilia: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  badgeTextFamilia: {
    color: '#1D4ED8',
  },
  badgeApoio: {
    backgroundColor: '#F3E8FF',
    borderColor: '#E9D5FF',
  },
  badgeTextApoio: {
    color: '#7C3AED',
  },
  badgeEspecialista: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgeTextEspecialista: {
    color: '#059669',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    marginRight: 8,
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  circleActionIcon: {
    fontSize: 15,
  },
  chatButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  chatActionIcon: {
    fontSize: 15,
  },
});
