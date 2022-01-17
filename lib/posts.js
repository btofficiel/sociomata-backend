const getUnixTime = require('date-fns/getUnixTime');
const Jimp = require('jimp');
const { twitter } = require('./sql.js');
const api = require('./api');
const helpers = require('./helpers');
const utils = require('./utils');
const { nanoid } = require('nanoid');

const getTimestamp = (offset, ts=getUnixTime(Date.now())) => {
    const timestampTodayUTC = Math.floor(ts/86400)*86400;
    const timestampTodayZone = timestampTodayUTC-(offset*60);
    const adjustedWithOffset = (offset < 0 ? timestampTodayZone-86400 : timestampTodayZone+86400);
    return (ts-timestampTodayZone >= 86400 ? adjustedWithOffset : timestampTodayZone);
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

const fetchPresignedURL = async media => {
    const mimeToExtension = {
        "image/png": "png",
        "image/jpeg": "jpeg"
    };

    if(media.newly_added) {
        let keyId = nanoid();
        let key = `twitter_images/${keyId}.${mimeToExtension[media.mime]}`; 
        let data = await helpers.createPresignedPost(key);
        return {
            ...media,
            url: data.url,
            fields: data.fields
        };
    }
    else {
        return {
            ...media,
            url: ""
        };
    }
};

const generatePresignedPosts = async payload => {
    const _payload = await fetchPresignedURL(payload);

    return api.createSuccessResponse(200, { media: _payload });
};

const createTwitterThread = async (tweets, post_id, db, sql) => {
    return db.batch(tweets.map(tweet => db.none(sql, [tweet.tweet, post_id, tweet.tweet_order])));
};

const addTwitterMedia = async (tweets, post_id, db, sql) => {
    return db.batch(tweets.map(tweet => db.none(sql, [post_id, tweet.tweet_order, tweet.media_order, tweet.key])));
};

const uploadMedia = async (media) => {
    let { media_order, tweet_order } = media;

    if(media.newly_added) {

        let mediaBuffer = await Buffer.from(media.url, 'base64');

        let image = await Jimp.read(mediaBuffer);

        const extention = image.getExtension();

        image = await image.getBufferAsync(Jimp.AUTO);
        
        let allowedMIMEtypes = ["jpeg", "jpg", "png"];

        if(allowedMIMEtypes.includes(extention)) {
            let keyId = nanoid();
            let key = `twitter_images/${keyId}.${extention}`; 

            await helpers.uploadToS3v2(image, key);

            return {
                key,
                tweet_order,
                media_order
            };
        }
        else {
            let err =new Error("Only JPG or PNG file is allowed");
            err.name = "FileTypeError";
            throw err
        }
    }
    else {
        return {
            key: `twitter_images/${media.url.split('twitter_images/')[1]}`,
            tweet_order,
            media_order
        };
    }
};

const flattenMediaArrays = (reducer, currentItem) => {
    let arr = []

    if(currentItem.media) {
        arr = currentItem.media.map((media, i)=> { 
            return { 
                ...media, 
                tweet_order: currentItem.tweet_order, 
                media_order: i+1 
            } 
        });
    }

    return reducer.concat(arr);
};

const uploadAllMedia = async mediaList => {
    let mediaKeys = [];
    for(let media of mediaList) {
        let result = await uploadMedia(media);
        mediaKeys.push(result);
    }

    return mediaKeys;
};


const createPost = async (payload, id, account, db, sql) => {
    const { 
        timestamp,
        recurring,
        plug_id,
        category_id,
        tweets,
        media
    } = payload;

    let twitterConnection = await db.oneOrNone(sql.twitter, [id]);
    if(twitterConnection) {
        let description = tweets[0].tweet.trim().substring(0, 100);

        const ts = utils.adjustTimestamp(getUnixTime(timestamp));

        await db.tx('createPostTx', async t => {
            const post = await t.one(sql.create_post,  [description, id, 1, category_id, plug_id]); 
            await t.none(sql.schedule, [post.id, account, ts, 1]);
            await createTwitterThread(tweets, post.id, t, sql.create_thread);
            return addTwitterMedia(media, post.id, t, sql.add_media);
        });

        return api.createSuccessResponse(200); 
    }
    else {
        return api.createFailedResponse(409, "Please connect your twitter account in settings");
    }
};

const createDraft = async (payload, id, account, db, sql) => {
    const { 
        plug_id,
        category_id,
        tweets,
        media
    } = payload;

    let twitterConnection = await db.oneOrNone(sql.twitter, [id]);
    if(twitterConnection) {
        let description = tweets[0].tweet.trim().substring(0, 100);

        await db.tx('createDraftTx', async t => {
            const post = await t.one(sql.create_post,  [description, id, 1, category_id, plug_id]); 
            await t.none(sql.draft, [post.id, account]);
            await createTwitterThread(tweets, post.id, t, sql.create_thread);
            return addTwitterMedia(media, post.id, t, sql.add_media);
        });

        return api.createSuccessResponse(200); 
    }
    else {
        return api.createFailedResponse(409, "Please connect your twitter account in settings");
    }
};

const editTwitterThread = async (tweets, post_id, db, sql) => {
    return db.batch(tweets.map(tweet=>db.none(sql, [tweet.tweet, post_id, tweet.tweet_order])));
};

const editPost = async (payload, post_id, id, account, db, sql) => {
    const { 
        timestamp,
        plug_id,
        category_id,
        tweets,
        media
    } = payload;

    let description = tweets[0].tweet.trim().substring(0, 100);

    const ts = utils.adjustTimestamp(getUnixTime(timestamp));

    let unchangedKeys = media
        .filter(i=>!i.newly_added)
        .map(m=>m.key);

    await db.tx('editPostTx', async t => { 
        const post = await t.one(sql.edit_post,  [description, post_id, category_id, id, plug_id]); 
        await t.none(sql.edit_schedule, [ts, post_id, account]);
        await t.none(sql.delete_extras, [post_id, tweets.length]);

        let removedKeys = [];

        if(unchangedKeys.length > 0) {
            removedKeys = await t.manyOrNone(sql.fetch_removed_media, [post_id, unchangedKeys]);
        }
        await t.manyOrNone(sql.delete_media, [post_id]);

        if(removedKeys.length > 0) {
            await helpers.deleteMediaS3(removedKeys);
        }

        await editTwitterThread(tweets, post.id, t, sql.upsert_thread);
        return addTwitterMedia(media, post.id, t, sql.add_media);
    });

    return api.createSuccessResponse(200); 
};

const editDraft = async (payload, post_id, id, account, db, sql) => {
    const { 
        timestamp,
        plug_id,
        category_id,
        tweets,
        media
    } = payload;

    let description = tweets[0].tweet.trim().substring(0, 100);


    let unchangedKeys = media
        .filter(i=>!i.newly_added)
        .map(m=>m.key);

    await db.tx('editPostTx', async t => { 
        const post = await t.one(sql.edit_post,  [description, post_id, category_id, id, plug_id]); 
        await t.none(sql.delete_extras, [post_id, tweets.length]);

        let removedKeys = [];

        if(unchangedKeys.length > 0) {
            removedKeys = await t.manyOrNone(sql.fetch_removed_media, [post_id, unchangedKeys]);
        }
        await t.manyOrNone(sql.delete_media, [post_id]);

        if(removedKeys.length > 0) {
            await helpers.deleteMediaS3(removedKeys);
        }

        await editTwitterThread(tweets, post.id, t, sql.upsert_thread);
        return addTwitterMedia(media, post.id, t, sql.add_media);
    });

    return api.createSuccessResponse(200); 
};

const convertDraftToPost = async (payload, post_id, id, account, db, sql) => {

    const {
        timestamp
    } = payload;

    const ts = utils.adjustTimestamp(getUnixTime(timestamp));

    await editDraft(payload, post_id, id, account, db, sql); 

    await db.tx('convertDraftToPostTx', async t => {
        await t.none(sql.schedule, [post_id, account, ts, 1]);
        return t.none(sql.delete_draft, [post_id, account]);
    });

    return api.createSuccessResponse(200); 

};

const deletePost = async (id, post_id, db, sql) => {
    await db.any(sql, [post_id, id]);
    return api.createSuccessResponse(200);
};

const fetchPost = async (account, post_id, db, sql) => {
    let post = await db.oneOrNone(sql.fetch_post, [post_id, account]);
    if(!post) {
        return api.createFailedResponse(409, "Post not found");
    }
    let tweets = await db.manyOrNone(sql.fetch_thread, [post_id]);
    
    post = { 
        ...post, 
        tweets
    };

    return api.createSuccessResponse(200, { post });
};

const fetchDraft = async (account, post_id, db, sql) => {
    let oneHourFromNow = getUnixTime(new Date())+600;
    let draft = await db.oneOrNone(sql.fetch_draft, [post_id, account, oneHourFromNow]);
    if(!draft) {
        return api.createFailedResponse(409, "Draft not found");
    }
    let tweets = await db.manyOrNone(sql.fetch_thread, [post_id]);
    
    let post = { 
        ...draft, 
        tweets
    };

    return api.createSuccessResponse(200, { post });
};

const fetchDrafts = async (id, account, db, sql) => {
    const drafts = await db.manyOrNone(sql.drafts, [account]);

    return api.createSuccessResponse(200, { drafts });
};
    

const fetchPostsQueue = async (id, account, db, sql, ts=null) => {
    const profile = await db.oneOrNone(sql.profile, [id]);
    const offset = (profile ? profile.offset_mins : 0);
    const timestampStart = (ts ? (ts+86400) : getTimestamp(offset));
    const timestamp6DaysAhead = timestampStart+(86400*7)-60;
    const postsList = await db.manyOrNone(sql.posts, [account, timestampStart, timestamp6DaysAhead]);

    const posts = await getPostsAsDict(timestampStart, postsList, offset);

    return api.createSuccessResponse(200, { posts });
};

module.exports = {
    createDraft,
    editDraft,
    convertDraftToPost,
    fetchDraft,
    fetchDrafts,
    createPost,
    editPost,
    deletePost,
    fetchPost,
    fetchPostsQueue,
    flattenMediaArrays,
    createTwitterThread,
    generatePresignedPosts,
    editTwitterThread
};
