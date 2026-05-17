import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { 
  generateRecipes, 
  generateRecipesByCategory, 
  generateRecipeImage, 
  getIngredientSubstitute 
} from "../services/gemini-service";

const app = express();

app.use(express.json());

app.post("/api/recipes", async (req, res) => {
  try {
    const { ingredients, preferences, languageCode } = req.body;
    const recipes = await generateRecipes(ingredients, preferences, languageCode);
    res.json({ recipes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/recipes-by-category", async (req, res) => {
  try {
    const { category, preferences, languageCode } = req.body;
    const recipes = await generateRecipesByCategory(category, preferences, languageCode);
    res.json({ recipes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/recipe-image", async (req, res) => {
  try {
    const { recipe } = req.body;
    const imageUrl = await generateRecipeImage(recipe);
    res.json({ imageUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ingredient-substitute", async (req, res) => {
  try {
    const { ingredient, languageCode } = req.body;
    const substitute = await getIngredientSubstitute(ingredient, languageCode);
    res.json({ substitute });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy Gemini API for Live API mode (which uses Websockets) 
// Note: WebSockets may not work in serverless environments like Vercel
app.use(
  '/api/gemini',
  createProxyMiddleware({
    target: 'https://generativelanguage.googleapis.com',
    changeOrigin: true,
    ws: true,
    pathRewrite: (path) => {
      let newPath = path.replace(/^\/api\/gemini/, '');
      if (newPath === path) { // fallback
         newPath = path.slice('/api/gemini'.length);
      }
      const separator = newPath.includes('?') ? '&' : '?';
      return `${newPath}${separator}key=${process.env.GEMINI_API_KEY}`;
    },
    on: {
      proxyReqWs: (proxyReq) => {
         const originalPath = proxyReq.path;
         const separator = originalPath.includes('?') ? '&' : '?';
         proxyReq.path = `${originalPath}${separator}key=${process.env.GEMINI_API_KEY}`;
      }
    }
  })
);

export default app;
