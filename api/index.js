const path = require('path');
const express = require('express');
const morgan = require('morgan');
const { getFileEnvByEnv } = require('../lib/helpers');
const envFile = getFileEnvByEnv(process.env.NODE_ENV);
require('dotenv').config({ path: path.resolve(__dirname, `../${envFile}`) });


const shopifyRoutes = require('./routes/shopify');

const app = express();
const port = 3000;

app.use(morgan('combined'));
app.use(express.raw({ type: '*/*' }));

app.get('/', (req, res) => {
    res.send('Hello API !');
});

app.use('/webhook', shopifyRoutes);

app.listen(port, () => {
    console.log(`API starting ${port}`);
});