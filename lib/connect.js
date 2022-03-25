const api = require('./api');
const fetch = require('node-fetch');
const getUnixTime = require('date-fns/getUnixTime');

const storeTokens = async (sql, params, db) => {
    const rows = await db.one(sql, params);
    return rows;
};


const storeFBUserToken = async (sql, params, db) => {

}

const deleteTwitterTokens = async (id, social_id, db, sql) => {
    const result = await db.result(sql, [Number(social_id), id]);
    if(result.rowCount > 0) {
        return api.createSuccessResponse(200);
    }
    else {
        return api.createFailedResponse(409, 'Sorry! But we found no social account connect with the given ID');
    }
};

const getFacebookAccessToken = async (code) => {
    let _params = {
        client_id: process.env.FB_ID,
        client_secret: process.env.FB_SECRET,
        redirect_uri: `https://${process.env.NGROK}/api/connect/facebook`,
        code
    };

    const _url = 'https://graph.facebook.com/v13.0/oauth/access_token?'+new URLSearchParams(_params);

    let _response = await fetch(_url);

    let _parsed = await _response.json()

    let params = {
        client_id: process.env.FB_ID,
        client_secret: process.env.FB_SECRET,
        grant_type: 'fb_exchange_token',
        fb_exchange_token: _parsed.access_token
    };

    const url = 'https://graph.facebook.com/v13.0/oauth/access_token?'+new URLSearchParams(params);

    let response = await fetch(url);
    let parsed = await response.json()

    let currentTS = getUnixTime(new Date());

    return {...parsed, valid_till: currentTS+5183944};
}

const getFacebookPageTokens = async (token) => {
    let _response = await fetch(`https://graph.facebook.com/v13.0/me?access_token=${token}`);
    let _id = await _response.json();

    let response = await fetch(`https://graph.facebook.com/${_id.id}/accounts?fields=name,access_token,instagram_business_account&access_token=${token}`);

    let parsed = await response.json();

    return {...parsed, personal: _id}
}


module.exports = {
    storeTokens,
    deleteTwitterTokens,
    getFacebookPageTokens,
    getFacebookAccessToken
};
