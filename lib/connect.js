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
        return api.createFailedResponse(409, 'Sorry! but we found no twitter account connect with your ID');
    }
};

module.exports = {
    storeTwitterTokens,
    deleteTwitterTokens
};
