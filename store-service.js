/*
    WEB322 – Assignment 05
    I declare that this assignment is my own work in accordance with Seneca Academic Policy.
    No part of this assignment has been copied manually or electronically from any other source 
    (including 3rd party web sites) or distributed to other students.
    
    Name: Ehsan Mahmood
    Student ID: 115028227
    Date: 01/12/2024
    Repl.it Web App URL: not updated yet on vercel cause deployed in vercel first
    GitHub Repository URL: not updated yet on vercel cause deployed in vercel first 
*/
const Sequelize = require('sequelize');

// Explicitly set the connection string
const sequelize = new Sequelize('postgresql://web322_ws5_owner:jKYGroTgm1n8@ep-quiet-dew-a5te3bkz.us-east-2.aws.neon.tech/web322_ws5?sslmode=require', {
    dialect: 'postgres',
    dialectOptions: {
        ssl: { rejectUnauthorized: false },
    },
    logging: false, // Disable Sequelize logging
});

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch((err) => {
        console.error('Unable to connect to the database:', err);
    });

// Define the Item model
const Item = sequelize.define('Item', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    body: Sequelize.TEXT,
    title: Sequelize.STRING,
    postDate: { type: Sequelize.DATE, field: 'postDate' }, // Explicit field mapping
    featureImage: { type: Sequelize.STRING, field: 'featureImage' },
    published: Sequelize.BOOLEAN,
    price: Sequelize.DOUBLE,
    category: { type: Sequelize.INTEGER, field: 'category' },
    createdAt: { type: Sequelize.DATE, field: 'createdAt' },
    updatedAt: { type: Sequelize.DATE, field: 'updatedAt' },
});



// Define the Category model
const Category = sequelize.define('Category', {
    category: Sequelize.STRING,
});

// Define the relationship
Item.belongsTo(Category, { foreignKey: 'category' });

module.exports = {
    initialize() {
        return sequelize.sync()
            .then(() => console.log("Database synced successfully!"))
            .catch((err) => {
                console.error("Unable to sync the database:", err);
                return Promise.reject("Unable to sync the database");
            });
    },

    getAllItems() {
        return Item.findAll()
            .then((data) => {
                console.log('Fetched Items:', data); // Add this
                return data;
            })
            .catch(() => Promise.reject("No results returned"));
    },
    

    getItemsByCategory(category) {
        return Item.findAll({
            where: { category: category },
        })
        .then((data) => data)
        .catch(() => Promise.reject("No results returned"));
    },

    getItemsByMinDate(minDateStr) {
        const { gte } = Sequelize.Op;
        return Item.findAll({
            where: {
                postDate: {
                    [gte]: new Date(minDateStr),
                },
            },
        })
        .then((data) => data)
        .catch(() => Promise.reject("No results returned"));
    },

    getItemById(id) {
        return Item.findAll({
            where: { id: id },
        })
        .then((data) => data[0]) // Return the first result
        .catch(() => Promise.reject("No results returned"));
    },

    addItem(itemData) {
        itemData.published = itemData.published ? true : false;

        // Replace empty strings with null
        for (const prop in itemData) {
            if (itemData[prop] === "") {
                itemData[prop] = null;
            }
        }

        // Set the postDate to the current date
        itemData.postDate = new Date();

        return Item.create(itemData)
            .then(() => Promise.resolve())
            .catch(() => Promise.reject("Unable to create item"));
    },

    getPublishedItems() {
        return Item.findAll({
            where: { published: true },
        })
        .then((data) => {
            console.log("Published Items:", data);
            return data;
        })
        .catch((err) => {
            console.error("Error fetching published items:", err);
            return Promise.reject("No results returned");
        });
    },
    
    
    
    getPublishedItemsByCategory(category) {
        return Item.findAll({
            where: {
                published: true,
                category: category,
            },
        })
        .then((data) => data)
        .catch(() => Promise.reject("No results returned"));
    },

    getCategories() {
        return Category.findAll()
            .then((data) => data)
            .catch(() => Promise.reject("No results returned"));
    },

    addCategory(categoryData) {
        // Replace empty strings with null
        for (const prop in categoryData) {
            if (categoryData[prop] === "") {
                categoryData[prop] = null;
            }
        }

        return Category.create(categoryData)
            .then(() => Promise.resolve())
            .catch(() => Promise.reject("Unable to create category"));
    },

    deleteCategoryById(id) {
        return Category.destroy({
            where: { id: id },
        })
        .then(() => Promise.resolve())
        .catch(() => Promise.reject("Unable to remove category / category not found"));
    },

    deleteItemById(id) {
        return Item.destroy({
            where: { id: id },
        })
        .then(() => Promise.resolve())
        .catch(() => Promise.reject("Unable to remove item / item not found"));
    },
};


