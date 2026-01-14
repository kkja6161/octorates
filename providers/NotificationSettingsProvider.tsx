import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PriceAlertSettings, DEFAULT_PRICE_ALERT_SETTINGS, schedulePriceAlertNotifications, cancelPriceAlertNotifications, getPriceAlertStatus } from '@/services/notificationService';
import { ProcessedForecastRate } from '@/types/energy';

export interface NotificationSettings {
  enabled: boolean;
  notifyNewAgileRates: boolean;
  priceAlert: PriceAlertSettings;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  notifyNewAgileRates: true,
  priceAlert: DEFAULT_PRICE_ALERT_SETTINGS,
};

const STORAGE_KEY_NOTIFICATIONS = '@energy_rates:notification_settings';

export const [NotificationSettingsProvider, useNotificationSettings] = createContextHook(() => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );

  useQuery({
    queryKey: ['stored-notification-settings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setNotificationSettings(parsed);
          return parsed;
        } catch (error) {
          console.error('[NotificationSettings] Error parsing settings:', error);
          await AsyncStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
        }
      }
      return DEFAULT_NOTIFICATION_SETTINGS;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(settings));
      setNotificationSettings(settings);
      console.log('[NotificationSettings] Settings saved:', settings);
      return settings;
    },
  });

  const toggleNotifications = (enabled: boolean) => {
    const newSettings = {
      ...notificationSettings,
      enabled,
    };
    saveSettings(newSettings);
  };

  const toggleNewAgileRatesNotification = (enabled: boolean) => {
    const newSettings = {
      ...notificationSettings,
      notifyNewAgileRates: enabled,
    };
    saveSettings(newSettings);
  };

  const updatePriceAlertSettings = useCallback((settings: Partial<PriceAlertSettings>) => {
    const newPriceAlert = {
      ...notificationSettings.priceAlert,
      ...settings,
    };
    const newSettings = {
      ...notificationSettings,
      priceAlert: newPriceAlert,
    };
    saveSettings(newSettings);
    console.log('[NotificationSettings] Price alert settings updated:', newPriceAlert);
  }, [notificationSettings, saveSettings]);

  const togglePriceAlerts = useCallback((enabled: boolean) => {
    updatePriceAlertSettings({ enabled });
    if (!enabled) {
      cancelPriceAlertNotifications();
    }
  }, [updatePriceAlertSettings]);

  const setTargetPrice = useCallback((price: number) => {
    updatePriceAlertSettings({ targetPrice: price });
  }, [updatePriceAlertSettings]);

  const setAdvanceMinutes = useCallback((minutes: number) => {
    updatePriceAlertSettings({ advanceMinutes: minutes });
  }, [updatePriceAlertSettings]);

  const schedulePriceAlerts = useCallback(async (predictions: ProcessedForecastRate[]) => {
    if (!notificationSettings.priceAlert.enabled) {
      console.log('[NotificationSettings] Price alerts disabled, not scheduling');
      return [];
    }
    return schedulePriceAlertNotifications(predictions, notificationSettings.priceAlert);
  }, [notificationSettings.priceAlert]);

  const getPriceAlertInfo = useCallback(async () => {
    return getPriceAlertStatus();
  }, []);

  return {
    notificationSettings,
    setNotificationSettings: saveSettings,
    toggleNotifications,
    toggleNewAgileRatesNotification,
    priceAlertSettings: notificationSettings.priceAlert,
    togglePriceAlerts,
    setTargetPrice,
    setAdvanceMinutes,
    schedulePriceAlerts,
    getPriceAlertInfo,
    isLoading: isPending,
  };
});
