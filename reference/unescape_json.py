import json
import os
import re


def unescape_and_fix(input_path, output_path):
    try:
        with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read().strip()

        # If it's wrapped like "text": "...", try to extract just the string part
        # We look for the first occurrence of "{" after "text": "
        match = re.search(r'"text":\s*"(.*)"', content, re.DOTALL)
        if match:
            escaped_str = match.group(1)
        elif content.startswith('"') and content.endswith('"'):
            escaped_str = content[1:-1]
        else:
            # Maybe it's already a valid JSON string that needs one round of decoding
            # but it was missing braces?
            # Let's try wrapping it in braces if it looks like a property
            if not content.startswith("{"):
                content = "{" + content + "}"

            try:
                data = json.loads(content)
                if isinstance(data, dict) and "text" in data:
                    escaped_str = data["text"]
                else:
                    print("Could not find 'text' key. Using whole content.")
                    escaped_str = content
            except:
                escaped_str = content

        # Now we need to unescape it. json.loads of a quoted string handles this.
        # Ensure it's wrapped in quotes for json.loads to treat it as a string literal
        if not escaped_str.startswith('"'):
            # It might have literal backslashes we need to handle.
            # Easiest way to unescape a string literal is to use the JSON decoder on a double-quoted string.
            wrapper = '"' + escaped_str.replace('"', '\\"') + '"'
            # Wait, if it ALREADY has \" inside, our replace will break it.
            # Let's try a different approach: literal_eval or just json.loads of the whole thing
            # if we can make it a valid JSON string.

            # If escaped_str is: {\n  \"goal_summary\":...
            # We want to treat it as a JSON string literal.
            # If we wrap it in quotes, we must escape the existing unescaped quotes.
            pass

        # Let's try the most direct way: extract the text between the surrounding quotes manually
        # if the regex found it, it's already "internal" content.

        # Actually, if content is: "text": "{\n  \"goal_summary\": \"...\"}"
        # and we want to get the JSON inside.

        # Try finding the content starting with { and ending with } inside the quotes
        json_match = re.search(r"(\{.*\})", escaped_str, re.DOTALL)
        if json_match:
            candidate = json_match.group(1)
            # Unescape it: replace \n with actual newline, \" with ", etc.
            unescaped = candidate.encode().decode("unicode_escape")

            # Clean up: Sometimes unicode_escape leaves literal \"
            unescaped = unescaped.replace('\\"', '"')

            try:
                final_data = json.loads(unescaped)
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(final_data, f, indent=4)
                print(f"Successfully unescaped and formatted {output_path}")
                return
            except Exception as inner_e:
                print(f"Failed to parse unescaped JSON: {inner_e}")
                # Save it anyway for inspection
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(unescaped)
                print("Saved unescaped raw content for inspection.")
        else:
            print("Could not find JSON structure inside string.")

    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    file_path = r"c:\Users\rejit\Development\react_native\vital-quest\vital-quest-app\reference\plan.json"
    unescape_and_fix(file_path, file_path)
