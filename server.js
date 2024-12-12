require('dotenv').config();
const express = require('express');
const path = require('path');
const storeService = require('./store-service');
const authData = require('./auth-service');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const exphbs = require('express-handlebars');
const clientSessions = require('client-sessions');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const handlebars = require('handlebars');

const app = express();
const PORT = process.env.PORT || 8080;

// Handlebars setup
app.engine(
  '.hbs',
  exphbs.engine({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
      navLink: function (url, options) {
        return (
          `<li class="nav-item">
            <a class="nav-link ${url === app.locals.activeRoute ? 'active' : ''}" href="${url}">
              ${options.fn(this)}
            </a>
          </li>`
        );
      },
    },
    handlebars: allowInsecurePrototypeAccess(handlebars),
  })
);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(clientSessions({
  cookieName: 'session',
  secret: process.env.SESSION_SECRET || 'defaultSecret',
  duration: 24 * 60 * 60 * 1000,
  activeDuration: 1000 * 60 * 5,
}));

// Make session available in views
app.use((req, res, next) => {
  res.locals.session = req.session;
  app.locals.activeRoute = `/${req.path.split('/')[1]}`;
  next();
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer for file uploads
const upload = multer();

// Ensure Login Middleware
function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

// Routes
app.get('/', (req, res) => res.redirect('/shop'));

app.get('/about', (req, res) => res.render('about', { title: 'About Us' }));

// Register and Login Routes
app.get('/register', (req, res) => res.render('register', { title: 'Register' }));

app.post('/register', (req, res) => {
  authData.registerUser(req.body)
    .then(() => res.render('register', { successMessage: 'User created successfully!', title: 'Register' }))
    .catch(err => res.render('register', { errorMessage: err, userName: req.body.userName, title: 'Register' }));
});

app.get('/login', (req, res) => res.render('login', { title: 'Login' }));

app.post('/login', (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  authData.checkUser(req.body)
    .then(user => {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory,
      };
      res.redirect('/shop');
    })
    .catch(err => res.render('login', { errorMessage: err, userName: req.body.userName, title: 'Login' }));
});

app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/login');
});

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory', { user: req.session.user, title: 'User History' });
});

// Shop Routes
app.get('/shop', (req, res) => {
  let viewData = { posts: [], categories: [] };
  storeService.getPublishedItems()
    .then(posts => {
      viewData.posts = posts;
      return storeService.getCategories();
    })
    .then(categories => {
      viewData.categories = categories;
      res.render('shop', viewData);
    })
    .catch(err => res.render('shop', { message: 'Error loading shop.', error: err }));
});

app.get('/shop/:id', (req, res) => {
  const itemId = req.params.id;
  let viewData = { post: null, posts: [], categories: [] };
  storeService.getPublishedItems()
    .then(posts => {
      viewData.posts = posts;
      return storeService.getCategories();
    })
    .then(categories => {
      viewData.categories = categories;
      return storeService.getAllItems();
    })
    .then(allItems => {
      viewData.post = allItems.find(item => item.id == itemId) || null;
      res.render('shop', viewData);
    })
    .catch(err => res.render('shop', { message: 'Error loading item.', error: err }));
});

// Item Routes
app.get('/items', ensureLogin, (req, res) => {
  storeService.getAllItems()
    .then(items => res.render('items', { items, title: 'Items' }))
    .catch(() => res.render('items', { message: 'No items found.', title: 'Items' }));
});

app.get('/items/add', ensureLogin, (req, res) => {
  storeService.getCategories()
    .then(categories => res.render('addPost', { title: 'Add Items', categories }))
    .catch(() => res.render('addPost', { title: 'Add Items', categories: [] }));
});

app.post('/items/add', ensureLogin, upload.single('featureImage'), (req, res) => {
  const processItem = (imageUrl) => {
    req.body.featureImage = imageUrl;
    storeService.addItem(req.body)
      .then(() => res.redirect('/items'))
      .catch(err => res.status(500).json({ message: 'Failed to add item', error: err }));
  };

  if (req.file) {
    const streamUpload = (req) => new Promise((resolve, reject) => {
      let stream = cloudinary.uploader.upload_stream((error, result) => {
        if (result) resolve(result);
        else reject(error);
      });
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    streamUpload(req)
      .then(uploaded => processItem(uploaded.url))
      .catch(() => res.status(500).json({ message: 'Image upload failed' }));
  } else {
    processItem('');
  }
});

app.get('/items/delete/:id', ensureLogin, (req, res) => {
  storeService.deleteItemById(req.params.id)
    .then(() => res.redirect('/items'))
    .catch(() => res.status(500).send('Unable to Remove Item / Item not found'));
});

//cart routes
// Route for Adding Items to Cart

// Route to view the cart
app.get('/cart', (req, res) => {
    const cartItems = req.session.cart || [];
    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    res.render('cart', { title: 'Your Cart', cartItems, total });
});

app.post('/cart/add', (req, res) => {
    if (!req.session.cart) req.session.cart = [];
    const { itemId, itemName, itemPrice } = req.body;

    const item = {
        id: parseInt(itemId, 10),
        name: itemName,
        price: parseFloat(itemPrice),
    };

    req.session.cart.push(item);
    res.redirect('/cart'); // Redirect to the cart page after adding an item
});

app.post('/cart/checkout', ensureLogin, (req, res) => {
    // Clear the cart after checkout
    req.session.cart = [];
    res.render('checkout', { message: 'Thank you for your purchase!', title: 'Checkout' });
  });

  

// Category Routes
app.get('/categories', ensureLogin, (req, res) => {
  storeService.getCategories()
    .then(categories => res.render('categories', { categories, title: 'Categories' }))
    .catch(() => res.render('categories', { message: 'Error retrieving categories', title: 'Categories' }));
});

app.get('/categories/add', ensureLogin, (req, res) => {
  res.render('addCategory', { title: 'Add Category' });
});

app.post('/categories/add', ensureLogin, (req, res) => {
  storeService.addCategory(req.body)
    .then(() => res.redirect('/categories'))
    .catch(() => res.status(500).send('Unable to add category'));
});

app.get('/categories/delete/:id', ensureLogin, (req, res) => {
  storeService.deleteCategoryById(req.params.id)
    .then(() => res.redirect('/categories'))
    .catch(() => res.status(500).send('Unable to Remove Category / Category not found'));
});

// Protected route for User History
app.get('/userHistory', ensureLogin, (req, res) => {
    res.render('userHistory', {
        user: req.session.user, // Pass the user object from session
        title: 'User History'
    });
});


// Catch-all for 404 errors
app.use((req, res) => {
  res.status(404).render('404', { message: 'Page Not Found' });
});

// Server Initialization
storeService.initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch(err => console.log(`Unable to start server: ${err}`));
