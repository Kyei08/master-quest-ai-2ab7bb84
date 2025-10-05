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

    console.log('Generating resources for topic:', topic);

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
          content: `Generate 5 high-quality learning resources for the topic "${topic}". Return ONLY a raw JSON array with format: [{"title": "...", "url": "..."}] with no code fences, no markdown, and no extra text. Use real URLs to quality resources like documentation, tutorials, or courses.`
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

    let resources: Array<{ title: string; url: string }> = [];
    try {
      resources = JSON.parse(cleaned);
    } catch (e1) {
      const tryCandidates: string[] = [];
      const objStart = cleaned.indexOf('{');
      const objEnd = cleaned.lastIndexOf('}');
      const arrStart = cleaned.indexOf('[');
      const arrEnd = cleaned.lastIndexOf(']');
      if (objStart !== -1 && objEnd > objStart) tryCandidates.push(cleaned.slice(objStart, objEnd + 1));
      if (arrStart !== -1 && arrEnd > arrStart) tryCandidates.push(cleaned.slice(arrStart, arrEnd + 1));

      let parsedOk = false;
      for (const c of tryCandidates) {
        try { resources = JSON.parse(c); parsedOk = true; break; } catch {}
      }
      if (!parsedOk) {
        console.error('Failed to parse AI response:', raw);
        throw new Error('Invalid AI response format');
      }
    }

    for (const resource of resources) {
      await supabase.from('resources').insert({
        module_id: moduleId,
        title: resource.title,
        url: resource.url,
        resource_type: 'teacher_pick',
      });
    }

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
