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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../src/constants/theme';
import { useCartStore, CartItem } from '../src/stores/cartStore';
import { createDirectOrder } from '../src/utils/api';

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
    setShowConfirmClear(true);
  };

  const confirmClearCart = () => {
    clearCart();
    setShowConfirmClear(false);
  };

  const handleCheckout = async (restaurantId: string) => {
    const restaurantItems = items.filter((i) => i.restaurantId === restaurantId);
    if (restaurantItems.length === 0) return;

    setIsCheckingOut(restaurantId);
    setErrorMessage('');

    try {
      // Use the frontend URL for Stripe redirect URLs
      const originUrl = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : BACKEND_URL || 'https://app.local';

      const orderData = {
        restaurant_id: restaurantId,
        items: restaurantItems.map((item) => ({
          menu_item_id: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image_url: item.imageUrl,
        })),
        origin_url: originUrl,
      };

      const result = await createDirectOrder(orderData);

      if (result.payment?.checkout_url) {
        clearRestaurantItems(restaurantId);

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
      setErrorMessage(error.message || 'Nu s-a putut crea comanda');
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
                  <Ionicons name="information-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.infoText}>
                    Platesti doar pretul produselor. Comisionul de 2.7% este dedus automat din incasarile restaurantului.
                  </Text>
                </View>

                <Pressable
                  style={[styles.checkoutBtn, isCheckingOut === group.restaurantId && styles.checkoutBtnDisabled]}
                  onPress={() => handleCheckout(group.restaurantId)}
                  disabled={isCheckingOut === group.restaurantId}
                  data-testid={`cart-checkout-${group.restaurantId}`}
                >
                  {isCheckingOut === group.restaurantId ? (
                    <ActivityIndicator color={COLORS.text} />
                  ) : (
                    <>
                      <Ionicons name="card" size={20} color={COLORS.text} />
                      <Text style={styles.checkoutBtnText}>Plateste {groupSubtotal.toFixed(2)} RON</Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}
          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      )}

      {/* Confirm Clear Modal */}
      <Modal visible={showConfirmClear} transparent animationType="fade" onRequestClose={() => setShowConfirmClear(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="trash" size={40} color={COLORS.error} />
            <Text style={styles.modalTitle}>Goleste cosul?</Text>
            <Text style={styles.modalMessage}>Toate produsele vor fi sterse din cos.</Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalBtnCancel} onPress={() => setShowConfirmClear(false)} data-testid="confirm-clear-no">
                <Text style={styles.modalBtnCancelText}>Nu</Text>
              </Pressable>
              <Pressable style={styles.modalBtnConfirm} onPress={confirmClearCart} data-testid="confirm-clear-yes">
                <Text style={styles.modalBtnConfirmText}>Da, goleste</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text },
  trashBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.error + '15' },
  trashBtnText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.error },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.error + '20',
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  errorText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.error, flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyText: { fontFamily: FONTS.semiBold, fontSize: 20, color: COLORS.textMuted, marginTop: SPACING.lg },
  emptySubtext: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, marginTop: SPACING.xs, textAlign: 'center' },
  browseBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.lg },
  browseBtnText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  restaurantGroup: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  restaurantHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  restaurantName: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text, flex: 1 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemImage: { width: 50, height: 50, borderRadius: BORDER_RADIUS.sm },
  itemInfo: { flex: 1, marginLeft: SPACING.sm },
  itemName: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  itemPrice: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.xs },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text, marginHorizontal: SPACING.sm },
  itemTotal: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.primary, minWidth: 50, textAlign: 'right' },
  removeBtn: { marginLeft: SPACING.xs, padding: 4 },
  groupSummary: { marginTop: SPACING.md, paddingTop: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.xs, paddingTop: SPACING.sm },
  totalLabel: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  totalValue: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '15',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  infoText: { flex: 1, fontFamily: FONTS.regular, fontSize: 13, color: COLORS.primary, lineHeight: 18 },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  checkoutBtnDisabled: { opacity: 0.6 },
  checkoutBtnText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', width: '100%', maxWidth: 360 },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, marginTop: SPACING.md },
  modalMessage: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl, width: '100%' },
  modalBtnCancel: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, alignItems: 'center' },
  modalBtnCancelText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
  modalBtnConfirm: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.error, alignItems: 'center' },
  modalBtnConfirmText: { fontFamily: FONTS.semiBold, fontSize: 16, color: '#fff' },
});
