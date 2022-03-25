'use strict';
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const fetch = require('node-fetch');
const client = require('./config/db');

const { TwitterApi } = require('twitter-api-v2');

const query = `
        SELECT 
        id,
        pgp_sym_decrypt(
        token::bytea,
        $2, $3) AS token,
        pgp_sym_decrypt(
        secret::bytea,
        $2, $3) AS secret
        FROM social_accounts
        `;

const query2 = `UPDATE social_accounts SET identifier=$1, description=$2, platform_id=$3 where id=$4`; 

const updateProfile = async (user) => {
        const userClient = new TwitterApi({
                appKey: process.env.TWITTER_APIKEY,
                appSecret: process.env.TWITTER_SECRET,
          // Following access tokens are not required if you are
          // at part 1 of user-auth process (ask for a request token)
          // or if you want a app-only client (see below)
                accessToken: user.token,
                accessSecret: user.secret,
        });

        let {data} = await userClient.v2.me();
        await client.none(query2, [data.id, `${data.name} - @${data.username}`, 1, user.id]);
        return data;
};

const updateProfiles = async () => {
        const res = await client.manyOrNone(query, [1, process.env.TWITTER_DB_KEY, process.env.DB_ENCRYPTION_ALGO]);
        const profiles = await Promise.all(res.map(updateProfile));
        console.log(profiles);
};

updateProfiles();
