const api = require('./api');

const createPlug = async (payload, id, db, sql) => {
    let {
        name,
        plug
    } = payload;

    let result = await db.one(sql, [name, plug, id]);

    return api.createSuccessResponse(200, { plug: result });
};

const editPlug = async (payload, plug_id, id, db, sql) => {
    let {
        name,
        plug
    } = payload;

    let result = await db.one(sql, [name, plug, plug_id, id]);

    return api.createSuccessResponse(200, { plug: result });
};

const deletePlug = async (plug_id, id, db, sql) => {
    await db.any(sql, [plug_id, id]);

    return api.createSuccessResponse(200);
};

const fetchPlugs = async (id, db, sql) => {
    let plugs = await db.manyOrNone(sql, [id]);

    return api.createSuccessResponse(200, { plugs });
};

module.exports = {
    createPlug,
    editPlug,
    deletePlug,
    fetchPlugs
};
