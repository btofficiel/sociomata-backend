const getUnixTime = require('date-fns/getUnixTime');
const { twitter } = require('./sql.js');
const api = require('./api');
const utils = require('./utils');

const getPostsAsDict = (basetime, postList) => {
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
            if(post.timestamp >= currentDayStart && post.timestamp <= currentDayEnd) {
                posts[currentDayStart].push(post);
            }
            else {
                currentDayStart += 86400;
                currentDayEnd += 86400;
                posts[currentDayStart].push(post);
            }
        }

        resolve(posts);
    });
}

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

const getTimestamp = (offset, ts=getUnixTime(Date.now())) => {
    const timestampTodayUTC = Math.floor(ts/86400)*86400;
    return timestampTodayUTC-(offset*60);
}

    

const fetchPostsQueue = async (id, db, sql, ts=null) => {
    const profile = await db.oneOrNone(sql.profile, [id]);
    const offset = (profile ? profile.offset_mins : 0);
    const timestampStart = (ts ? getTimestamp(offset, ts) : getTimestamp(offset));
    const timestamp6DaysAhead = timestampStart+(86400*6)-60;

    const postsList = await db.manyOrNone(sql.posts, [id, timestampStart, timestamp6DaysAhead]);

    const posts = await getPostsAsDict(timestampStart, postsList);

    return api.createSuccessResponse(200, { posts });
};

module.exports = {
    createPost,
    editPost,
    deletePost,
    fetchPostsQueue,
    createTwitterThread,
    editTwitterThread
};
