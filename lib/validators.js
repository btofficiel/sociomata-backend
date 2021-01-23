const Joi = require('joi');

const posts = {
    "PUT/posts": Joi.object().keys({
        timestamp: Joi.date().timestamp('unix').greater('now').required().messages({
            "date.format": "Scheduled date isn't in a timestamp format",
            "date.greater": "Scheduled time must be 5 mins ahead of current time",
            "any.required": "Scheduled date is missing"
        }),
        description: Joi.string().min(1).max(100).required().messages({
            "string.base": "Description must be a string",
            "string.min": "Description cannot be empty",
            "string.max": "Description cannot exceed more than 100 characters",
            "any.required": "Description is required"
        }),
        category_id: Joi.number().integer().allow(null).required().messages({
            "number.base": "Category ID must be a number",
            "any.required": "Category ID is required"
        }),
        tweets: Joi.array()
            .items(Joi.object().keys({
                tweet: Joi.string().min(1).max(280).required().messages({
                    "string.base": "Tweet must be a string",
                    "string.min": "Tweet cannot be empty",
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
            "any.required": "Tweets list is required"
        })
    }),
    "PUT/posts-params": Joi.object().keys({
        post_id: Joi.number().integer().messages({
            "number.base": "Post ID must be a number",
            "any.required": "Post ID is required"
        })
    }),
    "POST/posts": Joi.object().keys({
        timestamp: Joi.date().timestamp('unix').greater('now').required().messages({
            "date.format": "Scheduled date isn't in a timestamp format",
            "date.greater": "Scheduled time must be 5 mins ahead of current time",
            "any.required": "Scheduled date is missing"
        }),
        recurring: Joi.boolean().required().messages({
            "boolean.base": "Whether this is a recurring post or not isn't told via a boolean value",
            "any.required": "Recurring field is missing"
        }),
        description: Joi.string().min(1).max(100).required().messages({
            "string.base": "Description must be a string",
            "string.min": "Description cannot be empty",
            "string.max": "Description cannot exceed more than 100 characters",
            "any.required": "Description is required"
        }),
        category_id: Joi.number().integer().allow(null).required().messages({
            "number.base": "Category ID must be a number",
            "any.required": "Category ID is required"
        }),
        tweets: Joi.array()
            .items(Joi.object().keys({
                tweet: Joi.string().min(1).max(280).required().messages({
                    "string.base": "Tweet must be a string",
                    "string.min": "Tweet cannot be empty",
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
    })
};

const users = {
    "POST/login": Joi.object().keys({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),
    "POST/signup": Joi.object().keys({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).max(128).required()
    })
};

const categories = {
    "POST/categories": Joi.object().keys({
        name: Joi.string().min(1).max(20).required().messages({
            "string.base": "Category name must be a string",
            "string.min": "Category name cannot be empty",
            "string.max": "Category name cannot be larger than 20 characters"
        })
    }),
    "PUT/categories-params": Joi.object().keys({
        category_id: Joi.number().integer().allow(null).required().messages({
            "number.base": "Category ID must be a number",
            "any.required": "Category ID is required"
        })
    })
};

module.exports = {
    posts,
    users,
    categories
};
