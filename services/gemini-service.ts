
import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, Recipe } from "../types";
import { LANGUAGES } from "../constants";

// Fallback data for Demo/Offline mode
const DEMO_RECIPES: Recipe[] = [
  {
    id: "demo-breakfast",
    title: "Avocado & Egg Toast",
    description: "Creamy avocado on toasted sourdough topped with a poached egg and chili flakes. A perfect start to the day.",
    readyInMinutes: 15,
    ingredients: ["2 slices Sourdough Bread", "1 Ripe Avocado", "2 Eggs", "1 tsp Chili Flakes", "Salt & Pepper", "Lemon Juice"],
    instructions: [
      "Toast the sourdough bread slices until golden brown.",
      "Mash the avocado with lemon juice, salt, and pepper.",
      "Poach the eggs in simmering water for 3-4 minutes.",
      "Spread avocado on toast, top with egg, and sprinkle with chili flakes."
    ],
    calories: 450,
    protein: "18g",
    carbs: "35g",
    fat: "25g",
    cuisine: "Breakfast",
    servings: 2,
    isVegetarian: true,
    generatedImageUrl: "https://images.unsplash.com/photo-1525351484163-7529414395d8?w=800&q=80"
  },
  {
    id: "demo-lunch",
    title: "Grilled Chicken Salad",
    description: "Fresh mixed greens with grilled chicken breast, cherry tomatoes, and balsamic vinaigrette.",
    readyInMinutes: 20,
    ingredients: ["2 Chicken Breasts", "Mixed Greens", "1 cup Cherry Tomatoes", "Cucumber", "Olive Oil", "Balsamic Vinegar"],
    instructions: [
      "Season chicken breasts with salt and herbs.",
      "Grill chicken for 6-7 minutes per side until cooked through.",
      "Chop vegetables and toss with mixed greens.",
      "Slice chicken and place on top. Drizzle with olive oil and vinegar."
    ],
    calories: 380,
    protein: "45g",
    carbs: "12g",
    fat: "15g",
    cuisine: "Healthy",
    servings: 2,
    isVegetarian: false,
    generatedImageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"
  },
  {
    id: "demo-snack",
    title: "Greek Yogurt Parfait",
    description: "Layers of greek yogurt, granola, and fresh berries with a drizzle of honey.",
    readyInMinutes: 5,
    ingredients: ["1 cup Greek Yogurt", "1/2 cup Granola", "Fresh Berries (Strawberry/Blueberry)", "1 tbsp Honey"],
    instructions: [
      "Add a layer of yogurt to a glass.",
      "Add a layer of granola.",
      "Top with fresh berries.",
      "Drizzle with honey and serve immediately."
    ],
    calories: 250,
    protein: "15g",
    carbs: "30g",
    fat: "8g",
    cuisine: "Snack",
    servings: 2,
    isVegetarian: true,
    generatedImageUrl: "https://images.unsplash.com/photo-1488477181946-6428a029177b?w=800&q=80"
  },
  {
    id: "demo-afternoon-snack",
    title: "Apple & Almond Butter",
    description: "Sliced crisp apples served with creamy almond butter and a sprinkle of cinnamon.",
    readyInMinutes: 5,
    ingredients: ["1 Apple", "2 tbsp Almond Butter", "Cinnamon"],
    instructions: [
      "Slice the apple into wedges.",
      "Serve with almond butter on the side.",
      "Sprinkle with cinnamon for extra flavor."
    ],
    calories: 200,
    protein: "5g",
    carbs: "25g",
    fat: "12g",
    cuisine: "Snack",
    servings: 2,
    isVegetarian: true,
    generatedImageUrl: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&q=80"
  },
  {
    id: "demo-dinner",
    title: "Pan-Seared Salmon with Asparagus",
    description: "Crispy skin salmon fillet served with roasted asparagus and lemon butter sauce.",
    readyInMinutes: 25,
    ingredients: ["2 Salmon Fillets", "1 bunch Asparagus", "Butter", "Garlic", "Lemon", "Herbs"],
    instructions: [
      "Season salmon with salt and pepper.",
      "Sear salmon skin-side down in a hot pan for 4 minutes.",
      "Flip and cook for another 3 minutes. Add butter and garlic to pan.",
      "Roast asparagus in oven at 400°F (200°C) for 10 minutes.",
      "Serve salmon with asparagus and drizzle with pan sauce."
    ],
    calories: 550,
    protein: "40g",
    carbs: "8g",
    fat: "35g",
    cuisine: "Dinner",
    servings: 2,
    isVegetarian: false,
    generatedImageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a3a2750?w=800&q=80"
  },
  {
    id: "demo-late-snack",
    title: "Dark Chocolate & Walnuts",
    description: "A small handful of walnuts and a square of 70% dark chocolate for a satisfying end to the day.",
    readyInMinutes: 2,
    ingredients: ["20g Dark Chocolate", "30g Walnuts"],
    instructions: [
      "Portion out the chocolate and walnuts.",
      "Enjoy as a light evening treat."
    ],
    calories: 180,
    protein: "4g",
    carbs: "10g",
    fat: "15g",
    cuisine: "Snack",
    servings: 2,
    isVegetarian: true,
    generatedImageUrl: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&q=80"
  }
];

