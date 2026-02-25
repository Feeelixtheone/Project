import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { usePointsStore } from '../../src/stores/pointsStore';

const PAIRS = 8;
const FOOD_EMOJIS = ['🍕', '🍔', '🍩', '🍣', '🍰', '🌮', '🍦', '🥗', '🍇', '🧁', '🥐', '🍜'];

interface Card { id: number; emoji: string; isFlipped: boolean; isMatched: boolean; }

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
  const addPoints = usePointsStore((s) => s.addPoints);
  const getHighScore = usePointsStore((s) => s.getHighScore);
  const [cards, setCards] = useState<Card[]>(createCards);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const highScore = getHighScore('memory');

  useEffect(() => {
    timerRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (matchedPairs === PAIRS) {
      if (timerRef.current) clearInterval(timerRef.current);
      // Score: bonus for fewer moves and less time
      const moveBonus = Math.max(0, (40 - moves) * 5);
      const timeBonus = Math.max(0, (120 - timer) * 2);
      const score = PAIRS * 20 + moveBonus + timeBonus;
      setFinalScore(score);
      addPoints('memory', score);
      setTimeout(() => setShowEndScreen(true), 600);
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
    setShowEndScreen(false);
    setFinalScore(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
  };

  const handleFlip = (id: number) => {
    if (isChecking) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flippedIds.length >= 2) return;
    const newCards = cards.map((c) => c.id === id ? { ...c, isFlipped: true } : c);
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
          setCards((prev) => prev.map((c) => c.id === first.id || c.id === second.id ? { ...c, isMatched: true } : c));
          setMatchedPairs((prev) => prev + 1);
          setFlippedIds([]); setIsChecking(false);
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => c.id === first.id || c.id === second.id ? { ...c, isFlipped: false } : c));
          setFlippedIds([]); setIsChecking(false);
        }, 800);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Memory Match</Text>
        <TouchableOpacity onPress={resetGame} style={styles.backBtn}>
          <Ionicons name="refresh" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

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

      <View style={styles.cardsGrid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[styles.card, { width: CARD_SIZE, height: CARD_SIZE * 1.2 }, card.isFlipped && styles.cardFlipped, card.isMatched && styles.cardMatched]}
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

      {/* End Screen */}
      <Modal visible={showEndScreen} transparent animationType="fade">
        <View style={styles.endOverlay}>
          <View style={styles.endCard}>
            <Text style={styles.endEmoji}>🎉</Text>
            <Text style={styles.endTitle}>Felicitări!</Text>
            <View style={styles.endScoreCircle}>
              <Text style={styles.endScoreValue}>{finalScore}</Text>
              <Text style={styles.endScoreLabel}>puncte</Text>
            </View>
            {finalScore > highScore && finalScore > 0 && (
              <View style={styles.newRecordBadge}>
                <Ionicons name="trophy" size={16} color={COLORS.background} />
                <Text style={styles.newRecordText}>Nou Record!</Text>
              </View>
            )}
            <Text style={styles.endStats}>{moves} mutări • {formatTime(timer)}</Text>
            <Text style={styles.endPointsAdded}>+{finalScore} puncte adăugate la total</Text>
            <View style={styles.endButtons}>
              <TouchableOpacity style={styles.endBtnPrimary} onPress={resetGame}>
                <Ionicons name="refresh" size={20} color={COLORS.text} />
                <Text style={styles.endBtnPrimaryText}>Încearcă din nou</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.endBtnSecondary} onPress={() => router.back()}>
                <Text style={styles.endBtnSecondaryText}>Înapoi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, width: '100%', gap: SPACING.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontFamily: FONTS.bold, fontSize: 22, color: COLORS.text, textAlign: 'center' },
  statsBar: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, paddingVertical: SPACING.sm },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.text, marginTop: 2 },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSecondary },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md, marginTop: SPACING.md },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.border, ...SHADOWS.sm },
  cardFlipped: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.primary },
  cardMatched: { backgroundColor: COLORS.success + '20', borderColor: COLORS.success, opacity: 0.8 },
  cardEmoji: { fontSize: 32 },
  endOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  endCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', width: '100%', maxWidth: 340 },
  endEmoji: { fontSize: 60, marginBottom: SPACING.sm },
  endTitle: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text, marginBottom: SPACING.md },
  endScoreCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#00B4D820', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#00B4D8', marginBottom: SPACING.md },
  endScoreValue: { fontFamily: FONTS.bold, fontSize: 36, color: '#00B4D8' },
  endScoreLabel: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
  newRecordBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING.sm },
  newRecordText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.background },
  endStats: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  endPointsAdded: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.success, marginBottom: SPACING.lg },
  endButtons: { width: '100%', gap: SPACING.sm },
  endBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#00B4D8', padding: SPACING.md, borderRadius: BORDER_RADIUS.md },
  endBtnPrimaryText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
  endBtnSecondary: { alignItems: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight },
  endBtnSecondaryText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textSecondary },
});
