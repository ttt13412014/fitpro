// src/lib/nutrition-calculator.ts
// Base de datos local de alimentos con macros por 100g

export interface FoodMacros {
  name: string;
  aliases: string[];
  calories: number; // kcal por 100g
  protein: number;  // g por 100g
  carbs: number;    // g por 100g
  fat: number;      // g por 100g
}

export interface ParsedFood {
  name: string;
  quantity: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ParseResult {
  foods: ParsedFood[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  notes?: string;
}

// Base de datos de alimentos (macros por 100g)
const FOOD_DB: FoodMacros[] = [
  // Cereales y harinas
  { name: "Arroz blanco cocido", aliases: ["arroz", "arroz blanco", "arroz cocido"], calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Arroz integral cocido", aliases: ["arroz integral"], calories: 123, protein: 2.7, carbs: 25, fat: 1 },
  { name: "Avena", aliases: ["avena", "copos de avena", "harina de avena"], calories: 389, protein: 17, carbs: 66, fat: 7 },
  { name: "Pan blanco", aliases: ["pan", "pan blanco", "pan lactal", "pan de mesa"], calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  { name: "Pan integral", aliases: ["pan integral", "pan negro"], calories: 247, protein: 13, carbs: 41, fat: 4.2 },
  { name: "Pasta cocida", aliases: ["pasta", "fideos", "fideos cocidos", "tallarines", "spaghetti", "espagueti"], calories: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { name: "Papa cocida", aliases: ["papa", "papas", "patata", "papa cocida", "papa hervida"], calories: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  { name: "Batata cocida", aliases: ["batata", "camote", "boniato"], calories: 90, protein: 2, carbs: 21, fat: 0.1 },
  { name: "Harina de trigo", aliases: ["harina", "harina de trigo"], calories: 364, protein: 10, carbs: 76, fat: 1 },
  { name: "Quinoa cocida", aliases: ["quinoa", "quinua"], calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },

  // Carnes y proteínas
  { name: "Pechuga de pollo", aliases: ["pechuga", "pollo", "pechuga de pollo", "pollo cocido", "pollo a la plancha", "pollo grillado"], calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Muslo de pollo", aliases: ["muslo", "pata", "muslo de pollo"], calories: 209, protein: 26, carbs: 0, fat: 11 },
  { name: "Carne vacuna magra", aliases: ["carne", "carne vacuna", "bife", "lomo", "nalga", "cuadril", "carne magra"], calories: 250, protein: 26, carbs: 0, fat: 15 },
  { name: "Carne picada", aliases: ["carne picada", "picada"], calories: 280, protein: 24, carbs: 0, fat: 20 },
  { name: "Atún al agua", aliases: ["atun", "atún", "atún al agua", "atun al agua"], calories: 116, protein: 26, carbs: 0, fat: 1 },
  { name: "Salmón", aliases: ["salmon", "salmón"], calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Huevo entero", aliases: ["huevo", "huevos"], calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: "Clara de huevo", aliases: ["clara", "claras"], calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { name: "Cerdo magro", aliases: ["cerdo", "lomo de cerdo"], calories: 242, protein: 27, carbs: 0, fat: 14 },
  { name: "Pavo", aliases: ["pavo", "pechuga de pavo"], calories: 189, protein: 29, carbs: 0, fat: 7.4 },

  // Lácteos
  { name: "Leche entera", aliases: ["leche", "leche entera"], calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { name: "Leche descremada", aliases: ["leche descremada", "leche desnatada"], calories: 35, protein: 3.4, carbs: 5, fat: 0.1 },
  { name: "Yogur natural", aliases: ["yogur", "yoghurt", "yogurt"], calories: 59, protein: 3.5, carbs: 4.7, fat: 3.3 },
  { name: "Yogur griego", aliases: ["yogur griego", "yoghurt griego"], calories: 100, protein: 9, carbs: 3.6, fat: 5 },
  { name: "Queso cremoso", aliases: ["queso", "queso cremoso", "queso blanco"], calories: 300, protein: 18, carbs: 2.5, fat: 24 },
  { name: "Queso rallado", aliases: ["queso rallado", "parmesano"], calories: 420, protein: 38, carbs: 3.2, fat: 29 },
  { name: "Ricota", aliases: ["ricota", "ricotta"], calories: 174, protein: 11, carbs: 3, fat: 13 },
  { name: "Requesón", aliases: ["cottage", "queso cottage"], calories: 98, protein: 11, carbs: 3.4, fat: 4.3 },

  // Legumbres
  { name: "Lentejas cocidas", aliases: ["lentejas", "lenteja"], calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: "Porotos cocidos", aliases: ["porotos", "frijoles", "judías", "alubias"], calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5 },
  { name: "Garbanzos cocidos", aliases: ["garbanzos", "garbanzo"], calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },

  // Frutas
  { name: "Banana", aliases: ["banana", "banano", "plátano"], calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: "Manzana", aliases: ["manzana"], calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: "Naranja", aliases: ["naranja"], calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  { name: "Frutilla", aliases: ["frutilla", "fresa"], calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { name: "Uva", aliases: ["uva", "uvas"], calories: 69, protein: 0.7, carbs: 18, fat: 0.2 },
  { name: "Pera", aliases: ["pera"], calories: 57, protein: 0.4, carbs: 15, fat: 0.1 },
  { name: "Durazno", aliases: ["durazno", "melocotón"], calories: 39, protein: 0.9, carbs: 10, fat: 0.3 },
  { name: "Sandía", aliases: ["sandía", "sandia"], calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2 },
  { name: "Melón", aliases: ["melón", "melon"], calories: 34, protein: 0.8, carbs: 8, fat: 0.2 },

  // Verduras
  { name: "Brócoli", aliases: ["brocoli", "brócoli"], calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: "Espinaca", aliases: ["espinaca", "espinacas"], calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: "Tomate", aliases: ["tomate", "tomates"], calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: "Lechuga", aliases: ["lechuga"], calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  { name: "Zanahoria", aliases: ["zanahoria", "zanahorias"], calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  { name: "Calabaza", aliases: ["calabaza", "zapallo"], calories: 26, protein: 1, carbs: 6.5, fat: 0.1 },
  { name: "Cebolla", aliases: ["cebolla"], calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  { name: "Ajo", aliases: ["ajo"], calories: 149, protein: 6.4, carbs: 33, fat: 0.5 },
  { name: "Choclo", aliases: ["choclo", "maíz", "maiz", "elote"], calories: 86, protein: 3.2, carbs: 19, fat: 1.2 },

  // Grasas y aceites
  { name: "Aceite de oliva", aliases: ["aceite", "aceite de oliva", "aceite oliva"], calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: "Manteca", aliases: ["manteca", "mantequilla"], calories: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  { name: "Maní", aliases: ["maní", "mani", "cacahuate", "cacahuetes"], calories: 567, protein: 26, carbs: 16, fat: 49 },
  { name: "Manteca de maní", aliases: ["manteca de mani", "crema de mani", "peanut butter"], calories: 588, protein: 25, carbs: 20, fat: 50 },
  { name: "Almendra", aliases: ["almendra", "almendras"], calories: 579, protein: 21, carbs: 22, fat: 50 },
  { name: "Nuez", aliases: ["nuez", "nueces"], calories: 654, protein: 15, carbs: 14, fat: 65 },
  { name: "Palta", aliases: ["palta", "aguacate", "avocado"], calories: 160, protein: 2, carbs: 9, fat: 15 },

  // Suplementos y proteínas
  { name: "Proteína whey", aliases: ["whey", "proteina", "proteína", "suplemento proteico"], calories: 370, protein: 80, carbs: 7, fat: 4 },

  // Otros
  { name: "Azúcar", aliases: ["azucar", "azúcar"], calories: 387, protein: 0, carbs: 100, fat: 0 },
  { name: "Miel", aliases: ["miel"], calories: 304, protein: 0.3, carbs: 82, fat: 0 },
  { name: "Chocolate negro", aliases: ["chocolate", "chocolate negro"], calories: 546, protein: 5, carbs: 60, fat: 31 },
];

// Unidades y sus equivalencias en gramos
const UNIT_TO_GRAMS: Record<string, number> = {
  // Peso
  "g": 1, "gr": 1, "grs": 1, "gramo": 1, "gramos": 1,
  "kg": 1000, "kilo": 1000, "kilos": 1000,
  "mg": 0.001,
  // Volumen (para líquidos ~1g/ml)
  "ml": 1, "cc": 1, "l": 1000, "litro": 1000, "litros": 1000,
  // Medidas caseras
  "taza": 240, "tazas": 240,
  "cucharada": 15, "cucharadas": 15, "cda": 15, "cdas": 15,
  "cucharadita": 5, "cucharaditas": 5, "cdita": 5, "cditas": 5,
  // Porciones
  "porcion": 100, "porción": 100, "porciones": 100,
  "unidad": 100, "unidades": 100,
};

// Equivalencias especiales por alimento (cuando dicen "1 huevo", "2 bananas")
const UNIT_OVERRIDES: Record<string, number> = {
  "huevo": 60,    // 1 huevo = 60g
  "huevos": 60,
  "banana": 120,  // 1 banana = 120g
  "bananas": 120,
  "manzana": 150,
  "manzanas": 150,
  "naranja": 130,
  "naranjas": 130,
  "pera": 150,
  "peras": 150,
};

// Busca el alimento en la base de datos
function findFood(text: string): FoodMacros | null {
  const lower = text.toLowerCase().trim();
  
  // Búsqueda exacta por alias
  for (const food of FOOD_DB) {
    for (const alias of food.aliases) {
      if (lower === alias.toLowerCase()) return food;
    }
  }
  
  // Búsqueda parcial
  for (const food of FOOD_DB) {
    for (const alias of food.aliases) {
      if (lower.includes(alias.toLowerCase()) || alias.toLowerCase().includes(lower)) {
        return food;
      }
    }
  }
  
  return null;
}

// Parsea una cantidad como "300g", "2 tazas", "1/2 kg"
function parseQuantity(text: string, foodName: string): { grams: number; display: string } {
  const lower = text.toLowerCase().trim();
  
  // Fracciones: 1/2, 1/4, etc.
  const fractionMatch = lower.match(/(\d+)\/(\d+)/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
    // Busca unidad después de la fracción
    const rest = lower.replace(fractionMatch[0], "").trim();
    const unit = Object.keys(UNIT_TO_GRAMS).find(u => rest.startsWith(u));
    const grams = unit ? num * UNIT_TO_GRAMS[unit] : num * 100;
    return { grams, display: `${fractionMatch[0]}${unit ? " " + unit : ""}` };
  }
  
  // Número + unidad: "300g", "2 tazas", "1.5 kg"
  const numUnitMatch = lower.match(/^(\d+(?:[.,]\d+)?)\s*([a-záéíóúü]+)?/);
  if (numUnitMatch) {
    const num = parseFloat(numUnitMatch[1].replace(",", "."));
    const unit = numUnitMatch[2]?.toLowerCase() || "";
    
    // Override por tipo de alimento (ej: "2 huevos")
    const foodLower = foodName.toLowerCase();
    for (const [key, gramsPerUnit] of Object.entries(UNIT_OVERRIDES)) {
      if (foodLower.includes(key)) {
        if (!unit || unit === key) {
          return { grams: num * gramsPerUnit, display: `${num} ${key}` };
        }
      }
    }
    
    // Unidad conocida
    if (unit && UNIT_TO_GRAMS[unit]) {
      return { grams: num * UNIT_TO_GRAMS[unit], display: `${num}${unit}` };
    }
    
    // Solo número → asumimos gramos
    return { grams: num, display: `${num}g` };
  }
  
  return { grams: 100, display: "100g" };
}

// Parser principal: convierte texto libre a macros
export function calculateMacros(input: string): ParseResult {
  const foods: ParsedFood[] = [];
  
  // Separar por comas, "y", "con", "+"
  const parts = input
    .split(/,|\sy\s|\scon\s|\+/i)
    .map(p => p.trim())
    .filter(Boolean);
  
  for (const part of parts) {
    // Intentar extraer cantidad y alimento
    // Patrones: "300g de arroz", "2 huevos", "1 taza avena"
    const patterns = [
      /^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*([a-záéíóúü]+)?\s+(?:de\s+)?(.+)$/i,  // "300g de arroz"
      /^(\d+(?:[.,]\d+)?)\s+(.+)$/i,  // "2 huevos"
      /^(.+)\s+(\d+(?:[.,]\d+)?)\s*([a-záéíóúü]+)$/i,  // "arroz 300g"
    ];
    
    let matched = false;
    
    for (const pattern of patterns) {
      const match = part.match(pattern);
      if (match) {
        let quantityStr: string;
        let foodStr: string;
        
        if (pattern === patterns[2]) {
          // "arroz 300g"
          foodStr = match[1].trim();
          quantityStr = match[2] + (match[3] || "");
        } else if (pattern === patterns[1]) {
          // "2 huevos"
          quantityStr = match[1];
          foodStr = match[2].trim();
        } else {
          // "300g de arroz"
          quantityStr = match[1] + (match[2] || "");
          foodStr = match[3].trim();
        }
        
        const food = findFood(foodStr);
        if (food) {
          const { grams, display } = parseQuantity(quantityStr, foodStr);
          const factor = grams / 100;
          
          foods.push({
            name: food.name,
            quantity: display,
            grams,
            calories: Math.round(food.calories * factor * 10) / 10,
            protein: Math.round(food.protein * factor * 10) / 10,
            carbs: Math.round(food.carbs * factor * 10) / 10,
            fat: Math.round(food.fat * factor * 10) / 10,
          });
          matched = true;
          break;
        }
      }
    }
    
    // Si no matcheó con patrón, intentar buscar solo el alimento
    if (!matched) {
      const food = findFood(part);
      if (food) {
        foods.push({
          name: food.name,
          quantity: "100g",
          grams: 100,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        });
      }
    }
  }
  
  const totals = foods.reduce(
    (acc, f) => ({
      calories: Math.round((acc.calories + f.calories) * 10) / 10,
      protein: Math.round((acc.protein + f.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + f.carbs) * 10) / 10,
      fat: Math.round((acc.fat + f.fat) * 10) / 10,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  
  return { foods, totals };
}

// Lista de alimentos disponibles (para sugerencias)
export function searchFoods(query: string): string[] {
  const lower = query.toLowerCase();
  const results: string[] = [];
  
  for (const food of FOOD_DB) {
    for (const alias of food.aliases) {
      if (alias.toLowerCase().includes(lower) && !results.includes(food.name)) {
        results.push(food.name);
        break;
      }
    }
  }
  
  return results.slice(0, 5);
}
