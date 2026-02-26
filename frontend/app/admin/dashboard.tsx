import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { apiRequest, getAdminNotifications, markAdminNotificationRead, getAdminRestaurants, deleteAdminRestaurant } from '../../src/utils/api';
import { useAuth } from '../../src/context/AuthContext';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data
  const [stats, setStats] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [pendingCompanies, setPendingCompanies] = useState<any[]>([]);
  
  // Modals
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showVerifyCUI, setShowVerifyCUI] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectCompanyId, setRejectCompanyId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  
  // Create company form
  const [companyName, setCompanyName] = useState('');
  const [cui, setCui] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  
  // CUI verification
  const [verifyCui, setVerifyCui] = useState('');
  const [cuiResult, setCuiResult] = useState<any>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      setIsLoading(true);
      const adminCheck = await apiRequest<any>('/api/admin/check');
      setIsAdmin(adminCheck.is_admin);
      
      if (adminCheck.is_admin) {
        await loadData();
      }
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [statsData, companiesData, pendingData] = await Promise.all([
        apiRequest<any>('/api/admin/stats'),
        apiRequest<any[]>('/api/admin/companies'),
        apiRequest<any[]>('/api/admin/companies/pending'),
      ]);
      setStats(statsData);
      setCompanies(companiesData);
      setPendingCompanies(pendingData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleVerifyCompany = async (companyId: string) => {
    try {
      await apiRequest(`/api/admin/companies/${companyId}/verify`, { method: 'PUT' });
      Alert.alert('Succes', 'Firma a fost verificată');
      loadData();
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut verifica firma');
    }
  };

  const handleRejectCompany = (companyId: string) => {
    setRejectCompanyId(companyId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleSubmitReject = async () => {
    try {
      await apiRequest(`/api/admin/companies/${rejectCompanyId}/reject?reason=${rejectReason || ''}`, { method: 'PUT' });
      Alert.alert('Succes', 'Firma a fost respinsă');
      setShowRejectModal(false);
      setRejectCompanyId('');
      setRejectReason('');
      loadData();
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut respinge firma');
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    Alert.alert(
      'Șterge firma',
      `Ești sigur că vrei să ștergi "${companyName}"? Această acțiune este ireversibilă.`,
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Șterge',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/api/admin/companies/${companyId}`, { method: 'DELETE' });
              Alert.alert('Succes', 'Firma a fost ștearsă');
              loadData();
            } catch (error) {
              Alert.alert('Eroare', 'Nu s-a putut șterge firma');
            }
          },
        },
      ]
    );
  };

  const handleCreateCompany = async () => {
    if (!companyName || !cui || !companyEmail || !companyPhone) {
      Alert.alert('Eroare', 'Completează toate câmpurile obligatorii');
      return;
    }

    try {
      const result = await apiRequest<any>('/api/admin/companies/create', {
        method: 'POST',
        body: {
          company_name: companyName,
          cui,
          email: companyEmail,
          phone: companyPhone,
          owner_email: ownerEmail || undefined,
        },
      });
      
      Alert.alert(
        'Succes',
        `Firma "${result.company_name}" a fost creată!\n${result.anaf_verified ? 'CUI verificat prin ANAF' : 'CUI neverificat'}`
      );
      
      setShowCreateCompany(false);
      resetCreateForm();
      loadData();
    } catch (error: any) {
      Alert.alert('Eroare', error.message || 'Nu s-a putut crea firma');
    }
  };

  const handleVerifyCUI = async () => {
    if (!verifyCui) {
      Alert.alert('Eroare', 'Introdu un CUI');
      return;
    }

    try {
      setCuiResult(null);
      const result = await apiRequest<any>(`/api/cui/verify/${verifyCui}`);
      setCuiResult(result);
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut verifica CUI-ul');
    }
  };

  const resetCreateForm = () => {
    setCompanyName('');
    setCui('');
    setCompanyEmail('');
    setCompanyPhone('');
    setOwnerEmail('');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="lock-closed" size={64} color={COLORS.error} />
        <Text style={styles.accessDeniedTitle}>Acces interzis</Text>
        <Text style={styles.accessDeniedText}>
          Nu ai permisiuni de administrator.{'\n'}
          Contul admin: mutinyretreat37@gmail.com
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Înapoi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Panou Admin</Text>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
            <Text style={styles.adminBadgeText}>Administrator</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Stats */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{stats.total_users}</Text>
              <Text style={styles.statLabel}>Utilizatori</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="business" size={24} color={COLORS.secondary} />
              <Text style={styles.statValue}>{stats.total_companies}</Text>
              <Text style={styles.statLabel}>Firme</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.statValue}>{stats.verified_companies}</Text>
              <Text style={styles.statLabel}>Verificate</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color={COLORS.warning} />
              <Text style={styles.statValue}>{stats.pending_companies}</Text>
              <Text style={styles.statLabel}>În așteptare</Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acțiuni rapide</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowCreateCompany(true)}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              <Text style={styles.actionText}>Creează firmă</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowVerifyCUI(true)}
            >
              <Ionicons name="search" size={24} color={COLORS.secondary} />
              <Text style={styles.actionText}>Verifică CUI</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Companies */}
        {pendingCompanies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Firme în așteptare ({pendingCompanies.length})
            </Text>
            {pendingCompanies.map((company) => (
              <View key={company.id} style={styles.companyCard}>
                <View style={styles.companyHeader}>
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time-outline" size={14} color={COLORS.warning} />
                  </View>
                  <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{company.company_name}</Text>
                    <Text style={styles.companyCui}>CUI: {company.cui}</Text>
                  </View>
                </View>
                <View style={styles.companyDetails}>
                  <Text style={styles.companyEmail}>{company.email}</Text>
                  <Text style={styles.companyPhone}>{company.phone}</Text>
                </View>
                <View style={styles.companyActions}>
                  <TouchableOpacity
                    style={[styles.companyActionBtn, styles.verifyBtn]}
                    onPress={() => handleVerifyCompany(company.id)}
                  >
                    <Ionicons name="checkmark" size={18} color={COLORS.text} />
                    <Text style={styles.companyActionText}>Verifică</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.companyActionBtn, styles.rejectBtn]}
                    onPress={() => handleRejectCompany(company.id)}
                  >
                    <Ionicons name="close" size={18} color={COLORS.text} />
                    <Text style={styles.companyActionText}>Respinge</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* All Companies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Toate firmele ({companies.length})
          </Text>
          {companies.map((company) => (
            <View key={company.id} style={styles.companyCard}>
              <View style={styles.companyHeader}>
                <View style={[
                  styles.statusBadge,
                  company.is_verified ? styles.verifiedBadge : styles.unverifiedBadge
                ]}>
                  <Ionicons
                    name={company.is_verified ? 'checkmark-circle' : 'time-outline'}
                    size={14}
                    color={company.is_verified ? COLORS.success : COLORS.warning}
                  />
                </View>
                <View style={styles.companyInfo}>
                  <Text style={styles.companyName}>{company.company_name}</Text>
                  <Text style={styles.companyCui}>CUI: {company.cui}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteCompany(company.id, company.company_name)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
              <View style={styles.companyDetails}>
                <Text style={styles.companyEmail}>{company.email}</Text>
                {company.anaf_data?.valid && (
                  <View style={styles.anafBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                    <Text style={styles.anafText}>ANAF verificat</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Create Company Modal */}
      <Modal visible={showCreateCompany} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Creează Firmă</Text>
              <TouchableOpacity onPress={() => setShowCreateCompany(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nume Firmă *</Text>
                <TextInput
                  style={styles.formInput}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Numele firmei"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>CUI * (va fi verificat automat)</Text>
                <TextInput
                  style={styles.formInput}
                  value={cui}
                  onChangeText={setCui}
                  placeholder="2-10 cifre"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Firmă *</Text>
                <TextInput
                  style={styles.formInput}
                  value={companyEmail}
                  onChangeText={setCompanyEmail}
                  placeholder="contact@firma.ro"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Telefon *</Text>
                <TextInput
                  style={styles.formInput}
                  value={companyPhone}
                  onChangeText={setCompanyPhone}
                  placeholder="+40 xxx xxx xxx"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Proprietar (opțional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={ownerEmail}
                  onChangeText={setOwnerEmail}
                  placeholder="proprietar@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.helperText}>
                  Dacă utilizatorul există, firma va fi atribuită. Altfel, se va crea un cont nou.
                </Text>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleCreateCompany}>
                <Text style={styles.submitButtonText}>Creează Firma</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Verify CUI Modal */}
      <Modal visible={showVerifyCUI} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verifică CUI (ANAF)</Text>
              <TouchableOpacity onPress={() => {
                setShowVerifyCUI(false);
                setCuiResult(null);
                setVerifyCui('');
              }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>CUI</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  value={verifyCui}
                  onChangeText={setVerifyCui}
                  placeholder="Introdu CUI-ul"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleVerifyCUI}>
                  <Ionicons name="search" size={20} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>

            {cuiResult && (
              <View style={[
                styles.cuiResultCard,
                cuiResult.valid ? styles.cuiValid : styles.cuiInvalid
              ]}>
                <View style={styles.cuiResultHeader}>
                  <Ionicons
                    name={cuiResult.valid ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={cuiResult.valid ? COLORS.success : COLORS.error}
                  />
                  <Text style={[
                    styles.cuiResultTitle,
                    { color: cuiResult.valid ? COLORS.success : COLORS.error }
                  ]}>
                    {cuiResult.valid ? 'CUI Valid' : 'CUI Invalid'}
                  </Text>
                </View>
                
                {cuiResult.valid ? (
                  <View style={styles.cuiDetails}>
                    <Text style={styles.cuiDetailLabel}>Denumire:</Text>
                    <Text style={styles.cuiDetailValue}>{cuiResult.name}</Text>
                    
                    {cuiResult.address && (
                      <>
                        <Text style={styles.cuiDetailLabel}>Adresă:</Text>
                        <Text style={styles.cuiDetailValue}>{cuiResult.address}</Text>
                      </>
                    )}
                    
                    <Text style={styles.cuiDetailLabel}>Plătitor TVA:</Text>
                    <Text style={styles.cuiDetailValue}>{cuiResult.is_tva_payer ? 'Da' : 'Nu'}</Text>
                  </View>
                ) : (
                  <Text style={styles.cuiError}>{cuiResult.error}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Reject Company Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Respinge firma</Text>
              <TouchableOpacity onPress={() => { setShowRejectModal(false); setRejectReason(''); }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>Motivul respingerii (opțional)</Text>
            <TextInput
              style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Introdu motivul respingerii..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: COLORS.error }]} onPress={handleSubmitReject}>
              <Text style={styles.submitButtonText}>Respinge Firma</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  adminBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.success,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  accessDeniedTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  accessDeniedText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 24,
  },
  backButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  actionText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  companyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  pendingBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  verifiedBadge: {
    backgroundColor: COLORS.success + '20',
  },
  unverifiedBadge: {
    backgroundColor: COLORS.warning + '20',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  companyCui: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  deleteBtn: {
    padding: SPACING.xs,
  },
  companyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyEmail: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  companyPhone: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  anafBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  anafText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.success,
  },
  companyActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  companyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  verifyBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  companyActionText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  formInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  helperText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    width: 50,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cuiResultCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  cuiValid: {
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  cuiInvalid: {
    backgroundColor: COLORS.error + '15',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  cuiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cuiResultTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
  },
  cuiDetails: {
    gap: 4,
  },
  cuiDetailLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  cuiDetailValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  cuiError: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.error,
  },
});
