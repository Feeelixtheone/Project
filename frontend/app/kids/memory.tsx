import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';

const PAIRS = 8;
const FOOD_EMOJIS = ['🍕', '🍔', '🍩', '🍣', '🍰', '🌮', '🍦', '🥗', '🍇', '🧁', '🥐', '🍜'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createCards(): Card[] {
  const selected = shuffle(FOOD_EMOJIS).slice(0, PAIRS);
  const cards: Card[] = [];
  selected.forEach((emoji, i) => {
    cards.push({ id: i * 2, emoji, isFlipped: false, isMatched: false });
    cards.push({ id: i * 2 + 1, emoji, isFlipped: false, isMatched: false });
  });
  return shuffle(cards);
}

const { width } = Dimensions.get('window');
const CARD_SIZE = Math.min((width - 64) / 4, 80);

export default function MemoryScreen() {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState<Card[]>(createCards);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (matchedPairs === PAIRS) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => {
        Alert.alert(
          'Felicitări! 🎉',
          `Ai terminat în ${moves} mutări și ${formatTime(timer)}!`,
          [
            { text: 'Joacă din nou', onPress: resetGame },
            { text: 'Înapoi', onPress: () => router.back() },
          ]
        );
      }, 500);
    }
  }, [matchedPairs]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const resetGame = () => {
    setCards(createCards());
    setFlippedIds([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsChecking(false);
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  };

  const handleFlip = (id: number) => {
    if (isChecking) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flippedIds.length >= 2) return;

    const newCards = cards.map((c) =>
      c.id === id ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1);
      setIsChecking(true);

      const first = newCards.find((c) => c.id === newFlipped[0])!;
      const second = newCards.find((c) => c.id === newFlipped[1])!;

      if (first.emoji === second.emoji) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first.id || c.id === second.id
                ? { ...c, isMatched: true }
                : c
            )
          );
          setMatchedPairs((prev) => prev + 1);
          setFlippedIds([]);
          setIsChecking(false);
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first.id || c.id === second.id
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedIds([]);
          setIsChecking(false);
        }, 800);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Memory Match</Text>
        <TouchableOpacity onPress={resetGame} style={styles.backBtn}>
          <Ionicons name="refresh" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Ionicons name="swap-horizontal" size={18} color={COLORS.primary} />
          <Text style={styles.statValue}>{moves}</Text>
          <Text style={styles.statLabel}>Mutări</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.statValue}>{matchedPairs}/{PAIRS}</Text>
          <Text style={styles.statLabel}>Perechi</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time" size={18} color={COLORS.gold} />
          <Text style={styles.statValue}>{formatTime(timer)}</Text>
          <Text style={styles.statLabel}>Timp</Text>
        </View>
      </View>

      {/* Cards Grid */}
      <View style={styles.cardsGrid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[
              styles.card,
              { width: CARD_SIZE, height: CARD_SIZE * 1.2 },
              card.isFlipped && styles.cardFlipped,
              card.isMatched && styles.cardMatched,
            ]}
            onPress={() => handleFlip(card.id)}
            activeOpacity={0.8}
            disabled={card.isMatched}
          >
            {card.isFlipped || card.isMatched ? (
              <Text style={styles.cardEmoji}>{card.emoji}</Text>
            ) : (
              <Ionicons name="help" size={28} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    width: '100%',
    gap: SPACING.md,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontFamily: FONTS.bold, fontSize: 22, color: COLORS.text, textAlign: 'center' },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.text, marginTop: 2 },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSecondary },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardFlipped: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.primary,
  },
  cardMatched: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
    opacity: 0.8,
  },
  cardEmoji: { fontSize: 32 },
});
