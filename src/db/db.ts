// const mongoose = require("mongoose");

import mongoose from "mongoose";

const DB_URI = process.env.DB_URI || 'default';
console.log(DB_URI);

mongoose.connect(DB_URI)
    .then(() => console.log("Database connection successful"))
    .catch((err) => {
        console.log(err);
        process.exit(1);
    });