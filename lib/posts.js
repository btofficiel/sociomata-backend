const getUnixTime = require('date-fns/getUnixTime');
const { twitter } = require('./sql.js');
const api = require('./api');

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
        tweets
    } = payload;

    const post = await db.one(sql,  [getUnixTime(timestamp), recurring, description, id, 1, 1]); 
    await createTwitterThread(tweets, post.id, db, twitter.create_thread);
    return api.createSuccessResponse(200, { post }); 
};

const editTwitterThread = async (tweets, post_id, db, sql) => {
    tweets = tweets.sort((a,b)=>{ return a.tweet_order-b.tweet_order;});
    for (const tweet of tweets) {
        await db.any(sql, [tweet.tweet, post_id, tweet.tweet_order]);
    }

};

const editPost = async (payload, post_id, db, sql) => {
    const { 
        timestamp,
        description,
        tweets
    } = payload;

    const post = await db.one(sql,  [getUnixTime(timestamp), description, post_id]); 
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
    fetchPosts
};
