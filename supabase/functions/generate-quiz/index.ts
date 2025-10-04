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
    const numQuestions = quizType === 'final_test' ? 10 : 25;

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

    const data = await aiResponse.json();
    if (!aiResponse.ok) {
      console.error('AI API Error:', data);
      throw new Error(data.error?.message || 'AI generation failed');
    }
    
    const quiz = JSON.parse(data.choices[0].message.content);

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
