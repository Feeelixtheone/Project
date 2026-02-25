import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { getPaymentMethods, addPaymentMethod, deletePaymentMethod, updateUser, apiRequest } from '../../src/utils/api';
import { useCartStore } from '../../src/stores/cartStore';

type TabType = 'profil' | 'plati' | 'setari';

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profil');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [company, setCompany] = useState<any>(null);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAddress, setEditAddress] = useState(user?.address || '');

  // Add card modal
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardExpiryMonth, setCardExpiryMonth] = useState('');
  const [cardExpiryYear, setCardExpiryYear] = useState('');
  const [cardType, setCardType] = useState('visa');

  useEffect(() => {
    if (activeTab === 'plati') {
      loadPaymentMethods();
    }
    loadCompanyData();
  }, [activeTab]);

  useEffect(() => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditAddress(user?.address || '');
  }, [user]);

  const loadCompanyData = async () => {
    try {
      const companyData = await apiRequest<any>('/api/companies/me');
      setCompany(companyData);
    } catch (error) {
      // User doesn't have a company - that's ok
    }
  };

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const methods = await getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      await updateUser({
        name: editName,
        phone: editPhone,
        address: editAddress,
      });
      await refreshUser();
      setIsEditing(false);
      Alert.alert('Succes', 'Profilul a fost actualizat');
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut actualiza profilul');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCard = () => {
    setCardLastFour('');
    setCardExpiryMonth('');
    setCardExpiryYear('');
    setCardType('visa');
    setShowAddCardModal(true);
  };

  const handleSubmitCard = async () => {
    if (!cardLastFour || cardLastFour.length !== 4 || !/^\d{4}$/.test(cardLastFour)) {
      Alert.alert('Eroare', 'Introdu exact 4 cifre valide');
      return;
    }
    if (!cardExpiryMonth || !cardExpiryYear) {
      Alert.alert('Eroare', 'Completează luna și anul expirării');
      return;
    }
    try {
      await addPaymentMethod({
        card_type: cardType,
        last_four: cardLastFour,
        expiry_month: cardExpiryMonth,
        expiry_year: cardExpiryYear,
        is_default: paymentMethods.length === 0,
      });
      setShowAddCardModal(false);
      loadPaymentMethods();
      Alert.alert('Succes', 'Cardul a fost adăugat!');
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut adăuga cardul');
    }
  };

  const handleDeleteCard = (id: string) => {
    Alert.alert(
      'Șterge card',
      'Ești sigur că vrei să ștergi acest card?',
      [
        { text: 'Nu', style: 'cancel' },
        {
          text: 'Da, șterge',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePaymentMethod(id);
              loadPaymentMethods();
            } catch (error) {
              Alert.alert('Eroare', 'Nu s-a putut șterge cardul');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Deconectare',
      'Ești sigur că vrei să te deconectezi?',
      [
        { text: 'Nu', style: 'cancel' },
        { text: 'Da', onPress: logout },
      ]
    );
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'profil', label: 'Profil', icon: 'person-outline' },
    { key: 'plati', label: 'Plăți', icon: 'card-outline' },
    { key: 'setari', label: 'Setări', icon: 'settings-outline' },
  ];

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        {user?.picture ? (
          <Image source={{ uri: user.picture }} style={styles.profileImage} />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Ionicons name="person" size={48} color={COLORS.textSecondary} />
          </View>
        )}
        <Text style={styles.profileName}>{user?.name}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      {/* Profile Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detalii personale</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Ionicons
              name={isEditing ? 'close' : 'create-outline'}
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nume</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+40 xxx xxx xxx"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adresă</Text>
              <TextInput
                style={styles.input}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Adresa ta"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.saveButtonText}>Salvează</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{user?.name}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{user?.email}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{user?.phone || 'Nespecificat'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{user?.address || 'Nespecificată'}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderPaymentTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Metode de plată</Text>
          <TouchableOpacity onPress={handleAddCard}>
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
        ) : paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nu ai carduri salvate</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
              <Ionicons name="add" size={20} color={COLORS.text} />
              <Text style={styles.addButtonText}>Adăugă card</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {paymentMethods.map((method) => (
              <View key={method.id} style={styles.cardItem}>
                <View style={styles.cardIcon}>
                  <Ionicons
                    name={method.card_type === 'visa' ? 'card' : 'card-outline'}
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNumber}>**** **** **** {method.last_four}</Text>
                  <Text style={styles.cardExpiry}>
                    Expiră: {method.expiry_month}/{method.expiry_year}
                  </Text>
                </View>
                {method.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Principal</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => handleDeleteCard(method.id)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      {/* Quick Access - Cart */}
      <TouchableOpacity
        style={styles.quickAccessCardFull}
        onPress={() => router.push('/cart')}
      >
        <View style={[styles.quickAccessIcon, { backgroundColor: '#FF6B3520' }]}>
          <Ionicons name="cart" size={24} color="#FF6B35" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.quickAccessTitle}>Coșul meu</Text>
          <Text style={styles.quickAccessSub}>Vezi produsele din coș</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>

      {/* Admin Section - Only show if user is admin */}
      {user?.email === 'mutinyretreat37@gmail.com' && (
        <TouchableOpacity
          style={styles.adminBanner}
          onPress={() => router.push('/admin/dashboard')}
        >
          <View style={styles.adminBannerIcon}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.success} />
          </View>
          <View style={styles.adminBannerContent}>
            <Text style={styles.adminBannerTitle}>Panou Administrator</Text>
            <Text style={styles.adminBannerSubtitle}>Gestionează firme și utilizatori</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}

      {/* Company Section */}
      {company ? (
        <TouchableOpacity
          style={styles.companyBanner}
          onPress={() => router.push('/company/dashboard')}
        >
          <View style={styles.companyBannerIcon}>
            <Ionicons name="business" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.companyBannerContent}>
            <Text style={styles.companyBannerTitle}>{company.company_name}</Text>
            <Text style={styles.companyBannerSubtitle}>
              {company.is_verified ? 'Firmă verificată' : 'În așteptare verificare'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.registerCompanyBanner}
          onPress={() => router.push('/')}
        >
          <Ionicons name="business-outline" size={24} color={COLORS.primary} />
          <Text style={styles.registerCompanyText}>Înregistrează-te ca firmă</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Setări aplicație</Text>
        
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingText}>Notificări</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingText}>Limbă</Text>
            </View>
            <Text style={styles.settingValue}>Română</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingText}>Confidențialitate</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingText}>Ajutor</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingText}>Despre aplicație</Text>
            </View>
            <Text style={styles.settingValue}>v1.0.0</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.supportSection}>
        <Text style={styles.supportSectionTitle}>Suport & Contact</Text>
        <View style={styles.supportCard}>
          <View style={styles.supportRow}>
            <Ionicons name="person-outline" size={20} color={COLORS.primary} />
            <View style={styles.supportInfo}>
              <Text style={styles.supportLabel}>Suport clienți</Text>
              <Text style={styles.supportEmail}>support.clienti@restaurantapp.ro</Text>
            </View>
          </View>
          <View style={styles.supportDivider} />
          <View style={styles.supportRow}>
            <Ionicons name="business-outline" size={20} color={COLORS.secondary} />
            <View style={styles.supportInfo}>
              <Text style={styles.supportLabel}>Suport firme</Text>
              <Text style={[styles.supportEmail, { color: COLORS.secondary }]}>support.firme@restaurantapp.ro</Text>
            </View>
          </View>
        </View>
        <View style={styles.feeInfo}>
          <Ionicons name="cash-outline" size={18} color={COLORS.gold} />
          <Text style={styles.feeInfoText}>Comision platformă: <Text style={styles.feeBold}>1.7%</Text> din achiziții</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
        <Text style={styles.logoutText}>Deconectează-te</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Contul meu</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {activeTab === 'profil' && renderProfileTab()}
        {activeTab === 'plati' && renderPaymentTab()}
        {activeTab === 'setari' && renderSettingsTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  tabText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: SPACING.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  profileEmail: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  detailsList: {
    gap: SPACING.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  detailText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  editForm: {
    gap: SPACING.md,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  saveButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  cardsList: {
    gap: SPACING.sm,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.text,
  },
  cardExpiry: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  defaultText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.success,
  },
  settingsList: {
    gap: SPACING.xs,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  settingText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
  },
  settingValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  companyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  companyBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyBannerContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  companyBannerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  companyBannerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  registerCompanyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  registerCompanyText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.primary,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  adminBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.success + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBannerContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  adminBannerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  adminBannerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  supportSection: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  supportSectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  supportCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  supportInfo: {
    flex: 1,
  },
  supportLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  supportEmail: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 2,
  },
  supportDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  feeInfoText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  feeBold: {
    fontFamily: FONTS.bold,
    color: COLORS.gold,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.error + '15',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  logoutText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.error,
  },
  quickAccessCardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickAccessTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  quickAccessSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
