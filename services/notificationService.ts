import * as Notifications from 'expo-notifications';
import { ProcessedRate } from '@/types/energy';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_LAST_AGILE_CHECK = '@notifications:last_agile_check';
const STORAGE_KEY_SCHEDULED_NOTIFICATIONS = '@notifications:scheduled_ids';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') {
    return 'denied';
  }

  const { status } = await Notifications.getPermissionsAsync();
  console.log('[Notifications] Current permission status:', status);
  return status as 'granted' | 'denied' | 'undetermined';
}

export async function requestNotificationPermissions(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') {
    return 'denied';
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === 'granted') {
    console.log('[Notifications] Permission already granted');
    return 'granted';
  }

  if (existingStatus === 'denied') {
    console.log('[Notifications] Permission previously denied');
    return 'denied';
  }

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowDisplayInCarPlay: false,
      allowCriticalAlerts: false,
      provideAppNotificationSettings: false,
      allowProvisional: false,
    },
  });
  
  console.log('[Notifications] Permission request result:', status);
  return status as 'granted' | 'denied' | 'undetermined';
}

export async function scheduleNewRatesNotification(
  rates: ProcessedRate[],
  isForTomorrow: boolean = true
): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Skipping on web');
    return null;
  }

  try {
    const permissionStatus = await getNotificationPermissionStatus();
    if (permissionStatus !== 'granted') {
      console.log('[Notifications] Permission not granted:', permissionStatus);
      return null;
    }

    if (rates.length === 0) {
      console.log('[Notifications] No rates to notify about');
      return null;
    }

    const avgRate = rates.reduce((sum, r) => sum + r.price, 0) / rates.length;
    const minRate = Math.min(...rates.map(r => r.price));
    const maxRate = Math.max(...rates.map(r => r.price));
    
    const dayLabel = isForTomorrow ? "Tomorrow's" : "Today's";

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚡ ${dayLabel} Agile Rates Available`,
        body: `Avg: ${avgRate.toFixed(2)}p/kWh | Low: ${minRate.toFixed(2)}p | High: ${maxRate.toFixed(2)}p`,
        data: { 
          type: 'new_rates',
          avgRate,
          minRate,
          maxRate,
          rateCount: rates.length,
        },
        sound: 'default',
      },
      trigger: null,
    });

    console.log('[Notifications] Sent new rates notification:', notificationId);
    
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Failed to send new rates notification:', error);
    return null;
  }
}

export async function checkAndNotifyNewAgileRates(
  tomorrowRates: ProcessedRate[],
  notifyNewRates: boolean
): Promise<boolean> {
  if (Platform.OS === 'web' || !notifyNewRates) {
    return false;
  }

  try {
    const permissionStatus = await getNotificationPermissionStatus();
    if (permissionStatus !== 'granted') {
      return false;
    }

    if (tomorrowRates.length === 0) {
      console.log('[Notifications] No tomorrow rates available yet');
      return false;
    }

    const lastCheck = await AsyncStorage.getItem(STORAGE_KEY_LAST_AGILE_CHECK);
    const today = new Date().toDateString();
    
    if (lastCheck === today) {
      console.log('[Notifications] Already notified about new rates today');
      return false;
    }

    const firstTomorrowRate = tomorrowRates[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    if (firstTomorrowRate.validFrom >= tomorrow) {
      console.log('[Notifications] Tomorrow rates are available, sending notification');
      
      await scheduleNewRatesNotification(tomorrowRates, true);
      await AsyncStorage.setItem(STORAGE_KEY_LAST_AGILE_CHECK, today);
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Notifications] Error checking new Agile rates:', error);
    return false;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(STORAGE_KEY_SCHEDULED_NOTIFICATIONS);
    console.log('[Notifications] All notifications cancelled');
  } catch (error) {
    console.error('[Notifications] Failed to cancel notifications:', error);
  }
}

export async function getAllScheduledNotifications() {
  if (Platform.OS === 'web') {
    return [];
  }

  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('[Notifications] Scheduled notifications:', notifications.length);
    return notifications;
  } catch (error) {
    console.error('[Notifications] Failed to get scheduled notifications:', error);
    return [];
  }
}

export async function clearNotificationCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_AGILE_CHECK);
    await AsyncStorage.removeItem(STORAGE_KEY_SCHEDULED_NOTIFICATIONS);
    console.log('[Notifications] Notification cache cleared');
  } catch (error) {
    console.error('[Notifications] Failed to clear notification cache:', error);
  }
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
