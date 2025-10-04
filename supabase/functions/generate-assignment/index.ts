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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
}`
        }],
      }),
    });

    const data = await aiResponse.json();
    if (!aiResponse.ok) {
      console.error('AI API Error:', data);
      throw new Error(data.error?.message || 'AI generation failed');
    }
    
    const assignmentData = JSON.parse(data.choices[0].message.content);

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
