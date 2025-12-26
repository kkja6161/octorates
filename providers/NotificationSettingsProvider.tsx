import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';


export interface NotificationSettings {
  enabled: boolean;
  notifyNewAgileRates: boolean;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  notifyNewAgileRates: true,
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
        const parsed = JSON.parse(stored);
        setNotificationSettings(parsed);
      }
      return stored ? JSON.parse(stored) : DEFAULT_NOTIFICATION_SETTINGS;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const saveNotificationSettingsMutation = useMutation({
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
    saveNotificationSettingsMutation.mutate(newSettings);
  };

  const toggleNewAgileRatesNotification = (enabled: boolean) => {
    const newSettings = {
      ...notificationSettings,
      notifyNewAgileRates: enabled,
    };
    saveNotificationSettingsMutation.mutate(newSettings);
  };

  return {
    notificationSettings,
    setNotificationSettings: saveNotificationSettingsMutation.mutate,
    toggleNotifications,
    toggleNewAgileRatesNotification,
    isLoading: saveNotificationSettingsMutation.isPending,
  };
});
