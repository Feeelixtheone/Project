import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GameRecord {
  game: string;
  score: number;
  date: string;
}

interface PointsState {
  totalPoints: number;
  gameHistory: GameRecord[];
  addPoints: (game: string, score: number) => void;
  getTotalPoints: () => number;
  getHighScore: (game: string) => number;
  resetPoints: () => void;
}

export const usePointsStore = create<PointsState>()(
  persist(
    (set, get) => ({
      totalPoints: 0,
      gameHistory: [],

      addPoints: (game, score) => {
        set((state) => ({
          totalPoints: state.totalPoints + score,
          gameHistory: [
            { game, score, date: new Date().toISOString() },
            ...state.gameHistory.slice(0, 49),
          ],
        }));
      },

      getTotalPoints: () => get().totalPoints,

      getHighScore: (game) => {
        const records = get().gameHistory.filter((r) => r.game === game);
        if (records.length === 0) return 0;
        return Math.max(...records.map((r) => r.score));
      },

      resetPoints: () => set({ totalPoints: 0, gameHistory: [] }),
    }),
    {
      name: 'kids-points-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
