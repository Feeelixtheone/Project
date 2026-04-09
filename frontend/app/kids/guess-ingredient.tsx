import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { usePointsStore } from '../../src/stores/pointsStore';

const { width } = Dimensions.get('window');

// Food items with their ingredients for guessing
const FOOD_DATA = [
  {
    name: 'Pizza Margherita',
    emoji: '🍕',
    correctIngredients: ['mozzarella', 'rosii', 'busuioc'],
    allOptions: ['mozzarella', 'rosii', 'busuioc', 'ciocolata', 'banane', 'somon'],
  },
  {
    name: 'Sushi Roll',
    emoji: '🍣',
    correctIngredients: ['orez', 'somon', 'nori'],
    allOptions: ['orez', 'somon', 'nori', 'branza', 'paine', 'unt'],
  },
  {
    name: 'Burger Classic',
    emoji: '🍔',
    correctIngredients: ['carne vita', 'salata', 'branza'],
    allOptions: ['carne vita', 'salata', 'branza', 'ananas', 'orez', 'miere'],
  },
  {
    name: 'Tiramisu',
    emoji: '🍰',
    correctIngredients: ['mascarpone', 'cafea', 'cacao'],
    allOptions: ['mascarpone', 'cafea', 'cacao', 'somon', 'ceapa', 'otet'],
  },
  {
    name: 'Sarmale',
    emoji: '🥬',
    correctIngredients: ['varza', 'carne tocata', 'orez'],
    allOptions: ['varza', 'carne tocata', 'orez', 'ciocolata', 'capsuni', 'nuca'],
  },
  {
    name: 'Taco',
    emoji: '🌮',
    correctIngredients: ['tortilla', 'carne', 'avocado'],
    allOptions: ['tortilla', 'carne', 'avocado', 'lapte', 'zahar', 'ulei masline'],
  },
  {
    name: 'Cheesecake',
    emoji: '🧁',
    correctIngredients: ['branza crema', 'biscuiti', 'fructe'],
    allOptions: ['branza crema', 'biscuiti', 'fructe', 'cartofi', 'sare', 'mustar'],
  },
  {
    name: 'Ramen',
    emoji: '🍜',
    correctIngredients: ['taitei', 'supa', 'ou'],
    allOptions: ['taitei', 'supa', 'ou', 'ciocolata', 'gem', 'sos soia'],
  },
  {
    name: 'Papanasi',
    emoji: '🧀',
    correctIngredients: ['branza vaci', 'smantana', 'dulceata'],
    allOptions: ['branza vaci', 'smantana', 'dulceata', 'peste', 'ardei', 'mustar'],
  },
  {
    name: 'Ciorba de burta',
    emoji: '🥣',
    correctIngredients: ['burta vita', 'smantana', 'otet'],
    allOptions: ['burta vita', 'smantana', 'otet', 'ciocolata', 'banane', 'nuca'],
  },
];

