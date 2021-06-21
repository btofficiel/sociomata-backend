const api = require('./api');

const fetchProfile = async (id, db, sql) => {
    let profile = await db.oneOrNone(sql.profile, [id]);
    let twitterConnection = await db.oneOrNone(sql.twitter, [id]);
    let user = await db.oneOrNone(sql.email, [id]);

    return api.createSuccessResponse(200, {
        profile,
        email: user.email,
        twitter: (twitterConnection !== null)
    });
}

const editProfile = async (payload, id, db, sql) => {
    const {
        name,
        timezone
    } = payload;

    await db.oneOrNone(sql, [id, name, timezone]);

    return api.createSuccessResponse(200);
}

module.exports = {
    fetchProfile,
    editProfile
}
