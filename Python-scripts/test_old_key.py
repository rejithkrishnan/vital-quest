import requests
import json

# OLD KEY (the one that was supposedly working before)
OLD_KEY = "sb_publishable_zsRFhzOrapI7NscZ6vYGFw_AB3I__GV"
SUPABASE_URL = "https://nodwouaygritoprsbrrf.supabase.co"
FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/chat-agent"
HEADERS = {"Authorization": f"Bearer {OLD_KEY}", "Content-Type": "application/json"}


def test_with_old_key():
    print("\n=== Testing with OLD Key (sb_publishable_...) ===")

    payload = {"message": "Hello", "userId": "00000000-0000-0000-0000-000000000000"}

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
    test_with_old_key()
