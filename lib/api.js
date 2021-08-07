const jwt = require('jsonwebtoken');

const validateDecodedToken = async (client, sql, decoded, request) => {
    const account = await client.any(sql, [decoded._id]);
    if(account.length > 0) {
        request.app._id = account[0].id;
        return { isValid: true }
    }
    else {
        return { isValid: false }
    }
};

const createSuccessResponse = (code, data=null) => {
    return {
        status: 'success',
        statusCode: code,
        data
    };
};

const createFailedResponse = (code, message) => {
    return {
        status: 'fail',
        statusCode: code,
        message
    };
};

const sanitizePayload = (payload) => {
    if(!payload) {
        return {};
    }
    else {
        let { email, password, avatar, ...rest } = payload;
        return rest;
    }
};

const createToken = (token, secret, options={}) => {
    return new Promise(function(resolve, reject) {
        jwt.sign(token, secret, { 
            algorithm: "HS256",
            ...options
        }, function(err, token) {
            if(err) {
                reject(err);
            }
            else {
                resolve(token);
            }
        });
    });
};

const verifyToken = (token, secret) => {
    return new Promise(function(resolve, reject) {
        jwt.verify(token, secret, function(err, decoded) {
            if(err) {
                reject(err)
            }
            else {
                resolve(decoded)
            }
        })
    });
};


module.exports = {
    validateDecodedToken,
    createToken,
    verifyToken,
    createSuccessResponse,
    createFailedResponse,
    sanitizePayload
};
