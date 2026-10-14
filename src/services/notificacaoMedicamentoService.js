let Platform = { OS: 'web' };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rn = require('react-native');
  if (rn && rn.Platform) Platform = rn.Platform;
} catch (e) {
  // Ambiente de teste Node.js puro
}

let Notifications = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-notifications');
  if (mod && (mod.getPermissionsAsync || mod.default?.getPermissionsAsync)) {
    Notifications = mod.getPermissionsAsync ? mod : mod.default;
  }
} catch (e) {
  // Fallback se expo-notifications não estiver no ambiente nativo
}

// Configura o comportamento de exibição das notificações quando o app estiver em primeiro plano
if (Platform.OS !== 'web' && Notifications?.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    console.warn('[notificacaoService] Erro ao configurar NotificationHandler:', err.message);
  }
}

/**
 * Solicita permissão do sistema para envio de notificações locais (RF-038)
 */
export async function solicitarPermissaoNotificacoes() {
  if (
    Platform.OS === 'web' ||
    !Notifications ||
    typeof Notifications.getPermissionsAsync !== 'function'
  ) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted' && typeof Notifications.requestPermissionsAsync === 'function') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Canal prioritário para Android
    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('medicamentos-alarmes', {
        name: 'Lembretes de Medicamentos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#072369',
        sound: 'default',
        enableVibrate: true,
      });
    }

    return true;
  } catch (err) {
    console.warn('[notificacaoService] Falha ao solicitar permissão de notificações:', err.message);
    return false;
  }
}

/**
 * Cancela todos os lembretes de medicamentos agendados anteriormente
 */
export async function cancelarTodosLembretes() {
  if (
    Platform.OS === 'web' ||
    !Notifications ||
    typeof Notifications.getAllScheduledNotificationsAsync !== 'function'
  ) {
    return true;
  }

  try {
    const agendadas = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of agendadas) {
      if (notif.content?.data?.tipo === 'LEMBRETE_MEDICAMENTO' && typeof Notifications.cancelScheduledNotificationAsync === 'function') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
    return true;
  } catch (err) {
    console.warn('[notificacaoService] Erro ao cancelar lembretes anteriores:', err.message);
    return false;
  }
}

/**
 * Agenda notificações locais diárias recorrentes para cada horário da rotina ativa (RF-038).
 * Funciona 100% offline no daemon do sistema operacional (Android / iOS).
 *
 * @param {Array} rotinas - Lista de rotinas de medicamentos
 * @returns {Promise<number>} Quantidade de lembretes agendados com sucesso
 */
export async function agendarLembretesMedicacao(rotinas = []) {
  if (
    Platform.OS === 'web' ||
    !Notifications ||
    typeof Notifications.scheduleNotificationAsync !== 'function' ||
    !Array.isArray(rotinas) ||
    rotinas.length === 0
  ) {
    return 0;
  }

  try {
    const temPermissao = await solicitarPermissaoNotificacoes();
    if (!temPermissao) return 0;

    // Limpa agendamentos anteriores para evitar duplicidade
    await cancelarTodosLembretes();

    let agendadosCount = 0;

    for (const rotina of rotinas) {
      // Agenda apenas remédios ativos
      if (rotina.ativo === false) continue;

      const horario = rotina.horario || '08:00';
      const [horaStr, minutoStr] = horario.split(':');
      const hour = parseInt(horaStr, 10);
      const minute = parseInt(minutoStr, 10);

      if (isNaN(hour) || isNaN(minute)) continue;

      const nomeMed = rotina.medicamentoNome || rotina.nomeMedicamento || 'Medicamento';
      const dose = rotina.dosagem || '';
      const instrucao = rotina.instrucoes || 'Tomar conforme prescrição';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 Hora do Remédio: ${nomeMed}`,
          body: `${dose ? `${dose} • ` : ''}${instrucao}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: 'medicamentos-alarmes',
          data: {
            tipo: 'LEMBRETE_MEDICAMENTO',
            rotinaId: rotina.id,
            idosoId: rotina.idosoId,
            horario,
          },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });

      agendadosCount++;
    }

    return agendadosCount;
  } catch (err) {
    console.warn('[notificacaoService] Erro ao agendar notificações de medicamentos:', err.message);
    return 0;
  }
}

/**
 * Retorna as notificações locais de medicamentos atualmente agendadas no aparelho
 */
export async function obterLembretesAgendados() {
  if (
    Platform.OS === 'web' ||
    !Notifications ||
    typeof Notifications.getAllScheduledNotificationsAsync !== 'function'
  ) {
    return [];
  }

  try {
    const todas = await Notifications.getAllScheduledNotificationsAsync();
    return todas.filter((n) => n.content?.data?.tipo === 'LEMBRETE_MEDICAMENTO');
  } catch (err) {
    console.warn('[notificacaoService] Erro ao obter lembretes agendados:', err.message);
    return [];
  }
}
