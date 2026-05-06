'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

function buildS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
}

function safeName(str = '') {
  return String(str)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .slice(0, 60);
}

function makeFileName(prefix = 'contacts', label = 'all', extension = 'csv') {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = crypto.randomBytes(6).toString('hex');
  const normalizedExtension = String(extension || 'csv')
    .trim()
    .replace(/^\.+/, '')
    .toLowerCase() || 'csv';
  return `${safeName(prefix)}-${ts}-${safeName(label)}-${rand}.${normalizedExtension}`;
}

/**
 * Upload local file to S3 and return public URL
 */
async function uploadFileToS3({
  localPath,
  bucket = process.env.S3_BUCKET,
  keyPrefix = 'exports/contacts/',
  fileName,
  contentType = 'text/csv',
  publicBaseUrl = process.env.CLOUDFRONT_BASE_URL || '',
} = {}) {
  if (!localPath) throw new Error('localPath is required');
  if (!bucket) throw new Error('S3 bucket missing');

  const s3 = buildS3Client();
  const key = `${keyPrefix}${fileName}`;

  const body = fs.createReadStream(localPath);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  // cleanup temp file
  try {
    fs.unlinkSync(localPath);
  } catch (e) {}

  const url = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/+$/, '')}/${key}`
    : `https://${bucket}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;

  return { url, key };
}

async function uploadBufferToS3({
  buffer,
  fileName,
  bucket = process.env.S3_BUCKET,
  keyPrefix = 'exports/contacts/',
  contentType = 'text/csv',
  publicBaseUrl = process.env.CLOUDFRONT_BASE_URL || '',
} = {}) {
  if (!buffer) throw new Error('buffer is required');
  if (!fileName) throw new Error('fileName is required');
  if (!bucket) throw new Error('S3 bucket missing');

  const key = `${keyPrefix}${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer, // ✅ Buffer/string is allowed
      ContentType: contentType,
    }),
  );

  const url = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/+$/, '')}/${key}`
    : `https://${bucket}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;

  return { url, key };
}

module.exports = { makeFileName, uploadFileToS3, uploadBufferToS3 };
