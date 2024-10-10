/*********************************************************************************

WEB322 – Assignment 02
I declare that this assignment is my own work in accordance with Seneca Academic Policy. 
No part of this assignment has been copied manually or electronically from any other source 
(including 3rd party web sites) or distributed to other students.

Name: Ehsan Mahmood
Student ID: 115028227
Date: 09/10/2024
Repl.it Web App URL: 
GitHub Repository URL: 

********************************************************************************/


const express = require('express');
const path = require('path');
const storeService = require('./store-service');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 8080;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from 'public'
app.use(express.static('public'));

// Middleware to handle form submissions
app.use(express.urlencoded({ extended: true }));

// Use session middleware to store the cart
app.use(session({
    secret: 'your-secret-key', // Replace with your own secret key
    resave: false,
    saveUninitialized: true
}));

// SEO optimization middleware (adds meta tags)
app.use((req, res, next) => {
    res.set('X-Robots-Tag', 'index, follow');
    next();
});

// Redirect '/' to '/about'
app.get('/', (req, res) => {
    res.redirect('/about');
});

// Serve 'about.html' for '/about' route
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

// Serve published items for '/shop'
app.get('/shop', (req, res) => {
    storeService.getPublishedItems().then((items) => {
        res.render('shop', { items });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load shop items', error: err });
    });
});

// Add to Cart route
app.post('/cart/add', (req, res) => {
    const { itemId, itemName, itemPrice } = req.body;

    // Initialize cart in session if not already created
    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Add the item to the session's cart
    req.session.cart.push({ itemId, itemName, itemPrice });

    // Redirect to the cart page after adding
    res.redirect('/cart');
});

// Clear Cart route
app.post('/cart/clear', (req, res) => {
    // Clear the session cart
    req.session.cart = [];
    res.redirect('/cart');
});

// Checkout route
app.post('/cart/checkout', (req, res) => {
    // Simulate checkout by clearing the cart and showing a success message
    req.session.cart = [];
    res.render('checkout', { message: 'Your order has been placed successfully!' });
});

// View Cart route
app.get('/cart', (req, res) => {
    const cartItems = req.session.cart || [];
    let total = 0;

    // Calculate the total price of all items in the cart
    cartItems.forEach(item => {
        total += parseFloat(item.itemPrice);  // Ensure the price is a number
    });

    // Render the cart view and pass the total
    res.render('cart', { cartItems, total });
});

// Serve all items for '/items'
app.get('/items', (req, res) => {
    storeService.getAllItems().then((items) => {
        res.render('items', { items });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load items', error: err });
    });
});

// Serve all categories for '/categories'
app.get('/categories', (req, res) => {
    storeService.getCategories().then((categories) => {
        res.render('categories', { categories });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load categories', error: err });
    });
});

// Serve products under a specific category
app.get('/category/:id', (req, res) => {
    const categoryId = parseInt(req.params.id, 10);

    storeService.getAllItems().then((items) => {
        const filteredItems = items.filter(item => item.category === categoryId);
        res.render('categoryProducts', { items: filteredItems });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load category products', error: err });
    });
});

// Handle 404 error with a custom page
app.use((req, res) => {
    res.status(404).render('404', { message: 'Page Not Found' });
});

// Initialize data and start server
storeService.initialize().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
    });
}).catch(err => {
    console.log('Error initializing data:', err);
});