// Robust JSON extractor to handle potential markdown wrapping or extra text
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  
  let cleaned = text.trim();
  // Remove markdown wrappers if present
  cleaned = cleaned.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  
  // Locate the outer JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.substring(start, end + 1);
  }
  
  return cleaned || "{}";
};

const isQuotaError = (error: any): boolean => {
  const msg = (error?.message || JSON.stringify(error)).toLowerCase();
  return msg.includes('429') || msg.includes('quota') || error?.status === 429;
};

// Mifflin-St Jeor Equation
export const calculateDailyCalories = (prefs?: UserPreferences): number | null => {
  if (!prefs || !prefs.weight || !prefs.height || !prefs.age || !prefs.gender) return null;

  // Assuming weight is stored in kg and height in cm. 
  // If stored otherwise, conversion needed. For simplicity we assume user inputs stored as raw values matching Metric for now.
  // Ideally, App.tsx handles conversion before storing, OR we handle it here.
  // Given current App.tsx changes, let's assume raw values are consistent with 'Metric' standard (kg, cm).
  
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

export const generateRecipes = async (
  ingredients: string,
  preferences: UserPreferences,
  languageCode: string
): Promise<Recipe[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-3-flash-preview";
  
  const selectedLang = LANGUAGES.find(l => l.code === languageCode) || LANGUAGES[0];
  const dietString = preferences?.diet && preferences.diet !== 'None' ? `Dietary restriction: ${preferences.diet}.` : '';
  const allergyString = preferences?.allergies ? `Exclude ingredients causing allergies: ${preferences.allergies}.` : '';
  const units = preferences?.units || 'Metric';
  const servings = preferences?.servings || 2;
  
  const targetCalories = calculateDailyCalories(preferences);
  const calorieString = targetCalories 
    ? `Target daily calories: Approximately ${targetCalories} kcal total for the 4 meals combined.` 
    : '';

  const prompt = `
    You are a nutrition expert. Create a daily meal plan with exactly 6 recipes: Breakfast, Mid-morning Snack, Lunch, Afternoon Snack, Dinner, and Late-night Snack.
    Base these recipes on the following available ingredients: "${ingredients}".
    ${dietString}
    ${allergyString}
    ${calorieString}
    
    IMPORTANT RULES:
    1. Return a JSON object with a single key "recipes" containing an array of exactly 6 recipe objects.
    2. Order the recipes: Breakfast, Mid-morning Snack, Lunch, Afternoon Snack, Dinner, Late-night Snack.
    3. Language: ${selectedLang.name} (${selectedLang.nativeName}). Translate all fields (title, description, ingredients, instructions) to this language.
    4. Measurement System: ${units} units (e.g., ${units === 'Imperial' ? 'oz, lbs, cups' : 'g, kg, ml'}).
    5. Scale recipes for ${servings} people.
    6. Ensure calorie counts are integers per serving.
    7. Macros (protein, carbs, fat) should be strings like "20g".
    8. Each recipe MUST include a unique "id" and "servings" set to ${servings}.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are a JSON-only API. Return valid JSON.",
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  readyInMinutes: { type: Type.INTEGER },
                  ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                  instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  calories: { type: Type.INTEGER },
                  protein: { type: Type.STRING },
                  carbs: { type: Type.STRING },
                  fat: { type: Type.STRING },
                  cuisine: { type: Type.STRING },
                  servings: { type: Type.INTEGER },
                  isVegetarian: { type: Type.BOOLEAN }
                },
                required: ["id", "title", "description", "ingredients", "instructions", "calories", "protein", "carbs", "fat", "servings", "isVegetarian"]
              }
            }
          },
          required: ["recipes"]
        }
      }
    });

    const jsonText = cleanJson(response.text || "");
    
    if (!jsonText || jsonText === "{}") {
       throw new Error("Empty response from AI");
    }

    const parsed = JSON.parse(jsonText);
    
    if (!parsed.recipes || !Array.isArray(parsed.recipes)) {
        throw new Error("Invalid response format: missing recipes array");
    }

    if (parsed.recipes.length === 0) throw new Error("AI returned empty menu");
    
    return parsed.recipes as Recipe[];
  } catch (error) {
    if (isQuotaError(error)) {
        console.warn("Gemini Quota Exceeded - Returning Demo Data");
        // Return demo recipes but scaled to requested servings if possible
        return DEMO_RECIPES.map(r => ({...r, servings: preferences?.servings || 2}));
    }
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateRecipesByCategory = async (
  category: string,
  preferences: UserPreferences,
  languageCode: string
): Promise<Recipe[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-3-flash-preview";
  
  const selectedLang = LANGUAGES.find(l => l.code === languageCode) || LANGUAGES[0];
  const units = preferences?.units || 'Metric';
  
  const isBulk = ['Cakes', 'Laddus', 'Sweets', 'Desserts'].some(c => category.includes(c));
  const servings = isBulk ? 6 : (preferences?.servings || 2);

  const prompt = `
    Create a curated recipe list for the category: "${category}".
    Provide exactly 8 distinct, popular, and high-quality recipes for this category.
    
    SPECIAL INSTRUCTION FOR MIXED PACKAGES:
    If the category contains "Mixed" or "Combo", provide exactly 4 Vegetarian and 4 Non-Vegetarian recipes.
    Ensure the "isVegetarian" boolean is correctly set for each recipe.
    
    Context:
    - Language: ${selectedLang.name} (${selectedLang.nativeName}). Translate everything.
    - Units: ${units}
    - Servings: ${servings}
    - Dietary restriction: ${preferences?.diet || 'None'}
    
    IMPORTANT:
    - If the category is specific (e.g. "Laddus"), provide different variations (e.g. Besan, Motichoor, Coconut).
    - If the category is generic (e.g. "Cold Drinks"), provide a mix (e.g. Iced Coffee, Mojito, Milkshake).
    - Ensure instructions are detailed and professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are a professional chef API. Return strict JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  readyInMinutes: { type: Type.INTEGER },
                  ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                  instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  calories: { type: Type.INTEGER },
                  protein: { type: Type.STRING },
                  carbs: { type: Type.STRING },
                  fat: { type: Type.STRING },
                  cuisine: { type: Type.STRING },
                  servings: { type: Type.INTEGER },
                  isVegetarian: { type: Type.BOOLEAN }
                },
                required: ["id", "title", "description", "ingredients", "instructions", "calories", "protein", "carbs", "fat", "servings", "isVegetarian"]
              }
            }
          },
          required: ["recipes"]
        }
      }
    });

    const jsonText = cleanJson(response.text || "");
    const parsed = JSON.parse(jsonText);
    return parsed.recipes as Recipe[];
  } catch (error) {
    if (isQuotaError(error)) {
        console.warn("Gemini Quota Exceeded - Returning Demo Category Data");
        // Return duplicate demo recipes with modified IDs to mimic a list
        return [...DEMO_RECIPES, ...DEMO_RECIPES].map((r, i) => ({
            ...r, 
            id: `demo-cat-${i}`,
            title: i > 3 ? `${r.title} (Variation)` : r.title,
            servings: servings
        }));
    }
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateRecipeImage = async (recipe: Recipe): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-2.5-flash-image";
  
  // Specific instruction to improve realism based on recipe type
  const isDrink = recipe.ingredients.some(i => i.toLowerCase().includes('milk') || i.toLowerCase().includes('water') || i.toLowerCase().includes('ice')) && (recipe.title.toLowerCase().includes('tea') || recipe.title.toLowerCase().includes('coffee') || recipe.title.toLowerCase().includes('shake') || recipe.title.toLowerCase().includes('juice'));
  const isSweet = recipe.title.toLowerCase().includes('cake') || recipe.title.toLowerCase().includes('laddu') || recipe.title.toLowerCase().includes('sweet');
  
  let visualHint = "Plating: Michelin star, minimalist, on a dark ceramic plate.";
  if (isDrink) {
    visualHint = "Presented in an appropriate glass (e.g. tall glass for cold drinks, mug for hot). Condensation on glass if cold. Steam if hot. Professional beverage photography.";
  } else if (isSweet) {
     visualHint = "Showcasing the texture. If it's a bakery item, show crumbs or layers. If it's a sweet, show the rich texture. Professional dessert photography.";
  }

  const prompt = `Real world professional food photography of ${recipe.title}. 
  Hyper-realistic, 8k resolution, cinematic lighting, shallow depth of field. 
  ${visualHint}
  Ingredients visible: ${recipe.ingredients.slice(0, 3).join(', ')}.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        imageConfig: {
            aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    if (isQuotaError(error)) {
        // Return null to allow fallback to placeholders
        return null; 
    }
    console.error("Image gen error", error);
    return null;
  }
};

export const getIngredientSubstitute = async (ingredient: string, languageCode: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-3-flash-preview";
  const selectedLang = LANGUAGES.find(l => l.code === languageCode) || LANGUAGES[0];

  const prompt = `Suggest a common cooking substitute for "${ingredient}". 
  Keep it short (max 10 words). 
  Language: ${selectedLang.name} (${selectedLang.nativeName}).
  Format: "Try [substitute] ([reason])"`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "No substitute found.";
  } catch (error) {
    if (isQuotaError(error)) {
        return "Try a generic alternative (Quota Limit)";
    }
    return "Unavailable";
  }
};