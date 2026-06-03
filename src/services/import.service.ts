import type { ImportedExercise, ImportedNutrition } from '@/types';

// =============================================
// XLSX Import
// =============================================
export async function parseExcelFile(file: File): Promise<{
  exercises: ImportedExercise[];
  nutrition: ImportedNutrition[];
}> {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const exercises: ImportedExercise[] = [];
  const nutrition: ImportedNutrition[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const sheetLower = sheetName.toLowerCase();

    if (sheetLower.includes('nutrici') || sheetLower.includes('comida') || sheetLower.includes('food')) {
      for (const row of rows) {
        const item: ImportedNutrition = {
          meal_name: row['Comida'] || row['Food'] || row['Meal'] || `Comida importada`,
          calories: parseInt(row['Calorías'] || row['Calories'] || row['kcal'] || 0),
          protein: parseFloat(row['Proteína'] || row['Protein'] || 0),
          carbs: parseFloat(row['Carbohidratos'] || row['Carbs'] || 0),
          fat: parseFloat(row['Grasa'] || row['Fat'] || 0),
        };
        if (item.calories > 0) nutrition.push(item);
      }
    } else {
      // Asumir ejercicios
      for (const row of rows) {
        const ex: ImportedExercise = {
          name: row['Ejercicio'] || row['Exercise'] || row['Nombre'] || `Ejercicio ${exercises.length + 1}`,
          sets: parseInt(row['Series'] || row['Sets'] || 3),
          reps: String(row['Reps'] || row['Repeticiones'] || '8-12'),
          weight: parseFloat(row['Peso'] || row['Weight'] || row['Kg'] || 0) || undefined,
          notes: row['Notas'] || row['Notes'] || undefined,
        };
        if (ex.name) exercises.push(ex);
      }
    }
  }

  return { exercises, nutrition };
}

// =============================================
// PDF Import
// =============================================
export async function parsePDFFile(file: File): Promise<{
  exercises: ImportedExercise[];
  nutrition: ImportedNutrition[];
  rawText: string;
}> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let rawText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    rawText += pageText + '\n';
  }

  const exercises = extractExercisesFromText(rawText);
  const nutrition = extractNutritionFromText(rawText);

  return { exercises, nutrition, rawText };
}

function extractExercisesFromText(text: string): ImportedExercise[] {
  const exercises: ImportedExercise[] = [];
  const lines = text.split('\n');

  // Patrones: "Press de Banca: 4x10 @ 80kg", "Sentadilla 3 series 8-10 reps"
  const exPattern = /([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)[\s:]+(\d+)[xX×](\d+(?:-\d+)?)\s*(?:@|kg|lb)?\s*(\d+(?:\.\d+)?)?/g;

  let match;
  while ((match = exPattern.exec(text)) !== null) {
    exercises.push({
      name: match[1].trim(),
      sets: parseInt(match[2]),
      reps: match[3],
      weight: match[4] ? parseFloat(match[4]) : undefined,
    });
  }

  return exercises.slice(0, 30); // Máximo 30
}

function extractNutritionFromText(text: string): ImportedNutrition[] {
  const nutrition: ImportedNutrition[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const calMatch = line.match(/(\d+)\s*(kcal|cal|calorías?)/i);
    if (calMatch) {
      const protMatch = line.match(/(\d+(?:\.\d+)?)\s*g?\s*(proteína|protein)/i);
      const carbMatch = line.match(/(\d+(?:\.\d+)?)\s*g?\s*(carbs?|carbohidrato)/i);
      const fatMatch = line.match(/(\d+(?:\.\d+)?)\s*g?\s*(grasa|fat)/i);

      const item: ImportedNutrition = {
        meal_name: line.substring(0, 40).trim() || 'Comida importada',
        calories: parseInt(calMatch[1]),
        protein: protMatch ? parseFloat(protMatch[1]) : undefined,
        carbs: carbMatch ? parseFloat(carbMatch[1]) : undefined,
        fat: fatMatch ? parseFloat(fatMatch[1]) : undefined,
      };

      if (item.calories > 0) nutrition.push(item);
    }
  }

  return nutrition.slice(0, 20);
}
