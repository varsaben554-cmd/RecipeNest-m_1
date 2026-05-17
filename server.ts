import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";

// Load environment variables early
dotenv.config();

// We will also import the gemini-service directly to run standard routes server-side 
import { generateRecipes, generateRecipesByCategory, generateRecipeImage, getIngredientSubstitute } from "./services/gemini-service";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Define structured JSON APIs for the app
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
  // Our proxy runs at /api/gemini 
  app.use(
    '/api/gemini',
    createProxyMiddleware({
      target: 'https://generativelanguage.googleapis.com',
      changeOrigin: true,
      ws: true,
      pathRewrite: (path) => {
        // Remove /api/gemini prefix
        let newPath = path.replace(/^\/api\/gemini/, '');
        if (newPath === path) { // fallback
           newPath = path.slice('/api/gemini'.length);
        }
        
        // Append API Key
        const separator = newPath.includes('?') ? '&' : '?';
        return `${newPath}${separator}key=${process.env.GEMINI_API_KEY}`;
      },
      on: {
        proxyReqWs: (proxyReq, req, socket, options, head) => {
           // We also need to add the key for websocket proxy req
           const originalPath = proxyReq.path;
           const separator = originalPath.includes('?') ? '&' : '?';
           proxyReq.path = `${originalPath}${separator}key=${process.env.GEMINI_API_KEY}`;
        }
      }
    })
  );


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // NOTE: For websockets, we need to manually start the upgrade handling.
  // Wait, http-proxy-middleware automatically upgrades if we pass app.listen server.
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
