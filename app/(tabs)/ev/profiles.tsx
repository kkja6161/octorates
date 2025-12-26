import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Car, Battery, Plus, Trash2, Edit3, Zap, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';
import { useEV } from '@/providers/EVProvider';

export default function ProfilesScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  const { profiles, deleteProfile } = useEV();

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteProfile(id),
        },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => router.push('/ev/add-profile')}
      >
        <View style={styles.addButtonIcon}>
          <Plus size={24} color={colors.primary} />
        </View>
        <View style={styles.addButtonText}>
          <Text style={styles.addButtonTitle}>Add New Profile</Text>
          <Text style={styles.addButtonSubtitle}>EV or home battery</Text>
        </View>
        <ChevronRight size={20} color={colors.text.tertiary} />
      </TouchableOpacity>

      {profiles.length === 0 ? (
        <View style={styles.emptyState}>
          <Car size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No Profiles Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your EV or home battery to start optimizing your charging
          </Text>
        </View>
      ) : (
        <View style={styles.profilesList}>
          {profiles.map(profile => (
            <View key={profile.id} style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={[
                  styles.profileIcon,
                  { backgroundColor: profile.type === 'ev' ? colors.primary + '20' : colors.accent + '20' }
                ]}>
                  {profile.type === 'ev' ? (
                    <Car size={24} color={colors.primary} />
                  ) : (
                    <Battery size={24} color={colors.accent} />
                  )}
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile.name}</Text>
                  <Text style={styles.profileType}>
                    {profile.type === 'ev' ? 'Electric Vehicle' : 'Home Battery'}
                  </Text>
                </View>
              </View>

              <View style={styles.profileStats}>
                <View style={styles.profileStat}>
                  <Battery size={16} color={colors.text.secondary} />
                  <Text style={styles.profileStatValue}>{profile.capacity} kWh</Text>
                  <Text style={styles.profileStatLabel}>Capacity</Text>
                </View>
                <View style={styles.profileStatDivider} />
                <View style={styles.profileStat}>
                  <Zap size={16} color={colors.text.secondary} />
                  <Text style={styles.profileStatValue}>{profile.maxChargingRate} kW</Text>
                  <Text style={styles.profileStatLabel}>Max Rate</Text>
                </View>
              </View>

              <View style={styles.profileActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push({ pathname: '/ev/edit-profile', params: { id: profile.id } })}
                >
                  <Edit3 size={18} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDelete(profile.id, profile.name)}
                >
                  <Trash2 size={18} color={colors.error} />
                  <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  addButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    flex: 1,
  },
  addButtonTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  addButtonSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center' as const,
    marginTop: 8,
    lineHeight: 20,
  },
  profilesList: {
    gap: 16,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  profileIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  profileType: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  profileStats: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  profileStatValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  profileStatLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  bottomPadding: {
    height: 40,
  },
});
