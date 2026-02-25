import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const GRID_ROWS = 3;
const GRID_COLS = 3;
const GAME_DURATION = 30;
const INGREDIENTS = ['🍅', '🧅', '🥕', '🌶️', '🍋', '🧄', '🥦', '🌽'];

const { width } = Dimensions.get('window');
const HOLE_SIZE = Math.min((width - 80) / GRID_COLS, 100);

export default function WhackScreen() {
  const insets = useSafeAreaInsets();
  const addPoints = usePointsStore((s) => s.addPoints);
  const getHighScore = usePointsStore((s) => s.getHighScore);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [activeHoles, setActiveHoles] = useState<Map<number, string>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);

  const highScore = getHighScore('whack');

  const startGame = useCallback(() => {
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setActiveHoles(new Map());
    setTapped(new Set());
    setIsPlaying(true);
    setShowEndScreen(false);
    setFinalScore(0);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { setIsPlaying(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying && timeLeft === 0 && !showEndScreen) {
      if (moleTimerRef.current) clearInterval(moleTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      const fs = scoreRef.current;
      setFinalScore(fs);
      addPoints('whack', fs);
      setTimeout(() => setShowEndScreen(true), 300);
    }
  }, [isPlaying, timeLeft]);

  useEffect(() => {
    if (!isPlaying) {
      if (moleTimerRef.current) clearInterval(moleTimerRef.current);
      return;
    }
    const spawnMole = () => {
      const holeIndex = Math.floor(Math.random() * (GRID_ROWS * GRID_COLS));
      const ingredient = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
      setActiveHoles((prev) => { const next = new Map(prev); next.set(holeIndex, ingredient); return next; });
      setTapped((prev) => { const next = new Set(prev); next.delete(holeIndex); return next; });
      const duration = 800 + Math.random() * 1200;
      setTimeout(() => {
        setActiveHoles((prev) => { const next = new Map(prev); next.delete(holeIndex); return next; });
      }, duration);
    };
    const speed = Math.max(400, 1000 - (GAME_DURATION - timeLeft) * 15);
    moleTimerRef.current = setInterval(spawnMole, speed);
    return () => { if (moleTimerRef.current) clearInterval(moleTimerRef.current); };
  }, [isPlaying, timeLeft]);

  const handleTap = (index: number) => {
    if (!isPlaying || !activeHoles.has(index) || tapped.has(index)) return;
    const newScore = scoreRef.current + 10;
    scoreRef.current = newScore;
    setScore(newScore);
    setTapped((prev) => new Set(prev).add(index));
    setActiveHoles((prev) => { const next = new Map(prev); next.delete(index); return next; });
  };

  const progressWidth = (timeLeft / GAME_DURATION) * 100;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Prinde Ingredientul</Text>
        <TouchableOpacity onPress={startGame} style={styles.backBtn}>
          <Ionicons name="refresh" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Ionicons name="star" size={20} color={COLORS.gold} />
          <Text style={styles.statValue}>{score}</Text>
          <Text style={styles.statLabel}>Puncte</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time" size={20} color={timeLeft <= 10 ? COLORS.error : COLORS.primary} />
          <Text style={[styles.statValue, timeLeft <= 10 && { color: COLORS.error }]}>{timeLeft}s</Text>
          <Text style={styles.statLabel}>Timp</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="medal" size={20} color={COLORS.gold} />
          <Text style={styles.statValue}>{highScore}</Text>
          <Text style={styles.statLabel}>Record</Text>
        </View>
      </View>

      <View style={styles.timerBarContainer}>
        <View style={[styles.timerBar, { width: `${progressWidth}%` }]} />
      </View>

      {!isPlaying && timeLeft === GAME_DURATION ? (
        <View style={styles.startContainer}>
          <Text style={styles.startEmoji}>🎯</Text>
          <Text style={styles.startText}>Atinge ingredientele cât mai repede!</Text>
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Ionicons name="play" size={24} color={COLORS.text} />
            <Text style={styles.startBtnText}>Începe!</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gridContainer}>
          {Array.from({ length: GRID_ROWS }, (_, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {Array.from({ length: GRID_COLS }, (_, colIdx) => {
                const index = rowIdx * GRID_COLS + colIdx;
                const isActive = activeHoles.has(index);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.hole, { width: HOLE_SIZE, height: HOLE_SIZE }, isActive && styles.holeActive]}
                    onPress={() => handleTap(index)}
                    activeOpacity={0.6}
                  >
                    {isActive ? (
                      <Text style={styles.ingredient}>{activeHoles.get(index)}</Text>
                    ) : (
                      <View style={styles.holeInner} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* End Screen */}
      <Modal visible={showEndScreen} transparent animationType="fade">
        <View style={styles.endOverlay}>
          <View style={styles.endCard}>
            <Text style={styles.endEmoji}>⏰</Text>
            <Text style={styles.endTitle}>Timp expirat!</Text>
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
            <Text style={styles.endPointsAdded}>+{finalScore} puncte adăugate la total</Text>
            <View style={styles.endButtons}>
              <TouchableOpacity style={styles.endBtnPrimary} onPress={startGame}>
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
  title: { flex: 1, fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, textAlign: 'center' },
  statsBar: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, paddingVertical: SPACING.sm },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text, marginTop: 2 },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSecondary },
  timerBarContainer: { width: '85%', height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden', marginVertical: SPACING.sm },
  timerBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  startContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  startEmoji: { fontSize: 80 },
  startText: { fontFamily: FONTS.medium, fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SPACING.xl },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.full, marginTop: SPACING.md },
  startBtnText: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  gridContainer: { flex: 1, justifyContent: 'center', gap: SPACING.md },
  gridRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.md },
  hole: { borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.border, ...SHADOWS.sm },
  holeActive: { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.primary, transform: [{ scale: 1.05 }] },
  holeInner: { width: '50%', height: '50%', borderRadius: 100, backgroundColor: COLORS.surfaceLight },
  ingredient: { fontSize: 42 },
  endOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  endCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', width: '100%', maxWidth: 340 },
  endEmoji: { fontSize: 60, marginBottom: SPACING.sm },
  endTitle: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text, marginBottom: SPACING.md },
  endScoreCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#4CAF5020', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#4CAF50', marginBottom: SPACING.md },
  endScoreValue: { fontFamily: FONTS.bold, fontSize: 36, color: '#4CAF50' },
  endScoreLabel: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
  newRecordBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING.sm },
  newRecordText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.background },
  endPointsAdded: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.success, marginBottom: SPACING.lg },
  endButtons: { width: '100%', gap: SPACING.sm },
  endBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#4CAF50', padding: SPACING.md, borderRadius: BORDER_RADIUS.md },
  endBtnPrimaryText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
  endBtnSecondary: { alignItems: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight },
  endBtnSecondaryText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textSecondary },
});
