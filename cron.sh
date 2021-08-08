if [ -f $1/.env ]; then
    # Load Environment Variables
    # export $(grep PROJECT_DIRECTORY= $1/.env)
    cd $1
    $2/node $1/cron.js
fi
