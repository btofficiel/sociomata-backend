const pgp = require('pg-promise')();

const configureSSL = () => {
    switch(process.env.ENV) {
        case "dev":
            return false;
        case "prod":
            return {rejectUnauthorized: false};
        case "staging":
            return true;
        default:
            return false;
    }
};

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    ssl: configureSSL(),
    allowExitOnIdle: true
};


const client = pgp(dbConfig);

module.exports = client;
