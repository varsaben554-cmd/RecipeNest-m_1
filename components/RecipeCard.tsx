import React from 'react';
import { Recipe } from '../types';
import { Clock, Flame, ChefHat } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-sage-100 flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className="inline-block px-3 py-1 bg-sage-100 text-sage-600 text-xs font-bold uppercase tracking-wider rounded-full">
            {recipe.cuisine}
          </span>
        </div>
        <h3 className="text-xl font-serif font-bold text-sage-800 mb-2 group-hover:text-terracotta-500 transition-colors">
          {recipe.title}
        </h3>
        <p className="text-sage-600 text-sm line-clamp-3 mb-4">
          {recipe.description}
        </p>
      </div>

      <div className="flex items-center justify-between text-sage-500 text-sm border-t border-sage-50 pt-4 mt-auto">
        <div className="flex items-center gap-1">
          <Clock size={16} />
          <span>{recipe.readyInMinutes}m</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame size={16} />
          <span>{recipe.calories} kcal</span>
        </div>
        <div className="flex items-center gap-1">
          <ChefHat size={16} />
          <span>{recipe.ingredients.length} ings</span>
        </div>
      </div>
    </div>
  );
};