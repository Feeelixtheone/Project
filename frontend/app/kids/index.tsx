import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';

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

export default function KidsHubScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Zona Copii</Text>
          <Text style={styles.subtitle}>Minijocuri distractive!</Text>
        </View>
        <Ionicons name="happy" size={32} color={COLORS.gold} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.gamesGrid}>
        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={styles.gameCard}
            onPress={() => router.push(game.route as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.gameIconContainer, { backgroundColor: game.color + '25' }]}>
              <Ionicons name={game.icon as any} size={48} color={game.color} />
            </View>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.gameDescription}>{game.description}</Text>
            <View style={[styles.playButton, { backgroundColor: game.color }]}>
              <Ionicons name="play" size={18} color={COLORS.text} />
              <Text style={styles.playButtonText}>Joacă</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: { flex: 1 },
  title: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.text },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  content: { flex: 1 },
  gamesGrid: { padding: SPACING.lg, gap: SPACING.md },
  gameCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  gameIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  gameTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: SPACING.xs },
  gameDescription: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  playButtonText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
});
