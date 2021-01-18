'use strict';
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });
const Hapi = require('@hapi/hapi');
const Boom = require('@hapi/boom');
const AuthJWT = require('hapi-auth-jwt2');
const logger = require('./config/logger');
const client = require('./config/db');
const { user } = require('./lib/sql.js');
const registerRoutes = require('./lib/routes');


const init = async () => {

    const server = Hapi.server({
        port: 3001,
        routes: {
            validate: {
                options: {
                    abortEarly: false
                },
                failAction: async (request, response, err) => {
                    throw Boom.badRequest(err.message);
                }
            }
        }       
    });
    
    const validate = async (decoded, request, h) => {
        try {
            const account = await client.any(user.check_user_byid, [decoded._id]);
            if(account.length > 0) {
                request.app._id = account[0].id;
                return { isValid: true }
            }
            else {
                return { isValid: false }
            }
        } catch(e){
            h.response({
                status: 'fail',
                statusCode: 500
            });
        }
    };

    await server.register(AuthJWT);
    server.auth.strategy('jwt', 'jwt',
    {
        key: process.env.JWT_SECRET, 
        validate,
        verifyOptions: {
          ignoreExpirations: false,
          algorithms: ['HS256']
        }
    });

    registerRoutes(server, client);

    server.events.on('response', (request) => {
      logger.info("Request log", { 
        path: request.path, 
        method: request.method,
        timestamp: new Date(),
        userid: request.app._id,
        statusCode: request.response.statusCode
      });
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (reason, promise) => {
  const errorString = String(reason.stack);
  logger.error("unhandledRejection", {timestamp: new Date(), error: errorString});
});

init();
