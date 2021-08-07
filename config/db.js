const pgp = require('pg-promise')();

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    allowExitOnIdle: true
};


const client = pgp(dbConfig);

module.exports = client;
