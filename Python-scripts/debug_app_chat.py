import requests
import json

# Updated with the correct key
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZHdvdWF5Z3JpdG9wcnNicnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODY2NDAsImV4cCI6MjA4NDE2MjY0MH0.wC9A9Hv-TJJs7we1OmXbt8AAIWveR8MG4WH2XRfhInA"
SUPABASE_URL = "https://nodwouaygritoprsbrrf.supabase.co"
FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/chat-agent"
HEADERS = {"Authorization": f"Bearer {ANON_KEY}", "Content-Type": "application/json"}


# Simulating exact payload from chat.tsx
def test_chat_app_payload():
    print("\n=== Testing Chat App Payload (Simulating chat.tsx) ===")

    # This mimics what the app sends when NOT in goal_intake mode
    payload = {
        "mode": None,  # undefined in JS becomes null
        "message": "Hello",
        "history": [],
        "attachments": [],
        "context": {
            "userId": "00000000-0000-0000-0000-000000000000",
            "userName": "Test User",
            "xp": 100,
            "level": 1,
            "streak": 0,
        },
        "userId": "00000000-0000-0000-0000-000000000000",
    }

    try:
        resp = requests.post(FUNCTION_URL, headers=HEADERS, json=payload)
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 200:
            print("Response:", resp.json())
        else:
            print("Error:", resp.text)
    except Exception as e:
        print("Exception:", e)


if __name__ == "__main__":
    test_chat_app_payload()
