const Joi = require('joi');
const getUnixTime = require('date-fns/getUnixTime');

const dispatch = {
    "POST/dispatch": Joi.object().keys({
        user_id: Joi.number().integer().required().messages({
            "number.base": "User ID must be a number",
            "any.required": "User ID is required"
        }),
        post_id: Joi.number().integer().required().messages({
            "number.base": "Post ID must be a number",
            "any.required": "Post ID is required"
        })
    })
};


const plugs = {
    "POST/plugs": Joi.object().keys({
        name: Joi.string().trim().min(1).max(25).required().messages({
            "string.base": "Plug name must be a string",
            "string.min": "Plug name cannot be empty",
            "string.max": "Plug name cannot be larger than 25 characters"
        }),
        plug: Joi.string().trim().min(1).max(280).required().messages({
            "string.base": "Plug must be a string",
            "string.min": "Plug cannot be empty",
            "string.max": "Plug cannot be larger than 280 characters"
        })
    }),
    "PUT/plugs-params": Joi.object().keys({
        plug_id: Joi.number().integer().allow(null).required().messages({
            "number.base": "Plug ID must be a number",
            "any.required": "Plug ID is required"
        })
    })
};

const posts = {
    "PUT/posts": Joi.object().keys({
        timestamp: Joi.date().timestamp('unix').greater(Date.now()+(5*60*1000)).required().messages({
            "date.format": "Scheduled date isn't in a timestamp format",
            "date.greater": "Please select a datetime atleast 5 mins away from now",
            "any.required": "Scheduled date is missing"
        }),
        recurring: Joi.boolean().required().messages({
            "boolean.base": "Whether this is a recurring post or not isn't told via a boolean value",
            "any.required": "Recurring field is missing"
        }),
        category_id: Joi.number().integer().allow(null).required().messages({
            "number.base": "Category ID must be a number",
            "any.required": "Category ID is required"
        }),
        tweets: Joi.array()
            .items(Joi.object().keys({
                tweet: Joi.string().trim().min(1).max(280).required().messages({
                    "string.base": "Tweet must be a string",
                    "string.empty": "Please make sure you don't have empty tweets",
                    "string.max": "Tweet cannot exceed more than 280 characters",
                    "any.required": "Tweet is required"
                }),
                tweet_order: Joi.number().integer().messages({
                    "number.base": "Tweet order must be a number",
                    "any.required": "Tweet order is required"
                })
            }))
            .unique((a, b) => a.tweet_order === b.tweet_order)
            .required()
            .messages({
            "array.base": "Tweets must be a list",
            "array.unique": "Tweet order must be unique",
            "array.includesRequiredUnknowns": "Tweets must be in correct format",
            "any.required": "Tweets list is required",
        })
    }),
    "PUT/posts-params": Joi.object().keys({
        post_id: Joi.number().integer().messages({
            "number.base": "Post ID must be a number",
            "any.required": "Post ID is required"
        })
    }),
    "POST/posts": Joi.object().keys({
        timestamp: Joi.date().timestamp('unix').greater(Date.now()+(5*60*1000)).required().messages({
            "date.format": "Scheduled date isn't in a timestamp format",
            "date.greater": "Please select a datetime atleast 5 mins away from now",
            "any.required": "Scheduled date is missing"
        }),
        recurring: Joi.boolean().required().messages({
            "boolean.base": "Whether this is a recurring post or not isn't told via a boolean value",
            "any.required": "Recurring field is missing"
        }),
        category_id: Joi.number().integer().allow(null).required().messages({
            "number.base": "Category ID must be a number",
            "any.required": "Category ID is required"
        }),
        tweets: Joi.array()
            .items(Joi.object().keys({
                tweet: Joi.string().trim().min(1).max(280).required().messages({
                    "string.base": "Tweet must be a string",
                    "string.empty": "Please make sure you don't have empty tweets",
                    "string.max": "Tweet cannot exceed more than 280 characters",
                    "any.required": "Tweet is required"
                }),
                tweet_order: Joi.number().integer().messages({
                    "number.base": "Tweet order must be a number",
                    "any.required": "Tweet Order is required"
                })
            }))
            .unique((a, b) => a.tweet_order === b.tweet_order)
            .required()
            .messages({
            "array.base": "Tweets must be a list",
            "array.unique": "Tweet order must be unique",
            "array.includesRequiredUnknowns": "Tweets must be in correct format",
            "any.required": "Tweets list is required"
        })
    }),
    "POST/posts/now": Joi.object().keys({
        timestamp: Joi.date().timestamp('unix').greater(Date.now()+(5*60*1000)).optional().messages({
            "date.format": "Scheduled date isn't in a timestamp format",
            "date.greater": "Please select a datetime atleast 5 mins away from now",
            "any.required": "Scheduled date is missing"
        }),
        recurring: Joi.boolean().required().messages({
            "boolean.base": "Whether this is a recurring post or not isn't told via a boolean value",
            "any.required": "Recurring field is missing"
        }),
        category_id: Joi.number().integer().allow(null).required().messages({
            "number.base": "Category ID must be a number",
            "any.required": "Category ID is required"
        }),
        tweets: Joi.array()
            .items(Joi.object().keys({
                tweet: Joi.string().trim().min(1).max(280).required().messages({
                    "string.base": "Tweet must be a string",
                    "string.empty": "Please make sure you don't have empty tweets",
                    "string.max": "Tweet cannot exceed more than 280 characters",
                    "any.required": "Tweet is required"
                }),
                tweet_order: Joi.number().integer().messages({
                    "number.base": "Tweet order must be a number",
                    "any.required": "Tweet Order is required"
                })
            }))
            .unique((a, b) => a.tweet_order === b.tweet_order)
            .required()
            .messages({
            "array.base": "Tweets must be a list",
            "array.unique": "Tweet order must be unique",
            "array.includesRequiredUnknowns": "Tweets must be in correct format",
            "any.required": "Tweets list is required"
        })
    }),
    "GET/posts/queue": Joi.object().keys({
        timestamp: Joi.number().integer().min(0).optional().messages({
            "number.base": "Timestamp must be an integer"
        })
    })
};

