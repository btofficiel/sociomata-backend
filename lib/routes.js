const bcrypt = require('bcrypt');
const api = require('./api');
const validators = require('./validators');
const logger = require('../config/logger');
const Boom = require('@hapi/bell');
const getUnixTime = require('date-fns/getUnixTime');
const { 
    createUser, 
    login 
} = require('./users');
const { 
    createDraft,
    convertDraftToPost,
    editDraft,
    fetchDraft,
    fetchDrafts,
    createPost, 
    editPost, 
    deletePost, 
    fetchPost,
    fetchPostsQueue,
    generatePresignedPosts
} = require('./posts');
const {
    fetchProfile,
    editProfile
} = require('./profile');
const {
    fetchTimezones
} = require('./timezones');
const {
    deleteCategory,
    fetchCategories,
    editCategory,
    createCategory
} = require('./categories');
const {
    createPlug,
    editPlug,
    fetchPlugs,
    fetchPlug,
    deletePlug
} = require('./plugs');

const {
    storeTwitterTokens,
    deleteTwitterTokens
} = require('./connect');

const {
    dispatchTweets,
    dispatchTweetsNow
} = require('./dispatch');

const {
    fetchTransactions,
    addSubscription,
    addTransaction,
    getCardID
} = require('./payments');

const { 
    plug,
    user, 
    payments,
    post,
    timezones,
    twitter,
    twitterAuth,
    profiles,
    category
} = require('./sql.js');

const helpers = require('./helpers');

const stripe = require('stripe')(process.env.STRIPE_SECRET);

