const api = require('./api');

const getCardID = card => {
    switch(card) {
        case 'visa':
            return 1;
        case 'mastercard':
            return 2;
        case 'unionpay':
            return 3;
        case 'jcb':
            return 4;
        case 'discover':
            return 5;
        case 'diners_club':
            return 6;
        case 'amex':
            return 7;
        case 'cartes_bancaires':
            return 8;
        default:
            return 9;
    }
};

const addSubscription = async (account, config, db, sql) => {
    const {
        customer_id,
        current_subscription,
        current_period_end
    } = config;

    await db.none(sql, [account, customer_id, current_subscription, current_period_end]);

    return api.createSuccessResponse(200);
};

const addTransaction = async (account, config, db, sql) => {
    const {
        invoice,
        currency,
        amount,
        card_brand,
        card_last4,
        transaction_date,
        paid
    } = config;

    await db.none(sql, [
        account, 
        invoice,
        currency,
        amount,
        card_brand, 
        card_last4, 
        transaction_date, 
        paid
    ]);

    return api.createSuccessResponse(200);
};

const fetchTransactions = async (account, db, sql) => {
    const transactions = await db.manyOrNone(sql, [account]);

    return api.createSuccessResponse(200, { transactions });
};



module.exports = {
    addSubscription,
    addTransaction,
    getCardID,
    fetchTransactions
};

