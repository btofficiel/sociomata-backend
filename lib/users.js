const JWT = require('jsonwebtoken');
const api = require('./api');
const getUnixTime = require('date-fns/getUnixTime');
const postmark = require("postmark");

const createAccessToken = (jwt, key, id) => {
    const token = jwt.sign({ 
        _id: id,
        ts: Date.now()
    }, key, { 
        algorithm: "HS256"
    });

    return token;
};

const createAccount = async (name, trial_period, db, sql) => {
    return db.one(sql, [name, trial_period]);
};

const addTeamMember = async (account_id, user_id, db, sql) => {
    return db.one(sql, [account_id, user_id]);
};

const checkIfInvited = async (user) => {
    let isInvited = await user.db.oneOrNone(user.sql, [user.account, user.email]);
    return (isInvited? true : user.email);
}

const addInvitees = async (emails, account, db, sql) => {
    let currentTS = getUnixTime(new Date());
    return db.batch(emails.map(email => db.none(sql, [account, email, currentTS])));
}

const updateLimits = async (account, planId, db, sql) => {
    switch(planId) {
        case 1:
            return db.none(sql, [1, 1, 100, planId, account]);
        case 2:
            return db.none(sql, [2, 1, 100, planId, account]);
        case 3:
            return db.none(sql, [5, 3, 250, planId, account]);
        case 4:
            return db.none(sql, [10, 5, 500, planId, account]);
        case 5:
            return db.none(sql, [20, 10, 1000, planId, account]);
        default:
            return db.none(sql, [1, 1, 100, planId, account]);
    }
}



const fetchMembers = async (account, user, db, sql) => {
    let isAdmin = await db.oneOrNone(sql.check_if_admin, [user]);
    if(isAdmin) {
        let members = await db.many(sql.fetch_members, [account]);
        return api.createSuccessResponse(200, { members });
    }
    else {
        return api.createFailedResponse(409, "You don't have the permission to view all the members in your team");
    }
};


const createTemplateMessage = email => {
    return {
        "From": "noreply@sociomata.com",
        "To": email.email,
        "TemplateAlias": "user-invitation",
        "TemplateModel": {
            "invite_sender_name": email.sender,
            "action_url": `${process.env.ENV === "dev" ? "http" : "https" }://${process.env.ENV_HOST}/join?t=${email.team}`
        }
    }
};

const inviteMember = async (payload, account, id, db, sql) => {
    let isAdmin = await db.oneOrNone(sql.check_if_admin, [id]);
    if(!isAdmin) {
        return api.createFailedResponse(409, "You don't have the permission to invite people into your team");
    }
    let hasEmptyUserSlots = await db.oneOrNone(sql.max_user_reached, [account]);
    if(!hasEmptyUserSlots) {
        return api.createFailedResponse(409, "Your team has already reached the maximum user limit");
    }

    const { emails } = payload;
    const profile = await db.oneOrNone(sql.profile, [id]);
    if(profile) {
        let _emails = emails.map(e=>{ return { email: e.toLowerCase(), account: account, sql: sql.fetch_invite, db }});
        let newlyInvited = (await Promise.all(_emails.map(checkIfInvited))).filter(t=>{ return t !== true });
        await db.tx('addInvitees Tx', async t=> {
            return addInvitees(newlyInvited, account, t, sql.add_invitee); 
        });

        let emailsToBeSent = emails.map(e=>{ return { email: e.toLowerCase(), sender: profile.name, team: account } });

        let postmarkClient = new postmark.ServerClient(process.env.POSTMARK_TOKEN);

        await postmarkClient.sendEmailBatchWithTemplates(emailsToBeSent.map(createTemplateMessage));

        return api.createSuccessResponse(200);
    }
    else {
        return api.createFailedResponse(409, "Please complete your profile before sending invites");
    }
};

const createUser = async (payload, db, bcrypt, sql, admin=true) => {
    const { email, password } = payload;
    const saltRounds = 16;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashed_password = await bcrypt.hash(password, salt);
    const currentTS = getUnixTime(new Date());
    const trialPeriod = currentTS+(7*86400);
    const result = await db.tx('createUserTx', async t => {
        const account = await createAccount("", trialPeriod, t, sql.create_account);
        const user = await db.one(sql.create_user, [email, hashed_password, salt]);
        const roleId = (admin ? 1 : 2);
        await db.none(sql.assign_role, [user.id, roleId]);
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

const joinTeam = async (payload, db, bcrypt, sql) => {
    const { email, password, team_id } = payload;
    let isInvited = await db.oneOrNone(sql.fetch_invite, [team_id, email]);
    if(isInvited) {
        let hasEmptyUserSlots = await db.oneOrNone(sql.max_user_reached, [team_id]);
        if(!hasEmptyUserSlots) {
            return api.createFailedResponse(409, "Your team has already reached the maximum user limit");
        }

        const saltRounds = 16;
        const salt = await bcrypt.genSalt(saltRounds);
        const hashed_password = await bcrypt.hash(password, salt);
        const result = await db.tx('createUserTx', async t => {
            const user = await db.one(sql.create_user, [email, hashed_password, salt]);
            const roleId = 2;
            await db.none(sql.assign_role, [user.id, roleId]);
            return addTeamMember(team_id, user.id, t, sql.add_member);
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
    }
    else {
        return api.createFailedResponse(409, "You've not been invited to the this team yet.");
    }
}


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

const fetchSocialAccounts = async (account, db, sql) => {
    let accounts = await db.manyOrNone(sql, [account]);

    return api.createSuccessResponse(200, { accounts });
}

module.exports = {
    createUser,
    createAccessToken,
    fetchSocialAccounts,
    joinTeam,
    fetchMembers,
    updateLimits,
    inviteMember,
    login
};