const registerRoutes = (server, client) => {
    //Payments
    server.route({
        method: 'GET',
        path: '/transactions',
        handler: async (request, h) => {
            try {
                let result = await fetchTransactions(request.app._account, client, payments.fetch_transactions);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchTransactions error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt'
        }
    });
    server.route({
        method: 'POST',
        path: '/payment-hooks',
        handler: async (request, h) => {
            try {
                let data;
                let eventType;
                // Check if webhook signing is configured.
                const webhookSecret = process.env.STRIPE_WEBHOOK;
                if (webhookSecret) {
                    // Retrieve the event by verifying the signature using the raw body and secret.
                    let event;
                    let signature = request.headers["stripe-signature"];

                    try {
                      event = stripe.webhooks.constructEvent(
                        request.payload.toString(),
                        signature,
                        webhookSecret
                      );
                    } catch (err) {
                      //console.log(`⚠️  Webhook signature verification failed.`);
                      return h.response().code(400);
                    }
                    // Extract the object from the event.
                    data = event.data;
                    eventType = event.type;
                } else {
                    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
                    // retrieve the event data directly from the request body.
                    data = request.payload.data;
                    eventType = request.payload.type;
                }

                let paymentMethod;
                let subscription;
                let account_id;
                let intent;
                let result;
                let config;
                switch (eventType) {
                    case 'checkout.session.completed':
                        subscription = await stripe.subscriptions.retrieve(data.object.subscription);

                        config = {
                            customer_id: data.object.customer,
                            current_subscription: data.object.subscription,
                            current_period_end: subscription.current_period_end
                        };

                        account_id = Number(subscription.metadata.account_id);

                        result = await addSubscription(account_id, config, client, payments.add_subscription); 

                        return h.response(result).code(result.statusCode);
                    case 'invoice.paid':
                        subscription = await stripe.subscriptions.retrieve(data.object.subscription);
                        intent = await stripe.paymentIntents.retrieve(data.object.payment_intent);
                        paymentMethod = await stripe.paymentMethods.retrieve(intent.payment_method);


                        config = {
                            invoice: data.object.id,
                            currency: data.object.currency,
                            amount: Math.floor(data.object.total/100),
                            card_brand: getCardID(paymentMethod.card.brand),
                            card_last4: paymentMethod.card.last4,
                            transaction_date: getUnixTime(new Date()),
                            paid: true
                        };
                        account_id = Number(subscription.metadata.account_id);
                        result = await addTransaction(account_id, config, client, payments.add_transaction); 
                        return h.response(result).code(result.statusCode);
                    case 'invoice.payment_failed':
                        subscription = await stripe.subscriptions.retrieve(data.object.subscription);
                        intent = (
                                data.object.payment_intent 
                                    ? await stripe.paymentIntents.retrieve(data.object.payment_intent)
                                    : null
                                );

                        paymentMethod = (
                                intent 
                                ? await stripe.paymentMethods.retrieve(intent.payment_method)
                                : null
                                )
                        config = {
                            invoice: data.object.id,
                            currency: data.object.currency,
                            amount: Math.floor(data.object.total/100),
                            card_brand: getCardID(paymentMethod.card.brand),
                            card_last4: (paymentMethod ? paymentMethod.card.last4 : 'N/A'),
                            transaction_date: getUnixTime(new Date()),
                            paid: false
                        };
                        account_id = Number(subscription.metadata.account_id);
                        result = await addTransaction(account_id, config, client, payments.add_transaction); 
                        return h.response(result).code(result.statusCode);
                    default:
                      // Unhandled event type
                        return h.response().code(200);
                    }
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("paymentWebhook error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            payload: {
                output: 'data',
                parse: false
            }
        }
    });
    server.route({
        method: 'POST',
        path: '/create-checkout-session',
        handler: async (request, h) => {
            try {
                const decoded = await api.verifyToken(request.payload.token, process.env.JWT_SECRET);

                const { isValid } = await api.validateDecodedToken(client, user.check_user_cred, decoded, request);

                if(isValid) {
                    const priceId = request.payload.priceId;

                    const session = await stripe.checkout.sessions.create({
                        mode: 'subscription',
                        subscription_data: {
                            metadata: {
                                account_id: request.app._account
                            }
                        },
                        payment_method_types: ['card'],
                        line_items: [
                            {
                                price: priceId,
                                quantity: 1
                            }
                        ],
                        allow_promotion_codes: true,
                        // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
                        // the actual Session ID is returned in the query parameter when your customer
                        // is redirected to the success page.
                        success_url: `${process.env.ENV === "dev" ? "http" : "https" }://${process.env.ENV_HOST}/app/payment-successful`,
                        cancel_url: `${process.env.ENV === "dev" ? "http" : "https" }://${process.env.ENV_HOST}/app/payment-failed`,
                    });
                    return h.redirect(session.url).code(303);
                }
                else {
                    return h.response({ status: 'fail', message: 'Authentication error'}).code(401);
                }
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("checkoutSession error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        }
    });
    //
    //Upload routes
    server.route({
        method: 'POST',
        path: '/upload/twitter',
        handler: async (request, h) => { 
            try {
                let result = await generatePresignedPosts(request.payload);
                return h.response(result).code(200);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("uploadTwitter error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt'
        }
    });
    //Timezone routes
    server.route({
        method: 'GET',
        path: '/timezones',
        handler: async (request, h) => {
            try {
                let result = await fetchTimezones(client, timezones.fetch_timezones);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchTimezones error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt'
        }
    });
    //Profile routes
    server.route({
        method: 'GET',
        path: '/profile',
        handler: async (request, h) => {
            try {
                let sql = {
                    profile: profiles.fetch_profile,
                    twitter: twitterAuth.check_auth,
                    account: user.fetch_account,
                    email: user.fetch_email
                };

                let result = await fetchProfile(request.app._id, request.app._account, client, sql);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchProfile error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt'
        }
    });

    server.route({
        method: 'PUT',
        path: '/profile',
        handler: async (request, h) =>{
            try {
                let sql = {
                    upsert: profiles.upsert_profile,
                    upsertWithoutAvatar: profiles.upsert_profile_withoutAvatar,
                    fetch: profiles.fetch_avatar,
                    account: user.fetch_account,
                    profile: profiles.fetch_profile,
                    twitter: twitterAuth.check_auth,
                    email: user.fetch_email
                }
                let result = await editProfile(request.payload, request.app._id, request.app._account, client, sql);

                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("editProfile error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            payload: {
                maxBytes: 5242880,
                timeout: false
            },
            validate: {
                payload: validators.profiles["PUT/profiles"] 
            }
        }
    });

    //Dispatch routes
    server.route({
        method: 'POST',
        path: '/dispatch/twitter',
        handler: async (request, h) => {
            try {
                let sql = {
                    fetch_auth: twitterAuth.fetch_auth,
                    fetch_thread: twitter.fetch_thread,
                    fetch_post: post.fetch_post, 
                    fetch_plug: plug.fetch_plug,
                    fetch_media: twitter.fetch_media
                };

                await client.one(post.update_status, [2, request.payload.post_id]);
                const result = await dispatchTweets(request.payload.account_id, request.payload.post_id, client, sql, process.env);
                await client.one(post.update_status, [3, request.payload.post_id]);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                try {
                    await client.one(post.update_status, [4, request.payload.post_id]);
                }
                catch(err) {
                    logger.error("Dispatch Twitter error", { 
                        timestamp: new Date(), 
                        path: request.path,
                        error: String(err.stack),
                        userid: request.payload.user_id,
                        request: {
                            payload: api.sanitizePayload(request.payload),
                            query: api.sanitizePayload(request.query),
                            params: api.sanitizePayload(request.params),
                        }
                    });
                }
                const errorString = String(e.stack);
                logger.error("Dispatch Twitter error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.payload.user_id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt_cron',
            validate: {
                payload: validators.dispatch["POST/dispatch"] 
            }
        }
    });
    server.route({
        method: 'GET',
        path: '/connect',
        handler: async (request, h) => {
            try {
                let token = await api.createToken({ 
                    _id: request.app._id,
                    _account: request.app._account,
                    ts: Date.now()
                }, process.env.JWT_TEMP_SECRET, { expiresIn: '5m' });
                return h.response({
                    status: 'success',
                    statusCode: 200,
                    token
                }).code(200);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("Connect error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt'
        }
    });

    server.route({
        method: ['GET', 'POST'],
        path: '/connect/twitter',
        options: {
            auth: {
              mode: 'try',
              strategy: 'twitter'
            },
            handler: async (request, h) => {
                try {
                    if (!request.auth.isAuthenticated) {
                        return h.response(`Authentication failed`);
                    }

                    const { 
                        token: twitter_token,
                        secret: twitter_secret
                    } = request.auth.credentials;

                    const token = request.state['bell-twitter'].query.token;
                    
                    if(!token) {
                        return h.response(`Authentication failed due to missing access token`);
                    }
                    const decoded = await api.verifyToken(token, process.env.JWT_TEMP_SECRET);
                    const { isValid } = await api.validateDecodedToken(client, user.check_user_cred, decoded, request);
                    if(!isValid) {
                        return h.response(`Authentication failed due to invalid access token`);
                    }

                    const rows = await storeTwitterTokens(twitterAuth.upsert_auth, [
                        twitter_token, 
                        twitter_secret, 
                        process.env.TWITTER_DB_KEY, 
                        process.env.DB_ENCRYPTION_ALGO, 
                        request.app._account
                    ], client);

                    return h.redirect('/app/settings');
                }
                catch(e) {
                    const errorString = String(e.stack);
                    logger.error("Connect Twitter error", { 
                        timestamp: new Date(), 
                        path: request.path,
                        error: errorString,
                        userid: request.app._id,
                        request: {
                            payload: api.sanitizePayload(request.payload),
                            query: api.sanitizePayload(request.query),
                            params: api.sanitizePayload(request.params),
                        }
                    });
                    return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
                }
            }
        }
    });

    server.route({
        method: 'DELETE',
        path: '/connect/twitter',
        handler: async (request, h) => {
            try {
                const result = await deleteTwitterTokens(request.app._id, client, twitterAuth.disconnect);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("deleteTwitterTokens error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt'
        }
    });
    //Plug routes
    server.route({
        method: 'POST',
        path: '/plugs',
        handler: async (request, h) => { 
            try {
                let result = await createPlug(request.payload, request.app._account, client, plug.create_plug);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("createPlug error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                payload: validators.plugs["POST/plugs"] 
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/plugs',
        handler: async (request, h) => { 
            try {
                let result = await fetchPlugs(request.app._account, client, plug.fetch_plugs);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchPlugs error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt'
        }
    });

    server.route({
        method: 'GET',
        path: '/plugs/{plug_id}',
        handler: async (request, h) => { 
            try {
                let result = await fetchPlug(request.params.plug_id, request.app._account, client, plug.fetch_plug);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchPlug error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt'
        }
    });

    server.route({
        method: 'PUT',
        path: '/plugs/{plug_id}',
        handler: async (request, h) => { 
            try {
                let result = await editPlug(request.payload, request.params.plug_id, request.app._account, client, plug.edit_plug);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("editPlug error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                params: validators.plugs["PUT/plugs-params"],
                payload: validators.plugs["POST/plugs"] 
            }
        }
    });

    server.route({
        method: 'DELETE',
        path: '/plugs/{plug_id}',
        handler: async (request, h) => { 
            try {
                let result = await deletePlug(request.params.plug_id, request.app._account, client, plug.delete_plug);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("deletePlug error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                params: validators.plugs["PUT/plugs-params"]
            }
        }
    });
    // Category Routes
    server.route({
        method: 'POST',
        path: '/categories',
        handler: async (request, h) => {
            try {
                let result = await createCategory(request.payload, request.app._id, client, category.create_category);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("createCategory error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                payload: validators.categories["POST/categories"] 
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/categories',
        handler: async (request, h) => {
            try {
                let result = await fetchCategories(request.app._id, client, category.fetch_categories);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchCategories error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt'
        }
    });

    server.route({
        method: 'PUT',
        path: '/categories/{category_id}',
        handler: async (request, h) => {
            try {
                let result = await editCategory(request.payload, request.params.category_id, request.app._id, client, category.edit_category);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("editCategory error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                params: validators.categories["PUT/categories-params"],
                payload: validators.categories["POST/categories"] 
            }
        }
    });

    server.route({
        method: 'DELETE',
        path: '/categories/{category_id}',
        handler: async (request, h) => {
            try {
                let result = await deleteCategory(request.params.category_id, request.app._id, client, category.delete_category);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("deleteCategory error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                params: validators.categories["PUT/categories-params"]
            }
        }
    });

    // Draft routes

    server.route({
        method: 'POST',
        path: '/posts/drafts',
        handler: async (request, h) => {
            try {
                let sql = {
                    create_post: post.create_post,
                    draft: post.draft,
                    twitter: twitterAuth.check_auth,
                    add_media: twitter.add_media,
                    create_thread: twitter.create_thread
                };

                const result = await createDraft(request.payload, request.app._id, request.app._account, client, sql);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("createDraft error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                if(e.name==="FileTypeError") {
                    return h.response(api.createFailedResponse(409, e.message)).code(409);
                }
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                payload: validators.posts["POST/posts/now"]
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/posts/drafts',
        handler: async (request, h) => {
            try {
                const sql = {
                    drafts: post.fetch_drafts,
                };

                let { timestamp } = request.query;

                const result = await fetchDrafts(request.app._id, request.app._account, client, sql);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchDrafts error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt'
        }
    });

    server.route({
        method: 'GET',
        path: '/posts/drafts/{post_id}',
        handler: async (request, h) => {
            try {
                const sql = {
                    fetch_draft: post.fetch_draft,
                    fetch_thread: twitter.fetch_thread
                };

                const result = await fetchDraft(request.app._account, request.params.post_id, client, sql);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchDraft error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                params: validators.posts["PUT/posts-params"]
            }
        }
    });

    server.route({
        method: 'PUT',
        path: '/posts/drafts/{post_id}',
        handler: async (request, h) => {
            try {
                let sql = {
                    edit_post: post.edit_post,
                    add_media: twitter.add_media,
                    delete_extras: twitter.delete_extra_tweets,
                    delete_media: twitter.delete_media,
                    fetch_removed_media: twitter.fetch_removed_media,
                    upsert_thread: twitter.upsert_thread
                };

                const result = await editDraft(request.payload, request.params.post_id, request.app._id, request.app._account, client, sql);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("editPost error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                payload: validators.posts["POST/posts/now"],
                params: validators.posts["PUT/posts-params"]
            }
        }
    });

    server.route({
        method: 'PUT',
        path: '/posts/schedule-draft/{post_id}',
        handler: async (request, h) => {
            try {
                let sql = {
                    edit_post: post.edit_post,
                    add_media: twitter.add_media,
                    schedule: post.schedule,
                    delete_draft: post.delete_draft,
                    delete_extras: twitter.delete_extra_tweets,
                    delete_media: twitter.delete_media,
                    fetch_removed_media: twitter.fetch_removed_media,
                    upsert_thread: twitter.upsert_thread
                };

                const result = await convertDraftToPost(request.payload, request.params.post_id, request.app._id, request.app._account, client, sql);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("convertDraftToPost error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                payload: validators.posts["PUT/posts"],
                params: validators.posts["PUT/posts-params"]
            }
        }
    });
    // Post Routes
    server.route({
        method: 'GET',
        path: '/posts/queue',
        handler: async (request, h) => {
            try {
                const sql = {
                    posts: post.fetch_posts,
                    profile: profiles.fetch_profile,
                };

                let { timestamp } = request.query;

                const result = await fetchPostsQueue(request.app._id, request.app._account, client, sql, timestamp);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchPosts error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                query: validators.posts["GET/posts/queue"]
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/posts',
        handler: async (request, h) => {
            try {
                let sql = {
                    create_post: post.create_post,
                    schedule: post.schedule,
                    twitter: twitterAuth.check_auth,
                    add_media: twitter.add_media,
                    create_thread: twitter.create_thread
                };

                const result = await createPost(request.payload, request.app._id, request.app._account, client, sql);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("createPost error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                if(e.name==="FileTypeError") {
                    return h.response(api.createFailedResponse(409, e.message)).code(409);
                }
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                payload: validators.posts["POST/posts"]
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/posts/now',
        handler: async (request, h) => {
            try {
                let sql = twitterAuth.fetch_auth;

                const result = await dispatchTweetsNow(request.app._account, request.payload.tweets, request.payload.media, client, sql, process.env);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("postNow error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                payload: validators.posts["POST/posts/now"]
            }
        }
    });

    server.route({
        method: 'PUT',
        path: '/posts/{post_id}',
        handler: async (request, h) => {
            try {
                let sql = {
                    edit_post: post.edit_post,
                    edit_schedule: post.edit_schedule,
                    add_media: twitter.add_media,
                    delete_extras: twitter.delete_extra_tweets,
                    delete_media: twitter.delete_media,
                    fetch_removed_media: twitter.fetch_removed_media,
                    upsert_thread: twitter.upsert_thread
                };

                const result = await editPost(request.payload, request.params.post_id, request.app._id, request.app._account, client, sql);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("editPost error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                payload: validators.posts["PUT/posts"],
                params: validators.posts["PUT/posts-params"]
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/posts/{post_id}',
        handler: async (request, h) => {
            try {
                const sql = {
                    fetch_post: post.fetch_post,
                    fetch_thread: twitter.fetch_thread
                };

                const result = await fetchPost(request.app._account, request.params.post_id, client, sql);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("fetchPost error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                params: validators.posts["PUT/posts-params"]
            }
        }
    });

    server.route({
        method: 'DELETE',
        path: '/posts/{post_id}',
        handler: async (request, h) => {
            try {
                const result = await deletePost(request.app._id, request.params.post_id, client, post.delete_post);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("deletePost error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: 'jwt',
            validate: {
                params: validators.posts["PUT/posts-params"]
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/signup',
        handler: async (request, h) => {
            try {
                let sql = {
                    create_user: user.create_user,
                    create_account: user.create_account,
                    add_member: user.add_member
                };

                let result = await createUser(request.payload, client, bcrypt, sql);

                return h.response(result).code(result.statusCode);
            } 
            catch(e) {
                if(e.code === '23505') {
                    return h.response({
                        status: 'fail',
                        statusCode: 409,
                        message: 'An account already exists with the given email',
                    }).code(409);
                }
                
                const errorString = String(e.stack);
                logger.error("createUser error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            auth: false,
            validate: {
                payload: validators.users["POST/signup"]
            }
        }
    });


    server.route({
        method: 'POST',
        path: '/login',
        handler:  async (request, h) => {
            try {
                let sql = {
                    check_user: user.check_user,
                    check_user_byid: user.check_user_byid
                };

                const result = await login(request.payload, client, bcrypt, sql);
                return h.response(result).code(result.statusCode);
            }
            catch(e) {
                const errorString = String(e.stack);
                logger.error("login error", { 
                    timestamp: new Date(), 
                    path: request.path,
                    error: errorString,
                    userid: request.app._id,
                    request: {
                        payload: api.sanitizePayload(request.payload),
                        query: api.sanitizePayload(request.query),
                        params: api.sanitizePayload(request.params),
                    }
                });
                return h.response(api.createFailedResponse(500, "Some error occurred on the server")).code(500);
            }
        },
        options: {
            validate: {
                payload: validators.users["POST/login"]
            }
        }
    });

};

module.exports = registerRoutes;
