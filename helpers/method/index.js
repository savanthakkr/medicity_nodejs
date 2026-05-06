var methods = require('./methods');
const { makeFileName, uploadFileToS3, uploadBufferToS3 } = require('./s3Uploader.js');

module.exports = {
  ...methods,
  uploadFileToS3,
  makeFileName,
  uploadBufferToS3,
};
