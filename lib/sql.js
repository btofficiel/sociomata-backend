module.exports.twitterAuth = {
    fetch_auth: `
        SELECT 
        pgp_sym_decrypt(
        token::bytea,
        $2, $3) AS token,
        pgp_sym_decrypt(
        secret::bytea,
        $2, $3) AS secret
        FROM twitter_tokens
        WHERE user_id=$1
    `,
    check_auth: `
        SELECT
        user_id
        FROM
        twitter_tokens
        WHERE
        user_id=$1
    `,
    upsert_auth: `
        INSERT INTO twitter_tokens (user_id, token, secret) 
        VALUES(
        $5, 
        pgp_sym_encrypt($1, $3, $4), 
        pgp_sym_encrypt($2, $3, $4)
        )
        ON CONFLICT ON CONSTRAINT twitter_tokens_pkey
        DO
            UPDATE
            SET
            token=pgp_sym_encrypt($1, $3, $4),
            secret=pgp_sym_encrypt($2, $3, $4)
        RETURNING user_id
        `,
    disconnect: `
        DELETE FROM twitter_tokens
        WHERE user_id = $1
    `
};

module.exports.plug = {
    create_plug: `
        INSERT INTO plugs(
        name,
        plug,
        created_by
        )
        VALUES(
        $1,
        $2,
        $3
        )
        RETURNING id, name, plug
    `,
    edit_plug: `
        UPDATE plugs
        SET 
        name=$1,
        plug=$2
        WHERE
        id=$3
        AND
        created_by=$4
        RETURNING id,name,plug
    `,
    fetch_plugs: `
        SELECT
        id,
        name,
        plug
        FROM
        plugs
        WHERE
        created_by=$1
    `,
    delete_plug: `
        DELETE FROM plugs
        WHERE
        id=$1
        AND
        created_by=$2
    `
};

module.exports.profiles = {
    fetch_profile: `
        SELECT
        p.name,
        p.defaulttimezone,
        (
        CASE
            WHEN p.avatar IS NULL THEN p.avatar
            ELSE CONCAT('https://${process.env.S3_BUCKET}.s3.us-east-2.amazonaws.com/', p.avatar) 
        END
        )
        AS avatar,
        t.offset_mins
        FROM
        profiles AS p
        JOIN timezones AS t
        ON t.id=p.defaulttimezone
        WHERE
        p.id=$1
    `,
    fetch_avatar: `
        SELECT
        avatar
        FROM
        profiles
        WHERE
        id=$1
    `,
    upsert_profile: `
        INSERT INTO profiles(
            id, 
            name, 
            defaulttimezone,
            avatar
        )
        VALUES (
            $1,
            $2,
            $3,
            $4
        )
        ON CONFLICT ON CONSTRAINT profiles_pkey
        DO
            UPDATE
            SET
                name=$2,
                defaulttimezone=$3,
                avatar=$4
    `,
    upsert_profile_withoutAvatar: `
        INSERT INTO profiles(
            id, 
            name, 
            defaulttimezone
        )
        VALUES (
            $1,
            $2,
            $3
        )
        ON CONFLICT ON CONSTRAINT profiles_pkey
        DO
            UPDATE
            SET
                name=$2,
                defaulttimezone=$3
        `
};

module.exports.timezones = {
    fetch_timezones: `
        SELECT 
            id,
            timezone,
            offset_mins
        FROM
            timezones
        `
};

module.exports.category = {
    create_category: `
        INSERT INTO categories(
        name,
        created_by
        )
        VALUES(
        $1,
        $2
        )
        RETURNING id,name
    `,
    edit_category: `
        UPDATE categories
        SET
        name=$1
        WHERE
        id=$2
        AND
        created_by=$3
        RETURNING id, name
    `,
    fetch_categories: `
        SELECT id, name
        FROM categories
        WHERE
        created_by=$1
    `,
    delete_category: `
        DELETE FROM categories
        WHERE
        id=$1
        AND
        created_by=$2
    `
};

