import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { devLogin } from '../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthMode = 'welcome' | 'login' | 'register' | 'company';

export default function WelcomeScreen() {
  const { user, isLoading, login, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');
  const [devLoginLoading, setDevLoginLoading] = useState<string | null>(null);
  const { refreshUser } = useAuth();
  
  // Company registration form
  const [companyName, setCompanyName] = useState('');
  const [cui, setCui] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [cuiError, setCuiError] = useState('');

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/(tabs)/acasa');
    }
  }, [isAuthenticated, isLoading]);

  const validateCui = (value: string) => {
    setCui(value);
    if (value.length > 0) {
      if (!/^\d+$/.test(value)) {
        setCuiError('CUI-ul trebuie să conțină doar cifre');
      } else if (value.length < 2 || value.length > 10) {
        setCuiError('CUI-ul trebuie să aibă între 2 și 10 cifre');
      } else {
        setCuiError('');
      }
    } else {
      setCuiError('');
    }
  };

  const handleCompanyRegister = async () => {
    if (!companyName || !cui || !companyEmail || !companyPhone) {
      Alert.alert('Eroare', 'Completează toate câmpurile');
      return;
    }
    if (cuiError) {
      Alert.alert('Eroare', cuiError);
      return;
    }
    
    // First login with Google, then register company
    Alert.alert(
      'Înregistrare Firmă',
      'Mai întâi trebuie să te autentifici cu Google, apoi vei putea să îți înregistrezi firma.',
      [
        { text: 'Anulează', style: 'cancel' },
        { text: 'Continuă', onPress: login }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Se încarcă...</Text>
      </View>
    );
  }

  const renderWelcome = () => (
    <View style={styles.welcomeContent}>
      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Ionicons name="restaurant" size={56} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>RestaurantApp</Text>
        <Text style={styles.tagline}>Descoperă cele mai bune restaurante</Text>
      </View>

      {/* Food Categories Preview */}
      <View style={styles.categoriesPreview}>
        <Text style={styles.categoriesTitle}>Ce ai poftă să mănânci?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {[
            { icon: 'pizza-outline', name: 'Pizza' },
            { icon: 'restaurant-outline', name: 'Aperitive' },
            { icon: 'fish-outline', name: 'Sushi' },
            { icon: 'wine-outline', name: 'Alcool' },
            { icon: 'star-outline', name: 'Exclusive' },
          ].map((cat, index) => (
            <View key={index} style={styles.categoryChip}>
              <Ionicons name={cat.icon as any} size={20} color={COLORS.primary} />
              <Text style={styles.categoryChipText}>{cat.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Auth Buttons */}
      <View style={styles.authButtons}>
        <TouchableOpacity onPress={login} activeOpacity={0.8}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <Image
              source={{ uri: 'https://www.google.com/favicon.ico' }}
              style={styles.googleIcon}
            />
            <Text style={styles.primaryButtonText}>Continuă cu Google</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setAuthMode('company')}
        >
          <Ionicons name="business-outline" size={22} color={COLORS.primary} />
          <Text style={styles.secondaryButtonText}>Înregistrează-te ca firmă</Text>
        </TouchableOpacity>
      </View>

      {/* Support Info */}
      <View style={styles.supportSection}>
        <Text style={styles.supportTitle}>Ai nevoie de ajutor?</Text>
        <View style={styles.supportRow}>
          <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.supportEmail}>support.clienti@restaurantapp.ro</Text>
        </View>
      </View>

      <Text style={styles.termsText}>
        Continuând, accepți Termenii și Condițiile noastre
      </Text>
    </View>
  );

  const renderCompanyRegister = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScrollContent}>
        {/* Header */}
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => setAuthMode('welcome')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Înregistrare Firmă</Text>
        </View>

        {/* Company Icon */}
        <View style={styles.companyIconContainer}>
          <Ionicons name="business" size={48} color={COLORS.primary} />
        </View>

        <Text style={styles.formSubtitle}>
          Înregistrează-ți firma și începe să îți promovezi restaurantul
        </Text>

        {/* Form Fields */}
        <View style={styles.formFields}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Numele Firmei</Text>
            <TextInput
              style={styles.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Ex: Restaurant SRL"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CUI (Cod Unic de Identificare)</Text>
            <TextInput
              style={[styles.input, cuiError ? styles.inputError : null]}
              value={cui}
              onChangeText={validateCui}
              placeholder="2-10 cifre"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={10}
            />
            {cuiError ? (
              <Text style={styles.errorText}>{cuiError}</Text>
            ) : (
              <Text style={styles.helperText}>CUI-ul trebuie să conțină între 2 și 10 cifre</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email de contact</Text>
            <TextInput
              style={styles.input}
              value={companyEmail}
              onChangeText={setCompanyEmail}
              placeholder="contact@firma.ro"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={companyPhone}
              onChangeText={setCompanyPhone}
              placeholder="+40 xxx xxx xxx"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={COLORS.secondary} />
          <View style={styles.infoBoxContent}>
            <Text style={styles.infoBoxTitle}>Cum funcționează?</Text>
            <Text style={styles.infoBoxText}>
              1. Completează datele firmei{'\n'}
              2. Autentifică-te cu Google{'\n'}
              3. Așteaptă verificarea CUI-ului de către admin{'\n'}
              4. După aprobare, poți adăuga restaurantul tău
            </Text>
          </View>
        </View>

        {/* Fee Info */}
        <View style={styles.feeBox}>
          <Ionicons name="cash-outline" size={20} color={COLORS.gold} />
          <Text style={styles.feeText}>
            Comision platformă: <Text style={styles.feeBold}>1.7%</Text> din fiecare achiziție
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleCompanyRegister}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Continuă cu Google</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>

        {/* Support */}
        <View style={styles.companySupport}>
          <Text style={styles.companySupportText}>Suport pentru firme:</Text>
          <Text style={styles.companySupportEmail}>support.firme@restaurantapp.ro</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800' }}
        style={styles.backgroundImage}
        blurRadius={3}
      />
      <View style={styles.overlay} />

      {/* Content */}
      {authMode === 'welcome' && renderWelcome()}
      {authMode === 'company' && renderCompanyRegister()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  keyboardView: {
    flex: 1,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  appName: {
    fontFamily: FONTS.bold,
    fontSize: 36,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  categoriesPreview: {
    marginVertical: SPACING.lg,
  },
  categoriesTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  categoriesScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  authButtons: {
    gap: SPACING.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    minHeight: 56,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  primaryButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    minHeight: 56,
  },
  secondaryButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.primary,
  },
  supportSection: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  supportTitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  supportEmail: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  termsText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  // Company Registration Styles
  formScrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  formTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.text,
  },
  companyIconContainer: {
    alignSelf: 'center',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  formSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  formFields: {
    gap: SPACING.md,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  helperText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.error,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 180, 216, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  infoBoxText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  feeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  feeText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  feeBold: {
    fontFamily: FONTS.bold,
    color: COLORS.gold,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
    minHeight: 56,
  },
  submitButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
  },
  companySupport: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  companySupportText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  companySupportEmail: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 4,
  },
});
