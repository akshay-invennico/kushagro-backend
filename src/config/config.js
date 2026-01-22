const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(300).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    SENDGRID_API_KEY: Joi.string().required().description('SendGrid API key'),
    SENDER_MAIL: Joi.string().required().description('SendGrid sender email address'),
    AWS_SECRET_ACCESS_KEY: Joi.string().description('aws s3 secret access key'),
    AWS_ACCESS_KEY_ID: Joi.string().required().description('aws s3 access key id'),
    AWS_BUCKET_REGION: Joi.string().required().description('aws s3 region'),
    AWS_BUCKET_NAME: Joi.string().required().description('aws s3 bucket name'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: 10,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
    sendgrid: {
      apiKey: envVars.SENDGRID_API_KEY,
      senderMail: envVars.SENDER_MAIL,
    },
  },
  payment: {
    flutterwaveSecretKey: envVars.FLUTTERWAVE_SECRET,
    flutterwaveSecretHash: envVars.FLUTTERWAVE_SECRET_HASH,
    flutterwaveWebhokUrl: envVars.FLUTTERWAVE_WEBHOOK_URL,
  },
  order: {
    tax: envVars.ADMIN_TAX,
    platformCharges: envVars.PLATFORM_CHARGE,
  },
  firebase: {
    FIREBASE_PRIVATE_KEY: envVars.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: envVars.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PROJECT_ID: envVars.FIREBASE_PROJECT_ID,
  },
  aws: {
    s3: {
      secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
      accessKeyId: envVars.AWS_ACCESS_KEY_ID,
      region: envVars.AWS_BUCKET_REGION,
      bucket: envVars.AWS_BUCKET_NAME,
    },
  },
};
