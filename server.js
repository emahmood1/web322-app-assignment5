/*********************************************************************************

WEB322 – Assignment 03
I declare that this assignment is my own work in accordance with Seneca Academic Policy. 
No part of this assignment has been copied manually or electronically from any other source 
(including 3rd party web sites) or distributed to other students.

Name: Ehsan Mahmood
Student ID: 115028227
Date: 30/10/2024
Repl.it Web App URL: https://replit.com/join/kswbbqleik-ehsanmahmood202
GitHub Repository URL: https://github.com/emahmood1/web322-app-assignment2.git

********************************************************************************/

const express = require('express');
const path = require('path');
const storeService = require('./store-service');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

const upload = multer();

app.get('/', (req, res) => {
    res.redirect('/about');
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/shop', (req, res) => {
    storeService.getPublishedItems().then((items) => {
        res.render('shop', { items });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load shop items', error: err });
    });
});

app.get('/items', (req, res) => {
    storeService.getAllItems().then((items) => {
        res.render('items', { items });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load items', error: err });
    });
});

app.get('/items/add', (req, res) => {
    res.render('addItem');
});

app.post('/items/add', upload.single('featureImage'), (req, res) => {
    if (req.file) {
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream((error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                });
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        async function upload(req) {
            let result = await streamUpload(req);
            return result;
        }

        upload(req).then((uploaded) => {
            req.body.featureImage = uploaded.url;
            storeService.addItem(req.body).then(() => {
                res.redirect('/items');
            }).catch((err) => {
                res.status(500).json({ message: 'Failed to add item', error: err });
            });
        }).catch(() => {
            res.status(500).json({ message: 'Image upload failed' });
        });
    } else {
        storeService.addItem(req.body).then(() => {
            res.redirect('/items');
        }).catch((err) => {
            res.status(500).json({ message: 'Failed to add item', error: err });
        });
    }
});

app.get('/categories', (req, res) => {
    storeService.getCategories().then((categories) => {
        res.render('categories', { categories });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load categories', error: err });
    });
});

app.get('/category/:id', (req, res) => {
    const categoryId = parseInt(req.params.id, 10);

    storeService.getAllItems().then((items) => {
        const filteredItems = items.filter(item => item.category === categoryId);
        res.render('categoryProducts', { items: filteredItems });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load category products', error: err });
    });
});

app.use((req, res) => {
    res.status(404).render('404', { message: 'Page Not Found' });
});

storeService.initialize().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
    });
}).catch(err => {
    console.log('Error initializing data:', err);
});
