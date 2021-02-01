const getUnixTime = require('date-fns/getUnixTime');
const { twitter } = require('./sql.js');
const api = require('./api');
const utils = require('./utils');

const createTwitterThread = async (tweets, post_id, db, sql) => {
    for (const tweet of tweets) {
        await db.any(sql, [tweet.tweet, post_id, tweet.tweet_order]);
    }
};

const createPost = async (payload, id, db, sql) => {
    const { 
        timestamp,
        recurring,
        description,
        category_id,
        tweets
    } = payload;

    const ts = utils.adjustTimestamp(getUnixTime(timestamp));

    const post = await db.one(sql,  [ts, recurring, description, id, 1, 1, category_id]); 
    await createTwitterThread(tweets, post.id, db, twitter.create_thread);
    return api.createSuccessResponse(200, { post }); 
};

const editTwitterThread = async (tweets, post_id, db, sql) => {
    tweets = tweets.sort((a,b)=>{ return a.tweet_order-b.tweet_order;});
    for (const tweet of tweets) {
        await db.any(sql, [tweet.tweet, post_id, tweet.tweet_order]);
    }
};

const editPost = async (payload, post_id, id, db, sql) => {
    const { 
        timestamp,
        description,
        category_id,
        tweets
    } = payload;

    const ts = utils.adjustTimestamp(getUnixTime(timestamp));

    const post = await db.one(sql,  [ts, description, post_id, category_id, id]); 
    await editTwitterThread(tweets, post.id, db, twitter.upsert_thread);
    return api.createSuccessResponse(200, { post }); 
};

const deletePost = async (id, post_id, db, sql) => {
    await db.any(sql, [post_id, id]);
    return api.createSuccessResponse(200);
};

const fetchPosts = async (id, db, sql) => {
    const posts = await db.manyOrNone(sql, [id]);
    return api.createSuccessResponse(200, { posts });
};

module.exports = {
    createPost,
    editPost,
    deletePost,
    fetchPosts,
    createTwitterThread,
    editTwitterThread
};
