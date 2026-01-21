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
    
    **CRITICAL TOPIC BOUNDARY:**
    - You are a SPECIALIZED Health & Fitness Agent.
    - You MUST **REFUSE** to answer questions unrelated to health, diet, fitness, mental well-being, or the VitalQuest app.
    - If asked about coding (e.g. "write a python script"), math, politics, or general knowledge, politely decline: "I am your specific Health AI coach. I can only help with health and fitness queries."
    
    Keep responses helpful, encouraging, and thorough (within the health domain). Provide detailed explanations when the user asks for advice or plans.`;

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

    // Daily Summary Generation Mode
    if (mode === 'generate_summary') {
      const { tasks, hour, userName, hydration } = context;

      const summaryPrompt = `
        You are VitalQuest, an enthusiastic AI Health Coach.
        User Name: ${userName || 'Friend'}
        Current Time Hour: ${hour}
        Hydration: ${hydration?.current || 0} / ${hydration?.target || 2000} ml
        Today's Tasks Summary: ${JSON.stringify(tasks)}

        Task: Analyze the user's progress for today.
        
        Generate a concise, high-energy status update (30-40 words MAX).
        
        Structure:
        1. Personalized Greeting.
        2. Progress acknowledgement (tasks & water).
           - If water is low (below 50% by afternoon), remind them to drink!
           - If water is good, celebrate it.
        3. Motivation for the NEXT specific task.
        
        Tone: Encouraging, energetic, like a personal trainer.
        Output: ONLY the plain text message. No markdown headers.
      `;

      const summaryBody = {
        contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }]
      };

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summaryBody),
          }
        );

        if (!response.ok) throw new Error('Gemini API failed');

        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Keep pushing forward! You're doing great!";

        return new Response(JSON.stringify({ summary }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      } catch (error) {
        return new Response(JSON.stringify({ summary: "Keep going! You're making progress every day!" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // --- 5a.8: Goal Intake Mode (Conversational) ---
    if (mode === 'goal_intake') {
      const intakePrompt = `
        You are VitalQuest, an AI Health Coach. Your ONLY job is to collect the 4 required pieces of information below, then output JSON. DO NOT provide plans, advice, or long explanations during this phase.

        USER CONTEXT: ${JSON.stringify(context || {})}
        
        MEMORY BANK (Past Conversations):
        ${retrievedContext}
        
        REQUIRED INFORMATION (Collect these 7 items):
        1. Main Goal (e.g., "Lose weight", "Build muscle")
        2. Current Weight (in kg)
        3. Target Weight (in kg)
        4. Timeline (e.g., 8 weeks)
        5. Start Date (When they want to start - e.g., "Tomorrow", "Next Monday", "Jan 25", or a specific date. Default to tomorrow if user says "immediately" or "now")
        6. Dietary Preference (e.g., Vegetarian, Non-Veg, Vegan, Keto)
        7. Regional Preference (e.g., North Indian, South Indian, Mediterranean)
        
        CONVERSATION FLOW:
        1. **Gather Items:** Check MEMORY BANK or context for any known info. Ask for missing items one by one. Keep responses SHORT (1-2 sentences).
        2. **Detailed Summary:** ONCE ALL 7 ITEMS ARE COLLECTED, provide a DETAILED summary of the proposed plan. THIS SUMMARY MUST BE 50-70 WORDS LONG. Cover the nutrition strategy, regional food integration, start date, and expected progress.
        3. **Wait for Lock:** At the end of the summary, ask: "Does this roadmap look good? Ready to lock it in and generate your plan?"
        4. **Final Turn (JSON):** ONLY AFTER the user gives a positive confirmation (e.g., "Confirm", "Lock it in"), output the JSON below. DO NOT say anything else. Just the JSON.

        CRITICAL RULES:
        - DO NOT provide JSON until AFTER the user confirms the detailed 50-70 word summary.
        - If the user hasn't confirmed the summary, persist in plain text.
        - For Start Date: Convert ALL relative dates (like "tomorrow", "next Monday", "Feb 1st", "this coming friday") into a strict YYYY-MM-DD format using today's date: ${new Date().toISOString().split('T')[0]} as the reference. This is critical.
        - The "start_date" MUST be a valid YYYY-MM-DD string in the JSON output and should never be missing or null.

        OUTPUT FORMAT:
        - Summary/Interaction: Plain text.
        - Final Confirmation: 
          {
            "status": "complete",
            "data": {
              "goal": "lose_weight or build_muscle",
              "weight": number,
              "target_weight": number,
              "duration_weeks": number,
              "start_date": "YYYY-MM-DD",
              "diet": "string",
              "region": "string"
            },
            "summary": "The LATEST detailed 50-70 word summary you just provided."
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
         - Goal: ${context?.goal || 'lose_weight'}
         - Current Weight: ${context?.weight} kg
         - Target Weight: ${context?.target_weight} kg
         - Duration: ${context?.duration_weeks} weeks
         - Diet: ${context?.diet || 'Balanced'}
         - Region: ${context?.region || 'Indian'}
         
         OUTPUT FORMAT (JSON ONLY):
         {
           "goal_summary": "Thorough 50-70 word summary of the strategy",
           "daily_calorie_target": number,
           "daily_water_target": number,
           "macros": { "protein": number, "carbs": number, "fat": number },
           "weekly_plans": [
              { "week": 1, "focus": "...", "calorie_target": number, "ai_tips": "Reflect ${context?.diet} and ${context?.region} style tips" }
               ... (for all ${context?.duration_weeks} weeks)
           ],
           "day_1_tasks": {
             "meals": [
                { "meal_type": "breakfast", "time": "08:00", "description": "Specific ${context?.region} ${context?.diet} dish", "calories": number, "protein": num, "carbs": num, "fat": num },
                ...
             ],
             ...
           }
         }
         
         RULES:
         1. Respect ${context?.diet} and ${context?.region} preferences strictly.
         2. Generate a 'weekly_plan' item for EVERY week in the duration (${context?.duration_weeks} weeks).
         3. Generate detailed 'day_1_tasks' ONLY for Day 1.
         4. Output valid JSON only. No markdown, no backticks.
         5. Calculate appropriate calorie deficit for safe weight loss (0.5-1kg/week).
         6. **GOAL ALIGNMENT (STRICT)**: Day 1 meals MUST strictly align with the Goal (${context?.goal}).
            - Weight Loss: Prioritize steamed, grilled, or dry preparations. **AVOID** rich/creamy gravies. High protein, high fiber.
            - Weight Gain: Calorie dense.
         7. **MANDATORY FIELDS**: EVERY Day 1 meal MUST have 'calories' (number, not null) and 'time'.
         8. **WATER TARGET**: Calculate daily water needs based on weight (approx 35ml per kg of body weight). Min 2000ml. Max 4000ml.
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
         
         OUTPUT JSON ONLY (Strict Schema):
         {
           "meals": [ 
             { "meal_type": "breakfast", "time": "08:00", "description": "Specific meal description", "calories": number, "protein": number, "carbs": number, "fat": number },
             { "meal_type": "lunch", "time": "13:00", "description": "...", "calories": number, ... },
             { "meal_type": "dinner", "time": "19:00", "description": "...", "calories": number, ... },
             { "meal_type": "snack", "time": "16:00", "description": "...", "calories": number, ... }
           ],
           "workouts": [ 
             { "time": "18:00", "description": "Specific workout details", "duration": "30 min", "calories_burned": number } 
           ]
         }
         
         Rules:
          1. **GOAL ALIGNMENT (STRICT)**: All meals MUST strictly align with the Goal (${context?.goalDescription}).
             - **Weight Loss**: Prioritize steamed, grilled, or dry preparations. **AVOID** rich/creamy gravies, heavy coconut milk, or fried foods. High protein, high fiber.
             - Weight Gain: Calorie dense, high protein, healthy fats.
             - Maintenance: Balanced macronutrients.
          2. Ensure EVERY meal has a 'time', 'calories', and 'description'.
          3. Ensure total calories sum up close to the target (${context?.calorieTarget}).
          4. Return valid JSON only.
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
        Analyze the food in this image and estimate nutritional content.
        
        IMPORTANT: Describe what you ACTUALLY SEE in the image, not what was planned.
        If the image shows rice with curry, say "rice with curry" not what the planned meal was.
        
        Context (for reference only):
        - User Description: ${message || 'See image'}
        
        Respond with JSON ONLY:
        {
          "detected_food": "Describe exactly what you see in the image",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number,
          "confidence": "high" | "medium" | "low",
          "notes": "Brief nutritional analysis of what you detected"
        }
        `;

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

    if (mode === 'meal_suggest') {
      const suggestPrompt = `
        You are VitalQuest AI Health Coach.
        TASK: Determine if the user is LOGGING a meal they ate, or ASKING for a suggestion.
        
        CONTEXT:
        - Planned Meal: ${context?.plannedMeal || 'N/A'} (Reference ONLY)
        - Meal Type: ${context?.mealType || 'N/A'}
        - Goal: ${context?.goalDescription || 'General Health'}
        - User Request: ${message} (PRIORITIZE THIS)
        - Remaining Calories today: ${context?.remainingCalories || 'N/A'}
        - Remaining Macros: Protein: ${context?.remainingProtein || 'N/A'}, Carbs: ${context?.remainingCarbs || 'N/A'}, Fat: ${context?.remainingFat || 'N/A'}
        - User Preferences: ${retrievedContext}

        RULES:
        1. **LOGGING MODE**: IF the user says "I ate...", "I had...", "I consumed...", or lists specific food items (e.g. "2 idly"), assume they have ALREADY eaten it.
           - OUTPUT the nutritional info for THAT FOOD. 
           - DO NOT suggest an alternative.
           - Set "suggestion" to the name of the food they ate suitable for a title (e.g. "2 Idly & Sambar").
           
        2. **SUGGESTION MODE**: IF the user asks "What should I eat?", "Suggest something", or "I don't like this", then suggest a NEW meal.
           - Ensure it fits the remaining budget.
           - **CRITICAL**: Suggest a meal appropriate for **${context?.mealType}**. (e.g. Breakfast foods for Breakfast, etc).
           - **CRITICAL**: Ensure the suggestion aligns with the USER GOAL (${context?.goalDescription}).
             - **For Weight Loss**: Suggest **steamed** (e.g. Idli, Puttu), **grilled**, or **dry** options (e.g. Thoran, Roast) rather than rich gravies (Stew, Korma) containing heavy coconut milk/cream.
        
        3. Provide exact nutritional estimates for whichever mode is active.
        3. Respond with JSON ONLY.

        OUTPUT JSON:
        {
          "suggestion": "Name of the dish",
          "description": "Short description of the dish",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number,
          "notes": "Brief explanation of why this is a good choice"
        }
      `;
      systemPrompt = suggestPrompt;
    }

    if (mode === 'ingredient_suggest') {
      const ingredientPrompt = `
        You are VitalQuest AI Health Coach.
        TASK: Recommend what to cook based on the provided ingredients or food photo.
        
        CONTEXT:
        - Input: ${message || 'See image'}
        - Meal Slot: ${context?.mealType || 'Next meal'}
        - Remaining Budget: ${context?.remainingCalories || 'N/A'} calories
        - User Preferences: ${retrievedContext}

        RULES:
        1. If ingredients are provided, suggest a simple recipe.
        2. If a food item is shown/described, analyze it and suggest if it fits.
        3. Prioritize user's dietary and regional preferences.
        4. Respond with JSON ONLY.

        OUTPUT JSON:
        {
          "suggestion": "Recipe Name / Dish Name",
          "description": "Preparation steps or dish details",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number,
          "notes": "Why this fits today's goals"
        }
      `;
      systemPrompt = ingredientPrompt;
    }

    // Construct the request body
    const requestBody: any = {
      contents: []
    };

    // Add system instruction
    requestBody.system_instruction = {
      parts: [{ text: systemPrompt }]
    };

    // Handle plan generation modes (require JSON output)
    if (mode === 'plan' || mode === 'generate_full_plan' || mode === 'generate_roadmap' || mode === 'generate_daily_tasks' || mode === 'analyze_meal' || mode === 'meal_suggest' || mode === 'ingredient_suggest') {
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

    if ((mode === 'plan' || mode === 'generate_roadmap' || mode === 'generate_daily_tasks' || mode === 'analyze_meal' || mode === 'goal_intake' || mode === 'meal_suggest' || mode === 'ingredient_suggest') && aiText) {
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
