const { TwitterClient } = require('twitter-api-client');
const api = require('./api');

const sendTweets = async (thread=[], twitterClient) => {
    let tweet_ids = [null];

    for(let i=0; i < thread.length;i++) {
        let tweet = await twitterClient.tweets.statusesUpdate({
            status: thread[i].tweet,
            in_reply_to_status_id: tweet_ids[i]
        });
        tweet_ids.push(tweet.id_str);
    }
};

const dispatchTweets = async (id, post_id, db, sql, env) => {
    const credentials = await db.oneOrNone(sql.fetch_auth, [id, env.TWITTER_DB_KEY, env.DB_ENCRYPTION_ALGO]);
    if(credentials) {
        const thread = await db.many(sql.fetch_thread, [post_id]);
        if(thread.length === 0) {
            return api.createFailedResponse(409, 'No tweets found');
        };

        const twitterClient = new TwitterClient({
            apiKey: env.TWITTER_APIKEY,
            apiSecret: env.TWITTER_SECRET,
            accessToken: credentials.token,
            accessTokenSecret: credentials.secret,
        });
        
        await sendTweets(thread, twitterClient);

        return api.createSuccessResponse(200);
    }
    else {
        return api.createFailedResponse(409, "Twitter account not connected");
    }
};

const dispatchTweetsNow = async (id, thread, db, sql, env) => {
    const credentials = await db.oneOrNone(sql, [id, env.TWITTER_DB_KEY, env.DB_ENCRYPTION_ALGO]);
    if(credentials) {
        const twitterClient = new TwitterClient({
            apiKey: env.TWITTER_APIKEY,
            apiSecret: env.TWITTER_SECRET,
            accessToken: credentials.token,
            accessTokenSecret: credentials.secret,
        });
        
        await sendTweets(thread, twitterClient);

        return api.createSuccessResponse(200);
    }
    else {
        return api.createFailedResponse(409, "Please connect your twitter account in settings");
    }
};

module.exports = {
    dispatchTweets,
    dispatchTweetsNow
};

