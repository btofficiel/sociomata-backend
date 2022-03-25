const instagramProvider = (options) => {
    options = options || {};

    return {
        protocol: 'oauth2',
        useParamsAuth: true,
        auth: 'https://api.instagram.com/oauth/authorize',
        token: 'https://api.instagram.com/oauth/access_token',
        scope: [
            'user_profile', 
            'user_media', 
            'content_publish',
            'basic',
        ],
        scopeSeparator: ',',
        profile: async function (credentials, params, get) {

            credentials.profile = {
                id: params.user.id,
                username: params.user.username,
                displayName: params.user.full_name,
                raw: params.user
            };

            if (options.extendedProfile === false) { // Defaults to true
                return;
            }
        }
    };
};

const facebookProvider = (options) => {
    options = options || {};

    return {
        protocol: 'oauth2',
        useParamsAuth: true,
        auth: 'https://www.facebook.com/v13.0/dialog/oauth',
        token: 'https://graph.facebook.com/v13.0/oauth/access_token',
        scope: [
            'public_profile', 
            'pages_manage_posts', 
            'publish_video',
            'pages_read_user_content',
            'instagram_content_publish',
            'instagram_basic',
        ],
        scopeSeparator: ',',
        profile: async function (credentials, params, get) {

            credentials.profile = {
                id: params.user.id,
                username: params.user.username,
                displayName: params.user.full_name,
                raw: params.user
            };

            if (options.extendedProfile === false) { // Defaults to true
                return;
            }
        }
    };
};

module.exports = {
    instagramProvider,
    facebookProvider
};
