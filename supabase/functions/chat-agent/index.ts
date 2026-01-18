import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, context, mode, history, attachments, userId } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    // --- Helper Functions ---

    // 1. Generate Embedding
    const generateEmbedding = async (text: string) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text }] }
          }),
        }
      );
      const data = await response.json();
      return data.embedding.values;
    };

    // 2. Extract Facts (The Filter)
    const extractFacts = async (userMessage: string) => {
      const prompt = `
        Analyze this user message for permanent health-related facts or preferences.
        Message: "${userMessage}"
        
        Rules:
        - Extract personal details: Name, Age, Location/Place, Height, Weight.
        - Extract health facts: Diet, injuries, allergies, goals, habits.
        - Assign a category to each fact: 'personal', 'diet', 'medical', 'fitness', 'general'.
        - Ignore casual conversation ("Hello", "Thanks").
        
        Output JSON format: 
        { 
          "facts": [
            { "text": "fact 1", "category": "diet" }, 
            { "text": "fact 2", "category": "personal" }
          ] 
        } 
        or { "facts": [] }
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          }),
        }
      );
      const data = await response.json();
      try {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(text);
        // Handle both old format (array of strings) and new format (array of objects) just in case
        if (Array.isArray(parsed.facts)) {
          return parsed.facts.map((f: any) => typeof f === 'string' ? { text: f, category: 'general' } : f);
        }
        return [];
      } catch (e) {
        console.error("Fact extraction failed:", e);
        return [];
      }
    };

    // 3. Process Memories (Extract & Store)
    if (message && userId && mode !== 'title') { // Don't remember title gen requests
      // Fire and forget - don't block the main response
      (async () => {
        try {
          const facts = await extractFacts(message);
          if (facts.length > 0) {
            console.log("Extracted Facts:", facts);
            for (const factObj of facts) {
              const embedding = await generateEmbedding(factObj.text);
              const { error } = await supabase.from('user_memory').insert({
                user_id: userId,
                fact_text: factObj.text,
                category: factObj.category || 'general',
                embedding
              });
              if (error) console.error("Error saving memory:", error);
            }
          }
        } catch (err) {
          console.error("Async memory processing error:", err);
        }
      })();
    }

    // 4. Retrieve Relevant Memories
    let retrievedContext = "";
    if (userId) {
      try {
        // Always fetch recent facts (like Name) to ensure core profile is included
        const { data: recentFacts, error: recentError } = await supabase
          .from('user_memory')
          .select('fact_text, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!recentError && recentFacts && recentFacts.length > 0) {
          retrievedContext = "USER PROFILE FACTS:\n" + recentFacts.map((m: any) => `- ${m.fact_text} (Recorded: ${new Date(m.created_at).toLocaleDateString()})`).join("\n");
          console.log("Retrieved Recent Facts:", retrievedContext);
        }

        // Additionally, if there's a message, do similarity search for context-specific memories
        if (message) {
          const queryEmbedding = await generateEmbedding(message);
          const { data: memories, error } = await supabase.rpc('match_memory', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5, // Lowered threshold for better recall
            match_count: 5, // Increased count to see history
            p_user_id: userId
          });

          if (!error && memories && memories.length > 0) {
            // Merge with recent facts, avoiding duplicates
            const existingFacts = recentFacts?.map((f: any) => f.fact_text) || [];
            const newMemories = memories.filter((m: any) => !existingFacts.includes(m.fact_text));
            if (newMemories.length > 0) {
              retrievedContext += "\n\nRELEVANT MEMORIES:\n" + newMemories.map((m: any) => `- ${m.fact_text} (Recorded: ${new Date(m.created_at).toLocaleDateString()})`).join("\n");
            }
          }
        }
      } catch (err) {
        console.error("Memory retrieval error:", err);
      }
    }


    // --- Main Logic ---

    // Helper to convert ArrayBuffer to Base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    // Determine name to use:
    // 1. Explicitly in context (if not 'User')
    // 2. Extracted from recent memory retrieval (if found)
    // 3. Default to 'User'
    let effectiveName = context?.userName || 'User';

    // Simple check: if retrievedContext contains "Name: Rejith" or similar facts, the model should pick it up naturally via the prompt.
    // We strictly instruct the model to prefer the name in the memories if valid.

    let systemPrompt = `You are VitalQuest, an AI Health Coach. 
    User Context: ${JSON.stringify(context || {})}
    Refers to the user by their first name. 
    If the context says 'User' but the Retrieved Memories below contain a name (e.g., "My name is Rejith"), USE THE NAME FROM MEMORIES.

    MEMORY HANDLING RULES:
    - The "Retrieved Memories" below may contain conflicting info (e.g. "Weight 86kg" and "Weight 87kg").
    - Use the timestamps provided (if any) to determine the LATEST status.
    - When answering, prioritize the LATEST information.
    - If helpful, mention the history (e.g. "I see your weight has changed from 86kg to 87kg...").
    
    ${retrievedContext}
    
    Keep responses helpful, encouraging, and thorough. Provide detailed explanations when the user asks for advice or plans.`;

    // Title generation mode
    if (mode === 'title') {
      const titlePrompt = `Generate a very short title (3-5 words max) for a chat conversation that starts with this message: "${message}". 
      Return ONLY the title text, no quotes, no punctuation at the end.
      Examples: "Morning Workout Plan", "Diet Tips Question", "Weight Loss Goals"`;

      const titleBody = {
        contents: [{ role: 'user', parts: [{ text: titlePrompt }] }]
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(titleBody),
        }
      );

      if (!response.ok) {
        return new Response(JSON.stringify({ title: 'New Chat' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const data = await response.json();
      const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'New Chat';

      return new Response(JSON.stringify({ title }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Special handling for 'plan' mode
    if (mode === 'plan') {
      systemPrompt = `You are VitalQuest. Generate a personalized daily health plan for the user.
      User Context: ${JSON.stringify(context || {})}
      ${retrievedContext}
      
      Return ONLY a valid JSON object (no markdown, no backticks) with this structure:
      {
        "summary": "Brief encouraging summary of the day's focus (max 1 sentence)",
        "tasks": [
          { "description": "Short task description", "xp_reward": 10, "task_type": "workout" },
          { "description": "Short task description", "xp_reward": 10, "task_type": "nutrition" },
          { "description": "Short task description", "xp_reward": 10, "task_type": "mindfulness" }
        ]
      }
      Generate exactly 3 tasks tailored to the user's level.`;
    }

    // Construct the request body
    const requestBody: any = {
      contents: []
    };

    // Add system instruction
    requestBody.system_instruction = {
      parts: [{ text: systemPrompt }]
    };

    if (mode === 'plan') {
      requestBody.contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        }
      ];
      delete requestBody.system_instruction;
    } else {
      // Chat mode with history
      if (history && Array.isArray(history)) {
        requestBody.contents = requestBody.contents.concat(history);
      }

      // Process attachments
      // The current message can have text AND inlineData parts
      const currentMessageParts: any[] = [];

      if (message) {
        currentMessageParts.push({ text: message });
      }

      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        for (const attachment of attachments) {
          if (attachment.publicUrl) {
            try {
              console.log('Fetching attachment:', attachment.publicUrl);
              const imgResp = await fetch(attachment.publicUrl);
              if (imgResp.ok) {
                const imgBuffer = await imgResp.arrayBuffer();
                const base64Data = arrayBufferToBase64(imgBuffer);
                currentMessageParts.push({
                  inlineData: {
                    mimeType: attachment.type,
                    data: base64Data
                  }
                });
                console.log('Attachment processed successfully');
              } else {
                console.error('Failed to download attachment:', attachment.publicUrl, imgResp.status);
              }
            } catch (err) {
              console.error('Error processing attachment:', err);
            }
          }
        }
      }

      // If we have content (text or attachments), add to contents
      if (currentMessageParts.length > 0) {
        requestBody.contents.push({
          role: 'user',
          parts: currentMessageParts
        });
      }
    }

    // console.log('Request to Gemini:', JSON.stringify(requestBody).substring(0, 500) + '...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return new Response(JSON.stringify({ error: 'Gemini API request failed', details: errorText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    const data = await response.json();

    if (!data.candidates) {
      console.error('No candidates returned:', data);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (mode === 'plan' && aiText) {
      aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    return new Response(JSON.stringify({ text: aiText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
