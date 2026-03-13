const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure upload directories exist
const productUploadPath = path.join(__dirname, '../uploads/product');
const packageUploadPath = path.join(__dirname, '../uploads/package');
const treatmentUploadPath = path.join(__dirname, '../uploads/treatment');

if (!fs.existsSync(productUploadPath)) {
    fs.mkdirSync(productUploadPath, { recursive: true });
}
if (!fs.existsSync(packageUploadPath)) {
    fs.mkdirSync(packageUploadPath, { recursive: true });
}
if (!fs.existsSync(treatmentUploadPath)) {
    fs.mkdirSync(treatmentUploadPath, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination(req, file, cb) {
        if (req.params.type === 'package') {
            cb(null, 'uploads/package/');
        } else if (req.params.type === 'treatment') {
            cb(null, 'uploads/treatment/');
        } else {
            cb(null, 'uploads/product/');
        }
    },
    filename(req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Images only!');
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

router.post('/:type', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No image uploaded');
        }
        
        let filePath = req.file.path.replace(/\\/g, '/');
        // e.g. uploads/product/image-12345.jpg
        return res.status(200).json({ url: `/${filePath}` });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
