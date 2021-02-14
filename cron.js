'use strict';
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });
const _ = require('lodash/array');
const getUnixTime = require('date-fns/getUnixTime');
const fetch = require('node-fetch');
const client = require('./config/db');
const logger = require('./config/logger');
const api = require('./lib/api');


const postBatch = async () => {
    try {
        let raw_ts = Number(getUnixTime(new Date()));
        let ts = Math.floor(raw_ts/60)*60;
        const query = 'SELECT id AS post_id, user_id FROM posts WHERE timestamp=$1';
        const posts = await client.manyOrNone(query, [ts]);
        let token = await api.createToken({ ts }, process.env.JWT_CRON_SECRET, { expiresIn: '5m' });
        const batches = _.chunk(posts, 50);
        
        for(let batch of batches) {
            let headers = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token
                }
            };

            let result = await Promise.allSettled(batch.map(post=>fetch(`http://localhost/api/dispatch/twitter`, {
                ...headers, 
                body: JSON.stringify(post)
            }).then(
                res=>res.json()
            )));
        }
    }
    catch(e) {
        const errorString = String(e.stack);
        logger.error("Cron Script Error", {timestamp: new Date(), error: errorString});
    }
}


postBatch();
