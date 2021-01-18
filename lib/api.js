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

const sanitizePayload = ({ email, password, ...rest}={}) => {
    return rest;
};

module.exports = {
    createSuccessResponse,
    createFailedResponse,
    sanitizePayload
};
