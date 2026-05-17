import { Recipe, UserPreferences, HistoryItem } from '../types';

const KEYS = {
  RECIPES: 'recipenest_recipes',
  PREFS: 'recipenest_prefs',
  INGREDIENTS: 'recipenest_ingredients',
  FOCUS: 'recipenest_focus',
  HISTORY: 'recipenest_history',
  FAVORITES: 'recipenest_favorites'
};

export const storageService = {
  saveRecipes: (recipes: Recipe[]) => {
    try {
      localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
    } catch (e) {
      console.error('Failed to save recipes', e);
    }
  },

  getRecipes: (): Recipe[] => {
    try {
      const data = localStorage.getItem(KEYS.RECIPES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  savePreferences: (prefs: UserPreferences) => {
    localStorage.setItem(KEYS.PREFS, JSON.stringify(prefs));
  },

  getPreferences: (): UserPreferences | null => {
    try {
      const data = localStorage.getItem(KEYS.PREFS);
      return data ? (JSON.parse(data) as UserPreferences) : null;
    } catch (e) {
      return null;
    }
  },

  saveIngredients: (ingredients: string) => {
    localStorage.setItem(KEYS.INGREDIENTS, ingredients);
  },

  getIngredients: (): string => {
    return localStorage.getItem(KEYS.INGREDIENTS) || '';
  },

  saveFocusMode: (mode: 'Mood' | 'Energy') => {
    localStorage.setItem(KEYS.FOCUS, mode);
  },

  getFocusMode: (): 'Mood' | 'Energy' => {
    return (localStorage.getItem(KEYS.FOCUS) as 'Mood' | 'Energy') || 'Mood';
  },

  saveHistory: (recipes: Recipe[]) => {
    try {
      const currentRaw = localStorage.getItem(KEYS.HISTORY);
      const current: HistoryItem[] = currentRaw ? JSON.parse(currentRaw) : [];
      
      const newItem: HistoryItem = {
        timestamp: Date.now(),
        recipes: recipes
      };
      
      // Prepend and limit to 20
      const updated = [newItem, ...current].slice(0, 20);
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  },

  getHistory: (): HistoryItem[] => {
    try {
      const data = localStorage.getItem(KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  clearHistory: () => {
    localStorage.removeItem(KEYS.HISTORY);
  },

  saveFavorites: (recipes: Recipe[]) => {
    try {
      localStorage.setItem(KEYS.FAVORITES, JSON.stringify(recipes));
    } catch (e) {
      console.error('Failed to save favorites', e);
    }
  },

  getFavorites: (): Recipe[] => {
    try {
      const data = localStorage.getItem(KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }
};