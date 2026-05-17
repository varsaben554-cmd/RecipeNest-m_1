import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, ArrowLeft, ChefHat, Utensils, AlertCircle, Camera, ListChecks, Download, Clock, Globe, X, Zap, Menu, User, BarChart, BookOpen, ChevronRight, RefreshCw, Calendar, Trash2, CheckSquare, Settings, History, Heart, Play, Maximize2, Mic, Share2, Scale, Users, Coffee, IceCream, Cake, Wine, Plus, Pizza, Leaf, Soup, MicOff, Volume2, WifiOff
} from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { generateRecipes, generateRecipeImage, getIngredientSubstitute, generateRecipesByCategory, calculateDailyCalories } from './services/api-client';
import { storageService } from './services/storage-service';
import { UserPreferences, DietaryPreference, Recipe, ViewState, LanguageCode, HistoryItem, UnitSystem, ActivityLevel, FitnessGoal, Gender } from './types';
import { Button } from './components/Button';
import { LANGUAGES, TRANSLATIONS, COMMON_INGREDIENTS } from './constants';

const RecipeNestLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="256" cy="256" r="256" className="fill-primary" />
    {/* Bowl */}
    <path d="M116 290 C 116 390, 396 390, 396 290" stroke="#10221a" strokeWidth="32" strokeLinecap="round" />
    {/* Leaf */}
    <path d="M256 290 Q 256 190 330 190 Q 330 290 256 290 Z" fill="#10221a" />
    <path d="M256 290 Q 256 240 256 190" stroke="#13ec92" strokeWidth="8" />
    {/* Spoon */}
    <path d="M380 130 L 320 190" stroke="#10221a" strokeWidth="24" strokeLinecap="round" />
    <ellipse cx="400" cy="110" rx="25" ry="35" transform="rotate(45 400 110)" fill="#10221a" />
    {/* Letter R */}
    <path d="M140 140 V 240 M 140 140 H 190 C 220 140 220 190 190 190 H 140 M 190 190 L 220 240" stroke="#10221a" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// High quality placeholders for instant visual feedback
const PLACEHOLDER_IMAGES: Record<string, string[]> = {
  beverages: [
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80", // Tea/Cozy
    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80", // Cola/Cold
    "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=800&q=80", // Coffee
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80", // Juice
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80", // Mocktail
    "https://images.unsplash.com/photo-1629205696429-415ce807cb96?w=800&q=80"  // Milkshake
  ],
  sweets: [
    "https://images.unsplash.com/photo-1589119908995-c6837fa14848?w=800&q=80", // Laddu/Indian
    "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=800&q=80", // Gulab jamun ish
    "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80", // Cake/Sweet
    "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800&q=80", // Ice Cream
    "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&q=80", // Ice Cream scoops
    "https://images.unsplash.com/photo-1605197172074-68147a2559b9?w=800&q=80"  // Indian Sweet
  ],
  bakery: [
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80", // Cake
    "https://images.unsplash.com/photo-1509365465984-1156c594eee7?w=800&q=80", // Bread
    "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80", // Cookie
    "https://images.unsplash.com/photo-1488477181946-6428a029177b?w=800&q=80"
  ],
  main: [
    "https://images.unsplash.com/photo-1585937421612-70a008356f36?w=800&q=80", // Indian Curry
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80", // Healthy bowl
    "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&q=80", // Chinese Noodles
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80", // Salad
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80", // Curry
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&q=80"  // Sandwich/Toast
  ],
  fastfood: [
    "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800&q=80", // Burger
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80", // Pizza
    "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80", // Burger & Fries
    "https://images.unsplash.com/photo-1529042410759-befb72002f40?w=800&q=80"  // Fries
  ],
  diet: [
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80", // Salad
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80", // Healthy Plate
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80", // Gym food
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80"  // Salad
  ]
};

const getPlaceholderForRecipe = (categoryId: string | null, recipeId: string, title: string) => {
  // Use category or default to main
  const cat = categoryId && PLACEHOLDER_IMAGES[categoryId] ? categoryId : 'main';
  const images = PLACEHOLDER_IMAGES[cat];
  // Deterministic selection based on title length or randomish
  const index = (title.length + (parseInt(recipeId, 36) || 0)) % images.length;
  return images[index];
};

interface GeneratorModalProps {
  show: boolean;
  onClose: () => void;
  ingredients: string;
  setIngredients: (value: React.SetStateAction<string>) => void;
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  onGenerate: () => void;
  loading: boolean;
  error: string | null;
  t: Record<string, string>;
}

