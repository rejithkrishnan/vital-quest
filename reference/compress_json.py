import os


def compress_json(input_path, output_path):
    try:
        if not os.path.exists(input_path):
            print(f"Error: {input_path} does not exist.")
            return

        with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        # Remove newline characters and join into a single string
        # We also strip trailing spaces from each line to prevent extra spaces within strings/keys
        compressed = "".join(line.strip() for line in lines)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(compressed)

        print(f"Successfully compressed {input_path} to {output_path}")
        print(f"Original line count: {len(lines)}")
        print("Resulting file is a single line.")

    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    input_file = r"c:\Users\rejit\Development\react_native\vital-quest\vital-quest-app\reference\plan.json"
    output_file = r"c:\Users\rejit\Development\react_native\vital-quest\vital-quest-app\reference\plan.json"  # Overwriting as requested

    # Let's create a backup first just in case
    backup_file = r"c:\Users\rejit\Development\react_native\vital-quest\vital-quest-app\reference\plan.json.bak"
    if os.path.exists(input_file):
        import shutil

        shutil.copy2(input_file, backup_file)
        print(f"Backup created at {backup_file}")

    compress_json(input_file, output_file)
