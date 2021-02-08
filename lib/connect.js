const api = require('./api');

const storeTwitterTokens = async (sql, params, db) => {
    const rows = await db.one(sql, params);
    return rows;
};

const deleteTwitterTokens = async (id, db, sql) => {
    const result = await db.result(sql, [id]);
    if(result.rowCount > 0) {
        return api.createSuccessResponse(200);
    }
    else {
        return api.createFailedResponse(409, 'Not connected to any twitter account');
    }
};

module.exports = {
    storeTwitterTokens,
    deleteTwitterTokens
};
