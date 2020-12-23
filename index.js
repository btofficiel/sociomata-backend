'use strict';

require('dotenv').config()
const Hapi = require('@hapi/hapi');
const AuthJWT = require('hapi-auth-jwt2');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const logger = require('./config/logger');
const client = require('./config/db');
const { createUser, login } = require('./lib/users');
const { user } = require('./lib/sql.js');


const init = async () => {

    const server = Hapi.server({
        port: 3001
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

    server.events.on('response', (request) => {
      logger.info("Request log", { 
        path: request.path, 
        method: request.method,
        timestamp: new Date(),
        userid: request.app._id,
        statusCode: request.response.statusCode
      });
    });

    server.route({
        method: 'POST',
        path: '/signup',
        handler: async (request, h) => {
            try {
                await createUser(request.payload, client, bcrypt, user.create_user);
                return h.response({
                    status: 'success',
                    statusCode: 200
                });
            } 
            catch(e) {
                if(e.code === '23505') {
                    return h.response({
                        status: 'fail',
                        statusCode: 200,
                        code: 'emall_exists',
                    }).code(200);
                }
                
                const errorString = String(e.stack);
                logger.error("createUser error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString
                });
                return h.response({
                    status: 'fail',
                    statusCode: 500
                }).code(500);
            }
        },
        options: {
            auth: false,
            validate: {
                payload: Joi.object({
                    email: Joi.string().email(),
                    password: Joi.string().min(6).max(128)
                })
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/login',
        handler:  async (request, h) => {
            try {
                const result = await login(request.payload, client, bcrypt, user.check_user);
                return h.response(result);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("login error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString
                });

                return h.response({
                    status: 'fail',
                    statusCode: 500
                }).code(500);
            }
        },
        options: {
            validate: {
                payload: Joi.object({
                    email: Joi.string().email(),
                    password: Joi.string().min(6).max(128)
                })
            }
        }
    });
    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (reason, promise) => {
  const errorString = String(reason.stack);
  logger.error("unhandledRejection", {timestamp: new Date(), error: errorString});
});

init();
