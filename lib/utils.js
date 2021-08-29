const Jimp = require('jimp');
const helpers = require('./helpers');
const { nanoid } = require('nanoid');

const adjustTimestamp = timestamp => {
    return Math.floor(timestamp/60)*60;
}

const uploadMedia = async (media) => {
    let { media_order, tweet_order } = media;

    if(media.newly_added) {

        let mediaBuffer = await Buffer.from(media.url, 'base64');

        let image = await Jimp.read(mediaBuffer);

        const extention = image.getExtension();

        image = await image.getBufferAsync(Jimp.AUTO);
        
        let allowedMIMEtypes = ["jpeg", "jpg", "png"];

        if(allowedMIMEtypes.includes(extention)) {
            let keyId = nanoid();
            let key = `twitter_images/${keyId}.${extention}`; 

            await helpers.uploadToS3v2(image, key);

            return {
                key,
                tweet_order,
                media_order
            };
        }
        else {
            let err =new Error("Only JPG or PNG file is allowed");
            err.name = "FileTypeError";
            throw err
        }
    }
    else {
        return {
            key: `twitter_images/${media.url.split('twitter_images/')[1]}`,
            tweet_order,
            media_order
        };
    }
};

module.exports = {
    adjustTimestamp,
    uploadMedia
};


