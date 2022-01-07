module.exports.payments = {
    add_subscription: `
        INSERT INTO subscriptions(
            account_id,
            customer_id,
            current_subscription,
            current_period_end
        )
        VALUES(
            $1,
            $2,
            $3,
            $4
        )
        ON CONFLICT ON CONSTRAINT subscriptions_pkey
        DO
            UPDATE
            SET
                customer_id=$2,
                current_subscription=$3,
                current_period_end=$4
    `,
    add_transaction: `
        INSERT INTO transactions(
            account_id,
            invoice,
            currency,
            amount,
            card_brand,
            card_last4,
            transaction_date,
            paid
        )
        VALUES(
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
        )
    `,
    fetch_transactions: `
        SELECT
            T.currency,
            T.amount,
            C.brand AS card_brand,
            T.card_last4,
            T.transaction_date,
            T.paid
        FROM
            transactions AS T
        JOIN card_brands AS C
        ON C.id=T.card_brand
        WHERE
            account_id=$1
    `
};

module.exports.twitterAuth = {
    fetch_auth: `
        SELECT 
        pgp_sym_decrypt(
        token::bytea,
        $2, $3) AS token,
        pgp_sym_decrypt(
        secret::bytea,
        $2, $3) AS secret
        FROM social_accounts
        WHERE account_id=$1
    `,
    check_auth: `
        SELECT
        account_id
        FROM
        social_accounts
        WHERE
        account_id=$1
    `,
    upsert_auth: `
        INSERT INTO social_accounts (account_id, token, secret) 
        VALUES(
        $5, 
        pgp_sym_encrypt($1, $3, $4), 
        pgp_sym_encrypt($2, $3, $4)
        )
        ON CONFLICT ON CONSTRAINT social_accounts_account_id_key
        DO
            UPDATE
            SET
            token=pgp_sym_encrypt($1, $3, $4),
            secret=pgp_sym_encrypt($2, $3, $4)
        RETURNING account_id
        `,
    disconnect: `
        DELETE FROM social_accounts
        WHERE account_id = $1
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
    fetch_account: `
        SELECT 
            A.id, 
            A.name, 
            A.trial_period, 
            (A.trial_period > $2) AS trial_active,
            S.current_period_end,
            (S.current_period_end > $2) AS sub_active
        FROM accounts AS A
        LEFT JOIN subscriptions AS S
        ON A.id=S.account_id
        WHERE id=$1
    `,
    create_account: `
        INSERT INTO accounts(name, trial_period)
        VALUES($1, $2)
        RETURNING id
    `,
    add_member: `
        INSERT INTO account_members(
            account_id,
            user_id
        )
        VALUES($1, $2)
        RETURNING account_id, user_id
    `,
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
    check_user_cred:`
        SELECT
            account_id,
            user_id
        FROM account_members
        WHERE
        account_id=$1
        AND 
        user_id=$2
    `,
    check_user_byid: `
        SELECT
            account_id,
            user_id
        FROM account_members
        WHERE
        user_id=$1
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
    schedule: `
        INSERT INTO scheduled(
            post_id,
            account_id,
            timestamp,
            status
        )
        VALUES(
        $1,
        $2,
        $3,
        $4
        )
    `,
    draft: `
        INSERT INTO drafts(
            post_id,
            account_id
        )
        VALUES(
        $1,
        $2
        )
    `,
    delete_draft: `
        DELETE FROM
            drafts
        WHERE post_id=$1 AND account_id=$2
    `,
    edit_schedule: `
        UPDATE
        scheduled
        SET
        timestamp=$1
        WHERE
        post_id=$2
        AND
        account_id=$3
    `,
    create_post: `
        INSERT INTO posts(
        description,
        user_id,
        post_type,
        category_id
        )
        VALUES (
        $1,
        $2,
        $3,
        $4
        )
        RETURNING *
    `,
    edit_post: `
        UPDATE posts
        SET
        description=$1,
        category_id=$3
        WHERE id=$2
        AND user_id=$4
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
        posts.id AS id, 
        scheduled.timestamp AS timestamp, 
        false AS recurring,
        posts.description AS description,
        posts.category_id AS category_id,
        scheduled.status AS status
        FROM scheduled
        JOIN posts
        ON posts.id=scheduled.post_id
        WHERE account_id=$1
        AND timestamp BETWEEN $2 AND $3 
        AND status=1
        ORDER BY timestamp ASC
    `,
    fetch_drafts: `
        SELECT 
            drafts.post_id AS id,
            posts.description
        FROM
            drafts
        JOIN posts
        ON drafts.post_id=posts.id
        WHERE
            account_id=$1
        ORDER BY drafts.post_id DESC
    `,
    fetch_post: `
        SELECT 
        posts.id AS id, 
        scheduled.timestamp AS timestamp, 
        false AS recurring,
        posts.description AS description,
        posts.category_id AS category_id,
        scheduled.status AS status
        FROM scheduled
        JOIN posts
        ON posts.id=scheduled.post_id
        WHERE post_id=$1
        AND account_id=$2
    `,
    fetch_draft: `
        SELECT
            drafts.post_id AS id,
            $3 AS timestamp,
            false AS recurring,
            posts.description AS description,
            posts.category_id AS category_id,
            1 AS status
        FROM drafts
        JOIN posts
        ON posts.id=drafts.post_id
        WHERE post_id=$1
        AND account_id=$2
    `,
    update_status: `
        UPDATE scheduled
        SET status=$1
        WHERE post_id=$2
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
            'url', CONCAT('https://${process.env.S3_BUCKET}.s3.us-east-2.amazonaws.com/', tm.media_key),
            'media_key', tm.media_key
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
