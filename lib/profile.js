const api = require('./api');

const fetchProfile = async (id, db, sql) => {
    let profile = await db.oneOrNone(sql.profile, [id]);
    let twitterConnection = await db.oneOrNone(sql.twitter, [id]);

    return api.createSuccessResponse(200, {
        profile,
        twitter: (twitterConnection !== null)
    });
}

module.exports = {
    fetchProfile
}
