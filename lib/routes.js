const bcrypt = require('bcrypt');
const api = require('./api');
const validators = require('./validators');
const logger = require('../config/logger');
const { 
    createUser, 
    login 
} = require('./users');
const { 
    createPost, 
    editPost, 
    deletePost, 
    fetchPosts 
} = require('./posts');
const { 
    user, 
    post 
} = require('./sql.js');

const registerRoutes = (server, client) => {
    server.route({
        method: 'GET',
        path: '/posts',
        handler: async (request, h) => {
            try {
                const result = await fetchPosts(request.app._id, client, post.fetch_posts);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchPosts error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server"));
            }
        },
        options: {
            auth: 'jwt',
        }
    });

    server.route({
        method: 'POST',
        path: '/posts',
        handler: async (request, h) => {
            try {
                const result = await createPost(request.payload, request.app._id, client, post.create_post);
                return h.response(result);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("createPost error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server"));
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                payload: validators.posts["POST/posts"]
            }
        }
    });

    server.route({
        method: 'PUT',
        path: '/posts/{post_id}',
        handler: async (request, h) => {
            try {
                const result = await editPost(request.payload, request.params.post_id, client, post.edit_post);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("editPost error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server"));
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                payload: validators.posts["PUT/posts"],
                params: validators.posts["PUT/posts-params"]
            }
        }
    });

    server.route({
        method: 'DELETE',
        path: '/posts/{post_id}',
        handler: async (request, h) => {
            try {
                const result = await deletePost(request.app._id, request.params.post_id, client, post.delete_post);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("deletePost error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server"));
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                params: validators.posts["PUT/posts-params"]
            }
        }
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
                        statusCode: 409,
                        code: 'emall_exists',
                    }).code(409);
                }
                
                const errorString = String(e.stack);
                logger.error("createUser error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server"));
            }
        },
        options: {
            auth: false,
            validate: {
                payload: validators.users["POST/signup"]
            }
        }
    });


    server.route({
        method: 'POST',
        path: '/login',
        handler:  async (request, h) => {
            try {
                const result = await login(request.payload, client, bcrypt, user.check_user);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("login error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server"));
            }
        },
        options: {
            validate: {
                payload: validators.users["POST/login"]
            }
        }
    });
};

module.exports = registerRoutes;