const INGREDIENT_ICONS: Record<string, string> = {
  'mozzarella': '🧀', 'rosii': '🍅', 'busuioc': '🌿', 'ciocolata': '🍫',
  'banane': '🍌', 'somon': '🐟', 'orez': '🍚', 'nori': '🟢',
  'branza': '🧀', 'paine': '🍞', 'unt': '🧈', 'carne vita': '🥩',
  'salata': '🥬', 'ananas': '🍍', 'miere': '🍯', 'mascarpone': '🧀',
  'cafea': '☕', 'cacao': '🟤', 'ceapa': '🧅', 'otet': '🫗',
  'varza': '🥬', 'carne tocata': '🥩', 'capsuni': '🍓', 'nuca': '🌰',
  'tortilla': '🫓', 'carne': '🥩', 'avocado': '🥑', 'lapte': '🥛',
  'zahar': '🍬', 'ulei masline': '🫒', 'branza crema': '🧀', 'biscuiti': '🍪',
  'fructe': '🍇', 'cartofi': '🥔', 'sare': '🧂', 'mustar': '🟡',
  'taitei': '🍝', 'supa': '🥣', 'ou': '🥚', 'gem': '🫙', 'sos soia': '🥫',
  'branza vaci': '🧀', 'smantana': '🥛', 'dulceata': '🫙',
  'burta vita': '🥩', 'peste': '🐟', 'ardei': '🌶️',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function GuessIngredientScreen() {
  const insets = useSafeAreaInsets();
  const addPoints = usePointsStore((s) => s.addPoints);
  const getHighScore = usePointsStore((s) => s.getHighScore);
  const highScore = getHighScore('guess-ingredient');

  const [rounds, setRounds] = useState(() => shuffle(FOOD_DATA).slice(0, 6));
  const [currentRound, setCurrentRound] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [roundScore, setRoundScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [shakeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  const currentFood = rounds[currentRound];

  useEffect(() => {
    if (currentFood) {
      setOptions(shuffle(currentFood.allOptions));
    }
  }, [currentRound]);

  // Pulse animation for the food emoji
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const toggleIngredient = (ingredient: string) => {
    if (showResult) return;
    setSelectedIngredients((prev) =>
      prev.includes(ingredient)
        ? prev.filter((i) => i !== ingredient)
        : prev.length < 3 ? [...prev, ingredient] : prev
    );
  };

  const checkAnswer = () => {
    if (selectedIngredients.length !== 3) return;
    const correct = currentFood.correctIngredients;
    const correctCount = selectedIngredients.filter((i) => correct.includes(i)).length;
    let points = 0;
    if (correctCount === 3) {
      points = 100 + streak * 20; // Bonus for streaks
      setStreak((s) => s + 1);
    } else if (correctCount === 2) {
      points = 50;
      setStreak(0);
    } else if (correctCount === 1) {
      points = 20;
      setStreak(0);
    } else {
      setStreak(0);
      // Shake animation for wrong
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
    setRoundScore(points);
    setTotalScore((prev) => prev + points);
    setShowResult(true);
  };

  const nextRound = () => {
    if (currentRound >= rounds.length - 1) {
      addPoints('guess-ingredient', totalScore);
      setShowEndScreen(true);
    } else {
      setCurrentRound((r) => r + 1);
      setSelectedIngredients([]);
      setShowResult(false);
      setRoundScore(0);
    }
  };

  const resetGame = () => {
    setRounds(shuffle(FOOD_DATA).slice(0, 6));
    setCurrentRound(0);
    setSelectedIngredients([]);
    setShowResult(false);
    setRoundScore(0);
    setTotalScore(0);
    setStreak(0);
    setShowEndScreen(false);
  };

  if (!currentFood) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Ghiceste Ingredientul</Text>
        <TouchableOpacity onPress={resetGame} style={styles.backBtn}>
          <Ionicons name="refresh" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Score Bar */}
      <View style={styles.scoreBar}>
        <View style={styles.scoreItem}>
          <Ionicons name="star" size={20} color={COLORS.gold} />
          <Text style={styles.scoreValue}>{totalScore}</Text>
          <Text style={styles.scoreLabel}>Puncte</Text>
        </View>
        <View style={styles.scoreItem}>
          <Ionicons name="layers" size={20} color={COLORS.primary} />
          <Text style={styles.scoreValue}>{currentRound + 1}/{rounds.length}</Text>
          <Text style={styles.scoreLabel}>Runda</Text>
        </View>
        {streak > 0 && (
          <View style={styles.scoreItem}>
            <Ionicons name="flash" size={20} color="#FF6B35" />
            <Text style={[styles.scoreValue, { color: '#FF6B35' }]}>{streak}x</Text>
            <Text style={styles.scoreLabel}>Combo</Text>
          </View>
        )}
        <View style={styles.scoreItem}>
          <Ionicons name="medal" size={20} color={COLORS.gold} />
          <Text style={styles.scoreValue}>{highScore}</Text>
          <Text style={styles.scoreLabel}>Record</Text>
        </View>
      </View>

      {/* Food Display */}
      <Animated.View style={[styles.foodCard, { transform: [{ translateX: shakeAnim }, { scale: pulseAnim }] }]}>
        <Text style={styles.foodEmoji}>{currentFood.emoji}</Text>
        <Text style={styles.foodName}>{currentFood.name}</Text>
        <Text style={styles.foodHint}>Alege 3 ingrediente corecte!</Text>
      </Animated.View>

      {/* Ingredient Options */}
      <View style={styles.optionsGrid}>
        {options.map((ingredient) => {
          const isSelected = selectedIngredients.includes(ingredient);
          const isCorrect = showResult && currentFood.correctIngredients.includes(ingredient);
          const isWrong = showResult && isSelected && !currentFood.correctIngredients.includes(ingredient);
          return (
            <TouchableOpacity
              key={ingredient}
              style={[
                styles.optionBtn,
                isSelected && !showResult && styles.optionSelected,
                isCorrect && styles.optionCorrect,
                isWrong && styles.optionWrong,
              ]}
              onPress={() => toggleIngredient(ingredient)}
              activeOpacity={0.7}
              disabled={showResult}
            >
              <Text style={styles.optionEmoji}>{INGREDIENT_ICONS[ingredient] || '?'}</Text>
              <Text style={[
                styles.optionText,
                isSelected && !showResult && styles.optionTextSelected,
                isCorrect && { color: '#4CAF50' },
                isWrong && { color: '#F44336' },
              ]}>{ingredient}</Text>
              {isCorrect && <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={styles.optionIcon} />}
              {isWrong && <Ionicons name="close-circle" size={18} color="#F44336" style={styles.optionIcon} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Action Button */}
      {!showResult ? (
        <TouchableOpacity
          style={[styles.checkBtn, selectedIngredients.length !== 3 && styles.checkBtnDisabled]}
          onPress={checkAnswer}
          disabled={selectedIngredients.length !== 3}
        >
          <Ionicons name="checkmark" size={22} color="#fff" />
          <Text style={styles.checkBtnText}>Verifică ({selectedIngredients.length}/3)</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.resultArea}>
          <View style={[styles.resultBadge, roundScore >= 100 ? styles.resultPerfect : roundScore >= 50 ? styles.resultGood : styles.resultMiss]}>
            <Text style={styles.resultText}>
              {roundScore >= 100 ? 'Perfect!' : roundScore >= 50 ? 'Aproape!' : roundScore >= 20 ? 'Mai incearca!' : 'Gresit!'}
            </Text>
            <Text style={styles.resultPoints}>+{roundScore} pts</Text>
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={nextRound}>
            <Text style={styles.nextBtnText}>
              {currentRound >= rounds.length - 1 ? 'Vezi Rezultat' : 'Urmatoarea'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* End Screen Modal */}
      <Modal visible={showEndScreen} transparent animationType="fade">
        <View style={styles.endOverlay}>
          <View style={styles.endCard}>
            <Text style={styles.endEmoji}>🧑‍🍳</Text>
            <Text style={styles.endTitle}>Bravo, sef bucatar!</Text>
            <View style={styles.endScoreCircle}>
              <Text style={styles.endScoreValue}>{totalScore}</Text>
              <Text style={styles.endScoreLabel}>puncte</Text>
            </View>
            {totalScore > highScore && totalScore > 0 && (
              <View style={styles.newRecordBadge}>
                <Ionicons name="trophy" size={16} color={COLORS.background} />
                <Text style={styles.newRecordText}>Nou Record!</Text>
              </View>
            )}
            <Text style={styles.endPointsAdded}>+{totalScore} puncte adaugate la total</Text>
            <View style={styles.endButtons}>
              <TouchableOpacity style={styles.endBtnPrimary} onPress={resetGame}>
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.endBtnPrimaryText}>Joaca din nou</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.endBtnSecondary} onPress={() => router.back()}>
                <Text style={styles.endBtnSecondaryText}>Inapoi</Text>
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
  title: { flex: 1, fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, textAlign: 'center' },
  scoreBar: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.lg, paddingVertical: SPACING.sm, width: '100%', paddingHorizontal: SPACING.md },
  scoreItem: { alignItems: 'center' },
  scoreValue: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.text, marginTop: 2 },
  scoreLabel: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textSecondary },
  foodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginVertical: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary + '40',
    width: width - 48,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  foodEmoji: { fontSize: 64, marginBottom: SPACING.sm },
  foodName: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text, marginBottom: 4 },
  foodHint: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.primary },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 6,
    minWidth: (width - 80) / 2,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  optionCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF5020',
  },
  optionWrong: {
    borderColor: '#F44336',
    backgroundColor: '#F4433620',
  },
  optionEmoji: { fontSize: 22 },
  optionText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSecondary, flex: 1 },
  optionTextSelected: { color: COLORS.text },
  optionIcon: { marginLeft: 4 },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  checkBtnDisabled: { opacity: 0.4 },
  checkBtnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
  resultArea: { alignItems: 'center', marginTop: SPACING.md, gap: SPACING.md },
  resultBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BORDER_RADIUS.full, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  resultPerfect: { backgroundColor: '#4CAF5030', borderWidth: 2, borderColor: '#4CAF50' },
  resultGood: { backgroundColor: '#FF980030', borderWidth: 2, borderColor: '#FF9800' },
  resultMiss: { backgroundColor: '#F4433630', borderWidth: 2, borderColor: '#F44336' },
  resultText: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  resultPoints: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gold },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: BORDER_RADIUS.full,
  },
  nextBtnText: { fontFamily: FONTS.semiBold, fontSize: 16, color: '#fff' },
  endOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  endCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', width: '100%', maxWidth: 340, borderWidth: 1, borderColor: COLORS.primary + '30' },
  endEmoji: { fontSize: 64, marginBottom: SPACING.sm },
  endTitle: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.text, marginBottom: SPACING.md },
  endScoreCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.primary, marginBottom: SPACING.md },
  endScoreValue: { fontFamily: FONTS.bold, fontSize: 36, color: COLORS.primary },
  endScoreLabel: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
  newRecordBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING.sm },
  newRecordText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.background },
  endPointsAdded: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.success, marginBottom: SPACING.lg },
  endButtons: { width: '100%', gap: SPACING.sm },
  endBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: BORDER_RADIUS.md },
  endBtnPrimaryText: { fontFamily: FONTS.semiBold, fontSize: 16, color: '#fff' },
  endBtnSecondary: { alignItems: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight },
  endBtnSecondaryText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textSecondary },
});