const GeneratorModal: React.FC<GeneratorModalProps> = ({
  show,
  onClose,
  ingredients,
  setIngredients,
  preferences,
  setPreferences,
  onGenerate,
  loading,
  error,
  t
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!show) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setIngredients(val);
    updateSuggestions(val, e.target.selectionStart);
  };

  const updateSuggestions = (val: string, cursor: number) => {
    let start = cursor;
    while (start > 0 && /[^,\s]/.test(val[start - 1])) {
      start--;
    }
    const currentWord = val.slice(start, cursor);

    if (currentWord.trim().length >= 1) {
      const q = currentWord.toLowerCase();
      const starts = COMMON_INGREDIENTS.filter(i => i.toLowerCase().startsWith(q));
      const subs = COMMON_INGREDIENTS.filter(i => {
        if (starts.includes(i)) return false;
        const target = i.toLowerCase();
        let si = 0;
        for (const char of target) {
          if (char === q[si]) si++;
          if (si === q.length) return true;
        }
        return false;
      });
      setSuggestions([...starts, ...subs].slice(0, 8));
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (suggestion: string) => {
    if (!textareaRef.current) return;
    const val = ingredients;
    const cursor = textareaRef.current.selectionStart;

    let start = cursor;
    while (start > 0 && /[^,\s]/.test(val[start - 1])) {
      start--;
    }
    
    const prefix = val.slice(0, start);
    const suffix = val.slice(cursor);
    const newValue = prefix + suggestion + ", " + suffix;
    
    setIngredients(newValue);
    setSuggestions([]);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = prefix.length + suggestion.length + 2;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Could map to currentLang

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIngredients((prev) => prev ? `${prev}, ${transcript}` : transcript);
    };

    recognition.start();
  };

  const adjustServings = (delta: number) => {
    setPreferences(prev => {
       const current = prev.servings || 2;
       const newVal = Math.max(1, Math.min(50, current + delta));
       return { ...prev, servings: newVal };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
      <div className="bg-background-dark border-t border-white/10 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-lg shadow-2xl relative animate-in slide-in-from-bottom-full duration-300 flex flex-col h-[85vh] sm:h-auto">
         <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden"></div>
         <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white z-10"><X size={24} /></button>
         
         <h2 className="text-2xl font-bold text-white mb-2 font-display">{t.kitchen}</h2>
         <p className="text-slate-400 text-sm mb-6">{t.kitchenSub}</p>
         
         <div className="flex-1 flex flex-col overflow-hidden">
           <div className="relative">
             <textarea
               ref={textareaRef}
               value={ingredients}
               onChange={handleInputChange}
               placeholder={t.ingPlaceholder}
               className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-white resize-none mb-4 text-base pr-12"
             />
             <button 
                onClick={toggleVoiceInput}
                className={`absolute right-3 bottom-7 p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-slate-400 hover:text-white'}`}
             >
                <Mic size={20} />
             </button>
           </div>
           
           {suggestions.length > 0 && (
             <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
                {suggestions.map(s => (
                  <button 
                    key={s}
                    onClick={() => applySuggestion(s)}
                    className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg text-sm font-bold whitespace-nowrap hover:bg-primary/30 active:scale-95 transition-all"
                  >
                    {s}
                  </button>
                ))}
             </div>
           )}

           <div className="flex gap-4 mb-4">
              <div className="flex-1">
                 <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t.servings}</label>
                 <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                    <button onClick={() => adjustServings(-1)} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 active:scale-95 transition-all">-</button>
                    <span className="flex-1 text-center font-bold text-white text-lg">{preferences.servings || 2}</span>
                    <button onClick={() => adjustServings(1)} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 active:scale-95 transition-all">+</button>
                 </div>
              </div>
           </div>
           
           <div className="mb-4">
             <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3 block">{t.dietary}</label>
             <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar touch-pan-x">
              {Object.values(DietaryPreference).map((diet) => (
                <button
                  key={diet}
                  onClick={() => setPreferences(prev => ({ ...prev, diet }))}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border active:scale-95 ${
                    preferences.diet === diet ? 'bg-primary text-background-dark border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 border-white/5'
                  }`}
                >
                  {t[`diet_${diet.replace(' ', '_')}` as keyof typeof t] || diet}
                </button>
              ))}
             </div>
           </div>
           
           {error && (
             <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm mb-4 animate-in fade-in">
               <AlertCircle size={16} />
               {error}
             </div>
           )}
         </div>

         <div className="mt-auto pt-4">
           <Button fullWidth onClick={onGenerate} loading={loading} className="bg-primary text-background-dark hover:bg-primary/90 py-4 text-base shadow-xl shadow-primary/20 active:scale-[0.98]">
             {loading ? t.loading : t.generate} <Sparkles size={20} />
           </Button>
         </div>
      </div>
    </div>
  );
};

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'error' | 'success', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-safe left-4 right-4 z-[200] flex items-center gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-full duration-500 ${
      type === 'error' ? 'bg-red-500/90 text-white border border-red-400/50' : 'bg-primary/90 text-background-dark border border-primary/50'
    }`}>
      {type === 'error' ? <AlertCircle size={20} /> : <CheckSquare size={20} />}
      <span className="text-sm font-bold flex-1">{message}</span>
      <button onClick={onClose}><X size={18} opacity={0.8} /></button>
    </div>
  );
};

// --- Live API Helper Functions ---
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('ONBOARDING');
  const [preferences, setPreferences] = useState<UserPreferences>({ diet: DietaryPreference.NONE, allergies: '', units: 'Metric', servings: 2 });
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en');
  const [showLangSelector, setShowLangSelector] = useState(false);
  const [ingredients, setIngredients] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [focusMode, setFocusMode] = useState<'Mood' | 'Energy'>('Mood');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [lastView, setLastView] = useState<ViewState>('RESULTS');
  const [cookingSteps, setCookingSteps] = useState<Record<number, boolean>>({});
  
  // Book Mode States
  const [bookRecipes, setBookRecipes] = useState<Recipe[]>([]);
  const [activeBookCategory, setActiveBookCategory] = useState<string | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [bookLoadingMore, setBookLoadingMore] = useState(false);

  // Gallery State
  const [showGallery, setShowGallery] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Substutite state
  const [substituteLoading, setSubstituteLoading] = useState<string | null>(null);
  const [activeSubstitute, setActiveSubstitute] = useState<{ing: string, text: string} | null>(null);

  // Grocery list state
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  // Toast & Quota state
  const [toast, setToast] = useState<{message: string, type: 'error'|'success'} | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Live API State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  
  // Translation Helper
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];

  // Swipe to go back logic
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleGoBack = () => {
    if (view === 'BOOK' && activeSubCategory) {
      setActiveSubCategory(null);
      setBookRecipes([]);
      return;
    }
    if (view === 'DETAIL') {
      setView(lastView);
      return;
    }
    if (view === 'COOKING') {
      setView('DETAIL');
      return;
    }
    if (['SHOP', 'STATS', 'PROFILE', 'HISTORY', 'FAVORITES', 'BOOK'].includes(view)) {
      setView('RESULTS');
      return;
    }
    if (view === 'RESULTS') {
      setView('INPUT');
      return;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX.current;
    const dy = touchEndY - touchStartY.current;

    // Detect horizontal swipe
    if (Math.abs(dx) > 80 && Math.abs(dy) < 50) {
      handleGoBack();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const isPlanView = view === 'RESULTS' || view === 'ONBOARDING' || view === 'INPUT';

  // --- Live API Handlers ---
  const stopLiveSession = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (sourcesRef.current) {
        sourcesRef.current.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        sourcesRef.current = [];
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsLiveActive(false);
    setIsLiveConnecting(false);
  };

  const startLiveSession = async () => {
    if (isLiveActive || isLiveConnecting) return;
    
    // Check if we hit quota recently to avoid immediate failure
    if (quotaExceeded) {
        setToast({ message: t.quota_exceeded, type: 'error' });
        return;
    }

    setIsLiveConnecting(true);

    try {
      const ai = new GoogleGenAI({ 
        apiKey: "proxy", // API Key is handled by backend proxy
        httpOptions: { 
          baseUrl: window.location.origin + '/api/gemini' 
        } 
      });
      const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      
      let nextStartTime = 0;
      const outputNode = audioContext.createGain();
      outputNode.connect(audioContext.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
            setIsLiveActive(true);
            setIsLiveConnecting(false);

            // Setup input stream (resampled to 16kHz for Gemini)
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32 to Int16
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              
              const base64Data = arrayBufferToBase64(pcmData.buffer);
              
              // Only send if session is active
              sessionPromise.then(session => {
                try {
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64Data
                        }
                    });
                } catch (err) {
                    console.warn("Failed to send audio input", err);
                }
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
            
            inputSourceRef.current = source;
            processorRef.current = processor;
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const bytes = base64ToUint8Array(audioData);
              const int16Data = new Int16Array(bytes.buffer);
              const float32Data = new Float32Array(int16Data.length);
              for(let i=0; i<int16Data.length; i++) {
                float32Data[i] = int16Data[i] / 0x8000;
              }
              
              const buffer = audioContext.createBuffer(1, float32Data.length, 24000);
              buffer.copyToChannel(float32Data, 0);
              
              const source = audioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(outputNode);
              
              source.onended = () => {
                  sourcesRef.current = sourcesRef.current.filter(s => s !== source);
              };

              const now = audioContext.currentTime;
              const startTime = Math.max(now, nextStartTime);
              source.start(startTime);
              nextStartTime = startTime + buffer.duration;
              sourcesRef.current.push(source);
            }

            if (msg.serverContent?.interrupted) {
                console.log("Interrupted!");
                sourcesRef.current.forEach(source => {
                    try { source.stop(); } catch(e) {}
                });
                sourcesRef.current = [];
                nextStartTime = 0;
            }
          },
          onclose: () => {
            console.log('Live session closed');
            stopLiveSession();
          },
          onerror: (err) => {
            console.error('Live session error', err);
            // Check for quota error in live session
            const errMsg = JSON.stringify(err).toLowerCase();
            if (errMsg.includes('quota') || errMsg.includes('429')) {
                setQuotaExceeded(true);
                setToast({ message: t.quota_exceeded, type: 'error' });
            } else {
                setToast({ message: "Live connection failed", type: 'error' });
            }
            stopLiveSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: `You are a helpful culinary assistant guiding the user to cook "${selectedRecipe?.title}". 
          Ingredients: ${selectedRecipe?.ingredients.join(', ')}. 
          Instructions: ${selectedRecipe?.instructions.join('. ')}. 
          Be brief, encouraging, and helpful. If they ask about substitutes, give quick answers.`
        }
      });
      
      liveSessionRef.current = await sessionPromise;

    } catch (e: any) {
      console.error(e);
      stopLiveSession();
      if (e.message?.includes('quota') || e.message?.includes('429')) {
          setQuotaExceeded(true);
          setToast({ message: t.quota_exceeded, type: 'error' });
      } else {
          setToast({ message: "Failed to start AI Assistant", type: 'error' });
      }
    }
  };

  // --- Initialization & Database Loading ---
  useEffect(() => {
    // Load state from local "database"
    const savedRecipes = storageService.getRecipes();
    const savedPrefs = storageService.getPreferences();
    const savedIngs = storageService.getIngredients();
    const savedFocus = storageService.getFocusMode();
    const savedFavorites = storageService.getFavorites();

    if (savedRecipes.length > 0) {
      setRecipes(savedRecipes);
      setView('RESULTS');
    }
    if (savedPrefs) {
      setPreferences({ 
        ...savedPrefs, 
        units: (savedPrefs.units as UnitSystem) || 'Metric', 
        servings: savedPrefs.servings || 2 
      });
    }
    if (savedIngs) setIngredients(savedIngs);
    if (savedFavorites) setFavorites(savedFavorites);
    setFocusMode(savedFocus);
  }, []);

  useEffect(() => {
    const langObj = LANGUAGES.find(l => l.code === currentLang);
    document.dir = langObj?.dir || 'ltr';
  }, [currentLang]);

  useEffect(() => {
    if (view === 'HISTORY') {
      setHistory(storageService.getHistory());
    }
  }, [view]);

  // Request Wake Lock for Cooking Mode
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && view === 'COOKING') {
          // @ts-ignore
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake Lock error:', err);
      }
    };

    if (view === 'COOKING') {
      requestWakeLock();
    } else {
        // Cleanup live session if leaving cooking mode
        stopLiveSession();
    }

    return () => {
      if (wakeLock) wakeLock.release();
      stopLiveSession();
    };
  }, [view]);

  // --- Derived Data using Translation ---
  const mealLabels = [
    { name: t.breakfast, time: '08:00 AM', tag: t.tag_focus, mins: '10' },
    { name: t.mid_morning_snack, time: '10:30 AM', tag: t.tag_fuel, mins: '5' },
    { name: t.lunch, time: '01:00 PM', tag: t.tag_fuel, mins: '15' },
    { name: t.afternoon_snack, time: '04:00 PM', tag: t.tag_endure, mins: '5' },
    { name: t.dinner, time: '07:30 PM', tag: t.tag_rest, mins: '25' },
    { name: t.late_night_snack, time: '10:00 PM', tag: t.tag_rest, mins: '5' }
  ];

  const BOOK_CATEGORIES = [
    {
      id: 'packages',
      title: t.cat_packages || 'Meal Packages',
      icon: <ListChecks size={32} />,
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80',
      className: 'from-blue-600 to-indigo-900',
      subcategories: [t.sub_veg_package || 'Vegetarian Package', t.sub_nonveg_package || 'Non-Vegetarian Package', t.sub_mixed_package || 'Mixed Combo Package']
    },
    {
      id: 'fastfood',
      title: t.cat_fastfood,
      icon: <Pizza size={32} />,
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
      className: 'from-orange-500 to-amber-600',
      subcategories: [t.sub_burger, t.sub_pizza, t.sub_street, t.sub_sandwiches, t.sub_chips]
    },
    {
      id: 'sweets',
      title: t.cat_sweets,
      icon: <IceCream size={32} />,
      imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dabb89a?w=800&q=80',
      className: 'from-rose-500 to-pink-600',
      subcategories: [t.sub_icecream, t.sub_laddus, t.sub_halwa, t.sub_barfi, t.sub_syrup, t.sub_trad]
    },
    {
      id: 'bakery',
      title: t.cat_bakery,
      icon: <Cake size={32} />,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
      className: 'from-purple-600 to-indigo-800',
      subcategories: [t.sub_cakes, t.sub_pastries, t.sub_cookies, t.sub_pudding]
    },
    {
      id: 'beverages',
      title: t.cat_beverages,
      icon: <Coffee size={32} />, 
      imageUrl: 'https://images.unsplash.com/photo-1544787210-2213d84ad96b?w=800&q=80',
      className: 'from-amber-800 to-orange-950',
      subcategories: [t.sub_cold, t.sub_soft, t.sub_tea, t.sub_coffee, t.sub_smoothies, t.sub_mocktails]
    },
    {
      id: 'diet',
      title: t.cat_diet,
      icon: <Leaf size={32} />,
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
      className: 'from-lime-500 to-green-700',
      subcategories: [t.sub_salad, t.sub_keto, t.sub_vegan_special, t.sub_high_protein, t.sub_low_carb]
    },
    {
      id: 'main',
      title: t.cat_main,
      icon: <Utensils size={32} />,
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      className: 'from-slate-700 to-slate-900',
      subcategories: [t.sub_indian, t.sub_chinese, t.sub_italian, t.sub_mexican, t.sub_curry, t.sub_rice, t.sub_pasta]
    }
  ];

  // --- Handlers ---
  const handleGenerateRecipes = async () => {
    if (!ingredients.trim()) {
      setError(t.emptyError);
      return;
    }
    
    if (navigator.vibrate) navigator.vibrate(50);

    setLoading(true);
    setError(null);
    try {
      const generated = await generateRecipes(ingredients, preferences, currentLang);
      
      if (generated && generated.length > 0) {
        setRecipes(generated);
        storageService.saveRecipes(generated);
        storageService.saveIngredients(ingredients);
        storageService.savePreferences(preferences);
        storageService.saveHistory(generated);
        
        setShowGeneratorModal(false);
        setView('RESULTS');

        // Check for Demo ID to notify user
        if (generated[0]?.id?.startsWith('demo-')) {
            setToast({ message: "Quota reached: Showing demo meal plan", type: 'success' });
            setQuotaExceeded(true);
        }
      } else {
        throw new Error("AI returned empty menu");
      }
    } catch (e: any) {
      console.error(e);
      if (e.message === 'QUOTA_EXCEEDED') {
        setError(t.quota_exceeded);
      } else {
        setError(t.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBookCategoryClick = async (subcategory: string, append: boolean = false) => {
    if (!append) {
      setActiveSubCategory(subcategory);
      setBookRecipes([]);
      setLoading(true);
    } else {
      setBookLoadingMore(true);
    }

    try {
      const generated = await generateRecipesByCategory(subcategory, preferences, currentLang);
      setBookRecipes(prev => append ? [...prev, ...generated] : generated);
      
      if (generated[0]?.id?.startsWith('demo-')) {
          setToast({ message: "Quota reached: Showing demo recipes", type: 'success' });
          setQuotaExceeded(true);
      }

    } catch (e: any) {
      console.error(e);
      if (e.message === 'QUOTA_EXCEEDED') {
        setToast({ message: t.quota_exceeded, type: 'error' });
      }
    } finally {
      setLoading(false);
      setBookLoadingMore(false);
    }
  };

  const handleGenerateImage = async (targetRecipe?: Recipe) => {
    if (quotaExceeded) {
        setToast({ message: t.quota_exceeded, type: 'error' });
        return;
    }

    const r = targetRecipe || selectedRecipe;
    if (!r) return;
    
    if (!targetRecipe) setImageLoading(true); 
    
    try {
      const imageUrl = await generateRecipeImage(r);
      if (imageUrl) {
        // Append new image to existing images array if it exists, or create new array
        const currentImages = r.images || (r.generatedImageUrl ? [r.generatedImageUrl] : []);
        const newImages = [...currentImages, imageUrl];
        
        // Update recipe with new image array and set generatedImageUrl to latest (for backward compatibility)
        const updatedRecipe = { ...r, generatedImageUrl: imageUrl, images: newImages };
        
        if (selectedRecipe && selectedRecipe.id === r.id) setSelectedRecipe(updatedRecipe);
        
        // Update in recipes list if applicable
        if (view === 'RESULTS') {
            setRecipes(prev => prev.map(recipe => recipe.id === r.id ? updatedRecipe : recipe));
        } else if (view === 'BOOK') {
            setBookRecipes(prev => prev.map(recipe => recipe.id === r.id ? updatedRecipe : recipe));
        }

        if (favorites.some(f => f.id === r.id)) {
           const updatedFavs = favorites.map(f => f.id === r.id ? updatedRecipe : f);
           setFavorites(updatedFavs);
           storageService.saveFavorites(updatedFavs);
        }
      }
    } catch (e: any) {
      if (e.message === 'QUOTA_EXCEEDED') {
          setQuotaExceeded(true);
          setToast({ message: t.quota_exceeded, type: 'error' });
      } else {
          // Silent fail for other errors to not disturb UX
          console.warn("Silent image gen error", e);
      }
    } finally {
      if (!targetRecipe) setImageLoading(false);
    }
  };

  const handleSubstitute = async (ing: string) => {
    if (substituteLoading) return;
    setSubstituteLoading(ing);
    setActiveSubstitute(null);
    try {
      const result = await getIngredientSubstitute(ing, currentLang);
      setActiveSubstitute({ ing, text: result });
    } catch (e: any) {
      console.error(e);
    } finally {
      setSubstituteLoading(null);
    }
  };

  const handleShare = async () => {
    if (!selectedRecipe) return;
    const shareData = {
      title: selectedRecipe.title,
      text: `RecipeNest: ${selectedRecipe.title}\n\n${t.ingredients}:\n${selectedRecipe.ingredients.join('\n')}\n\n${t.instructions}:\n${selectedRecipe.instructions.join('\n')}`
    };

    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareData.text);
      setToast({ message: t.copied, type: 'success' });
    }
  };

  // Auto-generate image when entering detail view
  useEffect(() => {
    // Skip if quota already exceeded to prevent spam
    if (!quotaExceeded && view === 'DETAIL' && selectedRecipe && !selectedRecipe.generatedImageUrl && !imageLoading) {
      handleGenerateImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedRecipe?.id, quotaExceeded]);

  const handleFocusChange = (mode: 'Mood' | 'Energy') => {
    setFocusMode(mode);
    storageService.saveFocusMode(mode);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedRecipe) return;

    const isFav = favorites.some(f => f.id === selectedRecipe.id);
    let newFavs;
    if (isFav) {
      newFavs = favorites.filter(f => f.id !== selectedRecipe.id);
    } else {
      newFavs = [selectedRecipe, ...favorites];
    }
    setFavorites(newFavs);
    storageService.saveFavorites(newFavs);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const downloadRecipe = () => {
    if(!selectedRecipe) return;
    const element = document.createElement("a");
    const file = new Blob([
      `${selectedRecipe.title}\n${t.servings}: ${selectedRecipe.servings || 2}\n\n${t.ingredients}:\n${selectedRecipe.ingredients.join('\n')}\n\n${t.instructions}:\n${selectedRecipe.instructions.join('\n')}`
    ], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${selectedRecipe.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element); 
    element.click();
  };

  const clearData = () => {
    if(window.confirm(t.confirm_reset)) {
      localStorage.clear();
      setRecipes([]);
      setIngredients('');
      setFavorites([]);
      setHistory([]);
      setPreferences({ diet: DietaryPreference.NONE, allergies: '', units: 'Metric', servings: 2 });
      setView('ONBOARDING');
    }
  };

  const handleDeleteHistory = () => {
    if (window.confirm(t.confirm_delete_history)) {
      storageService.clearHistory();
      setHistory([]);
    }
  };

  const parseNutrient = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val);
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const getTotalNutrition = () => {
    if (recipes.length === 0) return { protein: 0, fat: 0, carbs: 0, calories: 0 };
    return recipes.reduce((acc, r) => ({
      protein: acc.protein + parseNutrient(r.protein),
      fat: acc.fat + parseNutrient(r.fat),
      carbs: acc.carbs + parseNutrient(r.carbs),
      calories: acc.calories + (r.calories || 0),
    }), { protein: 0, fat: 0, carbs: 0, calories: 0 });
  };

  const stats = getTotalNutrition();
  const dailyTarget = calculateDailyCalories(preferences);

  const toggleIngredient = (ing: string) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [ing]: !prev[ing]
    }));
  };

  const toggleCookingStep = (idx: number) => {
    setCookingSteps(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const toggleUnits = () => {
    const newUnits: UnitSystem = preferences.units === 'Metric' ? 'Imperial' : 'Metric';
    const newPrefs = { ...preferences, units: newUnits };
    setPreferences(newPrefs);
    storageService.savePreferences(newPrefs);
  };

  // --- Render Functions ---

  const renderRecipeList = (list: Recipe[], emptyMsg: string, context: ViewState) => (
    <div className="space-y-3">
      {list.length === 0 ? (
         <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/5 border-dashed">
             <div className="size-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                <ChefHat size={32} />
             </div>
             <p className="text-slate-400 text-sm">{emptyMsg}</p>
         </div>
      ) : (
         list.map((recipe) => {
           const displayImage = recipe.generatedImageUrl || 
             (context === 'BOOK' ? getPlaceholderForRecipe(activeBookCategory, recipe.id, recipe.title) : undefined);

           return (
             <div 
               key={recipe.id}
               onClick={() => { setSelectedRecipe(recipe); setLastView(context); setView('DETAIL'); }}
               className="bg-white/5 rounded-[2rem] border border-white/5 overflow-hidden cursor-pointer hover:bg-white/10 transition-all active:scale-[0.98] group shadow-xl"
             >
                {/* Large Image Header */}
                <div className="aspect-[16/9] relative overflow-hidden">
                   <img 
                     src={displayImage || 'https://images.unsplash.com/photo-1495195129352-aec325b55b65?w=800&q=80'} 
                     alt={recipe.title}
                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                     referrerPolicy="no-referrer"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                   
                   <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                            {recipe.cuisine || 'Recipe'}
                         </span>
                         <h4 className="font-bold text-lg text-white leading-tight">{recipe.title}</h4>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-2 py-1 flex items-center gap-1 text-white text-xs">
                         <Clock size={12} /> {recipe.readyInMinutes}m
                      </div>
                   </div>
                </div>

                <div className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t.calories}</span>
                         <span className="font-bold text-sm text-white">{recipe.calories} <span className="text-[10px] font-normal text-slate-500">kcal</span></span>
                      </div>
                      <div className="w-px h-8 bg-white/10"></div>
                      <div className="flex flex-col">
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t.protein}</span>
                         <span className="font-bold text-sm text-white">{recipe.protein}</span>
                      </div>
                   </div>
                   
                   <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background-dark transition-colors">
                      <ChevronRight size={20} />
                   </div>
                </div>
             </div>
           );
         })
      )}
      
      {/* Load More Button for Book Mode */}
      {context === 'BOOK' && list.length > 0 && activeSubCategory && (
        <Button 
          fullWidth 
          variant="outline" 
          onClick={() => handleBookCategoryClick(activeSubCategory, true)}
          loading={bookLoadingMore}
          className="mt-4 border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
        >
          <Plus size={18} /> Load More Recipes
        </Button>
      )}
    </div>
  );

  const renderCookingMode = () => {
    if (!selectedRecipe) return null;
    return (
      <div className="fixed inset-0 bg-background-light dark:bg-background-dark z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white dark:bg-background-dark shadow-sm">
           <button onClick={() => setView('DETAIL')} className="p-2 -ml-2 text-slate-600 dark:text-slate-400"><ArrowLeft /></button>
           <h3 className="font-bold text-lg truncate px-4">{selectedRecipe.title}</h3>
           <div className="w-10"></div>
        </div>
        
        {/* Live Assistant Overlay */}
        <div className={`fixed bottom-0 left-0 right-0 z-[110] p-6 bg-background-dark border-t border-white/10 transition-transform duration-500 rounded-t-3xl shadow-2xl ${isLiveActive || isLiveConnecting ? 'translate-y-0' : 'translate-y-[120%]'}`}>
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                 <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-background-dark">
                    <Volume2 size={20} />
                 </div>
              </div>
              <div className="flex-1">
                 <h4 className="font-bold text-white">AI Chef Assistant</h4>
                 <p className="text-xs text-primary">Listening & Speaking...</p>
              </div>
              <button 
                onClick={stopLiveSession}
                className="p-3 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500/30 transition-colors"
              >
                 <MicOff size={24} />
              </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pb-32 relative">
           <div className="mb-8 p-4 bg-primary/10 rounded-2xl border border-primary/20">
              <h4 className="font-bold text-primary mb-2 uppercase text-xs tracking-wider">{t.ingredients}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                 {selectedRecipe.ingredients.join(', ')}
              </p>
           </div>
           <div className="space-y-6">
              {selectedRecipe.instructions.map((step, idx) => (
                <div 
                  key={idx} 
                  onClick={() => toggleCookingStep(idx)}
                  className={`flex gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                    cookingSteps[idx] 
                      ? 'bg-emerald-500/10 border-emerald-500/20 opacity-60' 
                      : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-primary/50'
                  }`}
                >
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                      cookingSteps[idx] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-400 text-slate-400'
                   }`}>
                      {cookingSteps[idx] ? <CheckSquare size={14} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                   </div>
                   <p className={`text-sm leading-relaxed ${cookingSteps[idx] ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{step}</p>
                </div>
              ))}
           </div>
           <div className="mt-12 text-center">
              <h3 className="text-2xl font-bold font-display text-primary mb-2">Bon Appétit!</h3>
              <p className="text-slate-500 text-sm">Don't forget to take a photo of your creation.</p>
           </div>
        </div>
        
        {/* Floating Assistant Button */}
        {!isLiveActive && (
          <div className="fixed bottom-8 right-6 z-[100]">
             <button 
               onClick={startLiveSession}
               disabled={isLiveConnecting || quotaExceeded}
               className={`bg-primary text-background-dark p-4 rounded-full shadow-lg shadow-primary/30 font-bold flex items-center gap-2 transition-all ${quotaExceeded ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
             >
               {isLiveConnecting ? <RefreshCw className="animate-spin" size={24} /> : quotaExceeded ? <WifiOff size={24} /> : <Mic size={24} />}
               <span className="pr-1">{isLiveConnecting ? "Connecting..." : quotaExceeded ? "Offline" : "AI Chef"}</span>
             </button>
          </div>
        )}
      </div>
    );
  };

  const renderStatsView = () => (
    <div className="p-4 pb-24 animate-fade-in">
       <h2 className="text-2xl font-bold mb-6 font-display">{t.daily_nutrition}</h2>
       
       {dailyTarget && (
         <div className="mb-6 p-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl border border-primary/20">
            <h3 className="text-primary text-xs font-bold uppercase tracking-wider mb-2">{t.daily_goal}</h3>
            <div className="flex items-center justify-between mb-2">
               <div>
                  <span className="text-3xl font-bold text-white font-display">{stats.calories}</span>
                  <span className="text-sm text-slate-400 ml-1">/ {dailyTarget} kcal</span>
               </div>
               <div className="text-right">
                  <span className={`text-lg font-bold ${stats.calories > dailyTarget ? 'text-red-400' : 'text-emerald-400'}`}>
                    {Math.round((stats.calories / dailyTarget) * 100)}%
                  </span>
               </div>
            </div>
            {/* Progress Bar */}
            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
               <div 
                 className={`h-full rounded-full transition-all duration-1000 ${stats.calories > dailyTarget ? 'bg-red-500' : 'bg-primary'}`} 
                 style={{ width: `${Math.min(100, (stats.calories / dailyTarget) * 100)}%` }}
               ></div>
            </div>
         </div>
       )}

       {recipes.length > 0 ? (
         <div className="space-y-6">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
               <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">{t.total_intake}</h3>
               {!dailyTarget && (
                  <div className="flex items-end gap-2 mb-2">
                     <span className="text-5xl font-bold text-white font-display">{stats.calories}</span>
                     <span className="text-xl text-primary font-bold mb-1.5">kcal</span>
                  </div>
               )}
               
               <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="p-4 bg-white/5 rounded-2xl">
                     <div className="text-blue-400 font-bold text-xl mb-1">{stats.protein}g</div>
                     <div className="text-slate-500 text-xs uppercase font-bold">{t.protein}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl">
                     <div className="text-yellow-400 font-bold text-xl mb-1">{stats.carbs}g</div>
                     <div className="text-slate-500 text-xs uppercase font-bold">{t.carbs}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl">
                     <div className="text-pink-400 font-bold text-xl mb-1">{stats.fat}g</div>
                     <div className="text-slate-500 text-xs uppercase font-bold">{t.fat}</div>
                  </div>
               </div>
            </div>
         </div>
       ) : (
         <div className="text-center py-12 text-slate-500">{t.no_data}</div>
       )}
    </div>
  );

  const renderProfile = () => (
    <div className="p-4 pb-24 animate-fade-in space-y-4">
       <h2 className="text-2xl font-bold mb-2 font-display">{t.profile}</h2>
       
       <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
          <button onClick={() => setView('FAVORITES')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-200 dark:border-white/5">
             <div className="flex items-center gap-3">
                <Heart className="text-rose-500" size={20} />
                <span className="font-bold">{t.favorites}</span>
             </div>
             <ChevronRight size={18} className="text-slate-400" />
          </button>
          <button onClick={() => setView('HISTORY')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-200 dark:border-white/5">
             <div className="flex items-center gap-3">
                <History className="text-blue-500" size={20} />
                <span className="font-bold">{t.recipe_history}</span>
             </div>
             <ChevronRight size={18} className="text-slate-400" />
          </button>
          <button onClick={toggleUnits} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5">
             <div className="flex items-center gap-3">
                <Scale className="text-amber-500" size={20} />
                <span className="font-bold">{t.units}</span>
             </div>
             <span className="text-sm font-bold bg-white/10 px-2 py-1 rounded">{preferences.units}</span>
          </button>
       </div>

       {/* Personal Diet Section */}
       <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 p-4 space-y-4">
          <h3 className="text-lg font-bold font-display text-primary">{t.personal_diet}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t.age}</label>
              <input 
                 type="number"
                 value={preferences.age || ''}
                 onChange={(e) => {
                    const newPrefs = { ...preferences, age: parseInt(e.target.value) || undefined };
                    setPreferences(newPrefs);
                    storageService.savePreferences(newPrefs);
                 }}
                 className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t.gender}</label>
              <select 
                 value={preferences.gender || ''}
                 onChange={(e) => {
                    const newPrefs = { ...preferences, gender: e.target.value as Gender };
                    setPreferences(newPrefs);
                    storageService.savePreferences(newPrefs);
                 }}
                 className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary text-sm appearance-none"
              >
                 <option value="">Select</option>
                 <option value="Male">{t.male}</option>
                 <option value="Female">{t.female}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t.weight} ({preferences.units === 'Metric' ? 'kg' : 'kg'})</label>
              <input 
                 type="number"
                 placeholder="kg"
                 value={preferences.weight || ''}
                 onChange={(e) => {
                    const newPrefs = { ...preferences, weight: parseFloat(e.target.value) || undefined };
                    setPreferences(newPrefs);
                    storageService.savePreferences(newPrefs);
                 }}
                 className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t.height} ({preferences.units === 'Metric' ? 'cm' : 'cm'})</label>
              <input 
                 type="number"
                 placeholder="cm"
                 value={preferences.height || ''}
                 onChange={(e) => {
                    const newPrefs = { ...preferences, height: parseFloat(e.target.value) || undefined };
                    setPreferences(newPrefs);
                    storageService.savePreferences(newPrefs);
                 }}
                 className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t.activity}</label>
            <select 
               value={preferences.activityLevel || 'Sedentary'}
               onChange={(e) => {
                  const newPrefs = { ...preferences, activityLevel: e.target.value as ActivityLevel };
                  setPreferences(newPrefs);
                  storageService.savePreferences(newPrefs);
               }}
               className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary text-sm"
            >
               <option value="Sedentary">{t.sedentary}</option>
               <option value="Light">{t.light}</option>
               <option value="Moderate">{t.moderate}</option>
               <option value="Active">{t.active}</option>
               <option value="Very Active">{t.very_active}</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t.goal}</label>
            <div className="flex bg-slate-50 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/10">
               {(['Lose Weight', 'Maintain', 'Build Muscle'] as FitnessGoal[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                        const newPrefs = { ...preferences, goal: g };
                        setPreferences(newPrefs);
                        storageService.savePreferences(newPrefs);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${preferences.goal === g ? 'bg-primary text-background-dark shadow-sm' : 'text-slate-500 hover:text-white'}`}
                  >
                     {t[g.toLowerCase().replace(' ', '_') as keyof typeof t] || g}
                  </button>
               ))}
            </div>
          </div>
          
          {dailyTarget && (
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
               <span className="text-sm font-bold text-primary">{t.target_calories}</span>
               <span className="text-xl font-bold text-white">{dailyTarget} kcal</span>
            </div>
          )}
       </div>

       <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 p-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t.dietary}</label>
            <div className="flex flex-wrap gap-2">
               {Object.values(DietaryPreference).map(diet => (
                 <button 
                   key={diet}
                   onClick={() => {
                     const newPrefs = { ...preferences, diet };
                     setPreferences(newPrefs);
                     storageService.savePreferences(newPrefs);
                   }}
                   className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                      preferences.diet === diet ? 'bg-primary text-background-dark border-primary' : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500'
                   }`}
                 >
                   {diet}
                 </button>
               ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t.allergies}</label>
            <input 
              type="text" 
              value={preferences.allergies}
              onChange={(e) => {
                 const newPrefs = { ...preferences, allergies: e.target.value };
                 setPreferences(newPrefs);
                 storageService.savePreferences(newPrefs);
              }}
              placeholder={t.allergiesPlaceholder}
              className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary text-sm"
            />
          </div>
       </div>

       <Button fullWidth variant="outline" onClick={clearData} className="border-red-500/30 text-red-500 hover:bg-red-500/10">
          <Trash2 size={18} /> {t.reset_data}
       </Button>
    </div>
  );

  const renderDetail = () => {
    if (!selectedRecipe) return null;
    const isFav = favorites.some(f => f.id === selectedRecipe.id);
    
    return (
      <div className="pb-24 animate-in slide-in-from-right duration-300 bg-background-light dark:bg-background-dark min-h-screen relative z-10">
        <div className="sticky top-0 z-20 flex items-center justify-between p-4 bg-white/80 dark:bg-black/50 backdrop-blur-md">
           <button onClick={() => setView(lastView)} className="p-2 -ml-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
              <ArrowLeft size={24} />
           </button>
           <div className="flex items-center gap-2">
              <button onClick={toggleFavorite} className="p-2 rounded-full hover:bg-rose-500/10 transition-colors">
                 <Heart size={24} className={isFav ? "fill-rose-500 text-rose-500" : "text-slate-400"} />
              </button>
              <button onClick={handleShare} className="p-2 rounded-full hover:bg-blue-500/10 transition-colors text-slate-400 hover:text-blue-500">
                 <Share2 size={24} />
              </button>
           </div>
        </div>

        <div className="px-4">
           {/* Image Section */}
           <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl mb-6 group bg-slate-800">
              <img 
                src={selectedRecipe.generatedImageUrl || getPlaceholderForRecipe(activeBookCategory, selectedRecipe.id, selectedRecipe.title)} 
                alt={selectedRecipe.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              
              {/* Floating Action for Photo Gen if missing */}
              {!selectedRecipe.generatedImageUrl && !quotaExceeded && (
                <button 
                  onClick={() => handleGenerateImage(selectedRecipe)}
                  disabled={imageLoading}
                  className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-white/30 transition-all"
                >
                  {imageLoading ? <RefreshCw className="animate-spin" size={16}/> : <Camera size={16}/>}
                  {t.view_photos}
                </button>
              )}
              
              <div className="absolute bottom-4 left-4">
                 <span className="bg-primary text-background-dark text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider mb-2 inline-block shadow-lg">
                    {selectedRecipe.cuisine}
                 </span>
                 <h1 className="text-2xl font-bold text-white font-display leading-tight shadow-black drop-shadow-lg pr-20">
                    {selectedRecipe.title}
                 </h1>
              </div>
           </div>

           {/* Gallery if multiple images */}
           {selectedRecipe.images && selectedRecipe.images.length > 1 && (
             <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-4">
                {selectedRecipe.images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                        const updated = {...selectedRecipe, generatedImageUrl: img};
                        setSelectedRecipe(updated);
                    }}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${selectedRecipe.generatedImageUrl === img ? 'border-primary' : 'border-transparent'}`}
                  >
                     <img src={img} className="w-full h-full object-cover" />
                  </button>
                ))}
             </div>
           )}

           {/* Stats Row */}
           <div className="flex justify-between items-center mb-8 px-2">
              <div className="flex flex-col items-center">
                 <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center mb-1">
                    <Clock size={20} />
                 </div>
                 <span className="text-xs font-bold text-slate-500">{selectedRecipe.readyInMinutes}m</span>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-white/10"></div>
              <div className="flex flex-col items-center">
                 <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 text-red-500 flex items-center justify-center mb-1">
                    <Zap size={20} />
                 </div>
                 <span className="text-xs font-bold text-slate-500">{selectedRecipe.calories}</span>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-white/10"></div>
              <div className="flex flex-col items-center">
                 <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center mb-1">
                    <Users size={20} />
                 </div>
                 <span className="text-xs font-bold text-slate-500">{selectedRecipe.servings || 2}</span>
              </div>
           </div>

           {/* Description */}
           <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8 text-sm">
              {selectedRecipe.description}
           </p>

           {/* Ingredients */}
           <div className="mb-8">
              <h3 className="text-lg font-bold font-display mb-4 flex items-center justify-between">
                <span>{t.ingredients}</span>
                <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-full">
                   {selectedRecipe.ingredients.length} {t.items}
                </span>
              </h3>
              <div className="space-y-3">
                 {selectedRecipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-start justify-between group">
                       <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                          <span className="text-slate-700 dark:text-slate-200 text-sm font-medium">{ing}</span>
                       </div>
                       <button 
                         onClick={() => handleSubstitute(ing)}
                         className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold px-2 py-1 hover:bg-primary/10 rounded"
                       >
                         {substituteLoading === ing ? <RefreshCw className="animate-spin" size={12}/> : "Swap?"}
                       </button>
                    </div>
                 ))}
              </div>
              
              {/* Substitute Result */}
              {activeSubstitute && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 text-sm animate-in fade-in flex gap-2">
                   <RefreshCw size={16} className="shrink-0 mt-0.5" />
                   <div>
                     <span className="font-bold block mb-1">Substitute for {activeSubstitute.ing}:</span>
                     {activeSubstitute.text}
                   </div>
                </div>
              )}
           </div>

           {/* Instructions */}
           <div className="mb-8">
              <h3 className="text-lg font-bold font-display mb-4">{t.instructions}</h3>
              <div className="space-y-4">
                 {selectedRecipe.instructions.map((step, i) => (
                    <div 
                      key={i} 
                      className={`flex gap-4 p-3 rounded-2xl transition-colors cursor-pointer ${cookingSteps[i] ? 'bg-emerald-500/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      onClick={() => toggleCookingStep(i)}
                    >
                       <div className="flex flex-col items-center gap-1 shrink-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            cookingSteps[i] 
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                              : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                          }`}>
                             {cookingSteps[i] ? <CheckSquare size={14} /> : i + 1}
                          </div>
                          {i !== selectedRecipe.instructions.length - 1 && (
                             <div className="w-px h-full bg-slate-100 dark:bg-white/5 min-h-[20px]"></div>
                          )}
                       </div>
                       <p className={`text-sm leading-relaxed transition-all ${
                         cookingSteps[i] 
                           ? 'text-slate-400 line-through' 
                           : 'text-slate-600 dark:text-slate-300'
                       }`}>
                          {step}
                       </p>
                    </div>
                 ))}
              </div>
           </div>
           
           <div className="flex gap-3 mt-8">
              <Button fullWidth onClick={() => setView('COOKING')} className="bg-primary text-background-dark shadow-xl shadow-primary/20">
                 <Play size={20} className="fill-current" /> {t.start}
              </Button>
              <Button variant="outline" onClick={downloadRecipe} className="px-4">
                 <Download size={20} />
              </Button>
           </div>
        </div>
      </div>
    );
  };

  const renderRecipeBook = () => (
    <div className="p-4 pb-24 animate-fade-in min-h-[70vh]">
      {!activeSubCategory ? (
        <>
          {/* Header Section from Screenshot */}
          <div className="flex flex-col items-start mb-8 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#00FF9D] rounded-full flex items-center justify-center shadow-lg shadow-[#00FF9D]/20">
                <div className="relative">
                  <span className="text-black font-black text-sm leading-none">R</span>
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-black rotate-45"></div>
                </div>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">RecipeNest</h1>
            </div>
            
            <button 
              onClick={() => setShowLangSelector(true)}
              className="p-2 bg-white/5 rounded-lg border border-white/20 text-white mb-6 hover:bg-white/10 transition-colors"
            >
              <Globe size={20} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-white">{t.book}</h2>

            <div className="w-full rounded-3xl overflow-hidden mb-8 aspect-[4/3] shadow-2xl border border-white/10">
              <img 
                src="https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=1200&q=80" 
                alt="Culinary Inspiration" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {BOOK_CATEGORIES.map((cat) => (
               <div 
                 key={cat.id}
                 onClick={() => { setActiveBookCategory(cat.id); }}
                 className={`relative overflow-hidden rounded-[2rem] aspect-[4/5] cursor-pointer transition-all active:scale-95 group border border-white/10 shadow-lg ${activeBookCategory === cat.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-dark' : ''}`}
               >
                  {/* Background Image with Gradient Overlay */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={cat.imageUrl} 
                      alt={cat.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-b ${cat.className} opacity-40 mix-blend-multiply`}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  </div>

                  <div className="relative z-10 h-full flex flex-col justify-between p-4 text-white">
                     <div className="bg-white/10 w-fit p-2 rounded-2xl backdrop-blur-md border border-white/20 self-end">
                        {cat.icon}
                     </div>
                     
                     <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 mb-1">
                        <h3 className="font-bold text-lg leading-tight mb-0.5">{cat.title}</h3>
                        <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">{cat.subcategories.length} Collections</p>
                     </div>
                  </div>
               </div>
             ))}
          </div>

          {activeBookCategory && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center animate-in fade-in duration-200" onClick={() => setActiveBookCategory(null)}>
               <div className="bg-background-dark w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden"></div>
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-white">
                        {BOOK_CATEGORIES.find(c => c.id === activeBookCategory)?.title}
                     </h3>
                     <button onClick={() => setActiveBookCategory(null)} className="p-2 bg-white/10 rounded-full text-slate-400 hover:text-white"><X size={20} /></button>
                  </div>
                  <div className="space-y-2">
                     {BOOK_CATEGORIES.find(c => c.id === activeBookCategory)?.subcategories.map(sub => (
                       <button
                         key={sub}
                         onClick={() => { setActiveBookCategory(null); handleBookCategoryClick(sub); }}
                         className="w-full p-4 text-left bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-white font-medium flex justify-between items-center group transition-colors"
                       >
                         {sub}
                         <ChevronRight size={18} className="text-slate-500 group-hover:text-primary transition-colors" />
                       </button>
                     ))}
                  </div>
               </div>
            </div>
          )}
        </>
      ) : (
        <div className="animate-in slide-in-from-right">
           {/* Header Section from Screenshot */}
           <div className="flex flex-col items-start mb-2 pt-4">
             <div className="flex items-center gap-2 mb-4">
               <div className="w-8 h-8 bg-[#00FF9D] rounded-full flex items-center justify-center shadow-lg shadow-[#00FF9D]/20">
                 <div className="relative">
                   <span className="text-black font-black text-sm leading-none">R</span>
                   <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-black rotate-45"></div>
                 </div>
               </div>
               <h1 className="text-xl font-bold text-white tracking-tight">RecipeNest</h1>
             </div>
             
             <button 
               onClick={() => setShowLangSelector(true)}
               className="p-2 bg-white/5 rounded-lg border border-white/20 text-white mb-6 hover:bg-white/10 transition-colors"
             >
               <Globe size={20} />
             </button>

             <div className="flex items-center gap-2 mb-6">
                <button onClick={() => { setActiveSubCategory(null); setBookRecipes([]); }} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white">
                   <ArrowLeft size={24} />
                </button>
                <div>
                   <h2 className="text-xl font-bold font-display leading-none text-white">{activeSubCategory}</h2>
                   <span className="text-xs text-slate-500">Curated Collection</span>
                </div>
             </div>

             <div className="w-full rounded-3xl overflow-hidden mb-8 aspect-[4/3] shadow-2xl border border-white/10">
               <img 
                 src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80" 
                 alt="Collection Inspiration" 
                 className="w-full h-full object-cover"
                 referrerPolicy="no-referrer"
               />
             </div>
           </div>
           
           {loading && bookRecipes.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                <RefreshCw className="animate-spin text-primary" size={32} />
                <p className="animate-pulse">{t.curating}</p>
             </div>
           ) : activeSubCategory === t.sub_mixed_package ? (
             <div className="space-y-12">
               <div>
                 <div className="flex items-center gap-2 mb-4">
                   <div className="h-px flex-1 bg-white/10"></div>
                   <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary px-4 bg-white/5 py-1 rounded-full border border-primary/20">{t.vegetarian}</h3>
                   <div className="h-px flex-1 bg-white/10"></div>
                 </div>
                 {renderRecipeList(bookRecipes.filter(r => r.isVegetarian), t.no_recipes_book, 'BOOK')}
               </div>
               <div>
                 <div className="flex items-center gap-2 mb-4">
                   <div className="h-px flex-1 bg-white/10"></div>
                   <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-rose-500 px-4 bg-white/5 py-1 rounded-full border border-rose-500/20">{t.non_vegetarian}</h3>
                   <div className="h-px flex-1 bg-white/10"></div>
                 </div>
                 {renderRecipeList(bookRecipes.filter(r => !r.isVegetarian), t.no_recipes_book, 'BOOK')}
               </div>
             </div>
           ) : (
             renderRecipeList(bookRecipes, t.no_recipes_book, 'BOOK')
           )}
        </div>
      )}
    </div>
  );

  const renderShop = () => {
    // Collect ingredients from current plan (recipes) or user can manually add?
    // For simplicity, we aggregate from recipes.
    const allIngredients: string[] = recipes.flatMap(r => r.ingredients);
    const uniqueIngredients: string[] = Array.from(new Set(allIngredients)).sort();

    return (
      <div className="p-4 pb-24 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 font-display flex items-center justify-between">
           {t.grocery_list}
           <span className="text-sm font-normal bg-primary/10 text-primary px-3 py-1 rounded-full">{uniqueIngredients.length} items</span>
        </h2>
        
        {recipes.length === 0 ? (
           <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/5 border-dashed">
             <div className="size-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                <ListChecks size={32} />
             </div>
             <p className="text-slate-400 text-sm mb-6">{t.generate_to_see}</p>
             <Button onClick={() => setShowGeneratorModal(true)} className="bg-primary text-background-dark font-bold mx-auto">
               {t.create_plan}
             </Button>
           </div>
        ) : (
           <div className="space-y-2">
              {uniqueIngredients.map((ing, i) => (
                <div 
                  key={i} 
                  onClick={() => toggleIngredient(ing)}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                    checkedIngredients[ing] 
                      ? 'bg-emerald-500/5 border-emerald-500/10 opacity-50' 
                      : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-primary/50'
                  }`}
                >
                   <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
                      checkedIngredients[ing] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                   }`}>
                      {checkedIngredients[ing] && <CheckSquare size={16} />}
                   </div>
                   <span className={`flex-1 font-medium ${checkedIngredients[ing] ? 'line-through text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {ing}
                   </span>
                </div>
              ))}
              
              <div className="pt-6">
                 <Button 
                   fullWidth 
                   variant="outline" 
                   onClick={() => {
                      const text = uniqueIngredients.map(i => `- [${checkedIngredients[i] ? 'x' : ' '}] ${i}`).join('\n');
                      navigator.clipboard.writeText(text);
                      setToast({ message: t.copied, type: 'success' });
                   }}
                   className="border-slate-200 dark:border-white/10"
                 >
                    <Share2 size={18} /> Copy List
                 </Button>
              </div>
           </div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div className="p-4 pb-24 animate-fade-in">
       {/* Header Section from Screenshot */}
       <div className="flex flex-col items-start mb-2 pt-4">
         <div className="flex items-center gap-2 mb-4">
           <div className="w-8 h-8 bg-[#00FF9D] rounded-full flex items-center justify-center shadow-lg shadow-[#00FF9D]/20">
             <div className="relative">
               <span className="text-black font-black text-sm leading-none">R</span>
               <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-black rotate-45"></div>
             </div>
           </div>
           <h1 className="text-xl font-bold text-white tracking-tight">RecipeNest</h1>
         </div>
         
         <button 
           onClick={() => setShowLangSelector(true)}
           className="p-2 bg-white/5 rounded-lg border border-white/20 text-white mb-6 hover:bg-white/10 transition-colors"
         >
           <Globe size={20} />
         </button>

         <h2 className="text-2xl font-bold mb-6 text-white">{t.recipe_history}</h2>

         <div className="w-full rounded-3xl overflow-hidden mb-2 aspect-[4/3] shadow-2xl border border-white/10">
           <img 
             src="https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=1200&q=80" 
             alt="Culinary History" 
             className="w-full h-full object-cover"
             referrerPolicy="no-referrer"
           />
         </div>
       </div>

       <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold font-display">{t.total_intake}</h3>
          {history.length > 0 && (
            <button onClick={handleDeleteHistory} className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-colors">
               <Trash2 size={20} />
            </button>
          )}
       </div>

       {history.length === 0 ? (
          <div className="text-center py-12 text-slate-500">{t.no_data}</div>
       ) : (
          <div className="space-y-4">
             {history.map((item, i) => (
                <div 
                  key={item.timestamp}
                  onClick={() => {
                     setRecipes(item.recipes);
                     setToast({ message: "Plan restored from history", type: 'success' });
                     setView('RESULTS');
                  }}
                  className="bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/5 cursor-pointer hover:border-primary/50 transition-colors"
                >
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded">
                         {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   </div>
                   <div className="space-y-1">
                      {item.recipes.map(r => (
                         <div key={r.id} className="text-sm text-slate-700 dark:text-slate-300 truncate">• {r.title}</div>
                      ))}
                   </div>
                </div>
             ))}
          </div>
       )}
    </div>
  );

  const renderFavorites = () => (
    <div className="p-4 pb-24 animate-fade-in">
       {/* Header Section from Screenshot */}
       <div className="flex flex-col items-start mb-2 pt-4">
         <div className="flex items-center gap-2 mb-4">
           <div className="w-8 h-8 bg-[#00FF9D] rounded-full flex items-center justify-center shadow-lg shadow-[#00FF9D]/20">
             <div className="relative">
               <span className="text-black font-black text-sm leading-none">R</span>
               <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-black rotate-45"></div>
             </div>
           </div>
           <h1 className="text-xl font-bold text-white tracking-tight">RecipeNest</h1>
         </div>
         
         <button 
           onClick={() => setShowLangSelector(true)}
           className="p-2 bg-white/5 rounded-lg border border-white/20 text-white mb-6 hover:bg-white/10 transition-colors"
         >
           <Globe size={20} />
         </button>

         <h2 className="text-2xl font-bold mb-6 text-white">{t.favorites}</h2>

         <div className="w-full rounded-3xl overflow-hidden mb-2 aspect-[4/3] shadow-2xl border border-white/10">
           <img 
             src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80" 
             alt="Favorite Recipes" 
             className="w-full h-full object-cover"
             referrerPolicy="no-referrer"
           />
         </div>
       </div>

       {renderRecipeList(favorites, t.no_data, 'FAVORITES')}
    </div>
  );

  const renderPlan = () => (
    <div className="p-4 space-y-6 pb-24 animate-fade-in">
       {/* Header Section from Screenshot */}
       <div className="flex flex-col items-start mb-2 pt-4">
         <div className="flex items-center gap-2 mb-4">
           <div className="w-8 h-8 bg-[#00FF9D] rounded-full flex items-center justify-center shadow-lg shadow-[#00FF9D]/20">
             <div className="relative">
               <span className="text-black font-black text-sm leading-none">R</span>
               <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-black rotate-45"></div>
             </div>
           </div>
           <h1 className="text-xl font-bold text-white tracking-tight">RecipeNest</h1>
         </div>
         
         <button 
           onClick={() => setShowLangSelector(true)}
           className="p-2 bg-white/5 rounded-lg border border-white/20 text-white mb-6 hover:bg-white/10 transition-colors"
         >
           <Globe size={20} />
         </button>

         <h2 className="text-2xl font-bold mb-6 text-white">{t.plan}</h2>

         <div className="w-full rounded-3xl overflow-hidden mb-2 aspect-[4/3] shadow-2xl border border-white/10">
           <img 
             src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=80" 
             alt="Culinary Inspiration" 
             className="w-full h-full object-cover"
             referrerPolicy="no-referrer"
           />
         </div>
       </div>

       {/* AI Insight Card */}
       <div className="rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 border border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <Sparkles size={80} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary text-background-dark text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t.insight}</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 font-display">
              {focusMode === 'Mood' ? t.mood_title : t.energy_title}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {focusMode === 'Mood' ? t.mood_desc : t.energy_desc}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4 font-display flex items-center gap-2">
            {t.protocol} <span className="text-slate-500 text-sm font-normal">({recipes.length})</span>
          </h3>
          
          {recipes.length > 0 ? (
            <div className="space-y-3">
              {recipes.map((recipe, index) => {
                const label = mealLabels[index] || { name: 'Meal', time: '--:--', tag: 'Meal', mins: '20' };
                return (
                  <div 
                    key={recipe.id}
                    onClick={() => { setSelectedRecipe(recipe); setLastView('RESULTS'); setView('DETAIL'); }}
                    className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 overflow-hidden cursor-pointer hover:bg-white/10 transition-all active:scale-[0.98] group shadow-xl"
                  >
                    {/* Large Image Header */}
                    <div className="aspect-[16/9] relative overflow-hidden">
                       <img 
                         src={recipe.generatedImageUrl || 'https://images.unsplash.com/photo-1495195129352-aec325b55b65?w=800&q=80'} 
                         alt={recipe.title}
                         className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                         referrerPolicy="no-referrer"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                       
                       <div className="absolute top-4 left-4">
                          <div className="bg-primary text-background-dark text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                             {label.name}
                          </div>
                       </div>

                       <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                          <div className="flex flex-col">
                             <span className="text-[10px] text-slate-300 font-medium mb-1">{label.time}</span>
                             <h4 className="font-bold text-lg text-white leading-tight">{recipe.title}</h4>
                          </div>
                          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-2 py-1 flex items-center gap-1 text-white text-xs">
                             <Clock size={12} /> {recipe.readyInMinutes}m
                          </div>
                       </div>
                    </div>

                    <div className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                             <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t.calories}</span>
                             <span className="font-bold text-sm text-slate-900 dark:text-white">{recipe.calories} <span className="text-[10px] font-normal text-slate-500">kcal</span></span>
                          </div>
                          <div className="w-px h-8 bg-slate-100 dark:bg-white/10"></div>
                          <div className="flex flex-col">
                             <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t.protein}</span>
                             <span className="font-bold text-sm text-slate-900 dark:text-white">{recipe.protein}</span>
                          </div>
                       </div>
                       
                       <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background-dark transition-colors">
                          <ChevronRight size={20} />
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 bg-white/5 rounded-3xl border border-white/5 border-dashed">
               <div className="size-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <ChefHat size={32} />
               </div>
               <p className="text-slate-400 text-sm mb-6">{t.no_plan}</p>
               <Button onClick={() => setShowGeneratorModal(true)} className="bg-primary text-background-dark font-bold mx-auto">
                 {t.create_plan}
               </Button>
            </div>
          )}
        </div>
    </div>
  );

  return (
    <div 
      className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white pb-32 font-sans selection:bg-primary selection:text-background-dark overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {showLangSelector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-background-dark border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white font-display">{t.language}</h3>
                <button onClick={() => setShowLangSelector(false)}><X size={24} className="text-slate-400" /></button>
             </div>
             <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setCurrentLang(lang.code); setShowLangSelector(false); }}
                  className={`p-3 rounded-xl text-center border transition-all ${
                    currentLang === lang.code ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 text-slate-400'
                  }`}
                >
                  <div className="font-bold">{lang.nativeName}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <GeneratorModal 
        show={showGeneratorModal}
        onClose={() => setShowGeneratorModal(false)}
        ingredients={ingredients}
        setIngredients={setIngredients}
        preferences={preferences}
        setPreferences={setPreferences}
        onGenerate={handleGenerateRecipes}
        loading={loading}
        error={error}
        t={t}
      />
      {view === 'DETAIL' && renderDetail()}
      {view === 'COOKING' && renderCookingMode()}

      {/* Main Header */}
      <div className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 ios-blur border-b border-transparent dark:border-white/5 pt-safe-top">
        <div className="flex items-center px-4 py-3 justify-between">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
             <RecipeNestLogo className="w-full h-full" />
          </div>
          <h2 className="text-lg font-bold leading-tight font-display tracking-tight">{t.appName}</h2>
          <button onClick={() => setShowLangSelector(true)} className="size-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
             <Globe size={20} />
          </button>
        </div>
        
        {isPlanView && (
          <div className="px-4 pb-4 animate-fade-in">
            <div className="flex h-12 items-center justify-center rounded-2xl bg-slate-200 dark:bg-white/5 p-1.5 relative">
              <button 
                onClick={() => handleFocusChange('Mood')} 
                className={`flex-1 flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 h-full z-10 ${focusMode === 'Mood' ? 'text-background-dark' : 'text-slate-500'}`}
              >
                {t.mood_mode}
              </button>
              <button 
                onClick={() => handleFocusChange('Energy')} 
                className={`flex-1 flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 h-full z-10 ${focusMode === 'Energy' ? 'text-background-dark' : 'text-slate-500'}`}
              >
                {t.energy_mode}
              </button>
              
              <div 
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-primary rounded-xl shadow-lg transition-transform duration-300 ease-out ${focusMode === 'Energy' ? 'translate-x-[100%] left-1.5' : 'left-1.5'}`}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div className="min-h-[60vh]">
         {isPlanView && renderPlan()}
         {view === 'BOOK' && renderRecipeBook()}
         {view === 'SHOP' && renderShop()}
         {view === 'STATS' && renderStatsView()}
         {view === 'PROFILE' && renderProfile()}
         {view === 'HISTORY' && renderHistory()}
         {view === 'FAVORITES' && renderFavorites()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#0d1814]/95 ios-blur border-t border-slate-200 dark:border-white/5 px-6 pb-8 pt-4 flex items-center justify-between z-50">
        <button 
          onClick={() => setView('RESULTS')}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${isPlanView ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
        >
          <Menu size={22} className={isPlanView ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-[10px] font-bold">{t.plan}</span>
        </button>
        
        <button 
          onClick={() => setView('BOOK')}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${view === 'BOOK' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
        >
          <BookOpen size={22} className={view === 'BOOK' ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-[10px] font-bold">{t.book}</span>
        </button>

        <button 
          onClick={() => setView('STATS')}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${view === 'STATS' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
        >
          <BarChart size={22} className={view === 'STATS' ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-[10px] font-bold">{t.stats}</span>
        </button>
        
        <div className="-mt-12">
          <button 
            onClick={() => setShowGeneratorModal(true)}
            className="size-16 bg-primary text-background-dark rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-[6px] border-background-light dark:border-background-dark transform transition-transform active:scale-95"
          >
            <Sparkles size={28} className="fill-current" />
          </button>
        </div>

        <button 
          onClick={() => setView('SHOP')}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${view === 'SHOP' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
        >
          <ListChecks size={22} className={view === 'SHOP' ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-[10px] font-bold">{t.shop}</span>
        </button>
        
        <button 
          onClick={() => setView('PROFILE')}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${view === 'PROFILE' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
        >
          <User size={22} className={view === 'PROFILE' ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-[10px] font-bold">{t.profile}</span>
        </button>
      </div>
    </div>
  );
};

export default App;