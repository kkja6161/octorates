import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/constants/colors';
import { useTheme } from '@/providers/ThemeProvider';

// 1. Structure the data so it can be rendered in separate cards
const POLICY_SECTIONS = [
  {
    title: "Introduction",
    content: `This privacy policy governs your use of the mobile application ("App") that was created by Nimesh Patel ("us", "we", or "our"). This privacy policy was last updated on 21st December 2025.\n\nOur privacy policy may change from time to time for any reason. If we make any material changes to our policies, we will place a prominent notice on our website or application.`
  },
  {
    title: "The Simple Version",
    content: `We ask for your Octopus Energy details only to retrieve data held by Octopus Energy such as tariff information, consumption data and billing dates.\n\nThese details are only stored on your device and never accessible outside of the app or sent to us. Your Octopus Energy details are only used to communicate with the Octopus Energy API. We don't collect or store any personal data, period.`
  },
  {
    title: "Information Collection and Use",
    content: `The App asks for your Octopus Energy details only to retrieve your details such as your previous and current tariffs, consumption data and billing dates by communicating with the Octopus Energy API over a secure connection.\n\nThe App does not collect or transmit any other personally identifiable information about you, such as your name, address, phone number or email address. If you have opted-in to allow Apple to share information with developers, we received some anonymous analytics.`
  },
  {
    title: "User Feedback",
    content: `You may choose to share additional information with us, for example if submitting feedback or requesting support. If you do so, this information will be treated confidentially, used solely for the discussed purpose and will be deleted from our systems afterwards. This data will never be shared, except with your explicit consent.`
  },
  {
    title: "Location Data",
    content: `The App does not use or collect any personal data related to your geographic location.`
  },
  {
    title: "User Access to Personal Data",
    content: `The App itself does not collect, transmit, or maintain user data other than the data used for communication with the Octopus Energy API.`
  },
  {
    title: "Sharing of Personal Information",
    content: `Personal information such as your Octopus Energy API key and account number are used to communicate with the Octopus Energy API server, and only if the user decided to provide the App with this information.\n\nThis information is known by Octopus Energy where the user must be a customer to have access to the relevant information. No other personal information is collected, transmitted, or maintained by the App, we do not share personal information with anyone.`
  },
  {
    title: "Data Usage for Advertising",
    content: `No data is shared with advertising companies.`
  },
  {
    title: "Tracking Data & Third Parties",
    content: `No data is shared with vendors or analytics providers.`
  },
  {
    title: "Children's Privacy (COPPA)",
    content: `We comply with COPPA. We do not solicit nor gather any data from children under the age of 13. The App itself is available for ages 4+ and can be used without providing API information.\n\nIf a parent or guardian becomes aware that his or her child has provided the App with information without their consent, he or she should remove the App from his or her child’s device.`
  }
];

export default function PrivacyPolicyScreen() {
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.surface,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: insets.bottom + 20,
      gap: 16, // Adds space between the cards
    },
    contentCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 12, // Adds space between Title and Body text
      // Optional: Add shadow for better card definition
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 4,
    },
    contentText: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.text.secondary || colors.text.primary, // Fallback if secondary doesn't exist
      opacity: 0.9,
    },
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.surface} />
            </Pressable>
            <Text style={styles.headerTitle}>Privacy Policy</Text>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {POLICY_SECTIONS.map((section, index) => (
            <View key={index} style={styles.contentCard}>
              {section.title && (
                <Text style={styles.sectionTitle}>{section.title}</Text>
              )}
              <Text style={styles.contentText}>
                {section.content}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  );
}