module.exports.user = {
    create_user:`
        INSERT INTO users(
        email,
        password,
        password_salt)
        VALUES(
        $1,
        $2,
        $3)
        RETURNING id
    `,
    check_user:`
        SELECT
        id,
        email,
        password,
        password_salt
        FROM users
        WHERE
        email=$1
    `,
    check_user_byid:`
        SELECT
        id
        FROM users
        WHERE
        id=$1
    `,
    fetch_email:`
        SELECT
        email
        FROM users
        WHERE
        id=$1
    `
};

module.exports.post = {
    create_post: `
        INSERT INTO posts(
        timestamp,
        recurring,
        description,
        user_id,
        post_type,
        status,
        category_id
        )
        VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
        )
        RETURNING *
    `,
    edit_post: `
        UPDATE posts
        SET
        timestamp=$1,
        description=$2,
        category_id=$4
        WHERE id=$3
        AND user_id=$5
        RETURNING *
    `,
    delete_post: `
        DELETE FROM posts
        WHERE 
        id=$1 AND
        user_id=$2
    `,
    fetch_posts: `
        SELECT 
        id, 
        timestamp, 
        recurring,
        description,
        category_id,
        status
        FROM posts
        WHERE user_id=$1
        AND timestamp BETWEEN $2 AND $3 
        AND status=1
        ORDER BY timestamp ASC
    `,
    fetch_post: `
        SELECT
        id,
        timestamp,
        recurring,
        description,
        category_id,
        status
        FROM posts
        WHERE id=$1
        AND user_id=$2
    `,
    update_status: `
        UPDATE posts
        SET status=$1
        WHERE id=$2
        RETURNING status
    `
};

module.exports.twitter = {
    create_thread: `
        INSERT INTO twitter_posts(
        tweet,
        post_id,
        tweet_order
        )
        VALUES (
        $1,
        $2,
        $3
        )
    `,
    fetch_media: `
        SELECT
            post_id,
            tweet_order,
            media_order,
            media_key
        FROM twitter_media
        WHERE 
        post_id=$1
    `,
    add_media: `
        INSERT INTO twitter_media (
        post_id,
        tweet_order,
        media_order,
        media_key
        )
        VALUES(
        $1,
        $2,
        $3,
        $4
        )
    `,
    delete_media: `
        DELETE
        FROM
        twitter_media
        WHERE
        post_id=$1
    `,
    fetch_removed_media: `
        SELECT
        media_key AS "Key"
        FROM
        twitter_media
        WHERE
            post_id=$1
        AND
            media_key NOT IN (SELECT unnest($2))
    `,
    fetch_thread: `
        SELECT 
            tp.tweet AS tweet, 
            tp.tweet_order AS tweet_order, 
            COALESCE(
            json_agg(
            json_build_object(
            'newly_added', false,
            'url', CONCAT('https://${process.env.S3_BUCKET}.s3.us-east-2.amazonaws.com/', tm.media_key)
            ) 
            ORDER BY tm.media_order ASC
            ) 
            FILTER (WHERE tm.tweet_order IS NOT NULL),
            '[]'
            ) AS media
        FROM twitter_posts AS tp
        LEFT JOIN twitter_media AS tm
        ON tm.post_id=tp.post_id AND tm.tweet_order=tp.tweet_order
        WHERE tp.post_id=$1
        GROUP BY tp.tweet_order, tp.tweet
        ORDER BY tp.tweet_order ASC
    `,
    delete_thread: `
        DELETE FROM twitter_posts
        WHERE post_id=$1
    `,
    delete_extra_tweets: `
        DELETE FROM twitter_posts
        WHERE post_id=$1 
        AND tweet_order>$2
    `,
    upsert_thread: `
        INSERT INTO twitter_posts(
        tweet,
        post_id,
        tweet_order
        )
        VALUES(
        $1,
        $2,
        $3
        )
        ON CONFLICT ON CONSTRAINT unique_order_postid
        DO
            UPDATE 
            SET
            tweet=$1,
            tweet_order=$3
    `
};
