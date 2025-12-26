import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_TUTORIAL_COMPLETED = '@tutorial:completed_v2';

export const [TutorialProvider, useTutorial] = createContextHook(() => {
  const [tutorialCompleted, setTutorialCompleted] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);

  useQuery({
    queryKey: ['tutorial-completed'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_TUTORIAL_COMPLETED);
      const completed = stored === 'true';
      setTutorialCompleted(completed);
      return completed;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const completeTutorialMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.setItem(STORAGE_KEY_TUTORIAL_COMPLETED, 'true');
      setTutorialCompleted(true);
      return true;
    },
  });

  const resetTutorialMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(STORAGE_KEY_TUTORIAL_COMPLETED);
      setTutorialCompleted(false);
      setCurrentStep(0);
      return false;
    },
  });

  return {
    tutorialCompleted,
    currentStep,
    setCurrentStep,
    completeTutorial: completeTutorialMutation.mutate,
    resetTutorial: resetTutorialMutation.mutate,
  };
});
