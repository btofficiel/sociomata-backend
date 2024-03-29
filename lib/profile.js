const api = require('./api');
const getUnixTime = require('date-fns/getUnixTime');
const helpers = require('./helpers');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Jimp = require('jimp');
const { nanoid } = require('nanoid');

const fetchProfile = async (id, account, db, sql) => {
    let currentTS = getUnixTime(new Date());
    let profile = await db.oneOrNone(sql.profile, [id]);
    let socialAccounts = await db.manyOrNone(sql.twitter, [account]);
    let user = await db.oneOrNone(sql.email, [id]);
    let isAdmin = await db.oneOrNone(sql.check_if_admin, [id]);
    let accountDetails = await db.one(sql.account, [account, currentTS]);

    return api.createSuccessResponse(200, {
        profile,
        email: user.email,
        social_accounts: (socialAccounts !== null && socialAccounts.length > 0),
        is_admin: (isAdmin !== null), 
        account: accountDetails
    });
}

const getCoordForCrop = width => {
    return Math.floor((width-400)/2);
}

const generateAvatarImageKey = (userAvatar, id) => {
    if(userAvatar?.avatar) {
        let onlyFilename = userAvatar.avatar.split("?version=")[0];
        return onlyFilename;
    }
    else {
        let uniqueID = nanoid();

        let newFilename = id.toString().concat("_", uniqueID); 
        return `avatars/${newFilename}.jpg`;
    }
}



const editProfile = async (payload, id, account, db, sql) => {
    const {
        name,
        timezone,
        avatar
    } = payload;

    if(avatar) {

        let userAvatar =  await db.oneOrNone(sql.fetch, [id]);

        let avatarBuffer = await Buffer.from(avatar, 'base64');

        const image = await Jimp.read(avatarBuffer);
        const extention = image.getExtension();
        let allowedMIMEtypes = ["jpeg", "jpg", "png"];
        if(allowedMIMEtypes.includes(extention)) {
            let cropX;
            let resized_image;
            
            if (image.bitmap.width < image.bitmap.height) {
                await image.resize(400, Jimp.AUTO);
                cropY = getCoordForCrop(image.bitmap.height);
                resized_image = await image.crop(0, cropY, 400, 400).getBufferAsync(Jimp.MIME_JPEG);
            } 
            else {
                await image.resize(Jimp.AUTO, 400);
                cropX = getCoordForCrop(image.bitmap.width);
                resized_image = await image.crop(cropX, 0, 400, 400).getBufferAsync(Jimp.MIME_JPEG);
            }

            let imageKey = generateAvatarImageKey(userAvatar, id);

            await helpers.uploadToS3(resized_image, imageKey);

            let randomVersion = nanoid();
            let versionedImageKey = `${imageKey}?version=${randomVersion}`;

            await db.none(sql.upsert, [id, name, timezone, versionedImageKey]);

            let result = await fetchProfile(id, account, db, sql); 
            return result;
        }
        else {
            return api.createFailedResponse(409, "Only JPG or PNG image format is allowed");
        }
    } else {
        await db.none(sql.upsertWithoutAvatar, [id, name, timezone]);
        let result = await fetchProfile(id, account, db, sql); 
        return result;
    }
}

module.exports = {
    fetchProfile,
    editProfile
}
