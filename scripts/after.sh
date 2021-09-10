#!/bin/bash

cd /home/ubuntu/backend
sudo rm -rf .env
sudo npm install
if [ "$DEPLOYMENT_GROUP_NAME" == "Staging" ]
then
    sudo echo "Retrieving environment variables..."
    sudo echo DB_HOST=$(aws ssm get-parameter --name sociomata-staging-db_host --with-decryption --query Parameter.Value) >> .env
    sudo echo DB_USER=$(aws ssm get-parameter --name sociomata-staging-db_user --with-decryption --query Parameter.Value) >> .env
    sudo echo DB_PASS=$(aws ssm get-parameter --name sociomata-staging-db_pass --with-decryption --query Parameter.Value) >> .env
    sudo echo DB_PORT=5432 >> .env
    sudo echo DB_NAME=$(aws ssm get-parameter --name sociomata-staging-db --with-decryption --query Parameter.Value) >> .env
    sudo echo DB_ENCRYPTION_ALGO="\"compress-algo=2, cipher-algo=aes256\"" >> .env
    sudo echo ENV_HOST=$(aws ssm get-parameter --name sociomata-staging-host --with-decryption --query Parameter.Value) >> .env
    sudo echo TWITTER_APIKEY=$(aws ssm get-parameter --name sociomata-twitter_apikey --with-decryption --query Parameter.Value) >> .env
    sudo echo TWITTER_SECRET=$(aws ssm get-parameter --name sociomata-twitter_secret --with-decryption --query Parameter.Value) >> .env
    sudo echo TWITTER_PASSWORD=$(aws ssm get-parameter --name sociomata-staging-twitter_pass --with-decryption --query Parameter.Value) >> .env
    sudo echo TWITTER_DB_KEY=$(aws ssm get-parameter --name sociomata-staging-twitter-dbkey --with-decryption --query Parameter.Value) >> .env
    sudo echo JWT_SECRET=$(aws ssm get-parameter --name sociomata-staging-jwt_secret --with-decryption --query Parameter.Value) >> .env
    sudo echo JWT_CRON_SECRET=$(aws ssm get-parameter --name sociomata-staging-jwt-cron --with-decryption --query Parameter.Value) >> .env
    sudo echo JWT_TEMP_SECRET=$(aws ssm get-parameter --name sociomata-staging-jwt-temp --with-decryption --query Parameter.Value) >> .env
    sudo echo PROJECT_DIRECTORY=/home/ubuntu/backend >> .env
    sudo echo LOG_DIRECTORY="/home/ubuntu/backend-logs" >> .env
    sudo echo ENV=staging >> .env
    sudo echo S3_BUCKET=sociomata-staging >> .env
    sudo echo AWS_REGION=us-east-2 >> .env
    sudo echo AWS_SDK_LOAD_CONFIG="true" >> .env
    sudo echo "Environment variables retrieved successfully"
else
    echo "Retrieving environment variables..."
    sudo echo DB_HOST=$(aws ssm get-parameter --name prod-db_host --with-decryption --query Parameter.Value) >> .env
    sudo echo DB_USER=$(aws ssm get-parameter --name prod-db_user --with-decryption --query Parameter.Value) >> .env
    sudo echo DB_PASS=$(aws ssm get-parameter --name sociomata-prod-db_pass --with-decryption --query Parameter.Value) >> .env
    sudo echo DB_PORT=5432 >> .env
    sudo echo DB_NAME=$(aws ssm get-parameter --name prod-db --with-decryption --query Parameter.Value) >> .env
    sudo echo DB_ENCRYPTION_ALGO="\"compress-algo=2, cipher-algo=aes256\"" >> .env
    sudo echo ENV_HOST=$(aws ssm get-parameter --name prod-host --with-decryption --query Parameter.Value) >> .env
    sudo echo TWITTER_APIKEY=$(aws ssm get-parameter --name sociomata-twitter_apikey --with-decryption --query Parameter.Value) >> .env
    sudo echo TWITTER_SECRET=$(aws ssm get-parameter --name sociomata-twitter_secret --with-decryption --query Parameter.Value) >> .env
    sudo echo TWITTER_PASSWORD=$(aws ssm get-parameter --name prod-twitter_pass --with-decryption --query Parameter.Value) >> .env
    sudo echo TWITTER_DB_KEY=$(aws ssm get-parameter --name prod-twitter_dbkey --with-decryption --query Parameter.Value) >> .env
    sudo echo JWT_SECRET=$(aws ssm get-parameter --name prod-jwt_secret --with-decryption --query Parameter.Value) >> .env
    sudo echo JWT_CRON_SECRET=$(aws ssm get-parameter --name prod-jwt_cron --with-decryption --query Parameter.Value) >> .env
    sudo echo JWT_TEMP_SECRET=$(aws ssm get-parameter --name prod-jwt_temp --with-decryption --query Parameter.Value) >> .env
    sudo echo PROJECT_DIRECTORY=/home/ubuntu/backend >> .env
    sudo echo LOG_DIRECTORY="/home/ubuntu/backend-logs" >> .env
    sudo echo ENV=prod >> .env
    sudo echo S3_BUCKET=sociomata-prod >> .env
    sudo echo AWS_REGION=us-east-2 >> .env
    sudo echo AWS_SDK_LOAD_CONFIG="true" >> .env
    sudo echo "Environment variables retrieved successfully"
fi

