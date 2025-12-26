import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { ArrowRight, Settings, Zap, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTutorial } from '@/providers/TutorialProvider';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}

interface TutorialOverlayProps {
  hideWhileLoading?: boolean;
}

export default function TutorialOverlay({ hideWhileLoading = false }: TutorialOverlayProps) {
  const { tutorialCompleted, currentStep, setCurrentStep, completeTutorial } = useTutorial();
  const insets = useSafeAreaInsets();

  const tutorialSteps: TutorialStep[] = [
    {
      title: 'Welcome to OctoRates',
      description: 'Track your Octopus Energy tariff rates, view consumption data, and compare costs across different tariffs. Let\'s get you set up!',
      icon: <Zap size={64} color={Colors.primary} />,
    },
    {
      title: 'Connect Your Account',
      description: 'To get started, you\'ll need to connect your Octopus Energy account. This will automatically fetch your meter details, tariffs, and enable consumption tracking.',
      icon: <User size={64} color={Colors.primary} />,
    },
    {
      title: 'What You\'ll Need',
      description: 'From your Octopus Energy dashboard, you\'ll need:\n\n• Your Account Number (e.g., A-1234567)\n• Your API Key\n\nThese can be found in your account\'s developer settings.',
      icon: <Settings size={64} color={Colors.primary} />,
      action: () => {
        completeTutorial();
        router.push('/(tabs)/settings');
      },
      actionLabel: 'Set Up Now',
    },
  ];

  if (tutorialCompleted === null || tutorialCompleted || hideWhileLoading) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const handleSkip = () => {
    completeTutorial();
  };

  const handleStepAction = () => {
    const step = tutorialSteps[currentStep];
    if (step.action) {
      step.action();
    } else {
      handleNext();
    }
  };

  const currentStepData = tutorialSteps[currentStep];

  return (
    <Modal
      visible={!tutorialCompleted}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
          <View style={styles.iconContainer}>
            {currentStepData.icon}
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.description}>{currentStepData.description}</Text>
          </View>

          <View style={styles.progressContainer}>
            {tutorialSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                  index < currentStep && styles.progressDotCompleted,
                ]}
              />
            ))}
          </View>

          <View style={styles.buttonContainer}>
            {currentStepData.action ? (
              <>
                <Pressable
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleStepAction}
                >
                  <Text style={styles.buttonPrimaryText}>
                    {currentStepData.actionLabel || 'Next'}
                  </Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={handleNext}
                >
                  <Text style={styles.buttonSecondaryText}>Next</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleNext}
                >
                  <Text style={styles.buttonPrimaryText}>
                    {currentStep < tutorialSteps.length - 1 ? 'Next' : 'Get Started'}
                  </Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </Pressable>
                {currentStep === 0 && (
                  <Pressable onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip Tutorial</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    gap: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
  },
  description: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    width: 32,
    backgroundColor: Colors.primary,
  },
  progressDotCompleted: {
    backgroundColor: Colors.primary + '60',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  skipText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    paddingVertical: 8,
  },
});
