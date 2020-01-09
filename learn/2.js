#! /usr/local/bin/node

/*
根据第一阶段请求返回的页面总数，发送翻页请求获得所有文章的链接
*/

const axios = require('axios');
const qs = require('querystring');
const cheerio = require('cheerio');
const headers = require('../data/headers.json');

const originate = "情报学报";
const page = "1";

const form = {
    searchType: "MulityTermsSearch",
    ParamIsNullOrEmpty: "true",
    Islegal: "false",
    Originate: originate,
    Order: "1",
    Page: page
}

const options = {
    proxy: {
        host: '127.0.0.1',
        port: '8888'
    },
    method: 'POST',
    headers: headers,
    data: qs.stringify(form),
    url: 'http://yuanjian.cnki.com.cn/Search/ListResult'
};

axios(options)
    .then((response) => {
        parse(response.data);
    })
    .catch((error) => {
        console.error(error);
    })
    .finally(() => {
        console.log('done!');
    })

function parse(data) {
    const $ = cheerio.load(data);
    const links = $('a.left[target][title]').map((idx, item) => {
        return $(item).attr('href');
    }).toArray();
    console.log(links);
}