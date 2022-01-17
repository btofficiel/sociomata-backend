const api = require('./api');
const getUnixTime = require('date-fns/getUnixTime');

const createPlug = async (payload, account, db, sql) => {
    let {
        name,
        content
    } = payload;

    let currentTS = getUnixTime(new Date());

    let result = await db.none(sql, [account, name, content, currentTS]);

    return api.createSuccessResponse(200);
};

const editPlug = async (payload, plug_id, account, db, sql) => {
    let {
        name,
        content
    } = payload;

    let result = await db.none(sql, [name, content, plug_id, account]);

    return api.createSuccessResponse(200);
};

const deletePlug = async (plug_id, account, db, sql) => {
    await db.none(sql, [plug_id, account]);

    return api.createSuccessResponse(200);
};

const fetchPlugs = async (account, db, sql) => {
    let plugs = await db.manyOrNone(sql, [account]);

    return api.createSuccessResponse(200, { plugs });
};

const fetchPlug = async (plug_id, account, db, sql) => {
    let plug = await db.one(sql, [plug_id, account]);

    return api.createSuccessResponse(200, { plug });
};

module.exports = {
    createPlug,
    editPlug,
    deletePlug,
    fetchPlugs,
    fetchPlug
};
