#! /usr/local/bin/node

const axios = require('axios');
const qs = require('querystring')
const headers = require('../data/headers.json');
const Originate = "情报学报";

const form = {
    searchType: "MulityTermsSearch",
    Originate: Originate,
    Order: "1"
}

const options = {
    // proxy: {
    //     host: '127.0.0.1',
    //     port: '8888'
    // },
    method: 'POST',
    headers: headers,
    data: qs.stringify(form),
    url: 'http://yuanjian.cnki.com.cn/Search/Result'
};

axios(options)
    .then((response) => {
        console.log(response.data);
    })
    .catch((error) => {
        console.error(error);
    })
    .finally(() => {
        console.log('done!');
    })