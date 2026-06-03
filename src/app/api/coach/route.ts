import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { response: 'La API key de Anthropic no está configurada. Agregá ANTHROPIC_API_KEY al .env.local' },
        { status: 200 }
      );
    }

    const systemPrompt = `Eres un coach de fitness personalizado e inteligente integrado en la app FitPro. 
Tu rol es analizar los datos del usuario y dar consejos concretos, motivadores y basados en evidencia.

PRINCIPIOS:
- Respuestas concisas pero completas (máx 200 palabras)
- Usa datos concretos del contexto cuando estén disponibles
- Tono motivador pero realista
- Hablar en español argentino informal (vos, etc)
- Formato claro con saltos de línea para legibilidad
- Si no hay datos suficientes, pedí que registren más

CONTEXTO DEL USUARIO:
${context}

Responde directamente a la pregunta sin saludar ni introducirte de nuevo.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: systemPrompt,
        messages: messages.slice(-10), // Last 10 messages for context
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Anthropic error:', err);
      return NextResponse.json({ response: 'Error al conectar con la IA. Verificá la API key.' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'No pude generar una respuesta.';

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error('Coach API error:', err);
    return NextResponse.json({ response: 'Error interno del servidor.' }, { status: 500 });
  }
}
