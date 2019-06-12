'use strict'

const fs = require('fs');
const aws = require('aws-sdk');

let path = require('path');
let util = require('util');

let s3 = new aws.S3();
let execSync = require('child_process').execSync;

let i = 1;

const getObject = (bucket, key, resolve, preserve) => {
    let params = {
        Bucket: bucket,
        Key: key
    };
    
    s3.getObject(params, function(error, data) {
        try {
            if(error) {
                preserve(error);
            } else {
                resolve(data);
            }
        } catch(e) {
            preserve(e)
        }
    });
};

const putObject = (body, bucket, key, resolve, preserve) => {
    let params = {
        Body: body,
        Bucket: bucket,
        Key: key
    };
    
    s3.putObject(params, function(error, data) {
        try {
            if (error) {
                preserve(error);
            } else {
                resolve(data);
            }
        } catch(e) {
            preserve(e);
        }
    });
};

exports.handler = (event, context, callback) => {
    let bucket_name = "bucket_name";
    
    let srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    let name = path.basename(srcKey, path.extname(srcKey));
    
    try {
        getObject(bucket_name, 'uploads/' + name + '.mp4', function(srcData) {
           fs.writeFileSync('/tmp/srcData.mp4', srcData.Body);
           
           process.env.PATH += ':/var/task/bin';
           
           execSync('ffmpeg -i /tmp/srcData.mp4 -vframes 1 -filter:v fps=fps=1:round=down /tmp/%d.jpg');
           
           let files = fs.readdirSync('/tmp');
           
           for (let i = 1; i < files.lenght; i++) {
               let fileStream = fs.createReadStream('/tmp/' + i + '.jpg');
               putObject(fileStream, bucket_name, 'thumbnails/' + name + i + '.jpg', function(date) {
                   callback(null, 'OK');
               })
               
           }
        });
        
    } catch(e) {
        callback(JSON.stringify(e));
    }
    
};