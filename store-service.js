const fs = require("fs");

let items = [];
let categories = [];

module.exports.initialize = () => {
    return new Promise((resolve, reject) => {
        fs.readFile("./data/items.json", "utf8", (err, data) => {
            if (err) {
                reject("Unable to read items file");
                return;
            }
            items = JSON.parse(data);

            fs.readFile("./data/categories.json", "utf8", (err, data) => {
                if (err) {
                    reject("Unable to read categories file");
                    return;
                }
                categories = JSON.parse(data);
                resolve();
            });
        });
    });
};

module.exports.getAllItems = () => {
    return new Promise((resolve, reject) => {
        if (items.length > 0) {
            resolve(items);
        } else {
            reject("No items found");
        }
    });
};

module.exports.getPublishedItems = () => {
    return new Promise((resolve, reject) => {
        const publishedItems = items.filter(item => item.published);
        if (publishedItems.length > 0) {
            resolve(publishedItems);
        } else {
            reject("No published items found");
        }
    });
};

module.exports.getCategories = () => {
    return new Promise((resolve, reject) => {
        if (categories.length > 0) {
            resolve(categories);
        } else {
            reject("No categories found");
        }
    });
};
