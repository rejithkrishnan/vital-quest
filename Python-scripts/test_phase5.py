import requests
import json
import time

SUPABASE_URL = "https://nodwouaygritoprsbrrf.supabase.co"
FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/chat-agent"
# Using the anon key found in .env
ANON_KEY = "sb_publishable_zsRFhzOrapI7NscZ6vYGFw_AB3I__GV"

HEADERS = {"Authorization": f"Bearer {ANON_KEY}", "Content-Type": "application/json"}

FAKE_USER_ID = "00000000-0000-0000-0000-000000000000"


def test_ui_flow_simulation():
    print("\n=== Simulating Chat Wizard Flow ===")

    # 1. User enters data in Wizard
    wizard_data = {
        "goal": "Lose 5kg in 2 months",
        "currentWeight": 80,
        "targetWeight": 75,
        "duration": 8,
    }
    print(f"\n[Step 1] User Input: {json.dumps(wizard_data)}")

    # 2. Trigger Validation (from goalsStore.validateGoalWithAI)
    print("\n[Step 2] calling validate_goal...")
    validate_payload = {
        "mode": "validate_goal",
        "userId": FAKE_USER_ID,
        "context": {
            "goalDescription": wizard_data["goal"],
            "weight": wizard_data["currentWeight"],
            "targetValue": wizard_data["targetWeight"],
            "targetUnit": "kg",
            "durationWeeks": wizard_data["duration"],
        },
    }

    try:
        val_resp = requests.post(FUNCTION_URL, headers=HEADERS, json=validate_payload)
        if val_resp.status_code != 200:
            print(f"❌ Validation Failed: {val_resp.text}")
            return

        val_data = val_resp.json()
        print(f"✅ Validation Result: {val_data['text']}")
        val_json = json.loads(val_data["text"])

        if not val_json.get("is_realistic"):
            print(
                "⚠️ Goal deemed unrealistic (Expected for aggressive goals, but checking logic...)"
            )

    except Exception as e:
        print(f"❌ Exception in validation: {e}")
        return

    # 3. Trigger Plan Generation (from goalsStore.generateFullPlan)
    print("\n[Step 3] calling generate_full_plan...")

    # Needs a fake Goal ID since we aren't actually inserting into DB here,
    # but the Edge Function might use it for context or logging.
    FAKE_GOAL_ID = "test-goal-id-123"

    plan_payload = {
        "mode": "generate_roadmap",
        "userId": FAKE_USER_ID,
        "context": {
            "goalId": FAKE_GOAL_ID,
            "userName": "Test User",
            "age": 30,
            "height": 175,
            "weight": wizard_data["currentWeight"],
            "goal": wizard_data["goal"],
            "target_weight": wizard_data["targetWeight"],
            "targetUnit": "kg",
            "duration_weeks": wizard_data["duration"],
            "dietPreference": "Balanced",
            "activityLevel": "Moderate",
        },
    }

    try:
        # Measure time
        start_time = time.time()
        plan_resp = requests.post(FUNCTION_URL, headers=HEADERS, json=plan_payload)
        duration = time.time() - start_time

        if plan_resp.status_code != 200:
            print(f"❌ Plan Generation Failed: {plan_resp.text}")
            return

        plan_data = plan_resp.json()
        print(f"✅ Plan Generated in {duration:.2f}s")

        # Verify JSON structure
        if "text" in plan_data:
            try:
                plan_json = json.loads(plan_data["text"])
                print(
                    f"   Structure Check: {len(plan_json.get('weekly_plans', []))} weeks generated."
                )
                if len(plan_json.get("weekly_plans", [])) > 0:
                    first_week = plan_json["weekly_plans"][0]
                    print(f"   Sample Week 1 Focus: {first_week.get('focus')}")
                    print(
                        f"   Sample Week 1 Calorie Target: {first_week.get('calorie_target')}"
                    )
                if "day_1_tasks" in plan_json:
                    print(
                        f"   Day 1 Tasks: {len(plan_json['day_1_tasks'].get('meals', []))} meals, {len(plan_json['day_1_tasks'].get('workouts', []))} workouts"
                    )
            except json.JSONDecodeError:
                print("❌ Failed to parse Plan JSON response")
                print(plan_data["text"][:500])
        else:
            print("❌ No 'text' field in response")

    except Exception as e:
        print(f"❌ Exception in plan generation: {e}")


if __name__ == "__main__":
    test_ui_flow_simulation()
