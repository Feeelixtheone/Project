import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
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

type AuthMode = 'welcome' | 'login' | 'register' | 'company';

export default function WelcomeScreen() {
  const { user, isLoading, isAuthenticated, login, register } = useAuth();
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'business'>('user');

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

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setError('Completează toate câmpurile');
      return;
    }
    setError('');
    setLoginLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (err: any) {
      setError(err.message || 'Eroare la autentificare');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName || !regEmail || !regPassword) {
      setError('Completează toate câmpurile');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Parolele nu coincid');
      return;
    }
    if (regPassword.length < 6) {
      setError('Parola trebuie să aibă minim 6 caractere');
      return;
    }
    setError('');
    setLoginLoading(true);
    try {
      await register(regEmail.trim(), regPassword, regName.trim(), accountType);
    } catch (err: any) {
      setError(err.message || 'Eroare la înregistrare');
    } finally {
      setLoginLoading(false);
    }
  };

  const validateCui = (value: string) => {
    setCui(value);
    if (value.length > 0) {
      if (!/^\d+$/.test(value)) {
        setCuiError('CUI-ul trebuie sa contina doar cifre');
      } else if (value.length < 2 || value.length > 10) {
        setCuiError('CUI-ul trebuie sa aiba intre 2 si 10 cifre');
      } else {
        setCuiError('');
      }
    } else {
      setCuiError('');
    }
  };

  const handleCompanyRegister = async () => {
    if (!companyName || !cui || !companyEmail || !companyPhone) {
      setError('Completează toate câmpurile');
      return;
    }
    if (cuiError) {
      setError(cuiError);
      return;
    }
    // Switch to register mode with business type
    setRegName(companyName);
    setRegEmail(companyEmail);
    setAccountType('business');
    setAuthMode('register');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Se incarca...</Text>
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
        <Text style={styles.tagline}>Descopera cele mai bune restaurante</Text>
      </View>

      {/* Food Categories Preview */}
      <View style={styles.categoriesPreview}>
        <Text style={styles.categoriesTitle}>Ce ai pofta sa mananci?</Text>
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
        <Pressable
          onPress={() => { setError(''); setAuthMode('login'); }}
          data-testid="go-to-login-btn"
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.primaryButton, { pointerEvents: 'none' as any }]}
          >
            <Ionicons name="log-in-outline" size={24} color={COLORS.text} />
            <Text style={styles.primaryButtonText}>Autentifica-te</Text>
          </LinearGradient>
        </Pressable>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => { setError(''); setAccountType('user'); setAuthMode('register'); }}
          data-testid="go-to-register-btn"
        >
          <Ionicons name="person-add-outline" size={22} color={COLORS.primary} />
          <Text style={styles.secondaryButtonText}>Creeaza cont nou</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: COLORS.secondary }]}
          onPress={() => { setError(''); setAuthMode('company'); }}
          data-testid="go-to-company-btn"
        >
          <Ionicons name="business-outline" size={22} color={COLORS.secondary} />
          <Text style={[styles.secondaryButtonText, { color: COLORS.secondary }]}>Inregistreaza-te ca firma</Text>
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
        Continuand, accepti Termenii si Conditiile noastre
      </Text>
    </View>
  );

  const renderLogin = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScrollContent}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => { setError(''); setAuthMode('welcome'); }} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Autentificare</Text>
        </View>

        <View style={styles.loginIconContainer}>
          <Ionicons name="person-circle" size={64} color={COLORS.primary} />
        </View>

        {error ? (
          <View style={styles.errorBox} data-testid="auth-error">
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.formFields}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                value={loginEmail}
                onChangeText={setLoginEmail}
                placeholder="email@exemplu.ro"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                data-testid="login-email-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Parola</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.inputField, { flex: 1 }]}
                value={loginPassword}
                onChangeText={setLoginPassword}
                placeholder="Introdu parola"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                data-testid="login-password-input"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleLogin}
          disabled={loginLoading}
          data-testid="login-submit-btn"
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.submitButton, { pointerEvents: 'none' as any }]}
          >
            {loginLoading ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Autentifica-te</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
              </>
            )}
          </LinearGradient>
        </Pressable>

        <TouchableOpacity
          onPress={() => { setError(''); setAuthMode('register'); }}
          style={styles.switchLink}
        >
          <Text style={styles.switchLinkText}>Nu ai cont? <Text style={styles.switchLinkBold}>Creeaza unul</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderRegister = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScrollContent}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => { setError(''); setAuthMode('welcome'); }} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Cont Nou</Text>
        </View>

        {/* Account Type Selector */}
        <View style={styles.accountTypeSelector}>
          <TouchableOpacity
            style={[styles.accountTypeBtn, accountType === 'user' && styles.accountTypeBtnActive]}
            onPress={() => setAccountType('user')}
            data-testid="account-type-user"
          >
            <Ionicons name="person" size={20} color={accountType === 'user' ? COLORS.text : COLORS.textMuted} />
            <Text style={[styles.accountTypeBtnText, accountType === 'user' && styles.accountTypeBtnTextActive]}>Utilizator</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accountTypeBtn, accountType === 'business' && styles.accountTypeBtnActive]}
            onPress={() => setAccountType('business')}
            data-testid="account-type-business"
          >
            <Ionicons name="business" size={20} color={accountType === 'business' ? COLORS.text : COLORS.textMuted} />
            <Text style={[styles.accountTypeBtnText, accountType === 'business' && styles.accountTypeBtnTextActive]}>Firma</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox} data-testid="register-error">
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.formFields}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nume complet</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                value={regName}
                onChangeText={setRegName}
                placeholder="Numele tau"
                placeholderTextColor={COLORS.textMuted}
                data-testid="register-name-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                value={regEmail}
                onChangeText={setRegEmail}
                placeholder="email@exemplu.ro"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                data-testid="register-email-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Parola</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                value={regPassword}
                onChangeText={setRegPassword}
                placeholder="Minim 6 caractere"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                data-testid="register-password-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirma parola</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                value={regConfirmPassword}
                onChangeText={setRegConfirmPassword}
                placeholder="Repeta parola"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                data-testid="register-confirm-password-input"
              />
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleRegister}
          disabled={loginLoading}
          data-testid="register-submit-btn"
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.submitButton, { pointerEvents: 'none' as any }]}
          >
            {loginLoading ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Creeaza cont</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
              </>
            )}
          </LinearGradient>
        </Pressable>

        <TouchableOpacity
          onPress={() => { setError(''); setAuthMode('login'); }}
          style={styles.switchLink}
        >
          <Text style={styles.switchLinkText}>Ai deja cont? <Text style={styles.switchLinkBold}>Autentifica-te</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderCompanyRegister = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScrollContent}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => { setError(''); setAuthMode('welcome'); }} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Inregistrare Firma</Text>
        </View>

        <View style={styles.companyIconContainer}>
          <Ionicons name="business" size={48} color={COLORS.primary} />
        </View>

        <Text style={styles.formSubtitle}>
          Inregistreaza-ti firma si incepe sa iti promovezi restaurantul
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        ) : null}

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
              <Text style={styles.helperText}>CUI-ul trebuie sa contina intre 2 si 10 cifre</Text>
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

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={COLORS.secondary} />
          <View style={styles.infoBoxContent}>
            <Text style={styles.infoBoxTitle}>Cum functioneaza?</Text>
            <Text style={styles.infoBoxText}>
              1. Completează datele firmei{'\n'}
              2. Creează un cont cu email și parolă{'\n'}
              3. Așteaptă verificarea CUI de către admin{'\n'}
              4. După aprobare, poți adăuga restaurantul
            </Text>
          </View>
        </View>

        <View style={styles.feeBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.feeText}>
            Detaliile comerciale vor fi discutate după aprobare
          </Text>
        </View>

        <TouchableOpacity
          style={styles.submitButtonPlain}
          onPress={handleCompanyRegister}
          activeOpacity={0.8}
          data-testid="company-continue-btn"
        >
          <Text style={styles.submitButtonText}>Continua cu inregistrarea</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.companySupport}>
          <Text style={styles.companySupportText}>Suport pentru firme:</Text>
          <Text style={styles.companySupportEmail}>support.firme@restaurantapp.ro</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800' }}
        style={styles.backgroundImage}
        blurRadius={3}
      />
      <View style={styles.overlay} />

      {authMode === 'welcome' && renderWelcome()}
      {authMode === 'login' && renderLogin()}
      {authMode === 'register' && renderRegister()}
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
  // Form Styles
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
  loginIconContainer: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorBoxText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.error,
    flex: 1,
  },
  formFields: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    paddingLeft: SPACING.md,
  },
  inputField: {
    flex: 1,
    padding: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeBtn: {
    paddingRight: SPACING.md,
    padding: SPACING.sm,
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    minHeight: 56,
  },
  submitButtonPlain: {
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
  switchLink: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  switchLinkText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  switchLinkBold: {
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  // Account type selector
  accountTypeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  accountTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountTypeBtnActive: {
    backgroundColor: COLORS.primary + '30',
    borderColor: COLORS.primary,
  },
  accountTypeBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  accountTypeBtnTextActive: {
    color: COLORS.text,
  },
  // Company styles
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
