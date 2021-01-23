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
        let { email, password, ...rest } = payload;
        return rest;
    }
};

module.exports = {
    createSuccessResponse,
    createFailedResponse,
    sanitizePayload
};
