import requests
import json
import time

# Use the anon key found in .env
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZHdvdWF5Z3JpdG9wcnNicnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODY2NDAsImV4cCI6MjA4NDE2MjY0MH0.wC9A9Hv-TJJs7we1OmXbt8AAIWveR8MG4WH2XRfhInA"
SUPABASE_URL = "https://nodwouaygritoprsbrrf.supabase.co"
FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/chat-agent"
HEADERS = {"Authorization": f"Bearer {ANON_KEY}", "Content-Type": "application/json"}
FAKE_USER_ID = "00000000-0000-0000-0000-000000000000"


def test_chat():
    print("\n=== Testing Chat Mode ===")
    payload = {
        "message": "Hello, how are you?",
        "userId": FAKE_USER_ID,
        # mode is undefined for normal chat
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


def test_goal_intake():
    print("\n=== Testing Goal Intake Mode ===")
    payload = {
        "message": "I want to lose weight",
        "mode": "goal_intake",
        "userId": FAKE_USER_ID,
        "context": {"userName": "TestUser"},
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
    test_chat()
    test_goal_intake()
