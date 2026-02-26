import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
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
      if (window.confirm('Vrei sa golesti tot cosul?')) {
        clearCart();
      }
    } else {
      Alert.alert('Goleste cosul', 'Vrei sa golesti tot cosul?', [
        { text: 'Nu', style: 'cancel' },
        { text: 'Da', style: 'destructive', onPress: () => clearCart() },
      ]);
    }
  };

  const handleCheckout = async (restaurantId: string, restaurantName: string) => {
    const restaurantItems = items.filter((i) => i.restaurantId === restaurantId);
    if (restaurantItems.length === 0) return;

    setIsCheckingOut(restaurantId);

    try {
      const originUrl = BACKEND_URL || (typeof window !== 'undefined' ? window.location?.origin : '') || 'https://app.local';

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

      // Open Stripe checkout
      if (result.payment?.checkout_url) {
        // Clear restaurant items from cart after successful order creation
        clearRestaurantItems(restaurantId);
        
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(result.payment.checkout_url, '_blank');
        } else {
          const supported = await Linking.canOpenURL(result.payment.checkout_url);
          if (supported) {
            await Linking.openURL(result.payment.checkout_url);
          }
        }
      }
    } catch (error: any) {
      const msg = error.message || 'Nu s-a putut crea comanda';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Eroare', msg);
      }
    } finally {
      setIsCheckingOut(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} data-testid="cart-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} data-testid="cart-back-btn">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Cosul meu</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearCart} data-testid="cart-clear-all-btn">
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer} data-testid="cart-empty">
          <Ionicons name="cart-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Cosul tau este gol</Text>
          <Text style={styles.emptySubtext}>Adauga produse din meniul restaurantelor</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/restaurante')} data-testid="cart-browse-btn">
            <Text style={styles.browseBtnText}>Vezi restaurante</Text>
          </TouchableOpacity>
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
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemPrice}>{item.price.toFixed(2)} RON</Text>
                    </View>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
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
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        data-testid={`cart-item-increase-${item.menuItemId}`}
                        onPress={() => updateQuantity(item.menuItemId, item.restaurantId, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color={COLORS.text} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.itemTotal}>{(item.price * item.quantity).toFixed(2)}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(item.menuItemId, item.restaurantId)}
                      style={styles.removeBtn}
                      data-testid={`cart-item-remove-${item.menuItemId}`}
                    >
                      <Ionicons name="close-circle" size={22} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Group Summary */}
                <View style={styles.groupSummary}>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total de plata</Text>
                    <Text style={styles.totalValue}>{groupSubtotal.toFixed(2)} RON</Text>
                  </View>
                </View>

                {/* Info message */}
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.infoText}>
                    Platesti doar pretul produselor. Comisionul de 2.7% este dedus automat din incasarile restaurantului.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.checkoutBtn, isCheckingOut === group.restaurantId && styles.checkoutBtnDisabled]}
                  onPress={() => handleCheckout(group.restaurantId, group.restaurantName)}
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
                </TouchableOpacity>
              </View>
            );
          })}
          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      )}
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
  removeBtn: { marginLeft: SPACING.xs },
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
  infoText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
  },
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
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
});
