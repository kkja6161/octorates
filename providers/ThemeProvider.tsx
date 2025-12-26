import { Appearance, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = '@theme_preference';

export const [ThemeContext, useTheme] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [persistedTheme, setPersistedTheme] = useState<ThemeMode | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [systemColorScheme, setSystemColorScheme] = useState<'light' | 'dark'>(() => {
    const initial = Appearance.getColorScheme();
    return initial === 'dark' ? 'dark' : 'light';
  });
  const appStateRef = useRef(AppState.currentState);

  const updateSystemTheme = useCallback(() => {
    const currentScheme = Appearance.getColorScheme();
    setSystemColorScheme(currentScheme === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const appearanceListener = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });

    const appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        setTimeout(() => {
          updateSystemTheme();
        }, 100);
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      appearanceListener.remove();
      appStateListener.remove();
    };
  }, [updateSystemTheme]);

  const themeQuery = useQuery({
    queryKey: ['theme-preference'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
          return stored as ThemeMode;
        }
        return 'system' as ThemeMode;
      } catch {
        return 'system' as ThemeMode;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (themeQuery.data && !themeQuery.isLoading) {
      setPersistedTheme(themeQuery.data);
      setIsReady(true);
    }
  }, [themeQuery.data, themeQuery.isLoading]);

  const themeMutation = useMutation({
    mutationFn: async (mode: ThemeMode) => {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      return mode;
    },
    onSuccess: (mode) => {
      setPersistedTheme(mode);
      queryClient.setQueryData(['theme-preference'], mode);
    },
  });

  const setThemeMode = (mode: ThemeMode) => {
    themeMutation.mutate(mode);
  };

  const actualTheme = persistedTheme ?? 'system';
  
  const effectiveColorScheme: 'light' | 'dark' = actualTheme === 'system' 
    ? systemColorScheme 
    : actualTheme;

  return {
    themeMode: actualTheme,
    setThemeMode,
    effectiveColorScheme,
    isDark: effectiveColorScheme === 'dark',
    isLoading: !isReady,
  };
});
