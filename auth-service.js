const bcrypt = require("bcryptjs");
const Sequelize = require("sequelize");

let sequelize;
let User;

// Initialize the database connection
module.exports.initialize = function () {
    return new Promise((resolve, reject) => {
        sequelize = new Sequelize(process.env.DATABASE_URL, {
            dialect: "postgres",
            ssl: true,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            }
        });

        // Define User model after initializing sequelize
        User = sequelize.define("User", {
            userName: {
                type: Sequelize.STRING,
                unique: true
            },
            password: Sequelize.STRING,
            email: Sequelize.STRING,
            loginHistory: Sequelize.JSON // Stores an array of login history objects
        });

        sequelize.authenticate()
            .then(() => {
                console.log("Database connected successfully.");
                return User.sync();
            })
            .then(() => resolve())
            .catch((err) => reject("Unable to initialize the database: " + err));
    });
};

// Register User with Hashed Password
module.exports.registerUser = function (userData) {
    return new Promise((resolve, reject) => {
        if (userData.password !== userData.password2) {
            reject("Passwords do not match");
        } else {
            bcrypt.hash(userData.password, 10)
                .then(hash => {
                    userData.password = hash;
                    return User.create({
                        userName: userData.userName,
                        password: userData.password,
                        email: userData.email,
                        loginHistory: []
                    });
                })
                .then(() => resolve())
                .catch(err => {
                    if (err.name === "SequelizeUniqueConstraintError") {
                        reject("User Name already taken");
                    } else {
                        reject("There was an error creating the user: " + err);
                    }
                });
        }
    });
};

// Check User with Encrypted Password
module.exports.checkUser = function (userData) {
    return new Promise((resolve, reject) => {
        User.findOne({ where: { userName: userData.userName } })
            .then(user => {
                if (!user) {
                    reject(`Unable to find user: ${userData.userName}`);
                } else {
                    bcrypt.compare(userData.password, user.password)
                        .then(result => {
                            if (result) {
                                // Update login history
                                const loginHistory = user.loginHistory || [];
                                loginHistory.push({
                                    dateTime: new Date().toISOString(),
                                    userAgent: userData.userAgent
                                });

                                user.update({ loginHistory: loginHistory })
                                    .then(() => resolve(user))
                                    .catch(err => reject("Error updating login history: " + err));
                            } else {
                                reject(`Incorrect Password for user: ${userData.userName}`);
                            }
                        });
                }
            })
            .catch(err => reject("Unable to find user: " + err));
    });
};
