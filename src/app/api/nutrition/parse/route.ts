import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `Eres un nutricionista experto. El usuario te va a dar una descripción en lenguaje natural de alimentos que comió.

Tu tarea es extraer cada alimento con sus macronutrientes y devolver SOLO un JSON válido, sin texto adicional, sin markdown, sin backticks.

Reglas:
- Si el usuario no especifica la cantidad, asumí una porción estándar razonable
- Redondea todos los números a 1 decimal
- Las calorías son kcal
- Proteína, carbos y grasa en gramos
- Si hay ambigüedad (ej: "arroz" puede ser blanco o integral), usá el más común (arroz blanco cocido)
- Si el usuario menciona una preparación (ej: "pollo a la plancha"), calculá para la preparación más simple sin aceite extra salvo que lo mencione
- Para bebidas alcohólicas, calculá calorías del alcohol también

Formato de respuesta (SOLO esto, sin nada más):
{
  "foods": [
    {
      "name": "nombre del alimento",
      "quantity": "300g",
      "calories": 390,
      "protein": 7.2,
      "carbs": 85.1,
      "fat": 0.9
    }
  ],
  "totals": {
    "calories": 390,
    "protein": 7.2,
    "carbs": 85.1,
    "fat": 0.9
  },
  "notes": "nota opcional si hay algo ambiguo o importante"
}`;

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json({ error: "Input vacío" }, { status: 400 });
    }

    if (input.length > 500) {
      return NextResponse.json({ error: "El texto es demasiado largo (máx 500 caracteres)" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: input.trim() }],
    });

    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "No pude interpretar ese alimento. Intentá ser más específico." }, { status: 422 });
    }

    if (!parsed.foods || !Array.isArray(parsed.foods) || parsed.foods.length === 0) {
      return NextResponse.json({ error: "No encontré alimentos en lo que escribiste." }, { status: 422 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Nutrition parse error:", error);
    return NextResponse.json({ error: "Error al procesar. Intentá de nuevo." }, { status: 500 });
  }
}