import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { moduleId, topic } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not set');
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating assignment for topic:', topic);

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
          content: `Create a comprehensive assignment for "${topic}" with the following structure:
          
Title: Create an engaging assignment title (Total Marks: 100)
Description: Brief context/scenario for the assignment

Create 3-4 sections, each with:
- Section title with marks (e.g., "Section Name (25 Marks)")
- Section description/context
- 2-3 tasks with specific marks and detailed requirements
- Task IDs like "S1T1" (Section 1 Task 1)

For coding topics: Include code writing tasks with dark code editors
For theoretical topics: Include essay-style, analysis, or discussion questions
For practical topics: Include real-world application scenarios

Return as JSON:
{
  "title": "assignment title",
  "totalMarks": 100,
  "description": "assignment description",
  "sections": [
    {
      "id": 1,
      "title": "Section Title",
      "marks": 25,
      "description": "section context",
      "tasks": [
        {
          "id": "S1T1",
          "question": "detailed question",
          "marks": 15,
          "type": "essay" | "code" | "analysis"
        }
      ]
    }
  ]
}

IMPORTANT: Output ONLY raw JSON. Do not include any markdown, backticks, or code fences.`
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
    
    // Sanitize and parse JSON returned by the model (sometimes wrapped in ```json fences)
    const raw = data?.choices?.[0]?.message?.content ?? '';
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    let assignmentData: any;
    try {
      assignmentData = JSON.parse(cleaned);
    } catch (e1) {
      // Fallback: try to extract the JSON object/array boundaries
      const tryCandidates: string[] = [];
      const objStart = cleaned.indexOf('{');
      const objEnd = cleaned.lastIndexOf('}');
      const arrStart = cleaned.indexOf('[');
      const arrEnd = cleaned.lastIndexOf(']');
      if (objStart !== -1 && objEnd > objStart) tryCandidates.push(cleaned.slice(objStart, objEnd + 1));
      if (arrStart !== -1 && arrEnd > arrStart) tryCandidates.push(cleaned.slice(arrStart, arrEnd + 1));

      let parsedOk = false;
      for (const c of tryCandidates) {
        try { assignmentData = JSON.parse(c); parsedOk = true; break; } catch {}
      }
      if (!parsedOk) {
        console.error('Failed to parse AI response:', raw);
        throw new Error('Invalid AI response format');
      }
    }

    await supabase.from('assignments').upsert({
      module_id: moduleId,
      content: assignmentData,
    }, { onConflict: 'module_id' });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
