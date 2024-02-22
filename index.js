require('dotenv').config()
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const API = require('./api/index')
const PORT = process.env.PORT || 3000;
// const cookieParser = require('cookie-parser')

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(bodyParser.json());

app.get('/', (req, res) => {
   res.send('yerrr welcome to palate.')
});

// ROUTES
app.use('/api', API)


app.listen(PORT, () => {
   console.log('server is running on port', PORT)
})