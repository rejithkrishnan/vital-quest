import requests
import json
import time

# Use the anon key found in .env
ANON_KEY = "sb_publishable_zsRFhzOrapI7NscZ6vYGFw_AB3I__GV"
SUPABASE_URL = "https://nodwouaygritoprsbrrf.supabase.co"
FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/chat-agent"
HEADERS = {"Authorization": f"Bearer {ANON_KEY}", "Content-Type": "application/json"}
FAKE_USER_ID = "00000000-0000-0000-0000-000000000000"


def test_generate_roadmap():
    print("\n=== Testing Generate Roadmap ===")

    payload = {
        "mode": "generate_roadmap",
        "userId": FAKE_USER_ID,
        "context": {
            "goal": "Lose 5kg",
            "weight": 80,
            "target_weight": 75,
            "duration_weeks": 4,
            "goalId": "test-goal",
        },
    }

    try:
        print("Sending request...")
        start_time = time.time()
        response = requests.post(FUNCTION_URL, headers=HEADERS, json=payload)
        duration = time.time() - start_time

        print(f"Response status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            # The edge function wraps the AI text in a 'text' property
            raw_text = data.get("text", "")
            print(f"\nRaw AI Response ({len(raw_text)} chars):")
            print(raw_text)

            try:
                plan_json = json.loads(raw_text)
                print("\nJSON Parsed Successfully:")
                print(f"- goal_summary: {plan_json.get('goal_summary')}")
                if "day_1_tasks" in plan_json:
                    print("- day_1_tasks found!")
                    print(json.dumps(plan_json["day_1_tasks"], indent=2))
                else:
                    print("❌ day_1_tasks MISSING in JSON")

            except json.JSONDecodeError as e:
                print(f"\n❌ JSON Decode Error: {e}")
        else:
            print(f"Error body: {response.text}")

    except Exception as e:
        print(f"Exception: {e}")


if __name__ == "__main__":
    test_generate_roadmap()
