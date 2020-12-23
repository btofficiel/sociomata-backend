sudo pm2 stop backend
# actually start the server
sudo pm2 start /home/ubuntu/backend/index.js --name "backend"
