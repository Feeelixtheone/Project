import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { 
  getReservations, 
  cancelReservation, 
  getRestaurants,
  getRestaurant,
  createReservationWithPayment 
} from '../../src/utils/api';
import { useAuth } from '../../src/context/AuthContext';
import { DatePicker, TimePicker } from '../../src/components/DateTimePicker';
import { useCartStore } from '../../src/stores/cartStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function RezervariScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const clearRestaurantItems = useCartStore((s) => s.clearRestaurantItems);
  const [reservations, setReservations] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  
  // New reservation modal
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [reservationType, setReservationType] = useState<'table_only' | 'food_ready'>('table_only');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [guests, setGuests] = useState('2');
  const [specialRequests, setSpecialRequests] = useState('');
  const [selectedMenuItems, setSelectedMenuItems] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Restaurant selector
  const [showRestaurantPicker, setShowRestaurantPicker] = useState(false);

  // Handle prefill from cart
  useEffect(() => {
    if (params.prefill_restaurant_id && params.prefill_type === 'food_ready') {
      const prefillRestaurant = async () => {
        try {
          const rest = await getRestaurant(params.prefill_restaurant_id as string);
          setSelectedRestaurant(rest);
          setReservationType('food_ready');
          if (params.prefill_items) {
            const items = JSON.parse(params.prefill_items as string);
            setSelectedMenuItems(items.map((item: any) => ({
              ...item,
              selected: true,
            })));
          }
          setShowNewReservation(true);
        } catch (error) {
          console.error('Error prefilling reservation:', error);
        }
      };
      prefillRestaurant();
    }
  }, [params.prefill_restaurant_id]);

  const loadReservations = async () => {
    try {
      const data = await getReservations();
      setReservations(data);
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRestaurants = async () => {
    try {
      const data = await getRestaurants();
      setRestaurants(data);
    } catch (error) {
      console.error('Error loading restaurants:', error);
    }
  };

  useEffect(() => {
    loadReservations();
    loadRestaurants();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  }, []);

  const handleCancel = (reservationId: string, reservation: any) => {
    // Check if can cancel
    if (!reservation.can_cancel) {
      Alert.alert(
        'Nu se poate anula',
        reservation.reservation_type === 'food_ready' 
          ? 'Rezervările cu mâncare gata nu pot fi anulate cu mai puțin de 1 oră înainte.'
          : 'Această rezervare nu poate fi anulată.'
      );
      return;
    }

    Alert.alert(
      'Anulează rezervarea',
      'Ești sigur că vrei să anulezi această rezervare?',
      [
        { text: 'Nu', style: 'cancel' },
        {
          text: 'Da, anulează',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelReservation(reservationId);
              loadReservations();
            } catch (error: any) {
              Alert.alert('Eroare', error.message || 'Nu s-a putut anula rezervarea');
            }
          },
        },
      ]
    );
  };

  const handleCreateReservation = async () => {
    if (!selectedRestaurant || !reservationDate || !reservationTime) {
      Alert.alert('Eroare', 'Te rugăm să completezi toate câmpurile obligatorii.');
      return;
    }

    if (!user) {
      Alert.alert('Eroare', 'Trebuie să fii autentificat pentru a face o rezervare.');
      return;
    }

    setIsCreating(true);

    try {
      // Get current origin URL for Stripe redirects
      const originUrl = BACKEND_URL || window?.location?.origin || 'https://app.local';

      const reservationData = {
        restaurant_id: selectedRestaurant.id,
        date: reservationDate,
        time: reservationTime,
        guests: parseInt(guests),
        special_requests: specialRequests || undefined,
        reservation_type: reservationType,
        ordered_items: reservationType === 'food_ready' 
          ? selectedMenuItems.map(item => ({
              menu_item_id: item.id,
              quantity: item.selectedQuantity || 1
            }))
          : [],
        origin_url: originUrl,
      };

      const result = await createReservationWithPayment(reservationData);
      
      // Open Stripe checkout
      if (result.payment?.checkout_url) {
        // For mobile, we'll use Linking to open the checkout URL
        const supported = await Linking.canOpenURL(result.payment.checkout_url);
        if (supported) {
          await Linking.openURL(result.payment.checkout_url);
        } else {
          Alert.alert('Eroare', 'Nu se poate deschide pagina de plată.');
        }
      }
      
      setShowNewReservation(false);
      resetForm();
      loadReservations();
      
    } catch (error: any) {
      Alert.alert('Eroare', error.message || 'Nu s-a putut crea rezervarea.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedRestaurant(null);
    setReservationType('table_only');
    setReservationDate('');
    setReservationTime('');
    setGuests('2');
    setSpecialRequests('');
    setSelectedMenuItems([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return COLORS.success;
      case 'pending':
      case 'pending_payment':
        return COLORS.warning;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmată';
      case 'pending':
        return 'În așteptare';
      case 'pending_payment':
        return 'Așteaptă plata';
      case 'cancelled':
        return 'Anulată';
      case 'completed':
        return 'Finalizată';
      default:
        return status;
    }
  };

  const getReservationTypeText = (type: string) => {
    return type === 'food_ready' ? 'Cu mâncare gata' : 'Doar masă';
  };

  const filteredReservations = reservations.filter((r) => {
    const reservationDate = new Date(r.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') {
      return reservationDate >= today && r.status !== 'cancelled';
    } else if (filter === 'past') {
      return reservationDate < today || r.status === 'cancelled';
    }
    return true;
  });

  const toggleMenuItem = (item: any) => {
    const exists = selectedMenuItems.find(i => i.id === item.id);
    if (exists) {
      setSelectedMenuItems(selectedMenuItems.filter(i => i.id !== item.id));
    } else {
      setSelectedMenuItems([...selectedMenuItems, { ...item, selectedQuantity: 1 }]);
    }
  };

  const updateMenuItemQuantity = (itemId: string, quantity: number) => {
    setSelectedMenuItems(selectedMenuItems.map(item => 
      item.id === itemId ? { ...item, selectedQuantity: Math.max(1, quantity) } : item
    ));
  };

  const calculateFoodTotal = () => {
    return selectedMenuItems.reduce((total, item) => {
      return total + (item.price * (item.selectedQuantity || 1));
    }, 0);
  };

  const renderReservationItem = ({ item }: { item: any }) => (
    <View style={styles.reservationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.restaurantInfo}>
          <Ionicons name="restaurant" size={24} color={COLORS.primary} />
          <Text style={styles.restaurantName}>{item.restaurant_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.typeBadge}>
        <Ionicons 
          name={item.reservation_type === 'food_ready' ? 'fast-food' : 'calendar'} 
          size={14} 
          color={COLORS.primary} 
        />
        <Text style={styles.typeText}>{getReservationTypeText(item.reservation_type)}</Text>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{item.time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{item.guests} persoane</Text>
        </View>
      </View>

      {/* Payment Info */}
      {item.total_paid > 0 && (
        <View style={styles.paymentInfo}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              {item.reservation_type === 'food_ready' ? 'Total mâncare' : 'Taxă în avans'}
            </Text>
            <Text style={styles.paymentValue}>
              {item.reservation_type === 'food_ready' ? item.food_total : item.upfront_fee} RON
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Comision platformă (1.7%)</Text>
            <Text style={styles.paymentValue}>{item.platform_fee} RON</Text>
          </View>
          <View style={[styles.paymentRow, styles.paymentTotal]}>
            <Text style={styles.paymentTotalLabel}>Total plătit</Text>
            <Text style={styles.paymentTotalValue}>{item.total_paid} RON</Text>
          </View>
          {item.reservation_type === 'table_only' && (
            <Text style={styles.deductionNote}>
              * Taxa în avans se deduce din nota finală
            </Text>
          )}
        </View>
      )}

      {/* Ordered Items */}
      {item.ordered_items && item.ordered_items.length > 0 && (
        <View style={styles.orderedItems}>
          <Text style={styles.orderedItemsTitle}>Mâncare comandată:</Text>
          {item.ordered_items.map((orderItem: any, index: number) => (
            <View key={index} style={styles.orderedItem}>
              <Text style={styles.orderedItemName}>{orderItem.quantity}x {orderItem.name}</Text>
              <Text style={styles.orderedItemPrice}>{orderItem.price * orderItem.quantity} RON</Text>
            </View>
          ))}
        </View>
      )}

      {item.special_requests && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Cereri speciale:</Text>
          <Text style={styles.notesText}>{item.special_requests}</Text>
        </View>
      )}

      {(item.status === 'pending' || item.status === 'confirmed' || item.status === 'pending_payment') && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancel(item.id, item)}
        >
          <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
          <Text style={styles.cancelButtonText}>Anulează rezervarea</Text>
        </TouchableOpacity>
      )}

      {item.reservation_type === 'food_ready' && !item.can_cancel && item.status !== 'cancelled' && (
        <View style={styles.warningBox}>
          <Ionicons name="information-circle" size={16} color={COLORS.warning} />
          <Text style={styles.warningText}>
            Nu se mai poate anula - mai puțin de 1 oră până la rezervare
          </Text>
        </View>
      )}
    </View>
  );

  const filterOptions = [
    { key: 'all', label: 'Toate' },
    { key: 'upcoming', label: 'Viitoare' },
    { key: 'past', label: 'Trecute' },
  ] as const;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Rezervările mele</Text>
          <Text style={styles.subtitle}>{reservations.length} rezervări</Text>
        </View>
        <TouchableOpacity 
          style={styles.newReservationBtn}
          onPress={() => setShowNewReservation(true)}
        >
          <Ionicons name="add" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterButton,
              filter === option.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(option.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === option.key && styles.filterButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reservations List */}
      <FlatList
        data={filteredReservations}
        renderItem={renderReservationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {isLoading ? 'Se încarcă...' : 'Nu ai rezervări'}
            </Text>
            <Text style={styles.emptySubtext}>
              Rezervările tale vor apărea aici
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setShowNewReservation(true)}
            >
              <Text style={styles.emptyButtonText}>Fă o rezervare</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* New Reservation Modal */}
      <Modal visible={showNewReservation} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rezervare nouă</Text>
              <TouchableOpacity onPress={() => { setShowNewReservation(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Restaurant Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Restaurant *</Text>
                <TouchableOpacity 
                  style={styles.selectorButton}
                  onPress={() => setShowRestaurantPicker(true)}
                >
                  <Text style={selectedRestaurant ? styles.selectorText : styles.selectorPlaceholder}>
                    {selectedRestaurant?.name || 'Selectează restaurant'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Reservation Type */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tip rezervare *</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      reservationType === 'table_only' && styles.typeOptionActive
                    ]}
                    onPress={() => { setReservationType('table_only'); setSelectedMenuItems([]); }}
                  >
                    <Ionicons 
                      name="calendar" 
                      size={24} 
                      color={reservationType === 'table_only' ? COLORS.primary : COLORS.textMuted} 
                    />
                    <Text style={[
                      styles.typeOptionText,
                      reservationType === 'table_only' && styles.typeOptionTextActive
                    ]}>Doar masă</Text>
                    <Text style={styles.typeOptionDesc}>Taxă în avans dedusă din nota finală</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      reservationType === 'food_ready' && styles.typeOptionActive
                    ]}
                    onPress={() => setReservationType('food_ready')}
                  >
                    <Ionicons 
                      name="fast-food" 
                      size={24} 
                      color={reservationType === 'food_ready' ? COLORS.primary : COLORS.textMuted} 
                    />
                    <Text style={[
                      styles.typeOptionText,
                      reservationType === 'food_ready' && styles.typeOptionTextActive
                    ]}>Cu mâncare gata</Text>
                    <Text style={styles.typeOptionDesc}>Nu se poate anula cu 1h înainte</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date & Time */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: SPACING.sm }]}>
                  <DatePicker
                    label="Data *"
                    value={reservationDate}
                    onChange={setReservationDate}
                    placeholder="Selectează data"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <TimePicker
                    label="Ora *"
                    value={reservationTime}
                    onChange={setReservationTime}
                    placeholder="Selectează ora"
                  />
                </View>
              </View>

              {/* Guests */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Număr persoane *</Text>
                <View style={styles.guestSelector}>
                  {['1', '2', '3', '4', '5', '6+'].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[styles.guestOption, guests === num && styles.guestOptionActive]}
                      onPress={() => setGuests(num)}
                    >
                      <Text style={[styles.guestOptionText, guests === num && styles.guestOptionTextActive]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Menu Items (if food_ready) */}
              {reservationType === 'food_ready' && selectedRestaurant?.menu && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Selectează mâncare</Text>
                  <View style={styles.menuList}>
                    {selectedRestaurant.menu.map((item: any) => {
                      const isSelected = selectedMenuItems.find(i => i.id === item.id);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.menuItem, isSelected && styles.menuItemSelected]}
                          onPress={() => toggleMenuItem(item)}
                        >
                          <View style={styles.menuItemInfo}>
                            <Text style={styles.menuItemName}>{item.name}</Text>
                            <Text style={styles.menuItemPrice}>{item.price} RON</Text>
                          </View>
                          {isSelected && (
                            <View style={styles.quantitySelector}>
                              <TouchableOpacity 
                                onPress={() => updateMenuItemQuantity(item.id, (isSelected.selectedQuantity || 1) - 1)}
                                style={styles.quantityBtn}
                              >
                                <Ionicons name="remove" size={16} color={COLORS.text} />
                              </TouchableOpacity>
                              <Text style={styles.quantityText}>{isSelected.selectedQuantity || 1}</Text>
                              <TouchableOpacity 
                                onPress={() => updateMenuItemQuantity(item.id, (isSelected.selectedQuantity || 1) + 1)}
                                style={styles.quantityBtn}
                              >
                                <Ionicons name="add" size={16} color={COLORS.text} />
                              </TouchableOpacity>
                            </View>
                          )}
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color={COLORS.text} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Special Requests */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cereri speciale</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={specialRequests}
                  onChangeText={setSpecialRequests}
                  placeholder="Ex: masă la fereastră, aniversare..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Price Summary */}
              {selectedRestaurant && (
                <View style={styles.priceSummary}>
                  <Text style={styles.priceSummaryTitle}>Sumar plată</Text>
                  {reservationType === 'table_only' ? (
                    <>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Taxă în avans</Text>
                        <Text style={styles.priceValue}>{selectedRestaurant.upfront_fee || 20} RON</Text>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Comision (1.7%)</Text>
                        <Text style={styles.priceValue}>
                          {((selectedRestaurant.upfront_fee || 20) * 0.017).toFixed(2)} RON
                        </Text>
                      </View>
                      <View style={[styles.priceRow, styles.priceTotal]}>
                        <Text style={styles.priceTotalLabel}>Total de plătit</Text>
                        <Text style={styles.priceTotalValue}>
                          {((selectedRestaurant.upfront_fee || 20) * 1.017).toFixed(2)} RON
                        </Text>
                      </View>
                      <Text style={styles.priceNote}>
                        * Taxa în avans va fi dedusă din nota finală
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Total mâncare</Text>
                        <Text style={styles.priceValue}>{calculateFoodTotal().toFixed(2)} RON</Text>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Comision (1.7%)</Text>
                        <Text style={styles.priceValue}>
                          {(calculateFoodTotal() * 0.017).toFixed(2)} RON
                        </Text>
                      </View>
                      <View style={[styles.priceRow, styles.priceTotal]}>
                        <Text style={styles.priceTotalLabel}>Total de plătit</Text>
                        <Text style={styles.priceTotalValue}>
                          {(calculateFoodTotal() * 1.017).toFixed(2)} RON
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedRestaurant || !reservationDate || !reservationTime || isCreating) && styles.submitButtonDisabled
                ]}
                onPress={handleCreateReservation}
                disabled={!selectedRestaurant || !reservationDate || !reservationTime || isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <Ionicons name="card" size={20} color={COLORS.text} />
                    <Text style={styles.submitButtonText}>Continuă la plată</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.stripeNote}>
                Plata securizată procesată prin Stripe
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Restaurant Picker Modal */}
      <Modal visible={showRestaurantPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selectează restaurant</Text>
              <TouchableOpacity onPress={() => setShowRestaurantPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={restaurants}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.restaurantOption,
                    selectedRestaurant?.id === item.id && styles.restaurantOptionSelected
                  ]}
                  onPress={async () => {
                    // Load full restaurant data with menu
                    try {
                      const fullRestaurant = await getRestaurant(item.id);
                      setSelectedRestaurant(fullRestaurant);
                    } catch {
                      setSelectedRestaurant(item);
                    }
                    setShowRestaurantPicker(false);
                  }}
                >
                  <View>
                    <Text style={styles.restaurantOptionName}>{item.name}</Text>
                    <Text style={styles.restaurantOptionAddress}>{item.address}</Text>
                  </View>
                  {selectedRestaurant?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.text,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  newReservationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: COLORS.text,
  },
  listContainer: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  reservationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  restaurantName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  typeText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primary,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  paymentInfo: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  paymentLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  paymentValue: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
  },
  paymentTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  paymentTotalLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  paymentTotalValue: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
  },
  deductionNote: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.success,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  orderedItems: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
  },
  orderedItemsTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  orderedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  orderedItemName: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  orderedItemPrice: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
  },
  notesContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.sm,
  },
  notesLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.error + '15',
  },
  cancelButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.error,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.warning + '15',
    borderRadius: BORDER_RADIUS.sm,
  },
  warningText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.warning,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  emptyButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  // Modal styles
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
    maxHeight: '90%',
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
  formRow: {
    flexDirection: 'row',
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
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
  },
  selectorPlaceholder: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeOption: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  typeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  typeOptionText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  typeOptionTextActive: {
    color: COLORS.text,
  },
  typeOptionDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  guestSelector: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  guestOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  guestOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  guestOptionText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  guestOptionTextActive: {
    color: COLORS.text,
  },
  menuList: {
    gap: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  menuItemPrice: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
    marginHorizontal: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  priceSummary: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  priceSummaryTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  priceTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  priceTotalLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  priceTotalValue: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
  },
  priceNote: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.success,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.surfaceLight,
  },
  submitButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  stripeNote: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  restaurantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  restaurantOptionSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  restaurantOptionName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  restaurantOptionAddress: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
