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
        status
        FROM posts
        WHERE user_id=$1
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
    fetch_thread: `
        SELECT tweet, tweet_order
        FROM twitter_posts
        WHERE post_id=$1
        ORDER BY tweet_order ASC
    `,
    delete_thread: `
        DELETE FROM twitter_posts
        WHERE post_id=$1
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
