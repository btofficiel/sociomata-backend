const { TwitterClient } = require('twitter-api-client');
const api = require('./api');
const helpers = require('./helpers');
const { flattenMediaArrays } = require('./posts');
const { writeFile } = require('fs/promises');

const compareMedia = (a, b) => {
    return a.media_order-b.media_order;
}

const getTwitterMedia = async media => {
    let { media_order, twitterClient } = media;

    let mediaData = await helpers.getMediaV2(media.media_key);

    let tw_params = {
        media: mediaData.toString('base64'),
        media_category: "tweet_image"
    };

    let twitterMedia = await twitterClient.media.mediaUpload(tw_params);
    return {
        media_order,
        media_id: twitterMedia.media_id_string
    };
};



const getTwitterMediaFromBase64 = async media => {
    let { media_order, twitterClient } = media;

    let tw_params = {
        media: media.url,
        media_category: "tweet_image"
    };

    let twitterMedia = await twitterClient.media.mediaUpload(tw_params);
    return {
        media_order,
        media_id: twitterMedia.media_id_string
    };
};



const sendTweets = async (thread=[], mediaList=[], twitterClient, postNow=false) => {
    let tweet_ids = [null];
    
    for(let i=0; i < thread.length;i++) {
        let media = mediaList.filter(m=>m.tweet_order===(i+1)).map(c=>{ return {...c, twitterClient}});
        if(media.length > 0) {
            let mapFn = postNow ? getTwitterMediaFromBase64 : getTwitterMedia;
            let media_ids = await Promise.all(media.map(mapFn));
            media_ids = media_ids.sort(compareMedia).map(m=>m.media_id);
            let joinedMediaIds = media_ids.join();

            let tweet = await twitterClient.tweets.statusesUpdate({
                media_ids: joinedMediaIds,
                status: thread[i].tweet,
                in_reply_to_status_id: tweet_ids[i]
            });
            tweet_ids.push(tweet.id_str);
        } 
        else {
            let tweet = await twitterClient.tweets.statusesUpdate({
                status: thread[i].tweet,
                in_reply_to_status_id: tweet_ids[i]
            });
            tweet_ids.push(tweet.id_str);
        }
    }
};

const dispatchTweets = async (account, post_id, db, sql, env) => {
    const credentials = await db.oneOrNone(sql.fetch_auth, [account, env.TWITTER_DB_KEY, env.DB_ENCRYPTION_ALGO]);
    if(credentials) {
        const thread = await db.many(sql.fetch_thread, [post_id]);
        if(thread.length === 0) {
            return api.createFailedResponse(409, 'No tweets found');
        };

        const { plug_id } = await db.one(sql.fetch_post, [post_id, account]);

        if(plug_id) {
            const plug = await db.one(sql.fetch_plug, [plug_id, account]);
            let plugTweet = {
                tweet: plug.content,
                tweet_order: thread.length+1
            };

            thread.push(plugTweet);
        }

        const mediaList = await db.manyOrNone(sql.fetch_media, [post_id]); 

        const twitterClient = new TwitterClient({
            apiKey: env.TWITTER_APIKEY,
            apiSecret: env.TWITTER_SECRET,
            accessToken: credentials.token,
            accessTokenSecret: credentials.secret,
        });
        
        await sendTweets(thread, mediaList, twitterClient);

        return api.createSuccessResponse(200);
    }
    else {
        return api.createFailedResponse(409, "Twitter account not connected");
    }
}

const dispatchTweetsNow = async (id, thread, media, db, sql, env) => {
    const credentials = await db.oneOrNone(sql, [id, env.TWITTER_DB_KEY, env.DB_ENCRYPTION_ALGO]);
    if(credentials) {
        const twitterClient = new TwitterClient({
            apiKey: env.TWITTER_APIKEY,
            apiSecret: env.TWITTER_SECRET,
            accessToken: credentials.token,
            accessTokenSecret: credentials.secret,
        });

        let mediaList = media.map(m=>{ return { ...m, media_key: m.key } });
        
        await sendTweets(thread, mediaList, twitterClient, false);

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

