const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const S3 = require('aws-sdk/clients/s3');

const createPresignedPost = (key) => {
    return new Promise((resolve, reject) => {
        let s3 = new S3({
            signatureVersion: 'v4'
        });

        let params = {
            Bucket: process.env.S3_BUCKET, 
            Fields: {
                key
            }
        };

        s3.createPresignedPost(params, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        })
    });
};


const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

const getMedia = async (key) => {
    let awsClient = new S3Client();

    let params = {
        Bucket: process.env.S3_BUCKET, 
        Key: key 
    };
    
    let command = new GetObjectCommand(params);
    
    let s3Result = await awsClient.send(command);

    let mediaData = await streamToBuffer(s3Result.Body);

    await awsClient.destroy();

    return mediaData;
}

const deleteMediaS3 = async (keys) => {
    let awsClient = new S3Client();

    let params = {
        Bucket: process.env.S3_BUCKET, 
        Delete: {
            Objects: keys
        }
    };

    let command = new DeleteObjectsCommand(params);

    let s3Result = await awsClient.send(command);

    await awsClient.destroy()

    return;
}

const uploadToS3 = async (body, key) => {
    let awsClient = new S3Client();

    let params = {
        Body: body, 
        Bucket: process.env.S3_BUCKET, 
        Key: key
    };

    let command = new PutObjectCommand(params);

    let s3Result = await awsClient.send(command);

    await awsClient.destroy()

    return;
}

const getMediaV2 = (key) => {
    return new Promise((resolve, reject) => {
        let s3 = new S3();

        let params = {
            Bucket: process.env.S3_BUCKET, 
            Key: key 
        };

        s3.getObject(params, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                resolve(data.Body);
            }
        })
    });
};

const uploadToS3v2 = (body, key) => {
    return new Promise((resolve, reject) => {
        let s3 = new S3();

        let params = {
            Body: body, 
            Bucket: process.env.S3_BUCKET, 
            Key: key
        };

        s3.putObject(params, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        })
    });
};
        


module.exports = {
    uploadToS3,
    uploadToS3v2,
    deleteMediaS3,
    createPresignedPost,
    getMediaV2,
    getMedia
};

