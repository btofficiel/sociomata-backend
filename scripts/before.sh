#!/bin/bash

cd /home/ubuntu/backend
sudo rm -rf .env
sudo npm install
if [ "$DEPLOYMENT_GROUP_NAME" == "Staging" ]
then
    echo "Retrieving environment variables..."
    echo DB_HOST=$(aws ssm get-parameter --name sociomata-staging-db_host --with-decryption --query Parameter.Value) >> .env
    echo DB_USER=$(aws ssm get-parameter --name sociomata-staging-db_user --with-decryption --query Parameter.Value) >> .env
    echo DB_PASS=$(aws ssm get-parameter --name sociomata-staging-db_pass --with-decryption --query Parameter.Value) >> .env
    echo DB_PORT=5432 >> .env
    echo DB_NAME=$(aws ssm get-parameter --name sociomata-staging-db --with-decryption --query Parameter.Value) >> .env
    echo DB_ENCRYPTION_ALGO="\"compress-algo=2, cipher-algo=aes256\"" >> .env
    echo ENV_HOST=$(aws ssm get-parameter --name sociomata-staging-host --with-decryption --query Parameter.Value) >> .env
    echo TWITTER_APIKEY=$(aws ssm get-parameter --name sociomata-twitter_apikey --with-decryption --query Parameter.Value) >> .env
    echo TWITTER_SECRET=$(aws ssm get-parameter --name sociomata-twitter_secret --with-decryption --query Parameter.Value) >> .env
    echo TWITTER_PASSWORD=$(aws ssm get-parameter --name sociomata-staging-twitter_pass --with-decryption --query Parameter.Value) >> .env
    echo TWITTER_DB_KEY=$(aws ssm get-parameter --name sociomata-staging-twitter-dbkey --with-decryption --query Parameter.Value) >> .env
    echo JWT_SECRET=$(aws ssm get-parameter --name sociomata-staging-jwt_secret --with-decryption --query Parameter.Value) >> .env
    echo JWT_CRON_SECRET=$(aws ssm get-parameter --name sociomata-staging-jwt-cron --with-decryption --query Parameter.Value) >> .env
    echo JWT_TEMP_SECRET=$(aws ssm get-parameter --name sociomata-staging-jwt-temp --with-decryption --query Parameter.Value) >> .env
    echo PROJECT_DIRECTORY=/home/ubuntu/backend >> .env
    echo LOG_DIRECTORY="/home/ubuntu/backend-logs" >> .env
    echo ENV=staging >> .env
    echo "Environment variables retrieved successfully"
else
    echo "Production not setup yet"
fi

