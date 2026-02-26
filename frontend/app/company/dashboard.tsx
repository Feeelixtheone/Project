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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { apiRequest, getCompanyNotifications, markAllNotificationsRead, getStoreOrders, deleteStoreProduct, getCompanyReceipts, createSpecialOffer } from '../../src/utils/api';
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

  // Notifications & Orders
  const [notifications, setNotifications] = useState<any[]>([]);
  const [storeOrders, setStoreOrders] = useState<any>({ orders: [], reservations: [] });
  const [receipts, setReceipts] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<'stores' | 'notifications' | 'orders' | 'receipts' | 'offers'>('stores');

  // Special Offers
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerStoreId, setOfferStoreId] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('');
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
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
        
        // Load notifications
        try {
          const notifs = await getCompanyNotifications();
          setNotifications(notifs);
        } catch (e) {}
        
        // Load orders for first store
        if (storesData.length > 0) {
          try {
            const ordersData = await getStoreOrders(storesData[0].id);
            setStoreOrders(ordersData);
          } catch (e) {}
        }
        
        // Load receipts
        try {
          const receiptsData = await getCompanyReceipts();
          setReceipts(receiptsData);
        } catch (e) {}
      }
    } catch (error) {
      // User might not have a company
      console.log('No company found');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteProduct = async (storeId: string, productId: string) => {
    const doDelete = async () => {
      try {
        await deleteStoreProduct(storeId, productId);
        loadData();
      } catch (error: any) {
        const msg = error.message || 'Nu s-a putut șterge produsul';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Eroare', msg);
      }
    };
    
    if (Platform.OS === 'web') {
      if (window.confirm('Ești sigur că vrei să ștergi acest produs?')) {
        doDelete();
      }
    } else {
      Alert.alert('Șterge produs', 'Ești sigur că vrei să ștergi acest produs?', [
        { text: 'Nu', style: 'cancel' },
        { text: 'Da, șterge', style: 'destructive', onPress: doDelete },
      ]);
    }
  };
  
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (e) {}
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

  const handleUpload3DImage = (storeId: string) => {
    setSelectedStoreFor3D(storeId);
    setImage3DUrl('');
    setShow3DImageModal(true);
  };

  const handleSubmit3DImage = async () => {
    if (!image3DUrl || !selectedStoreFor3D) {
      Alert.alert('Eroare', 'Introdu URL-ul imaginii');
      return;
    }
    try {
      await apiRequest(`/api/stores/${selectedStoreFor3D}/images-3d?image_url=${encodeURIComponent(image3DUrl)}`, {
        method: 'POST',
      });
      Alert.alert('Succes', 'Imaginea 3D a fost adăugată!');
      setShow3DImageModal(false);
      setImage3DUrl('');
      setSelectedStoreFor3D('');
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut adăuga imaginea');
    }
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
            <Text style={styles.statValue}>2.7%</Text>
            <Text style={styles.statLabel}>Comision</Text>
          </View>
          <TouchableOpacity style={styles.statCard} onPress={() => setActiveSection('notifications')}>
            <Text style={styles.statValue}>{notifications.filter(n => !n.is_read).length}</Text>
            <Text style={styles.statLabel}>Notificări noi</Text>
          </TouchableOpacity>
        </View>

        {/* Section Tabs */}
        <View style={styles.sectionTabs}>
          {(['stores', 'notifications', 'orders', 'receipts'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.sectionTab, activeSection === tab && styles.sectionTabActive]}
              onPress={() => setActiveSection(tab)}
              data-testid={`company-tab-${tab}`}
            >
              <Ionicons
                name={tab === 'stores' ? 'restaurant' : tab === 'notifications' ? 'notifications' : tab === 'orders' ? 'receipt' : 'document-text'}
                size={18}
                color={activeSection === tab ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.sectionTabText, activeSection === tab && styles.sectionTabTextActive]}>
                {tab === 'stores' ? 'Restaurante' : tab === 'notifications' ? 'Notificări' : tab === 'orders' ? 'Comenzi' : 'Facturi'}
              </Text>
              {tab === 'notifications' && notifications.filter(n => !n.is_read).length > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{notifications.filter(n => !n.is_read).length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications Section */}
        {activeSection === 'notifications' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notificări</Text>
              {notifications.some(n => !n.is_read) && (
                <TouchableOpacity onPress={handleMarkAllRead} data-testid="mark-all-read-btn">
                  <Text style={{ color: COLORS.primary, fontFamily: FONTS.medium, fontSize: 14 }}>Marchează citite</Text>
                </TouchableOpacity>
              )}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.emptyStores}>
                <Ionicons name="notifications-off-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nu ai notificări</Text>
              </View>
            ) : (
              notifications.map((notif: any) => (
                <View key={notif.id} style={[styles.notifItem, !notif.is_read && styles.notifUnread]} data-testid={`notif-${notif.id}`}>
                  <Ionicons
                    name={notif.notification_type === 'new_order' ? 'cart' : notif.notification_type === 'reservation_paid' ? 'calendar' : 'notifications'}
                    size={24}
                    color={!notif.is_read ? COLORS.primary : COLORS.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                    <Text style={styles.notifTime}>{new Date(notif.created_at).toLocaleString('ro-RO')}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Orders Section */}
        {activeSection === 'orders' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comenzi & Rezervări</Text>
            {storeOrders.orders?.length === 0 && storeOrders.reservations?.length === 0 ? (
              <View style={styles.emptyStores}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nu ai comenzi sau rezervări</Text>
              </View>
            ) : (
              <>
                {storeOrders.orders?.map((order: any) => (
                  <View key={order.id} style={styles.orderItem} data-testid={`order-${order.id}`}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderTitle}>Comandă #{order.id?.slice(-6)}</Text>
                      <View style={[styles.orderStatus, { backgroundColor: order.status === 'confirmed' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                        <Text style={[styles.orderStatusText, { color: order.status === 'confirmed' ? COLORS.success : COLORS.warning }]}>
                          {order.status === 'confirmed' ? 'Confirmată' : order.status === 'pending_payment' ? 'Așteaptă plata' : order.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.orderDetail}>Client: {order.user_name || order.user_email}</Text>
                    <Text style={styles.orderDetail}>Total: {order.total} RON</Text>
                    <Text style={styles.orderDetail}>Comision: -{order.platform_fee} RON</Text>
                    <Text style={[styles.orderDetail, { color: COLORS.success, fontFamily: FONTS.semiBold }]}>Vei primi: {order.restaurant_payout || (order.total - order.platform_fee).toFixed(2)} RON</Text>
                    <Text style={styles.orderTime}>{new Date(order.created_at).toLocaleString('ro-RO')}</Text>
                  </View>
                ))}
                {storeOrders.reservations?.map((res: any) => (
                  <View key={res.id} style={styles.orderItem} data-testid={`reservation-${res.id}`}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderTitle}>Rezervare #{res.id?.slice(-6)}</Text>
                      <View style={[styles.orderStatus, { backgroundColor: res.status === 'confirmed' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                        <Text style={[styles.orderStatusText, { color: res.status === 'confirmed' ? COLORS.success : COLORS.warning }]}>
                          {res.status === 'confirmed' ? 'Confirmată' : res.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.orderDetail}>Data: {res.date} la {res.time}</Text>
                    <Text style={styles.orderDetail}>Persoane: {res.guests}</Text>
                    {res.total_paid > 0 && <Text style={styles.orderDetail}>Plătit: {res.total_paid} RON</Text>}
                    <Text style={styles.orderTime}>{new Date(res.created_at).toLocaleString('ro-RO')}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Receipts Section */}
        {activeSection === 'receipts' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Facturi</Text>
            {receipts.length === 0 ? (
              <View style={styles.emptyStores}>
                <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nu ai facturi încă</Text>
              </View>
            ) : (
              receipts.map((receipt: any) => (
                <View key={receipt.id} style={styles.orderItem} data-testid={`receipt-${receipt.id}`}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderTitle}>Factură {receipt.receipt_number}</Text>
                    <Text style={{ fontFamily: FONTS.semiBold, color: COLORS.success }}>{receipt.status}</Text>
                  </View>
                  <Text style={styles.orderDetail}>CUI: {receipt.company_cui}</Text>
                  <Text style={styles.orderDetail}>Restaurant: {receipt.restaurant_name}</Text>
                  <Text style={styles.orderDetail}>Total: {receipt.total_amount} RON</Text>
                  <Text style={styles.orderDetail}>Comision ({receipt.platform_commission_percentage}%): -{receipt.platform_commission} RON</Text>
                  <Text style={[styles.orderDetail, { color: COLORS.success, fontFamily: FONTS.semiBold }]}>Payout: {receipt.restaurant_payout} RON</Text>
                  <Text style={styles.orderTime}>{new Date(receipt.issued_date).toLocaleString('ro-RO')}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Stores Section */}
        {activeSection === 'stores' && (
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
                  
                  {/* Products list */}
                  {store.menu && store.menu.length > 0 && (
                    <View style={{ marginTop: SPACING.sm }}>
                      <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>
                        Produse ({store.menu.length}):
                      </Text>
                      {store.menu.slice(0, 5).map((item: any) => (
                        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 }}>
                          <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text, flex: 1 }} numberOfLines={1}>
                            {item.name} - {item.price} RON
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleDeleteProduct(store.id, item.id)}
                            style={{ padding: 4 }}
                            data-testid={`delete-product-${item.id}`}
                          >
                            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {store.menu.length > 5 && (
                        <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted }}>
                          +{store.menu.length - 5} alte produse
                        </Text>
                      )}
                    </View>
                  )}
                  
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
        )} {/* End of activeSection === 'stores' */}

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

      {/* 3D Image Modal */}
      <Modal visible={show3DImageModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adaugă imagine 3D</Text>
              <TouchableOpacity onPress={() => { setShow3DImageModal(false); setImage3DUrl(''); }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>URL-ul imaginii 3D</Text>
            <TextInput
              style={styles.formInput}
              value={image3DUrl}
              onChangeText={setImage3DUrl}
              placeholder="https://..."
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit3DImage}>
              <Text style={styles.submitButtonText}>Adaugă</Text>
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
  sectionTabs: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTabActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  sectionTabText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  sectionTabTextActive: {
    color: COLORS.primary,
  },
  notifBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  notifBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#fff',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notifUnread: {
    backgroundColor: COLORS.primary + '08',
  },
  notifTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  notifMessage: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notifTime: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  orderItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  orderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  orderStatusText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  orderDetail: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderTime: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});
