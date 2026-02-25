import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { usePointsStore } from '../../src/stores/pointsStore';

const GRID_SIZE = 7;
const FOOD_ITEMS = [
  { emoji: '🍕', color: '#FF6B35' },
  { emoji: '🍔', color: '#FFA726' },
  { emoji: '🍩', color: '#AB47BC' },
  { emoji: '🍣', color: '#EF5350' },
  { emoji: '🍰', color: '#EC407A' },
  { emoji: '🌮', color: '#66BB6A' },
];

const { width } = Dimensions.get('window');
const CELL_SIZE = Math.min((width - 48) / GRID_SIZE, 52);

type Cell = { type: number; id: string };

function createId() {
  return Math.random().toString(36).substr(2, 9);
}

function createGrid(): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let type: number;
      do {
        type = Math.floor(Math.random() * FOOD_ITEMS.length);
      } while (
        (c >= 2 && row[c - 1].type === type && row[c - 2].type === type) ||
        (r >= 2 && grid[r - 1][c].type === type && grid[r - 2][c].type === type)
      );
      row.push({ type, id: createId() });
    }
    grid.push(row);
  }
  return grid;
}

function findMatches(grid: Cell[][]): Set<string> {
  const matched = new Set<string>();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE - 2; c++) {
      if (grid[r][c].type === grid[r][c + 1].type && grid[r][c].type === grid[r][c + 2].type) {
        matched.add(`${r}-${c}`); matched.add(`${r}-${c + 1}`); matched.add(`${r}-${c + 2}`);
      }
    }
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    for (let r = 0; r < GRID_SIZE - 2; r++) {
      if (grid[r][c].type === grid[r + 1][c].type && grid[r][c].type === grid[r + 2][c].type) {
        matched.add(`${r}-${c}`); matched.add(`${r + 1}-${c}`); matched.add(`${r + 2}-${c}`);
      }
    }
  }
  return matched;
}

function removeAndDrop(grid: Cell[][], matches: Set<string>): Cell[][] {
  const g = grid.map((row) => row.map((cell) => ({ ...cell })));
  matches.forEach((key) => { const [r, c] = key.split('-').map(Number); g[r][c] = { type: -1, id: createId() }; });
  for (let c = 0; c < GRID_SIZE; c++) {
    let emptyRow = GRID_SIZE - 1;
    for (let r = GRID_SIZE - 1; r >= 0; r--) {
      if (g[r][c].type !== -1) {
        if (r !== emptyRow) { g[emptyRow][c] = g[r][c]; g[r][c] = { type: -1, id: createId() }; }
        emptyRow--;
      }
    }
    for (let r = emptyRow; r >= 0; r--) {
      g[r][c] = { type: Math.floor(Math.random() * FOOD_ITEMS.length), id: createId() };
    }
  }
  return g;
}

