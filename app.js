// app.js
const express = require('express');
const expressLayout = require('express-ejs-layouts');
const path = require('path');
const main = require('./service/routes/main');
const connectDB = require('./service/config/db');
const app = express();

//CONNESSIONE AL DB
connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(expressLayout);
app.use(express.static(path.join(__dirname, 'public')));

app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');

app.use('/', main);

module.exports = app;
