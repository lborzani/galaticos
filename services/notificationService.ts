import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configurado no nível do módulo — roda antes de qualquer render
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_KEY = (eventId: string) => `reminder_${eventId}`;

export async function setupNotifications(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Galácticos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
    });
  }
}

export async function scheduleEventReminders(
  eventId: string,
  eventDate: Date,
  title: string,
): Promise<void> {
  const ids: string[] = [];
  const now = new Date();

  const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
  if (oneHourBefore > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Falta 1 hora!',
        body: `${title} começa em 1 hora!`,
        data: { eventId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: oneHourBefore,
      },
    });
    ids.push(id);
  }

  const fiveMinsBefore = new Date(eventDate.getTime() - 5 * 60 * 1000);
  if (fiveMinsBefore > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Já está começando!',
        body: `${title} começa em 5 minutos!`,
        data: { eventId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fiveMinsBefore,
      },
    });
    ids.push(id);
  }

  if (ids.length > 0) {
    await AsyncStorage.setItem(REMINDER_KEY(eventId), JSON.stringify(ids));
  }
}

export async function cancelEventReminders(eventId: string): Promise<void> {
  const stored = await AsyncStorage.getItem(REMINDER_KEY(eventId));
  if (!stored) return;
  const ids = JSON.parse(stored) as string[];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await AsyncStorage.removeItem(REMINDER_KEY(eventId));
}

export async function notifyEventCancelled(
  eventId: string,
  title: string,
  reason?: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Evento cancelado',
      body: reason ? `${title} foi cancelado. Motivo: ${reason}` : `${title} foi cancelado.`,
      data: { eventId },
    },
    trigger: null,
  });
}