const users = {
    "POST/login": Joi.object().keys({
        email: Joi.string().trim().empty('').email().required().messages({
            "string.base": "Email must be string",
            "string.email": "Email must be a valid email address",
            "any.empty": "Email is required",
            "any.required": "Email is required"
        }),
        password: Joi.string().trim().empty('').required().messages({
            "string.base": "Password must be string",
            "any.required": "Password is required"
        })
    }),
    "POST/signup": Joi.object().keys({
        email: Joi.string().trim().empty('').email().required().messages({
            "string.base": "Email must be string",
            "string.email": "Email must be a valid email address",
            "any.empty": "Email is required",
            "any.required": "Email is required"
        }),
        password: Joi.string().trim().empty('').min(6).max(128).required().messages({
            "string.base": "Password must be string",
            "string.min": "Password must have 6 characters atleast",
            "string.max": "Password can't have more than 128 characters",
            "any.required": "Password is required"
        })
    })
};

const categories = {
    "POST/categories": Joi.object().keys({
        name: Joi.string().trim().min(1).max(20).required().messages({
            "string.base": "Category name must be a string",
            "string.min": "Category name cannot be empty",
            "string.max": "Category name cannot be larger than 20 characters",
            "any.required": "Category name is required"
        })
    }),
    "PUT/categories-params": Joi.object().keys({
        category_id: Joi.number().integer().allow(null).required().messages({
            "number.base": "Category ID must be a number",
            "any.required": "Category ID is required"
        })
    })
};

const profiles = {
    "PUT/profiles": Joi.object().keys({
        name: Joi.string().trim().max(20).required().messages({
            "string.base": "Name must be a string",
            "string.max": "Name cannot be larger than 20 characters",
            "any.required": "Name is required"
        }),
        timezone: Joi.number().integer().required().messages({
            "number.base": "Timezone must be a number",
            "any.required": "Timezone is required"
        }),
        avatar: Joi.string().trim().allow(null).required().messages({
            "string.base": "Avatar must be a base64 string",
            "any.required": "Avatar is required"
        })
    })
};

module.exports = {
    dispatch,
    plugs,
    posts,
    users,
    profiles,
    categories
};
