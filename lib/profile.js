const api = require('./api');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Jimp = require('jimp');
const { nanoid } = require('nanoid');

const fetchProfile = async (id, db, sql) => {
    let profile = await db.oneOrNone(sql.profile, [id]);
    let twitterConnection = await db.oneOrNone(sql.twitter, [id]);
    let user = await db.oneOrNone(sql.email, [id]);

    return api.createSuccessResponse(200, {
        profile,
        email: user.email,
        twitter: (twitterConnection !== null)
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



const editProfile = async (payload, id, db, sql) => {
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


            let awsClient = new S3Client();

            let imageKey = generateAvatarImageKey(userAvatar, id);
            let params = {
                Body: resized_image, 
                Bucket: process.env.S3_BUCKET, 
                Key: imageKey
            };

            let command = new PutObjectCommand(params);

            let s3Result = await awsClient.send(command);

            await awsClient.destroy()

            let randomVersion = nanoid();
            let versionedImageKey = `${imageKey}?version=${randomVersion}`;

            await db.oneOrNone(sql.upsert, [id, name, timezone, versionedImageKey]);

            return api.createSuccessResponse(200);
        }
        else {
            return api.createFailedResponse(409, "Only JPG or PNG image format is allowed");
        }
    } else {
        await db.oneOrNone(sql.upsertWithoutAvatar, [id, name, timezone]);
        return api.createSuccessResponse(200);
    }
}

module.exports = {
    fetchProfile,
    editProfile
}
