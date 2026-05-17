import { UserPreferences, Recipe } from "../types";

export const generateRecipes = async (
  ingredients: string,
  preferences: UserPreferences,
  languageCode: string
): Promise<Recipe[]> => {
  const response = await fetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients, preferences, languageCode })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to generate recipes');
  }
  const data = await response.json();
  return data.recipes;
};

export const generateRecipesByCategory = async (
  category: string,
  preferences: UserPreferences,
  languageCode: string
): Promise<Recipe[]> => {
  const response = await fetch('/api/recipes-by-category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, preferences, languageCode })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to generate recipes');
  }
  const data = await response.json();
  return data.recipes;
};

export const generateRecipeImage = async (recipe: Recipe): Promise<string | null> => {
  const response = await fetch('/api/recipe-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe })
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data.imageUrl;
};

export const getIngredientSubstitute = async (ingredient: string, languageCode: string): Promise<string> => {
  const response = await fetch('/api/ingredient-substitute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient, languageCode })
  });
  if (!response.ok) {
    return "Unavailable";
  }
  const data = await response.json();
  return data.substitute;
};

export const calculateDailyCalories = (prefs?: UserPreferences): number | null => {
  if (!prefs || !prefs.weight || !prefs.height || !prefs.age || !prefs.gender) return null;

  let bmr = (10 * prefs.weight) + (6.25 * prefs.height) - (5 * prefs.age);
  
  if (prefs.gender === 'Male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  const activityMultipliers: Record<string, number> = {
    'Sedentary': 1.2,
    'Light': 1.375,
    'Moderate': 1.55,
    'Active': 1.725,
    'Very Active': 1.9
  };

  const activity = prefs.activityLevel || 'Sedentary';
  let tdee = bmr * (activityMultipliers[activity] || 1.2);

  if (prefs.goal === 'Lose Weight') {
    tdee -= 500;
  } else if (prefs.goal === 'Build Muscle') {
    tdee += 300;
  }

  return Math.round(tdee);
};
