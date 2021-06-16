const api = require('./api');

const fetchTimezones = async (db, sql) => {
    let timezones = await db.manyOrNone(sql, []);

    return api.createSuccessResponse(200, { timezones });
};

module.exports = {
    fetchTimezones
};
