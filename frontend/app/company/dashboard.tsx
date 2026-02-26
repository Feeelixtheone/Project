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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { apiRequest } from '../../src/utils/api';
import { useAuth } from '../../src/context/AuthContext';

const PRODUCT_SECTIONS = [
  'Aperitive',
  'Pizza',
  'Paste',
  'Fel Principal',
  'Supe',
  'Salate',
  'Deserturi',
  'Băuturi',
  'Alcool',
];

const FOOD_CATEGORIES = [
  { id: 'pizza', name: 'Pizza' },
  { id: 'aperitive', name: 'Aperitive' },
  { id: 'sushi', name: 'Sushi' },
  { id: 'alcool', name: 'Alcool' },
  { id: 'exclusive', name: 'Exclusive' },
  { id: 'bauturi', name: 'Băuturi' },
  { id: 'deserturi', name: 'Deserturi' },
  { id: 'fast-food', name: 'Fast Food' },
];

export default function CompanyDashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);

  // 3D Image Modal
  const [show3DImageModal, setShow3DImageModal] = useState(false);
  const [image3DUrl, setImage3DUrl] = useState('');
  const [selectedStoreFor3D, setSelectedStoreFor3D] = useState<string>('');

  // Store form
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeCoverImage, setStoreCoverImage] = useState('');
  const [storeCuisine, setStoreCuisine] = useState('');
  const [storeHours, setStoreHours] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Product form
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productSection, setProductSection] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const companyData = await apiRequest<any>('/api/companies/me');
      setCompany(companyData);
      
      if (companyData.is_verified) {
        const storesData = await apiRequest<any[]>('/api/stores/my');
        setStores(storesData);
      }
    } catch (error) {
      // User might not have a company
      console.log('No company found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStore = async () => {
    if (!storeName || !storeAddress || !storeCoverImage || !storeCuisine) {
      Alert.alert('Eroare', 'Completează câmpurile obligatorii');
      return;
    }

    // Validate description word count
    if (storeDescription && storeDescription.split(' ').length > 50) {
      Alert.alert('Eroare', 'Descrierea nu poate depăși 50 de cuvinte');
      return;
    }

    try {
      await apiRequest('/api/stores', {
        method: 'POST',
        body: {
          name: storeName,
          description: storeDescription,
          address: storeAddress,
          cover_image: storeCoverImage,
          gallery_images: [],
          sections: selectedSections,
          cuisine_type: storeCuisine,
          categories: selectedCategories,
          price_range: '$$',
          opening_hours: storeHours || '10:00 - 22:00',
          phone: storePhone,
        },
      });
      
      Alert.alert('Succes', 'Restaurantul a fost creat!');
      setShowCreateStore(false);
      resetStoreForm();
      loadData();
    } catch (error: any) {
      Alert.alert('Eroare', error.message || 'Nu s-a putut crea restaurantul');
    }
  };

  const handleAddProduct = async () => {
    if (!selectedStore || !productName || !productPrice || !productSection) {
      Alert.alert('Eroare', 'Completează câmpurile obligatorii');
      return;
    }

    try {
      await apiRequest(`/api/stores/${selectedStore.id}/products`, {
        method: 'POST',
        body: {
          section_id: productSection,
          name: productName,
          description: productDescription,
          price: parseFloat(productPrice),
          quantity: productQuantity || '1 porție',
          image_url: productImage || 'https://images.unsplash.com/photo-1623073284788-0d846f75e329?w=400',
        },
      });
      
      Alert.alert('Succes', 'Produsul a fost adăugat!');
      setShowAddProduct(false);
      resetProductForm();
    } catch (error: any) {
      Alert.alert('Eroare', error.message || 'Nu s-a putut adăuga produsul');
    }
  };

  const handleUpload3DImage = async (storeId: string) => {
    Alert.prompt(
      'Adaugă imagine 3D',
      'Introdu URL-ul imaginii 3D',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Adaugă',
          onPress: async (url) => {
            if (url) {
              try {
                await apiRequest(`/api/stores/${storeId}/images-3d?image_url=${encodeURIComponent(url)}`, {
                  method: 'POST',
                });
                Alert.alert('Succes', 'Imaginea 3D a fost adăugată!');
              } catch (error) {
                Alert.alert('Eroare', 'Nu s-a putut adăuga imaginea');
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const resetStoreForm = () => {
    setStoreName('');
    setStoreDescription('');
    setStoreAddress('');
    setStoreCoverImage('');
    setStoreCuisine('');
    setStoreHours('');
    setStorePhone('');
    setSelectedSections([]);
    setSelectedCategories([]);
  };

  const resetProductForm = () => {
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductQuantity('');
    setProductImage('');
    setProductSection('');
  };

  const toggleSection = (section: string) => {
    if (selectedSections.includes(section)) {
      setSelectedSections(selectedSections.filter(s => s !== section));
    } else {
      setSelectedSections([...selectedSections, section]);
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(c => c !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!company) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="business-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.noCompanyText}>Nu ai o firmă înregistrată</Text>
        <TouchableOpacity style={styles.registerButton} onPress={() => router.push('/')}>
          <Text style={styles.registerButtonText}>Înregistrează-te ca firmă</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!company.is_verified) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="time-outline" size={64} color={COLORS.warning} />
        <Text style={styles.pendingTitle}>În așteptare</Text>
        <Text style={styles.pendingText}>
          Firma ta "{company.company_name}" este în curs de verificare.{'\n'}
          CUI: {company.cui}
        </Text>
        <View style={styles.supportBox}>
          <Text style={styles.supportLabel}>Suport firme:</Text>
          <Text style={styles.supportEmail}>support.firme@restaurantapp.ro</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dashboard Firmă</Text>
          <Text style={styles.headerSubtitle}>{company.company_name}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Company Info */}
        <View style={styles.companyCard}>
          <View style={styles.companyHeader}>
            <View style={styles.companyIcon}>
              <Ionicons name="business" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.company_name}</Text>
              <Text style={styles.companyCui}>CUI: {company.cui}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.verifiedText}>Verificat</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stores.length}</Text>
            <Text style={styles.statLabel}>Restaurante</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>1.7%</Text>
            <Text style={styles.statLabel}>Comision</Text>
          </View>
        </View>

        {/* Stores Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Restaurantele Tale</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCreateStore(true)}
            >
              <Ionicons name="add" size={20} color={COLORS.text} />
              <Text style={styles.addButtonText}>Adaugă</Text>
            </TouchableOpacity>
          </View>

          {stores.length === 0 ? (
            <View style={styles.emptyStores}>
              <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nu ai restaurante încă</Text>
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => setShowCreateStore(true)}
              >
                <Text style={styles.createFirstText}>Creează primul tău restaurant</Text>
              </TouchableOpacity>
            </View>
          ) : (
            stores.map((store) => (
              <View key={store.id} style={styles.storeCard}>
                <Image source={{ uri: store.cover_image }} style={styles.storeImage} />
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeAddress}>{store.address}</Text>
                  <View style={styles.storeActions}>
                    <TouchableOpacity
                      style={styles.storeAction}
                      onPress={() => {
                        setSelectedStore(store);
                        setShowAddProduct(true);
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.storeActionText}>Produs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.storeAction}
                      onPress={() => handleUpload3DImage(store.id)}
                    >
                      <Ionicons name="cube-outline" size={18} color={COLORS.secondary} />
                      <Text style={[styles.storeActionText, { color: COLORS.secondary }]}>3D</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 3D Photography Info */}
        <View style={styles.info3dBox}>
          <Ionicons name="cube" size={24} color={COLORS.secondary} />
          <View style={styles.info3dContent}>
            <Text style={styles.info3dTitle}>Fotografiere 3D</Text>
            <Text style={styles.info3dText}>
              Poți adăuga imagini 3D ale preparatelor tale pentru a oferi clienților o experiență mai bună.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Create Store Modal */}
      <Modal visible={showCreateStore} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Creează Restaurant</Text>
              <TouchableOpacity onPress={() => setShowCreateStore(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nume Restaurant *</Text>
                <TextInput
                  style={styles.formInput}
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder="Ex: Pizzeria Napoli"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descriere (max 50 cuvinte)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={storeDescription}
                  onChangeText={setStoreDescription}
                  placeholder="Scurtă descriere..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.wordCount}>
                  {storeDescription ? storeDescription.split(' ').filter(w => w).length : 0}/50 cuvinte
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Adresă *</Text>
                <TextInput
                  style={styles.formInput}
                  value={storeAddress}
                  onChangeText={setStoreAddress}
                  placeholder="Str. Exemplu 123, București"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>URL Imagine Cover *</Text>
                <TextInput
                  style={styles.formInput}
                  value={storeCoverImage}
                  onChangeText={setStoreCoverImage}
                  placeholder="https://..."
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tip Bucătărie *</Text>
                <TextInput
                  style={styles.formInput}
                  value={storeCuisine}
                  onChangeText={setStoreCuisine}
                  placeholder="Italienesc, Românesc, etc."
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Program</Text>
                <TextInput
                  style={styles.formInput}
                  value={storeHours}
                  onChangeText={setStoreHours}
                  placeholder="10:00 - 22:00"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Telefon</Text>
                <TextInput
                  style={styles.formInput}
                  value={storePhone}
                  onChangeText={setStorePhone}
                  placeholder="+40 xxx xxx xxx"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Secțiuni Meniu</Text>
                <View style={styles.chipsContainer}>
                  {PRODUCT_SECTIONS.map((section) => (
                    <TouchableOpacity
                      key={section}
                      style={[
                        styles.chip,
                        selectedSections.includes(section) && styles.chipActive,
                      ]}
                      onPress={() => toggleSection(section)}
                    >
                      <Text style={[
                        styles.chipText,
                        selectedSections.includes(section) && styles.chipTextActive,
                      ]}>
                        {section}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Categorii</Text>
                <View style={styles.chipsContainer}>
                  {FOOD_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.chip,
                        selectedCategories.includes(cat.id) && styles.chipActive,
                      ]}
                      onPress={() => toggleCategory(cat.id)}
                    >
                      <Text style={[
                        styles.chipText,
                        selectedCategories.includes(cat.id) && styles.chipTextActive,
                      ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleCreateStore}>
                <Text style={styles.submitButtonText}>Creează Restaurant</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal visible={showAddProduct} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adaugă Produs</Text>
              <TouchableOpacity onPress={() => setShowAddProduct(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nume Produs *</Text>
                <TextInput
                  style={styles.formInput}
                  value={productName}
                  onChangeText={setProductName}
                  placeholder="Ex: Pizza Margherita"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descriere</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={productDescription}
                  onChangeText={setProductDescription}
                  placeholder="Ingrediente, preparare..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Preț (RON) *</Text>
                <TextInput
                  style={styles.formInput}
                  value={productPrice}
                  onChangeText={setProductPrice}
                  placeholder="35.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cantitate</Text>
                <TextInput
                  style={styles.formInput}
                  value={productQuantity}
                  onChangeText={setProductQuantity}
                  placeholder="300g, 1 porție, etc."
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>URL Imagine</Text>
                <TextInput
                  style={styles.formInput}
                  value={productImage}
                  onChangeText={setProductImage}
                  placeholder="https://..."
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Secțiune *</Text>
                <View style={styles.chipsContainer}>
                  {(selectedStore?.sections || PRODUCT_SECTIONS.slice(0, 5)).map((section: any) => {
                    const sectionName = typeof section === 'string' ? section : section.name;
                    return (
                      <TouchableOpacity
                        key={sectionName}
                        style={[
                          styles.chip,
                          productSection === sectionName && styles.chipActive,
                        ]}
                        onPress={() => setProductSection(sectionName)}
                      >
                        <Text style={[
                          styles.chipText,
                          productSection === sectionName && styles.chipTextActive,
                        ]}>
                          {sectionName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAddProduct}>
                <Text style={styles.submitButtonText}>Adaugă Produs</Text>
              </TouchableOpacity>
            </ScrollView>
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
  backButton: {
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
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  companyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  companyName: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
  },
  companyCui: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  verifiedText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.success,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.primary,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  addButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  emptyStores: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  createFirstButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  createFirstText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  storeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  storeImage: {
    width: 100,
    height: 100,
  },
  storeInfo: {
    flex: 1,
    padding: SPACING.sm,
    justifyContent: 'space-between',
  },
  storeName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  storeAddress: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  storeActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  storeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeActionText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primary,
  },
  info3dBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary + '15',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  info3dContent: {
    flex: 1,
  },
  info3dTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.secondary,
  },
  info3dText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  noCompanyText: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  registerButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  registerButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  pendingTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.warning,
    marginTop: SPACING.md,
  },
  pendingText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 24,
  },
  supportBox: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  supportLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  supportEmail: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 4,
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
  formTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  wordCount: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.text,
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
});
