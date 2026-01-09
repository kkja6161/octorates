import { useState, useEffect, useCallback } from 'react';
import {
  AccessibilityInfo,
  PixelRatio,
  Platform,
  Dimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ACCESSIBILITY_STORAGE_KEY = '@accessibility_settings';

export interface AccessibilitySettings {
  highContrastEnabled: boolean;
  fontScaleOverride: number | null;
  boldTextEnabled: boolean;
  reduceMotionEnabled: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrastEnabled: false,
  fontScaleOverride: null,
  boldTextEnabled: false,
  reduceMotionEnabled: false,
};

export const [AccessibilityContext, useAccessibility] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [systemFontScale, setSystemFontScale] = useState<number>(() => PixelRatio.getFontScale());
  const [systemReduceMotion, setSystemReduceMotion] = useState<boolean>(false);
  const [systemBoldText, setSystemBoldText] = useState<boolean>(false);
  const [systemHighContrast, setSystemHighContrast] = useState<boolean>(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['accessibility-settings'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored) as AccessibilitySettings;
        }
        return DEFAULT_SETTINGS;
      } catch (error) {
        console.log('[Accessibility] Error loading settings:', error);
        return DEFAULT_SETTINGS;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (settingsQuery.data && !settingsQuery.isLoading) {
      setSettings(settingsQuery.data);
      setIsReady(true);
    }
  }, [settingsQuery.data, settingsQuery.isLoading]);

  const { mutate: saveSettings } = useMutation({
    mutationFn: async (newSettings: AccessibilitySettings) => {
      await AsyncStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(newSettings));
      return newSettings;
    },
    onSuccess: (newSettings) => {
      setSettings(newSettings);
      queryClient.setQueryData(['accessibility-settings'], newSettings);
    },
  });

  const updateSystemAccessibility = useCallback(async () => {
    const fontScale = PixelRatio.getFontScale();
    setSystemFontScale(fontScale);
    console.log('[Accessibility] System font scale:', fontScale);

    if (Platform.OS !== 'web') {
      try {
        const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
        setSystemReduceMotion(reduceMotion);
        console.log('[Accessibility] Reduce motion:', reduceMotion);

        if (Platform.OS === 'ios') {
          const boldText = await AccessibilityInfo.isBoldTextEnabled();
          setSystemBoldText(boldText);
          console.log('[Accessibility] Bold text:', boldText);

          const reduceTransparency = await AccessibilityInfo.isReduceTransparencyEnabled();
          setSystemHighContrast(reduceTransparency);
          console.log('[Accessibility] High contrast (reduce transparency):', reduceTransparency);
        }
      } catch (error) {
        console.log('[Accessibility] Error checking system settings:', error);
      }
    }
  }, []);

  useEffect(() => {
    updateSystemAccessibility();

    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => {
        setSystemReduceMotion(isEnabled);
        console.log('[Accessibility] Reduce motion changed:', isEnabled);
      }
    );

    let boldTextListener: { remove: () => void } | null = null;
    let reduceTransparencyListener: { remove: () => void } | null = null;

    if (Platform.OS === 'ios') {
      boldTextListener = AccessibilityInfo.addEventListener(
        'boldTextChanged',
        (isEnabled) => {
          setSystemBoldText(isEnabled);
          console.log('[Accessibility] Bold text changed:', isEnabled);
        }
      );

      reduceTransparencyListener = AccessibilityInfo.addEventListener(
        'reduceTransparencyChanged',
        (isEnabled) => {
          setSystemHighContrast(isEnabled);
          console.log('[Accessibility] High contrast changed:', isEnabled);
        }
      );
    }

    const dimensionsListener = Dimensions.addEventListener('change', () => {
      const newScale = PixelRatio.getFontScale();
      setSystemFontScale(newScale);
      console.log('[Accessibility] Font scale changed:', newScale);
    });

    const appStateListener = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        updateSystemAccessibility();
      }
    });

    return () => {
      reduceMotionListener.remove();
      boldTextListener?.remove();
      reduceTransparencyListener?.remove();
      dimensionsListener.remove();
      appStateListener.remove();
    };
  }, [updateSystemAccessibility]);

  const setHighContrastEnabled = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, highContrastEnabled: enabled };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const setFontScaleOverride = useCallback((scale: number | null) => {
    const newSettings = { ...settings, fontScaleOverride: scale };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const setBoldTextEnabled = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, boldTextEnabled: enabled };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const setReduceMotionEnabled = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, reduceMotionEnabled: enabled };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const effectiveFontScale = settings.fontScaleOverride ?? systemFontScale;
  const isHighContrast = settings.highContrastEnabled || systemHighContrast;
  const isBoldText = settings.boldTextEnabled || systemBoldText;
  const isReduceMotion = settings.reduceMotionEnabled || systemReduceMotion;

  const scaleFontSize = useCallback((baseSize: number): number => {
    const scaled = baseSize * effectiveFontScale;
    const maxScale = baseSize * 1.5;
    return Math.min(scaled, maxScale);
  }, [effectiveFontScale]);

  const scaleSpacing = useCallback((baseSpacing: number): number => {
    if (effectiveFontScale <= 1) return baseSpacing;
    const scaleFactor = 1 + (effectiveFontScale - 1) * 0.5;
    return Math.round(baseSpacing * scaleFactor);
  }, [effectiveFontScale]);

  return {
    systemFontScale,
    effectiveFontScale,
    isHighContrast,
    isBoldText,
    isReduceMotion,
    isLargeText: effectiveFontScale > 1.2,
    isExtraLargeText: effectiveFontScale > 1.5,
    
    settings,
    setHighContrastEnabled,
    setFontScaleOverride,
    setBoldTextEnabled,
    setReduceMotionEnabled,
    
    scaleFontSize,
    scaleSpacing,
    
    isReady,
  };
});
