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

    // --- 5a.8: Goal Intake Mode (Conversational) ---
    if (mode === 'goal_intake') {
      const intakePrompt = `
        You are VitalQuest, an AI Health Coach. Your goal is to conduct a short interview to build a personalized health plan.
        
        USER CONTEXT: ${JSON.stringify(context || {})}
        
        MEMORY BANK (Past Conversations):
        ${retrievedContext}
        
        REQUIRED INFORMATION:
        1. Main Goal (e.g., Lose weight, Build muscle)
        2. Current Attributes (Age, Height, Weight)
        3. Target (Target Weight)
        4. Timeline (How many weeks?)
        5. Preferences (Diet style, Activity level, Injuries?)
        
        INSTRUCTIONS:
        1. **FIRST TURN Analysis**: 
           - Scan the "MEMORY BANK" and "USER CONTEXT" for any of the required info.
           - If you find relevant details (e.g., "User mentioned weight is 85kg last week"), START the conversation by listing what you know.
           - Example: "Hi! To build your plan, I recall your goal is to lose weight and you are currently 85kg. Is that still accurate?"
        
        2. **Subsequent Turns**:
           - If the user confirms the data, mark it as collected.
           - If the user corrects it, update your understanding.
           - Ask ONE clear question at a time for the *missing* info.
        
        3. **Completion**:
           - If the user provides multiple details at once, acknowledge them.
           - If ALL required information is present and confirmed by the user, output specific JSON.
        
        OUTPUT FORMAT:
        - If information is MISSING: Respond in plain text (natural language) asking the next question.
        - If ALL information is COLLECTED:
          Output JSON ONLY:
          {
            "status": "complete",
            "data": {
              "goal": "...",
              "age": number,
              "height": number,
              "weight": number,
              "target_weight": number,
              "duration_weeks": number,
              "diet": "...",
              "activity": "...",
              "limitations": "..."
            },
            "summary": "Brief summary of the plan you are about to build."
          }
      `;

      systemPrompt = intakePrompt;
      // Using standard generating logic at the end
    }

    // --- 5a.7: Generate Roadmap (was Generate Full Plan) ---
    if (mode === 'generate_roadmap') {
      systemPrompt = `
         Generate a High-Level Roadmap and Day 1 Plan.
         
         USER CONTEXT:
         - Name: ${effectiveName}
         - Height: ${context?.height} cm | Weight: ${context?.weight} kg | Age: ${context?.age}
         - Goal: ${context?.goalDescription}
         - Diet: ${context?.dietPreference} | Activity: ${context?.activityLevel}
         - Target: ${context?.targetValue} ${context?.targetUnit} in ${context?.durationWeeks} weeks
         
         OUTPUT FORMAT (JSON ONLY):
         {
           "goal_summary": "Encouraging summary of the goal",
           "daily_calorie_target": number,
           "macros": { "protein": number, "carbs": number, "fat": number },
           "weekly_plans": [
              { "week": 1, "focus": "...", "calorie_target": number, "ai_tips": "..." },
              { "week": 2, "focus": "...", "calorie_target": number, "ai_tips": "..." },
               ... (for all ${context?.durationWeeks} weeks)
           ],
           "day_1_tasks": {
             "meals": [
                { "meal_type": "breakfast", "time": "08:00", "description": "...", "calories": number, "protein": num, "carbs": num, "fat": num },
                { "meal_type": "lunch", ... },
                { "meal_type": "dinner", ... },
                { "meal_type": "snack", ... }
             ],
             "workouts": [
                { "time": "18:00", "description": "...", "duration": "30 min", "calories_burned": number, "exercises": ["..."] }
             ]
           }
         }
         
         RULES:
         1. Indian food preferences by default unless specified.
         2. Generate a 'weekly_plan' item for EVERY week in the duration.
         3. Generate detailed 'day_1_tasks' ONLY for Day 1.
         4. Output valid JSON only.
         `;
    }

    // --- 5a.9: Generate Daily Tasks (Lazy Load) ---
    if (mode === 'generate_daily_tasks') {
      systemPrompt = `
         Generate daily tasks for Day ${context?.dayNumber || '?'} of Week ${context?.weekNumber || '?'}.
         
         CONTEXT:
         - Goal: ${context?.goalDescription}
         - Week Focus: ${context?.weekFocus}
         - Calorie Target: ${context?.calorieTarget}
         - Diet: ${context?.dietPreference}
         
         OUTPUT JSON ONLY:
         {
           "meals": [ ... ],
           "workouts": [ ... ]
         }
         
         Rule: Create a balanced day fitting the calorie target and week focus.
       `;
    }

    // --- 5a.6: Goal Validation Mode ---
    if (mode === 'validate_goal') {
      const validationPrompt = `
        TASK: Validate if the user's health goal is realistic and safe.
        
        USER REQUEST: ${context?.goalDescription || message}
        CURRENT WEIGHT: ${context?.weight} kg
        TARGET: ${context?.targetValue} ${context?.targetUnit}
        TIMELINE: ${context?.durationWeeks} weeks
        
        SAFETY RULES:
        - Weight loss: Max 1kg per week (0.5-0.75kg is ideal).
        - Weight gain: Max 0.5kg per week.
        - Minimum timeline: 2 weeks.
        
        Output JSON object ONLY:
        {
          "is_realistic": true/false,
          "reason": "Clear explanation to the user",
          "suggested_timeline_weeks": number (safe duration if unrealistic, else null),
          "rate_per_week": number
        }
        `;

      const validationBody = {
        contents: [{ role: 'user', parts: [{ text: validationPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validationBody),
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- 5a.8: Analyze Meal Mode (Photo or Text) ---
    if (mode === 'analyze_meal') {
      const analysisPrompt = `
        Analyze this food (image or text) and estimate nutritional content.
        
        Planned Meal (if any): ${context?.plannedMeal || 'N/A'}
        User Description: ${message || 'See image'}
        
        Respond with JSON ONLY:
        {
          "detected_food": "Description of what you see/read",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number,
          "confidence": "high" | "medium" | "low",
          "notes": "E.g., High in sugar, good protein source..."
        }
        `;

      // We reuse the main logic which handles attachments (images) and text
      systemPrompt = analysisPrompt;
    }
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

    if (mode === 'plan' || mode === 'generate_full_plan') {
      requestBody.contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        }
      ];
      requestBody.generationConfig = { responseMimeType: "application/json" };
      delete requestBody.system_instruction;
    } else {
      // Chat mode with history (or analyze_meal)
      if (mode === 'analyze_meal') {
        requestBody.generationConfig = { responseMimeType: "application/json" };
      }

      // Add history only if NOT analyze_meal (keep analysis context clean)
      if (mode !== 'analyze_meal' && history && Array.isArray(history)) {
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
    console.log("Gemini Response Raw:", aiText);

    if ((mode === 'plan' || mode === 'generate_roadmap' || mode === 'generate_daily_tasks' || mode === 'analyze_meal' || mode === 'goal_intake') && aiText) {
      // Clean markdown if present, but only if it looks like a JSON block or we are in a JSON-only mode
      if (aiText.includes('```json')) {
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (mode !== 'goal_intake') {
        // For purely JSON modes, aggressive strip
        aiText = aiText.replace(/```/g, '').trim();
      }
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
