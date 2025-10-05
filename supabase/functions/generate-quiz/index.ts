import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { topic, quizType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not set');
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    
    const numQuestions = quizType === 'final_test' ? 10 : 25;

    console.log('Generating quiz for topic:', topic, 'type:', quizType);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Generate ${numQuestions} high-quality multiple choice questions about "${topic}". 
          
Focus on quality over quantity. Mix theoretical and practical questions.

Also generate AI metrics for this ${quizType}:
- Practicality/Theoretical split (e.g., "60% Theoretical / 40% Practical")
- Predictability rating (e.g., "Highly Predictable", "Moderately Predictable")
- Difficulty level (e.g., "Intermediate Graduate Level", "High Graduate Level")
- Alignment percentage (e.g., "100% Aligned with designated resources")
- Estimated learning time (e.g., "5-10 minutes per attempt")
- Proficiency required (e.g., "Basic understanding of concepts")

Return as JSON:
{
  "questions": [
    {
      "question": "detailed question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ],
  "metrics": {
    "practicalityTheoretical": "percentage split",
    "predictability": "rating",
    "difficulty": "level description",
    "alignment": "percentage aligned",
    "learningTime": "time estimate",
    "proficiency": "required level"
  }
}`
        }],
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      console.error('AI API Error:', aiResponse.status, errorData);
      throw new Error(errorData.error?.message || `AI API returned ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));
    
    let quiz: any;
    try {
      const raw = data?.choices?.[0]?.message?.content ?? '';
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      try {
        quiz = JSON.parse(cleaned);
      } catch {
        const candidates: string[] = [];
        const objStart = cleaned.indexOf('{');
        const objEnd = cleaned.lastIndexOf('}');
        const arrStart = cleaned.indexOf('[');
        const arrEnd = cleaned.lastIndexOf(']');
        if (objStart !== -1 && objEnd > objStart) candidates.push(cleaned.slice(objStart, objEnd + 1));
        if (arrStart !== -1 && arrEnd > arrStart) candidates.push(cleaned.slice(arrStart, arrEnd + 1));

        let ok = false;
        for (const c of candidates) { try { quiz = JSON.parse(c); ok = true; break; } catch {} }
        if (!ok) throw new Error('parse_failed');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', data?.choices?.[0]?.message?.content);
      throw new Error('Invalid AI response format');
    }

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
