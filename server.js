/*********************************************************************************
WEB322 – Assignment 02
I declare that this assignment is my own work in accordance with Seneca Academic Policy.
No part of this assignment has been copied manually or electronically from any other
source (including 3rd party websites) or distributed to other students.

Name: Your Name
Student ID: Your Student ID
Date: Today's Date
Cyclic Web App URL: _______________________________________________________
GitHub Repository URL: ______________________________________________________
********************************************************************************/

const express = require("express");
const app = express();
const path = require("path");
const exphbs = require("express-handlebars");
const storeService = require("./store-service");

// Set up Handlebars as the view engine
app.engine(".hbs", exphbs.engine({ extname: ".hbs" }));
app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the public directory
app.use(express.static("public"));

// Redirect root to the about page
app.get("/", (req, res) => {
    res.redirect("/about");
});

// About page
app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, "views/about.html"));
});

// Shop page (Published items)
app.get("/shop", (req, res) => {
    storeService.getPublishedItems()
        .then((items) => res.render("shop", { items }))
        .catch((err) => res.render("shop", { message: err }));
});

// Items page (All items)
app.get("/items", (req, res) => {
    storeService.getAllItems()
        .then((items) => res.json(items))
        .catch((err) => res.json({ message: err }));
});

// Categories page
app.get("/categories", (req, res) => {
    storeService.getCategories()
        .then((categories) => res.json(categories))
        .catch((err) => res.json({ message: err }));
});

// Handle 404 (Page not found)
app.use((req, res) => {
    res.status(404).send("Page Not Found");
});

// Initialize the store service and start the server
const PORT = process.env.PORT || 8080;
storeService.initialize()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Express http server listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error(`Unable to start server: ${err}`);
    });
