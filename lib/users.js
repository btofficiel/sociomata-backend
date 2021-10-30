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

const createAccount = async (name, db, sql) => {
    return db.one(sql, [name]);
};

const addTeamMember = async (account_id, user_id, db, sql) => {
    return db.one(sql, [account_id, user_id]);
};

const createUser = async (payload, db, bcrypt, sql) => {
    const { email, password } = payload;
    const saltRounds = 16;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashed_password = await bcrypt.hash(password, salt);
    const result = await db.tx('createUserTx', async t => {
        const account = await createAccount("", t, sql.create_account);
        const user = await db.one(sql.create_user, [email, hashed_password, salt]);
        return addTeamMember(account.id, user.id, t, sql.add_member);
    });
    
    let token = await api.createToken({ 
        _id: result.user_id,
        _account: result.account_id, 
        ts: Date.now()
    }, process.env.JWT_SECRET);

    return {
        status: 'success',
        statusCode: 200,
        token
    };
};

const login = async (payload, db, bcrypt, sql) => {
    const { email, password } = payload;
    const user = await db.oneOrNone(sql.check_user, [email]);
    if(!user) {
        return api.createFailedResponse(409, "No user found with the given email")
    }

    const hashed_password = await bcrypt.hash(password, user.password_salt);
    if(hashed_password !== user.password) {
        return api.createFailedResponse(409, "The email or password you have entered is invalid.")
    };

    const account = await db.one(sql.check_user_byid, [user.id]);

    let token = await api.createToken({ 
        _id: account.user_id,
        _account: account.account_id, 
        ts: Date.now()
    }, process.env.JWT_SECRET);

    return {
        status: 'success',
        statusCode: 200,
        token
    };
};

module.exports = {
    createUser,
    createAccessToken,
    login
};
