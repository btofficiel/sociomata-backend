const JWT = require('jsonwebtoken');
const api = require('./api');

const createAccessToken = (jwt, key, id) => {
    const token = jwt.sign({ 
        _id: id,
        ts: Date.now()
    }, key, { 
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
        return api.createFailedResponse(409, "No user found with the given email")
    }

    const hashed_password = await bcrypt.hash(password, user[0].password_salt);
    if(hashed_password !== user[0].password) {
        return api.createFailedResponse(409, "The email or password you have entered is invalid.")
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
