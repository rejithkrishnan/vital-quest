---
description: Create a new Supabase Edge Function with proper structure and error handling
---

# Edge Function Workflow

## Steps

1. **Ask for function details:**
   - Function name (e.g., "gamify-action")
   - Purpose/description
   - Input parameters
   - Expected output

2. **Create Edge Function directory:**
   - `supabase/functions/<function-name>/index.ts`

3. **Use this template:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  // Define expected input
}

interface ResponseBody {
  success: boolean;
  data?: unknown;
  error?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const body: RequestBody = await req.json();

    // Your business logic here

    const response: ResponseBody = {
      success: true,
      data: { /* your data */ },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const response: ResponseBody = {
      success: false,
      error: error.message,
    };

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

// turbo
4. **Deploy the function:**
   - `supabase functions deploy <function-name>`

5. **Test the function:**
   - Use Supabase dashboard or curl
