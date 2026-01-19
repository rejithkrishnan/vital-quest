import json
import re
import os

file_path = r"c:\Users\rejit\Development\react_native\vital-quest\vital-quest-app\reference\plan.json"


def fix_json():
    if not os.path.exists(file_path):
        print(f"File found: {file_path}")
        return

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Step 1: Remove standalone 'n' lines (and unwanted artifacts if any)
        # Note: We do this before removing all newlines to catch them clearly
        # Using multiline flag to match start/end of lines
        fixed_content = re.sub(r"^\s*n\s*$", "", content, flags=re.MULTILINE)

        # Step 2: Remove all newlines
        # This fixes split keys, split values, and split numbers
        fixed_content = fixed_content.replace("\n", "")

        # Step 3: Parse JSON
        data = json.loads(fixed_content)
        print("JSON parsed successfully.")

        # Step 4: Write back formatted JSON
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        print("File fixed and saved.")

    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON: {e}")
        # print snippet
        print(
            f"Error context: {fixed_content[max(0, e.pos-50):min(len(fixed_content), e.pos+50)]}"
        )
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    fix_json()
