#!/bin/bash

# Define source and destination directories
SOURCE_DIR="./config/sync/"
DEST_DIR="./web/profiles/custom/drupalx/config/install/"

# Check if the source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Source directory $SOURCE_DIR does not exist."
  exit 1
fi

# Check if the destination directory exists
if [ ! -d "$DEST_DIR" ]; then
  echo "Destination directory $DEST_DIR does not exist."
  exit 1
fi

# Function to check if the only difference is the default_config_hash
is_only_hash_change() {
  local file1=$1
  local file2=$2
  diff_output=$(diff <(grep -v '^default_config_hash:' "$file1") <(grep -v '^default_config_hash:' "$file2"))
  if [ -z "$diff_output" ]; then
    return 0 # True: Only hash changed
  else
    return 1 # False: Other changes present
  fi
}

# Sync only existing files, ignoring those with only default_config_hash changes
for file in "$DEST_DIR"/*; do
  filename=$(basename "$file")
  source_file="$SOURCE_DIR/$filename"
  dest_file="$DEST_DIR/$filename"

  if [ -f "$source_file" ]; then
    if is_only_hash_change "$source_file" "$dest_file"; then
      echo "Ignoring $filename as only default_config_hash has changed."
    else
      echo "Updating $filename with changes from $source_file"
      cp "$source_file" "$DEST_DIR"
    fi
  fi
done

echo "Sync complete."
