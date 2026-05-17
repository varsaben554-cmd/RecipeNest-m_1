
export interface Recipe {
  id: string;
  title: string;
  description: string;
  readyInMinutes: number;
  ingredients: string[];
  instructions: string[];
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  cuisine: string;
  servings: number;
  isVegetarian?: boolean;
  generatedImageUrl?: string;
  images?: string[];
}

export interface HistoryItem {
  timestamp: number;
  recipes: Recipe[];
}

export enum DietaryPreference {
  NONE = 'None',
  VEGETARIAN = 'Vegetarian',
  VEGAN = 'Vegan',
  KETO = 'Keto',
  PALEO = 'Paleo',
  GLUTEN_FREE = 'Gluten Free'
}

export type UnitSystem = 'Metric' | 'Imperial';

export type ActivityLevel = 'Sedentary' | 'Light' | 'Moderate' | 'Active' | 'Very Active';
export type FitnessGoal = 'Lose Weight' | 'Maintain' | 'Build Muscle';
export type Gender = 'Male' | 'Female';

export interface UserPreferences {
  diet: DietaryPreference;
  allergies: string;
  units: UnitSystem;
  servings: number;
  // Personal Diet Fields
  age?: number;
  gender?: Gender;
  weight?: number;
  height?: number;
  activityLevel?: ActivityLevel;
  goal?: FitnessGoal;
}

export type ViewState = 'ONBOARDING' | 'INPUT' | 'RESULTS' | 'DETAIL' | 'SHOP' | 'STATS' | 'PROFILE' | 'HISTORY' | 'FAVORITES' | 'COOKING' | 'BOOK';

export type LanguageCode = 
  | 'en' | 'es' | 'fr' | 'de' | 'hi' | 'ar' | 'zh' | 'pt' | 'ru' | 'ja' 
  | 'bn' | 'pa' | 'gu' | 'it' | 'ko' | 'tr' | 'vi' | 'nl' | 'id' | 'th';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dir?: 'ltr' | 'rtl';
}