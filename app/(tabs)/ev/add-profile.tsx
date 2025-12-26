import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Car, Battery, Zap, Save } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useColors } from '@/constants/colors';
import { useEV } from '@/providers/EVProvider';

export default function AddProfileScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = useColors(isDark);
  const { addProfile } = useEV();

  const [type, setType] = useState<'ev' | 'battery'>('ev');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [maxRate, setMaxRate] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for this profile.');
      return;
    }

    const capacityNum = parseFloat(capacity);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      Alert.alert('Invalid Capacity', 'Please enter a valid battery capacity in kWh.');
      return;
    }

    const maxRateNum = parseFloat(maxRate);
    if (isNaN(maxRateNum) || maxRateNum <= 0) {
      Alert.alert('Invalid Rate', 'Please enter a valid maximum charging rate in kW.');
      return;
    }

    addProfile({
      name: name.trim(),
      type,
      capacity: capacityNum,
      maxChargingRate: maxRateNum,
    });

    router.back();
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeOption, type === 'ev' && styles.typeOptionSelected]}
            onPress={() => setType('ev')}
          >
            <Car size={24} color={type === 'ev' ? '#fff' : colors.text.secondary} />
            <Text style={[styles.typeOptionText, type === 'ev' && styles.typeOptionTextSelected]}>
              Electric Vehicle
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, type === 'battery' && styles.typeOptionSelected]}
            onPress={() => setType('battery')}
          >
            <Battery size={24} color={type === 'battery' ? '#fff' : colors.text.secondary} />
            <Text style={[styles.typeOptionText, type === 'battery' && styles.typeOptionTextSelected]}>
              Home Battery
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder={type === 'ev' ? 'e.g., Tesla Model 3' : 'e.g., Powerwall'}
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Battery Capacity (kWh)</Text>
        <View style={styles.inputWithIcon}>
          <Battery size={20} color={colors.text.secondary} />
          <TextInput
            style={styles.iconInput}
            value={capacity}
            onChangeText={setCapacity}
            placeholder={type === 'ev' ? '60' : '13.5'}
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
          />
          <Text style={styles.inputUnit}>kWh</Text>
        </View>
        <Text style={styles.hint}>
          {type === 'ev' 
            ? 'The total usable battery capacity of your EV'
            : 'The total storage capacity of your battery system'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Max Charging Rate (kW)</Text>
        <View style={styles.inputWithIcon}>
          <Zap size={20} color={colors.text.secondary} />
          <TextInput
            style={styles.iconInput}
            value={maxRate}
            onChangeText={setMaxRate}
            placeholder={type === 'ev' ? '7' : '5'}
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
          />
          <Text style={styles.inputUnit}>kW</Text>
        </View>
        <Text style={styles.hint}>
          {type === 'ev'
            ? 'Usually 7kW for home chargers, up to 22kW for faster chargers'
            : 'The maximum rate your battery can charge at'}
        </Text>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Save size={20} color="#fff" />
        <Text style={styles.saveButtonText}>Save Profile</Text>
      </TouchableOpacity>

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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  typeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  iconInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 16,
  },
  inputUnit: {
    fontSize: 14,
    color: colors.text.tertiary,
    fontWeight: '500' as const,
  },
  hint: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 8,
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
});
