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
