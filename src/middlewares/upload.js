const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const config = require('../config/config');

aws.config.update({
  secretAccessKey: config.aws.s3.secretAccessKey,
  accessKeyId: config.aws.s3.accessKeyId,
  region: config.aws.s3.region,
});

const s3 = new aws.S3();

const fileFilter = (_, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type, only JPEG and PNG is allowed!'), false);
  }
};

const upload = multer({
  fileFilter,
  storage: multerS3({
    s3,
    bucket: config.aws.s3.bucket,

    contentType: multerS3.AUTO_CONTENT_TYPE,

    metadata(_, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },

    key(_, file, cb) {
      cb(null, `images/${Date.now()}_${file.originalname}`);
    },
  }),
});

module.exports = upload;
