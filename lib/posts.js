const getUnixTime = require('date-fns/getUnixTime');
const { twitter } = require('./sql.js');
const api = require('./api');
const utils = require('./utils');

const getTimestamp = (offset, ts=getUnixTime(Date.now())) => {
    const timestampTodayUTC = Math.floor(ts/86400)*86400;
    return timestampTodayUTC-(offset*60);
};

const getPostsAsDict = (basetime, postList, offset) => {
    return new Promise((resolve, reject)=>{
        if(typeof basetime != "number") {
            reject(new Error("Type of basetime must be number"));
        }

        let posts = {};

        for(let i=0;i<7;i++) {
            posts[basetime+(i*86400)] = [];
        }


        let currentDayStart = basetime;
        let currentDayEnd = basetime+86400-60;

        for(let post of postList) {
            let ts = getTimestamp(offset, post.timestamp);
            posts[ts].push(post); 
        }

        resolve(posts);
    });
}

const createTwitterThread = async (tweets, post_id, db, sql) => {
    return db.batch(tweets.map(tweet => db.none(sql, [tweet.tweet, post_id, tweet.tweet_order])));
};

const createPost = async (payload, id, db, sql) => {
    const { 
        timestamp,
        recurring,
        category_id,
        tweets
    } = payload;

    let twitterConnection = await db.oneOrNone(sql.twitter, [id]);
    if(twitterConnection) {
        let description = tweets[0].tweet.trim().substring(0, 100);

        const ts = utils.adjustTimestamp(getUnixTime(timestamp));

        await db.tx('createPostTx', async t => {
            const post = await t.one(sql.create_post,  [ts, recurring, description, id, 1, 1, category_id]); 
            return createTwitterThread(tweets, post.id, t, sql.create_thread);
        })

        return api.createSuccessResponse(200); 
    }
    else {
        return api.createFailedResponse(409, "Please connect your twitter account in settings");
    }
};

const editTwitterThread = async (tweets, post_id, db, sql) => {
    return db.batch(tweets.map(tweet=>db.none(sql, [tweet.tweet, post_id, tweet.tweet_order])));
};

const editPost = async (payload, post_id, id, db, sql) => {
    const { 
        timestamp,
        category_id,
        tweets
    } = payload;

    let description = tweets[0].tweet.trim().substring(0, 100);

    const ts = utils.adjustTimestamp(getUnixTime(timestamp));

    await db.tx('editPostTx', async t => { 
        const post = await t.one(sql.edit_post,  [ts, description, post_id, category_id, id]); 
        await t.none(sql.delete_extras, [post_id, tweets.length]);
        return editTwitterThread(tweets, post.id, t, sql.upsert_thread);
    });

    return api.createSuccessResponse(200); 
};

const deletePost = async (id, post_id, db, sql) => {
    await db.any(sql, [post_id, id]);
    return api.createSuccessResponse(200);
};

const fetchPost = async (id, post_id, db, sql) => {
    let post = await db.one(sql.fetch_post, [post_id, id]);
    let tweets = await db.many(sql.fetch_thread, [post_id]);
    
    post = { 
        ...post, 
        tweets
    };

    return api.createSuccessResponse(200, { post });
};


    

const fetchPostsQueue = async (id, db, sql, ts=null) => {
    const profile = await db.oneOrNone(sql.profile, [id]);
    const offset = (profile ? profile.offset_mins : 0);
    const timestampStart = (ts ? (ts+86400) : getTimestamp(offset));
    const timestamp6DaysAhead = timestampStart+(86400*7)-60;
    const postsList = await db.manyOrNone(sql.posts, [id, timestampStart, timestamp6DaysAhead]);

    const posts = await getPostsAsDict(timestampStart, postsList, offset);

    return api.createSuccessResponse(200, { posts });
};

module.exports = {
    createPost,
    editPost,
    deletePost,
    fetchPost,
    fetchPostsQueue,
    createTwitterThread,
    editTwitterThread
};
