const api = require('./api');

const createCategory= async (payload, id, db, sql) => {
    let { name } = payload;
    let category = await db.one(sql, [name, id]);
    return api.createSuccessResponse(200, { category });
};

const editCategory = async (payload, category_id, id, db, sql) => {
    let { name } = payload;
    let category = await db.one(sql, [name, category_id, id]);
    return api.createSuccessResponse(200, { category });
};

const fetchCategories = async (id, db, sql) => {
    let categories = await db.manyOrNone(sql, [id]);
    return api.createSuccessResponse(200, { categories });
};

const deleteCategory = async (category_id, id, db, sql) => {
    await db.any(sql, [category_id, id]);
    return api.createSuccessResponse(200);
}

module.exports = {
    deleteCategory,
    fetchCategories,
    editCategory,
    createCategory
};
