#!/bin/bash

cd /home/ubuntu/backend
rm -rf .env
npm install
if [ "$DEPLOYMENT_GROUP_NAME" == "Staging" ]
then
    echo "Retrieving environment variables..."
    echo DB_HOST=$(aws ssm get-parameter --name sociomata-staging-db_host --with-decryption --query Parameter.Value) >> .env
    echo DB_USER=$(aws ssm get-parameter --name sociomata-staging-db_user --with-decryption --query Parameter.Value) >> .env
    echo DB_PASS=$(aws ssm get-parameter --name sociomata-staging-db_pass --with-decryption --query Parameter.Value) >> .env
    echo DB_PORT=5432 >> .env
    echo DB_NAME=$(aws ssm get-parameter --name sociomata-staging-db --with-decryption --query Parameter.Value) >> .env
    echo TWITTER_APIKEY=$(aws ssm get-parameter --name sociomata-twitter_apikey --with-decryption --query Parameter.Value) >> .env
    echo TWITTER_SECRET=$(aws ssm get-parameter --name sociomata-twitter_secret --with-decryption --query Parameter.Value) >> .env
    echo TWITTER_PASSWORD=$(aws ssm get-parameter --name sociomata-staging-twitter_pass --with-decryption --query Parameter.Value) >> .env
    echo LOG_DIRECTORY="/home/ubuntu/backend-logs" >> .env
    echo ENV=staging >> .env
    echo "Environment variables retrieved successfully"
else
    echo "Production not setup yet"
fi

