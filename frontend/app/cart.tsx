import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../src/constants/theme';
import { useCartStore, CartItem } from '../src/stores/cartStore';
import { createReservationWithPayment } from '../src/utils/api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const clearRestaurantItems = useCartStore((s) => s.clearRestaurantItems);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Reservation modal state
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationRestaurantId, setReservationRestaurantId] = useState('');
  const [reservationRestaurantName, setReservationRestaurantName] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [reservationGuests, setReservationGuests] = useState('2');
  const [reservationNotes, setReservationNotes] = useState('');

  // Group items by restaurant
  const groupedItems = useMemo(() => {
    const groups: Record<string, { restaurantId: string; restaurantName: string; items: CartItem[] }> = {};
    items.forEach((item) => {
      if (!groups[item.restaurantId]) {
        groups[item.restaurantId] = {
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          items: [],
        };
      }
      groups[item.restaurantId].items.push(item);
    });
    return Object.values(groups);
  }, [items]);

  const handleRemoveItem = (menuItemId: string, restaurantId: string) => {
    removeItem(menuItemId, restaurantId);
  };

  const handleClearCart = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sigur vrei să golești coșul?')) {
        clearCart();
      }
    } else {
      setShowConfirmClear(true);
    }
  };

  const confirmClear = () => {
    clearCart();
    setShowConfirmClear(false);
  };

  // Generate quick date options (today + next 6 days)
  const dateOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Azi' : i === 1 ? 'Maine' : d.toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' });
      opts.push({ value: dateStr, label: dayName });
    }
    return opts;
  }, []);

  const timeOptions = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

  // Open reservation modal before checkout
  const handleStartCheckout = (restaurantId: string, restaurantName: string) => {
    setReservationRestaurantId(restaurantId);
    setReservationRestaurantName(restaurantName);
    setReservationDate('');
    setReservationTime('');
    setReservationGuests('2');
    setReservationNotes('');
    setShowReservationModal(true);
  };

  // Complete checkout with reservation + payment
  const handleCheckoutWithReservation = async () => {
    if (!reservationDate || !reservationTime) {
      const msg = 'Selecteaza data si ora pentru rezervare';
      Platform.OS === 'web' ? window.alert(msg) : null;
      return;
    }

    const restaurantItems = items.filter((i) => i.restaurantId === reservationRestaurantId);
    if (restaurantItems.length === 0) return;

    setIsCheckingOut(reservationRestaurantId);
    setErrorMessage('');
    setShowReservationModal(false);

    try {
      const originUrl = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : BACKEND_URL || 'https://app.local';

      const reservationData = {
        restaurant_id: reservationRestaurantId,
        date: reservationDate,
        time: reservationTime,
        guests: parseInt(reservationGuests),
        special_requests: reservationNotes || undefined,
        reservation_type: 'food_ready',
        ordered_items: restaurantItems.map((item) => ({
          menu_item_id: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        origin_url: originUrl,
      };

      const result = await createReservationWithPayment(reservationData);

      if (result.payment?.checkout_url) {
        clearRestaurantItems(reservationRestaurantId);

        if (typeof window !== 'undefined') {
          window.location.href = result.payment.checkout_url;
        } else {
          const supported = await Linking.canOpenURL(result.payment.checkout_url);
          if (supported) {
            await Linking.openURL(result.payment.checkout_url);
          }
        }
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Nu s-a putut crea rezervarea');
    } finally {
      setIsCheckingOut(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} data-testid="cart-screen">
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} data-testid="cart-back-btn">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Cosul meu</Text>
        {items.length > 0 && (
          <Pressable onPress={handleClearCart} data-testid="cart-clear-all-btn" style={styles.trashBtn}>
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
            <Text style={styles.trashBtnText}>Goleste</Text>
          </Pressable>
        )}
      </View>

      {/* Error message */}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={() => setErrorMessage('')}>
            <Ionicons name="close" size={18} color={COLORS.error} />
          </Pressable>
        </View>
      ) : null}

      {items.length === 0 ? (
        <View style={styles.emptyContainer} data-testid="cart-empty">
          <Ionicons name="cart-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Cosul tau este gol</Text>
          <Text style={styles.emptySubtext}>Adauga produse din meniul restaurantelor</Text>
          <Pressable style={styles.browseBtn} onPress={() => router.push('/(tabs)/restaurante')} data-testid="cart-browse-btn">
            <Text style={styles.browseBtnText}>Vezi restaurante</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {groupedItems.map((group) => {
            const groupSubtotal = group.items.reduce((s, i) => s + i.price * i.quantity, 0);

            return (
              <View key={group.restaurantId} style={styles.restaurantGroup} data-testid={`cart-group-${group.restaurantId}`}>
                <View style={styles.restaurantHeader}>
                  <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                  <Text style={styles.restaurantName}>{group.restaurantName}</Text>
                </View>

                {group.items.map((item) => (
                  <View key={`${item.menuItemId}-${item.restaurantId}`} style={styles.cartItem} data-testid={`cart-item-${item.menuItemId}`}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                    ) : (
                      <View style={[styles.itemImage, { backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="fast-food" size={20} color={COLORS.textMuted} />
                      </View>
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemPrice}>{item.price.toFixed(2)} RON</Text>
                    </View>
                    <View style={styles.quantityControls}>
                      <Pressable
                        style={styles.qtyBtn}
                        data-testid={`cart-item-decrease-${item.menuItemId}`}
                        onPress={() => {
                          if (item.quantity <= 1) {
                            handleRemoveItem(item.menuItemId, item.restaurantId);
                          } else {
                            updateQuantity(item.menuItemId, item.restaurantId, item.quantity - 1);
                          }
                        }}
                      >
                        <Ionicons name={item.quantity <= 1 ? "trash" : "remove"} size={14} color={item.quantity <= 1 ? COLORS.error : COLORS.text} />
                      </Pressable>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <Pressable
                        style={styles.qtyBtn}
                        data-testid={`cart-item-increase-${item.menuItemId}`}
                        onPress={() => updateQuantity(item.menuItemId, item.restaurantId, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color={COLORS.text} />
                      </Pressable>
                    </View>
                    <Text style={styles.itemTotal}>{(item.price * item.quantity).toFixed(2)}</Text>
                    <Pressable
                      onPress={() => handleRemoveItem(item.menuItemId, item.restaurantId)}
                      style={styles.removeBtn}
                      data-testid={`cart-item-remove-${item.menuItemId}`}
                    >
                      <Ionicons name="close-circle" size={22} color={COLORS.error} />
                    </Pressable>
                  </View>
                ))}

                {/* Group Summary */}
                <View style={styles.groupSummary}>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total de plata</Text>
                    <Text style={styles.totalValue}>{groupSubtotal.toFixed(2)} RON</Text>
                  </View>
                </View>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={18} color={COLORS.secondary} />
                  <Text style={styles.infoText}>
                    Mancarea va fi pregatita pentru momentul rezervarii tale. Selecteaza data si ora pentru a continua.
                  </Text>
                </View>

                <Pressable
                  style={[styles.checkoutBtn, isCheckingOut === group.restaurantId && styles.checkoutBtnDisabled]}
                  onPress={() => handleStartCheckout(group.restaurantId, group.restaurantName)}
                  disabled={isCheckingOut === group.restaurantId}
                  data-testid={`cart-checkout-${group.restaurantId}`}
                >
                  {isCheckingOut === group.restaurantId ? (
                    <ActivityIndicator color={COLORS.text} />
                  ) : (
                    <>
                      <Ionicons name="calendar" size={20} color={COLORS.text} />
                      <Text style={styles.checkoutBtnText}>Rezerva si plateste {groupSubtotal.toFixed(2)} RON</Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Confirm Clear Modal */}
      <Modal visible={showConfirmClear} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Goleste cosul?</Text>
            <Text style={styles.modalText}>Toate produsele vor fi eliminate din cos.</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowConfirmClear(false)}>
                <Text style={styles.modalCancelText}>Anuleaza</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={confirmClear}>
                <Text style={styles.modalConfirmText}>Goleste</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reservation Modal */}
      <Modal visible={showReservationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.reservationModal}>
            <View style={styles.reservationModalHeader}>
              <Text style={styles.reservationModalTitle}>Rezerva masa la {reservationRestaurantName}</Text>
              <Pressable onPress={() => setShowReservationModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.reservationSubtitle}>Mancarea va fi pregatita pentru momentul rezervarii tale</Text>

              {/* Date selection */}
              <Text style={styles.fieldLabel}>Data</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                {dateOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionChip, reservationDate === opt.value && styles.optionChipActive]}
                    onPress={() => setReservationDate(opt.value)}
                    data-testid={`reservation-date-${opt.value}`}
                  >
                    <Text style={[styles.optionChipText, reservationDate === opt.value && styles.optionChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Time selection */}
              <Text style={styles.fieldLabel}>Ora</Text>
              <View style={styles.timeGrid}>
                {timeOptions.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, reservationTime === t && styles.optionChipActive]}
                    onPress={() => setReservationTime(t)}
                    data-testid={`reservation-time-${t}`}
                  >
                    <Text style={[styles.optionChipText, reservationTime === t && styles.optionChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Guests */}
              <Text style={styles.fieldLabel}>Persoane</Text>
              <View style={styles.guestsRow}>
                {['1', '2', '3', '4', '5', '6', '7', '8'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.guestChip, reservationGuests === g && styles.optionChipActive]}
                    onPress={() => setReservationGuests(g)}
                    data-testid={`reservation-guests-${g}`}
                  >
                    <Text style={[styles.optionChipText, reservationGuests === g && styles.optionChipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.fieldLabel}>Observatii (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={reservationNotes}
                onChangeText={setReservationNotes}
                placeholder="Alergii, preferinte speciale..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                data-testid="reservation-notes"
              />
            </ScrollView>

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.confirmReservationBtn, (!reservationDate || !reservationTime) && { opacity: 0.5 }]}
              onPress={handleCheckoutWithReservation}
              disabled={!reservationDate || !reservationTime || isCheckingOut !== null}
              data-testid="confirm-reservation-checkout"
            >
              {isCheckingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.confirmReservationBtnText}>Confirma si plateste</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text },
  trashBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trashBtnText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.error },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.error + '20', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.error + '40',
  },
  errorText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.error, flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyText: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, marginTop: SPACING.lg },
  emptySubtext: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, marginTop: SPACING.xs },
  browseBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md, marginTop: SPACING.lg,
  },
  browseBtnText: { fontFamily: FONTS.semiBold, fontSize: 16, color: '#fff' },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  restaurantGroup: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.lg,
  },
  restaurantHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  restaurantName: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
  cartItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemImage: { width: 48, height: 48, borderRadius: BORDER_RADIUS.sm },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  itemPrice: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text, minWidth: 20, textAlign: 'center' },
  itemTotal: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.gold, minWidth: 50, textAlign: 'right' },
  removeBtn: { padding: 4 },
  groupSummary: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  totalRow: {},
  totalLabel: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
  totalValue: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gold },
  infoBox: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'center',
    backgroundColor: COLORS.secondary + '15', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.sm,
  },
  infoText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.md,
  },
  checkoutBtnDisabled: { opacity: 0.6 },
  checkoutBtnText: { fontFamily: FONTS.semiBold, fontSize: 16, color: '#fff' },
  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, width: '85%', maxWidth: 400,
  },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: SPACING.sm },
  modalText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  modalCancelBtn: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, alignItems: 'center' },
  modalCancelText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  modalConfirmBtn: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.error, alignItems: 'center' },
  modalConfirmText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },
  // Reservation modal styles
  reservationModal: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, width: '100%', maxHeight: '85%',
    position: 'absolute', bottom: 0,
  },
  reservationModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md,
  },
  reservationModalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, flex: 1 },
  reservationSubtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.md },
  optionsScroll: { marginBottom: SPACING.sm },
  optionChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight,
    marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionChipText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  optionChipTextActive: { color: '#fff' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  timeChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight,
    borderWidth: 1, borderColor: COLORS.border,
  },
  guestsRow: { flexDirection: 'row', gap: SPACING.sm },
  guestChip: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  notesInput: {
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 60, textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  confirmReservationBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.md,
  },
  confirmReservationBtnText: { fontFamily: FONTS.semiBold, fontSize: 16, color: '#fff' },
});
