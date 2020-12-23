const JWT = require('jsonwebtoken');

const createAccessToken = (jwt, key, id) => {
    const token = jwt.sign({ _id: id }, key, { 
        algorithm: "HS256"
    });

    return token;
};

const createUser = async (payload, db, bcrypt, sql) => {
    const { email, password } = payload;
    const saltRounds = 16;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashed_password = await bcrypt.hash(password, salt);
    return await db.none(sql, [email, hashed_password, salt]);
};

const login = async (payload, db, bcrypt, sql) => {
    const { email, password } = payload;
    const user = await db.any(sql, [email]);
    if(user.length === 0) {
        return {
            status: 'fail',
            statusCode: 200,
            code: 'user_not_exists'
        };
    }
    const hashed_password = await bcrypt.hash(password, user[0].password_salt);
    if(hashed_password !== user[0].password) {
        return {
            status: 'fail',
            statusCode: 200,
            code: 'invalid_login_credentials'
        };
    };
    return {
        status: 'success',
        statusCode: 200,
        token: createAccessToken(JWT, process.env.JWT_SECRET, user[0].id)
    };
};

module.exports = {
    createUser,
    createAccessToken,
    login
};
