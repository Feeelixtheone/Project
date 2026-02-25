import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';

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
  // Horizontal
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE - 2; c++) {
      if (
        grid[r][c].type === grid[r][c + 1].type &&
        grid[r][c].type === grid[r][c + 2].type
      ) {
        matched.add(`${r}-${c}`);
        matched.add(`${r}-${c + 1}`);
        matched.add(`${r}-${c + 2}`);
      }
    }
  }
  // Vertical
  for (let c = 0; c < GRID_SIZE; c++) {
    for (let r = 0; r < GRID_SIZE - 2; r++) {
      if (
        grid[r][c].type === grid[r + 1][c].type &&
        grid[r][c].type === grid[r + 2][c].type
      ) {
        matched.add(`${r}-${c}`);
        matched.add(`${r + 1}-${c}`);
        matched.add(`${r + 2}-${c}`);
      }
    }
  }
  return matched;
}

function removeAndDrop(grid: Cell[][], matches: Set<string>): Cell[][] {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  // Remove matched
  matches.forEach((key) => {
    const [r, c] = key.split('-').map(Number);
    newGrid[r][c] = { type: -1, id: createId() };
  });
  // Drop
  for (let c = 0; c < GRID_SIZE; c++) {
    let emptyRow = GRID_SIZE - 1;
    for (let r = GRID_SIZE - 1; r >= 0; r--) {
      if (newGrid[r][c].type !== -1) {
        if (r !== emptyRow) {
          newGrid[emptyRow][c] = newGrid[r][c];
          newGrid[r][c] = { type: -1, id: createId() };
        }
        emptyRow--;
      }
    }
    // Fill empty spots
    for (let r = emptyRow; r >= 0; r--) {
      newGrid[r][c] = { type: Math.floor(Math.random() * FOOD_ITEMS.length), id: createId() };
    }
  }
  return newGrid;
}

export default function CandyCrushScreen() {
  const insets = useSafeAreaInsets();
  const [grid, setGrid] = useState<Cell[][]>(createGrid);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Process matches after grid changes
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

  useEffect(() => {
    processMatches();
  }, [grid]);

  useEffect(() => {
    if (moves <= 0 && !isProcessing) {
      Alert.alert('Joc terminat!', `Scorul tău: ${score} puncte`, [
        { text: 'Joacă din nou', onPress: resetGame },
        { text: 'Înapoi', onPress: () => router.back() },
      ]);
    }
  }, [moves, isProcessing]);

  const resetGame = () => {
    setGrid(createGrid());
    setScore(0);
    setMoves(30);
    setSelected(null);
  };

  const handlePress = (row: number, col: number) => {
    if (isProcessing || moves <= 0) return;

    if (!selected) {
      setSelected({ row, col });
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      return;
    }

    // Check adjacency
    const isAdjacent =
      (Math.abs(selected.row - row) === 1 && selected.col === col) ||
      (Math.abs(selected.col - col) === 1 && selected.row === row);

    if (!isAdjacent) {
      setSelected({ row, col });
      return;
    }

    // Swap
    const newGrid = grid.map((r) => r.map((c) => ({ ...c })));
    const temp = newGrid[row][col];
    newGrid[row][col] = newGrid[selected.row][selected.col];
    newGrid[selected.row][selected.col] = temp;

    const matches = findMatches(newGrid);
    if (matches.size > 0) {
      setGrid(newGrid);
      setMoves((prev) => prev - 1);
    }
    // If no match, don't swap
    setSelected(null);
  };

  const matchedCells = findMatches(grid);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Food Crush</Text>
        <TouchableOpacity onPress={resetGame} style={styles.backBtn}>
          <Ionicons name="refresh" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Score */}
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
      </View>

      {/* Grid */}
      <View style={styles.gridContainer}>
        {grid.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((cell, colIndex) => {
              const isMatch = matchedCells.has(`${rowIndex}-${colIndex}`);
              const isSel = selected?.row === rowIndex && selected?.col === colIndex;
              return (
                <TouchableOpacity
                  key={cell.id}
                  style={[
                    styles.cell,
                    { width: CELL_SIZE, height: CELL_SIZE },
                    isSel && styles.cellSelected,
                    isMatch && styles.cellMatched,
                  ]}
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
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  scoreItem: { alignItems: 'center' },
  scoreValue: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text, marginTop: 2 },
  scoreLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  gridContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.sm,
    ...{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  },
  gridRow: { flexDirection: 'row' },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
    margin: 1,
    backgroundColor: COLORS.surfaceLight,
  },
  cellSelected: {
    backgroundColor: COLORS.primary + '40',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cellMatched: {
    backgroundColor: COLORS.gold + '30',
  },
  emoji: { fontSize: CELL_SIZE * 0.55 },
});
