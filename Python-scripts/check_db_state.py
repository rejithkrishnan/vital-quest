import requests
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("EXPO_PUBLIC_SUPABASE_URL")
# Use anon key for DB access
ANON_KEY = os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")

if not ANON_KEY:
    print("ERROR: EXPO_PUBLIC_SUPABASE_ANON_KEY not found in .env")
    exit(1)

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
}

print("=== Checking Database State ===\n")

# 1. Check health_goals
print("1. Health Goals:")
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/health_goals?select=id,goal_type,status,ai_summary&status=eq.active&limit=3",
    headers=headers,
)
goals = resp.json()
for g in goals:
    print(f"   - {g.get('id')[:8]}... | {g.get('goal_type')} | {g.get('status')}")
    print(f"     Summary: {(g.get('ai_summary') or 'None')[:50]}...")

# 2. Check weekly_plans
print("\n2. Weekly Plans (first 3):")
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/weekly_plans?select=id,goal_id,week_number,focus_areas,status&limit=3",
    headers=headers,
)
weeks = resp.json()
for w in weeks:
    print(
        f"   - Week {w.get('week_number')} | Status: {w.get('status')} | Goal: {str(w.get('goal_id'))[:8]}..."
    )
    print(f"     Focus: {str(w.get('focus_areas'))[:60]}...")

# 3. Check daily_plans (today)
from datetime import date

today_str = date.today().isoformat()
print(f"\n3. Daily Plans for today ({today_str}):")
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/daily_plans?select=id,date,summary,calorie_target,weekly_plan_id&date=eq.{today_str}",
    headers=headers,
)
days = resp.json()
if days:
    for d in days:
        print(f"   - Plan ID: {d.get('id')[:8]}... | Summary: {d.get('summary')}")
        print(
            f"     Calories: {d.get('calorie_target')} | Weekly Plan: {str(d.get('weekly_plan_id'))[:8] if d.get('weekly_plan_id') else 'None'}..."
        )
else:
    print("   No daily plans found for today!")

# 4. Check plan_tasks
print(f"\n4. Plan Tasks (all):")
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/plan_tasks?select=id,plan_id,description,task_type,time_slot,is_completed&limit=10",
    headers=headers,
)
tasks = resp.json()
if isinstance(tasks, list) and tasks:
    for t in tasks:
        print(
            f"   - {t.get('task_type')} | {t.get('time_slot')} | {t.get('description')[:40]}..."
        )
elif isinstance(tasks, dict) and tasks.get("message"):
    print(f"   Error: {tasks.get('message')}")
else:
    print("   No tasks found in database!")
