import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { getNewRestaurants } from '../../src/utils/api';
import { usePointsStore } from '../../src/stores/pointsStore';

type SectionType = 'noutati' | 'copii';

const GAMES = [
  {
    id: 'candy-crush',
    title: 'Food Crush',
    description: 'Combină 3 sau mai multe alimente identice!',
    icon: 'pizza',
    color: '#FF6B35',
    route: '/kids/candy-crush',
  },
  {
    id: 'memory',
    title: 'Memory Match',
    description: 'Găsește perechile de alimente ascunse!',
    icon: 'grid',
    color: '#00B4D8',
    route: '/kids/memory',
  },
  {
    id: 'whack',
    title: 'Prinde Ingredientul',
    description: 'Atinge ingredientele cât mai repede!',
    icon: 'hand-left',
    color: '#4CAF50',
    route: '/kids/whack',
  },
];

export default function NouScreen() {
  const insets = useSafeAreaInsets();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [section, setSection] = useState<SectionType>('noutati');
  const totalPoints = usePointsStore((s) => s.totalPoints);
  const getHighScore = usePointsStore((s) => s.getHighScore);

  const loadRestaurants = async () => {
    try {
      const data = await getNewRestaurants();
      setRestaurants(data);
    } catch (error) {
      console.error('Error loading new restaurants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRestaurants();
    setRefreshing(false);
  }, []);

  const renderNewRestaurant = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => router.push(`/restaurant/${item.id}`)}
      activeOpacity={0.9}
    >
      <Image source={{ uri: item.cover_image }} style={styles.coverImage} />
      <View style={styles.newBadge}>
        <Ionicons name="sparkles" size={14} color={COLORS.background} />
        <Text style={styles.newBadgeText}>NOU</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <View style={styles.metaContainer}>
          <View style={styles.cuisineTag}>
            <Text style={styles.cuisineText}>{item.cuisine_type}</Text>
          </View>
          <Text style={styles.priceRange}>{item.price_range}</Text>
        </View>
        <View style={styles.footerRow}>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={COLORS.gold} />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderKidsSection = () => (
    <ScrollView
      style={styles.kidsContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Points Banner */}
      <View style={styles.pointsBanner}>
        <View style={styles.pointsIconCircle}>
          <Ionicons name="trophy" size={32} color={COLORS.gold} />
        </View>
        <View style={styles.pointsInfo}>
          <Text style={styles.pointsLabel}>Punctele tale</Text>
          <Text style={styles.pointsValue}>{totalPoints}</Text>
        </View>
      </View>

      {/* Games */}
      {GAMES.map((game) => {
        const highScore = getHighScore(game.id);
        return (
          <TouchableOpacity
            key={game.id}
            style={styles.gameCard}
            onPress={() => router.push(game.route as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.gameIconContainer, { backgroundColor: game.color + '25' }]}>
              <Ionicons name={game.icon as any} size={40} color={game.color} />
            </View>
            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle}>{game.title}</Text>
              <Text style={styles.gameDescription}>{game.description}</Text>
              {highScore > 0 && (
                <View style={styles.highScoreRow}>
                  <Ionicons name="medal" size={14} color={COLORS.gold} />
                  <Text style={styles.highScoreText}>Record: {highScore} pts</Text>
                </View>
              )}
            </View>
            <View style={[styles.playBtn, { backgroundColor: game.color }]}>
              <Ionicons name="play" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="sparkles" size={28} color={COLORS.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Descoperă</Text>
          <Text style={styles.subtitle}>Noutăți & Zona Copii</Text>
        </View>
      </View>

      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        <TouchableOpacity
          style={[styles.sectionTab, section === 'noutati' && styles.sectionTabActive]}
          onPress={() => setSection('noutati')}
        >
          <Ionicons name="sparkles" size={18} color={section === 'noutati' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.sectionTabText, section === 'noutati' && styles.sectionTabTextActive]}>
            Noutăți
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionTab, section === 'copii' && styles.sectionTabActive]}
          onPress={() => setSection('copii')}
        >
          <Ionicons name="happy" size={18} color={section === 'copii' ? COLORS.gold : COLORS.textMuted} />
          <Text style={[styles.sectionTabText, section === 'copii' && styles.sectionTabTextActive]}>
            Zona Copii
          </Text>
          {totalPoints > 0 && (
            <View style={styles.pointsMini}>
              <Text style={styles.pointsMiniText}>{totalPoints}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {section === 'noutati' ? (
        <FlatList
          data={restaurants}
          renderItem={renderNewRestaurant}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {isLoading ? 'Se încarcă...' : 'Nu sunt restaurante noi'}
              </Text>
              <Text style={styles.emptySubtext}>Revino mai târziu pentru noutăți</Text>
            </View>
          }
        />
      ) : (
        renderKidsSection()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  sectionTabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTab: {
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
  sectionTabActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  sectionTabText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  sectionTabTextActive: { color: COLORS.primary },
  pointsMini: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  pointsMiniText: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.background },
  listContainer: { padding: SPACING.lg, paddingTop: 0 },
  restaurantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  coverImage: { width: '100%', height: 200 },
  newBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  newBadgeText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.background },
  cardContent: { padding: SPACING.md },
  restaurantName: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 4 },
  description: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm },
  metaContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  cuisineTag: { backgroundColor: COLORS.primary + '20', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm },
  cuisineText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.primary },
  priceRange: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 },
  address: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyText: { fontFamily: FONTS.medium, fontSize: 18, color: COLORS.textMuted, marginTop: SPACING.md },
  emptySubtext: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, marginTop: SPACING.xs },
  // Kids Section
  kidsContent: { flex: 1, paddingHorizontal: SPACING.lg },
  pointsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    ...SHADOWS.md,
  },
  pointsIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.gold + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsInfo: { flex: 1, marginLeft: SPACING.md },
  pointsLabel: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSecondary },
  pointsValue: { fontFamily: FONTS.bold, fontSize: 36, color: COLORS.gold },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  gameIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameInfo: { flex: 1, marginLeft: SPACING.md },
  gameTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  gameDescription: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  highScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  highScoreText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.gold },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
