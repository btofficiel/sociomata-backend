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
