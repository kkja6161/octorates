import { useMemo } from 'react';
import { TextStyle } from 'react-native';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';

export interface AccessibleTextStyles {
  title: TextStyle;
  heading: TextStyle;
  subheading: TextStyle;
  body: TextStyle;
  bodyLarge: TextStyle;
  caption: TextStyle;
  label: TextStyle;
  button: TextStyle;
}

export function useAccessibleStyles() {
  const { isDark } = useTheme();
  const {
    effectiveFontScale,
    isHighContrast,
    isBoldText,
    isLargeText,
    isExtraLargeText,
    scaleFontSize,
    scaleSpacing,
  } = useAccessibility();

  const colors = useColors(isDark, isHighContrast);

  const fontWeight = useMemo(() => {
    return isBoldText ? '700' as const : '400' as const;
  }, [isBoldText]);

  const headingWeight = useMemo(() => {
    return isBoldText ? '800' as const : '700' as const;
  }, [isBoldText]);

  const textStyles = useMemo((): AccessibleTextStyles => {
    const baseLineHeightMultiplier = isLargeText ? 1.4 : 1.3;
    
    return {
      title: {
        fontSize: scaleFontSize(32),
        fontWeight: headingWeight,
        color: colors.text.primary,
        lineHeight: scaleFontSize(32) * baseLineHeightMultiplier,
        letterSpacing: isHighContrast ? 0.5 : 0,
      },
      heading: {
        fontSize: scaleFontSize(24),
        fontWeight: headingWeight,
        color: colors.text.primary,
        lineHeight: scaleFontSize(24) * baseLineHeightMultiplier,
        letterSpacing: isHighContrast ? 0.3 : 0,
      },
      subheading: {
        fontSize: scaleFontSize(18),
        fontWeight: isBoldText ? '600' as const : '600' as const,
        color: colors.text.primary,
        lineHeight: scaleFontSize(18) * baseLineHeightMultiplier,
      },
      body: {
        fontSize: scaleFontSize(16),
        fontWeight: fontWeight,
        color: colors.text.primary,
        lineHeight: scaleFontSize(16) * 1.5,
      },
      bodyLarge: {
        fontSize: scaleFontSize(18),
        fontWeight: fontWeight,
        color: colors.text.primary,
        lineHeight: scaleFontSize(18) * 1.5,
      },
      caption: {
        fontSize: scaleFontSize(14),
        fontWeight: fontWeight,
        color: colors.text.secondary,
        lineHeight: scaleFontSize(14) * 1.4,
      },
      label: {
        fontSize: scaleFontSize(14),
        fontWeight: isBoldText ? '600' as const : '500' as const,
        color: colors.text.secondary,
        textTransform: 'uppercase' as const,
        letterSpacing: isHighContrast ? 1 : 0.5,
      },
      button: {
        fontSize: scaleFontSize(16),
        fontWeight: isBoldText ? '700' as const : '600' as const,
        color: colors.text.primary,
        letterSpacing: isHighContrast ? 0.5 : 0,
      },
    };
  }, [scaleFontSize, headingWeight, fontWeight, colors, isHighContrast, isBoldText, isLargeText]);

  const spacing = useMemo(() => ({
    xs: scaleSpacing(4),
    sm: scaleSpacing(8),
    md: scaleSpacing(12),
    lg: scaleSpacing(16),
    xl: scaleSpacing(20),
    xxl: scaleSpacing(24),
    xxxl: scaleSpacing(32),
  }), [scaleSpacing]);

  const borderWidth = useMemo(() => {
    return isHighContrast ? 2 : 1;
  }, [isHighContrast]);

  const minTouchTarget = useMemo(() => {
    const baseSize = 44;
    if (isExtraLargeText) return baseSize + 16;
    if (isLargeText) return baseSize + 8;
    return baseSize;
  }, [isLargeText, isExtraLargeText]);

  return {
    colors,
    textStyles,
    spacing,
    borderWidth,
    minTouchTarget,
    effectiveFontScale,
    isHighContrast,
    isBoldText,
    isLargeText,
    isExtraLargeText,
    scaleFontSize,
    scaleSpacing,
  };
}

export function useAccessibleColors() {
  const { isDark } = useTheme();
  const { isHighContrast } = useAccessibility();
  return useColors(isDark, isHighContrast);
}
