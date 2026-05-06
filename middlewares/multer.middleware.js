const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = "/home/ubuntu/emami-uploads";

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "_" + file.originalname);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
            return cb(new Error("Only Excel files allowed"));
        }
        cb(null, true);
    },
});

module.exports = {
    upload,
    UPLOAD_DIR,
};