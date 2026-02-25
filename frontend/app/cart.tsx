import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../src/constants/theme';
import { useCartStore, CartItem } from '../src/stores/cartStore';

const PLATFORM_FEE = 1.7;

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const clearRestaurantItems = useCartStore((s) => s.clearRestaurantItems);

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

  const handleRemoveItem = (menuItemId: string, restaurantId: string, name: string) => {
    Alert.alert('Șterge din coș', `Vrei să scoți "${name}" din coș?`, [
      { text: 'Nu', style: 'cancel' },
      {
        text: 'Da',
        style: 'destructive',
        onPress: () => {
          removeItem(menuItemId, restaurantId);
        },
      },
    ]);
  };

  const handleCheckout = (restaurantId: string, restaurantName: string) => {
    const restaurantItems = items.filter((i) => i.restaurantId === restaurantId);
    if (restaurantItems.length === 0) return;

    Alert.alert(
      'Comandă cu mâncare gata pregătită',
      'Dacă plătești acum, vei opta pentru opțiunea cu mâncare gata pregătită. Vei fi redirecționat la pagina de rezervări pentru a finaliza comanda.',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Continuă',
          onPress: () => {
            // Navigate to rezervari tab with pre-selected items
            router.push({
              pathname: '/(tabs)/rezervari',
              params: {
                prefill_restaurant_id: restaurantId,
                prefill_restaurant_name: restaurantName,
                prefill_items: JSON.stringify(
                  restaurantItems.map((item) => ({
                    menu_item_id: item.menuItemId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                  }))
                ),
                prefill_type: 'food_ready',
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Coșul meu</Text>
        {items.length > 0 && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Golește coșul', 'Vrei să golești tot coșul?', [
                { text: 'Nu', style: 'cancel' },
                { text: 'Da', style: 'destructive', onPress: () => clearCart() },
              ])
            }
          >
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Coșul tău este gol</Text>
          <Text style={styles.emptySubtext}>Adaugă produse din meniul restaurantelor</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/restaurante')}>
            <Text style={styles.browseBtnText}>Vezi restaurante</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {groupedItems.map((group) => {
            const groupSubtotal = group.items.reduce((s, i) => s + i.price * i.quantity, 0);
            const groupFee = Math.round(groupSubtotal * (PLATFORM_FEE / 100) * 100) / 100;
            const groupTotal = Math.round((groupSubtotal + groupFee) * 100) / 100;

            return (
              <View key={group.restaurantId} style={styles.restaurantGroup}>
                <View style={styles.restaurantHeader}>
                  <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                  <Text style={styles.restaurantName}>{group.restaurantName}</Text>
                </View>

                {group.items.map((item) => (
                  <View key={`${item.menuItemId}-${item.restaurantId}`} style={styles.cartItem}>
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemPrice}>{item.price.toFixed(2)} RON</Text>
                    </View>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => {
                          if (item.quantity <= 1) {
                            removeItem(item.menuItemId, item.restaurantId);
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
                        onPress={() => updateQuantity(item.menuItemId, item.restaurantId, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color={COLORS.text} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.itemTotal}>{(item.price * item.quantity).toFixed(2)}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(item.menuItemId, item.restaurantId, item.name)}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="close-circle" size={22} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Group Summary */}
                <View style={styles.groupSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>{groupSubtotal.toFixed(2)} RON</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Comision ({PLATFORM_FEE}%)</Text>
                    <Text style={styles.summaryValue}>{groupFee.toFixed(2)} RON</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>{groupTotal.toFixed(2)} RON</Text>
                  </View>
                </View>

                {/* Info message */}
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.infoText}>
                    Dacă plătești acum, vei opta pentru opțiunea cu mâncare gata pregătită.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.checkoutBtn}
                  onPress={() => handleCheckout(group.restaurantId, group.restaurantName)}
                >
                  <Ionicons name="card" size={20} color={COLORS.text} />
                  <Text style={styles.checkoutBtnText}>Comandă și plătește</Text>
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
  summaryLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  summaryValue: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },
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
  checkoutBtnText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
});
