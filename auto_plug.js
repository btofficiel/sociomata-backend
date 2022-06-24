
'use strict';
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });
const { TwitterApi } = require('twitter-api-v2');

const fetchTweet = async () => {
    try {
        console.log(process.env.TWITTER_BEARER);
        const client = new TwitterApi(process.env.TWITTER_BEARER);
        const tweet = await client.v2.singleTweet('1501509173749723137', {
            "tweet.fields": [ 'public_metrics' ]
        });

        console.log(tweet);
    }
    catch(e) {
        console.log(e);
    }
}


fetchTweet();
