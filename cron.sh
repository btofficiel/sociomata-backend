if [ -f .env ]; then
    # Load Environment Variables
    export $(grep PROJECT_DIRECTORY= $1/.env)
    $2/node $PROJECT_DIRECTORY/cron.js
fi
