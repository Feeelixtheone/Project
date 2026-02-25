import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { getRestaurants, seedData, toggleLike, apiRequest } from '../../src/utils/api';
import { useAuth } from '../../src/context/AuthContext';
import { useCartStore } from '../../src/stores/cartStore';

const { width } = Dimensions.get('window');

type SortOption = 'sponsored' | 'popular' | 'liked';

const FOOD_CATEGORIES = [
  { id: 'all', name: 'Toate', icon: 'grid-outline' },
  { id: 'pizza', name: 'Pizza', icon: 'pizza-outline' },
  { id: 'aperitive', name: 'Aperitive', icon: 'restaurant-outline' },
  { id: 'sushi', name: 'Sushi', icon: 'fish-outline' },
  { id: 'alcool', name: 'Alcool', icon: 'wine-outline' },
  { id: 'exclusive', name: 'Exclusive', icon: 'star-outline' },
  { id: 'bauturi', name: 'Băuturi', icon: 'cafe-outline' },
  { id: 'deserturi', name: 'Deserturi', icon: 'ice-cream-outline' },
  { id: 'fast-food', name: 'Fast Food', icon: 'fast-food-outline' },
];

export default function AcasaScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('sponsored');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadRestaurants = async () => {
    try {
      // First try to seed data if needed
      await seedData().catch(() => {});
      const data = await getRestaurants(sortBy, searchQuery || undefined);
      
      // Filter by category if not "all"
      let filtered = data;
      if (selectedCategory !== 'all') {
        filtered = data.filter((r: any) => 
          r.categories?.includes(selectedCategory) || 
          r.cuisine_type?.toLowerCase().includes(selectedCategory)
        );
      }
      
      setRestaurants(filtered);
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, [sortBy, searchQuery, selectedCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRestaurants();
    setRefreshing(false);
  }, [sortBy, searchQuery, selectedCategory]);

  const handleLike = async (restaurantId: string) => {
    try {
      await toggleLike(restaurantId);
      loadRestaurants();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'sponsored', label: 'Sponsorizate' },
    { key: 'popular', label: 'Populare' },
    { key: 'liked', label: 'Apreciate' },
  ];

  const renderCategoryItem = ({ item }: { item: typeof FOOD_CATEGORIES[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.categoryItemActive,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <View style={[
        styles.categoryIconContainer,
        selectedCategory === item.id && styles.categoryIconContainerActive,
      ]}>
        <Ionicons
          name={item.icon as any}
          size={24}
          color={selectedCategory === item.id ? COLORS.text : COLORS.primary}
        />
      </View>
      <Text
        style={[
          styles.categoryName,
          selectedCategory === item.id && styles.categoryNameActive,
        ]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderRestaurantCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => router.push(`/restaurant/${item.id}`)}
      activeOpacity={0.9}
    >
      {/* Cover Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.cover_image }} style={styles.coverImage} />
        
        {/* Sponsored Badge */}
        {item.is_sponsored && (
          <View style={styles.sponsoredBadge}>
            <Ionicons name="star" size={12} color={COLORS.background} />
            <Text style={styles.sponsoredText}>SPONSORIZAT</Text>
          </View>
        )}

        {/* 3D Badge if available */}
        {item.images_3d && item.images_3d.length > 0 && (
          <View style={styles.badge3d}>
            <Ionicons name="cube-outline" size={12} color={COLORS.text} />
            <Text style={styles.badge3dText}>3D</Text>
          </View>
        )}
        
        {/* Like Button */}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => handleLike(item.id)}
        >
          <Ionicons name="heart" size={22} color={COLORS.primary} />
          <Text style={styles.likeCount}>{item.likes}</Text>
        </TouchableOpacity>
        
        {/* Gradient Overlay */}
        <View style={styles.imageGradient} />
      </View>
      
      {/* Card Content */}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.restaurantName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={COLORS.gold} />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.review_count})</Text>
          </View>
        </View>
        
        <Text style={styles.cuisineType}>{item.cuisine_type} • {item.price_range}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
          </View>
          <Text style={styles.hours}>{item.opening_hours}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bună, {user?.name?.split(' ')[0] || 'Utilizator'}!</Text>
          <Text style={styles.subGreeting}>Ce ai poftă să mănânci azi?</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.cartHeaderBtn} onPress={() => router.push('/cart')}>
            <Ionicons name="cart-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profil')}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color={COLORS.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Caută restaurante..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Food Categories */}
      <View style={styles.categoriesSection}>
        <Text style={styles.categoriesTitle}>Categorii</Text>
        <FlatList
          horizontal
          data={FOOD_CATEGORIES}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortButton,
                sortBy === option.key && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(option.key)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === option.key && styles.sortButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Restaurant List */}
      <FlatList
        data={restaurants}
        renderItem={renderRestaurantCard}
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
            <Ionicons name="restaurant-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {isLoading ? 'Se încarcă...' : 'Nu s-au găsit restaurante'}
            </Text>
            {selectedCategory !== 'all' && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => setSelectedCategory('all')}
              >
                <Text style={styles.clearFilterText}>Șterge filtrul</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cartHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartHeaderBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartHeaderBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.text,
  },
  greeting: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.text,
  },
  subGreeting: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  categoriesSection: {
    marginTop: SPACING.md,
  },
  categoriesTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  categoriesList: {
    paddingHorizontal: SPACING.lg,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: SPACING.md,
    width: 70,
  },
  categoryItemActive: {
    // Active styles handled by children
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  categoryIconContainerActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryName: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categoryNameActive: {
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  sortContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sortButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sortButtonTextActive: {
    color: COLORS.text,
  },
  listContainer: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  restaurantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
  },
  sponsoredBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  sponsoredText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.background,
  },
  badge3d: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm + 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  badge3dText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.text,
  },
  likeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  likeCount: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.text,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  restaurantName: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  reviewCount: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cuisineType: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  address: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  hours: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  clearFilterButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  clearFilterText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
});
