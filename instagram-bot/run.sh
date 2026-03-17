#!/bin/bash
# Instagram Bot — Daily Run Script
# Runs the full bot routine (follow, unfollow, like, comment)
#
# Schedule 2 sessions per day via cron:
#   crontab -e
#   0 10 * * * /Users/philippesaint-hubert/Documents/growth4u-landing/instagram-bot/run.sh
#   0 17 * * * /Users/philippesaint-hubert/Documents/growth4u-landing/instagram-bot/run.sh

cd "$(dirname "$0")"

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Headless mode for automated runs (no display needed)
export HEADLESS=true

# Log output
LOG_FILE="data/bot-$(date +%Y-%m-%d).log"
echo "=== Bot run: $(date) ===" >> "$LOG_FILE"

# Run the bot
node --import tsx src/daily.ts >> "$LOG_FILE" 2>&1

echo "=== Run complete: $(date) ===" >> "$LOG_FILE"