export default function CandyCrushScreen() {
  const insets = useSafeAreaInsets();
  const addPoints = usePointsStore((s) => s.addPoints);
  const getHighScore = usePointsStore((s) => s.getHighScore);
  const [grid, setGrid] = useState<Cell[][]>(createGrid);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [pointsSaved, setPointsSaved] = useState(false);

  const highScore = getHighScore('candy-crush');

  const processMatches = useCallback(() => {
    const matches = findMatches(grid);
    if (matches.size > 0) {
      setIsProcessing(true);
      setTimeout(() => {
        const newGrid = removeAndDrop(grid, matches);
        setScore((prev) => prev + matches.size * 10);
        setGrid(newGrid);
        setIsProcessing(false);
      }, 300);
    }
  }, [grid]);

  useEffect(() => { processMatches(); }, [grid]);

  useEffect(() => {
    if (moves <= 0 && !isProcessing && !showEndScreen) {
      setTimeout(() => {
        if (!pointsSaved) {
          addPoints('candy-crush', score);
          setPointsSaved(true);
        }
        setShowEndScreen(true);
      }, 500);
    }
  }, [moves, isProcessing]);

  const resetGame = () => {
    setGrid(createGrid());
    setScore(0);
    setMoves(30);
    setSelected(null);
    setShowEndScreen(false);
    setPointsSaved(false);
  };

  const handlePress = (row: number, col: number) => {
    if (isProcessing || moves <= 0) return;
    if (!selected) { setSelected({ row, col }); return; }
    const isAdjacent = (Math.abs(selected.row - row) === 1 && selected.col === col) || (Math.abs(selected.col - col) === 1 && selected.row === row);
    if (!isAdjacent) { setSelected({ row, col }); return; }
    const newGrid = grid.map((r) => r.map((c) => ({ ...c })));
    const temp = newGrid[row][col];
    newGrid[row][col] = newGrid[selected.row][selected.col];
    newGrid[selected.row][selected.col] = temp;
    const matches = findMatches(newGrid);
    if (matches.size > 0) { setGrid(newGrid); setMoves((prev) => prev - 1); }
    setSelected(null);
  };

  const matchedCells = findMatches(grid);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Food Crush</Text>
        <TouchableOpacity onPress={resetGame} style={styles.backBtn}>
          <Ionicons name="refresh" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.scoreBar}>
        <View style={styles.scoreItem}>
          <Ionicons name="star" size={20} color={COLORS.gold} />
          <Text style={styles.scoreValue}>{score}</Text>
          <Text style={styles.scoreLabel}>Puncte</Text>
        </View>
        <View style={styles.scoreItem}>
          <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
          <Text style={styles.scoreValue}>{moves}</Text>
          <Text style={styles.scoreLabel}>Mutări</Text>
        </View>
        <View style={styles.scoreItem}>
          <Ionicons name="medal" size={20} color={COLORS.gold} />
          <Text style={styles.scoreValue}>{highScore}</Text>
          <Text style={styles.scoreLabel}>Record</Text>
        </View>
      </View>

      <View style={styles.gridContainer}>
        {grid.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((cell, colIndex) => {
              const isMatch = matchedCells.has(`${rowIndex}-${colIndex}`);
              const isSel = selected?.row === rowIndex && selected?.col === colIndex;
              return (
                <TouchableOpacity
                  key={cell.id}
                  style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }, isSel && styles.cellSelected, isMatch && styles.cellMatched]}
                  onPress={() => handlePress(rowIndex, colIndex)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emoji}>{FOOD_ITEMS[cell.type]?.emoji || '?'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* End Screen Modal */}
      <Modal visible={showEndScreen} transparent animationType="fade">
        <View style={styles.endOverlay}>
          <View style={styles.endCard}>
            <Text style={styles.endEmoji}>🎉</Text>
            <Text style={styles.endTitle}>Joc terminat!</Text>
            <View style={styles.endScoreCircle}>
              <Text style={styles.endScoreValue}>{score}</Text>
              <Text style={styles.endScoreLabel}>puncte</Text>
            </View>
            {score > highScore && score > 0 && (
              <View style={styles.newRecordBadge}>
                <Ionicons name="trophy" size={16} color={COLORS.background} />
                <Text style={styles.newRecordText}>Nou Record!</Text>
              </View>
            )}
            <Text style={styles.endPointsAdded}>+{score} puncte adăugate la total</Text>
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
  scoreBar: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, paddingVertical: SPACING.md },
  scoreItem: { alignItems: 'center' },
  scoreValue: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text, marginTop: 2 },
  scoreLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSecondary },
  gridContainer: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  gridRow: { flexDirection: 'row' },
  cell: { justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.sm, margin: 1, backgroundColor: COLORS.surfaceLight },
  cellSelected: { backgroundColor: COLORS.primary + '40', borderWidth: 2, borderColor: COLORS.primary },
  cellMatched: { backgroundColor: COLORS.gold + '30' },
  emoji: { fontSize: CELL_SIZE * 0.55 },
  endOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  endCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', width: '100%', maxWidth: 340 },
  endEmoji: { fontSize: 60, marginBottom: SPACING.sm },
  endTitle: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text, marginBottom: SPACING.md },
  endScoreCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.primary, marginBottom: SPACING.md },
  endScoreValue: { fontFamily: FONTS.bold, fontSize: 36, color: COLORS.primary },
  endScoreLabel: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
  newRecordBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING.sm },
  newRecordText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.background },
  endPointsAdded: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.success, marginBottom: SPACING.lg },
  endButtons: { width: '100%', gap: SPACING.sm },
  endBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: BORDER_RADIUS.md },
  endBtnPrimaryText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text },
  endBtnSecondary: { alignItems: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight },
  endBtnSecondaryText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textSecondary },
});
