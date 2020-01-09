#! /usr/local/bin/node

/*
进入网站 http://yuanjian.cnki.com.cn/
使用检索框，输入文献来源，点击提交
返回的第一个页面，包含记录总数，或者说需要翻页的次数
*/

const axios = require('axios');
const qs = require('querystring');
const cheerio = require('cheerio');
const headers = require('../data/headers.json');

const originate = "情报学报";

const form = {
    searchType: "MulityTermsSearch",
    Originate: originate,
    Order: "1"
}

const options = {
    proxy: {
        host: '127.0.0.1',
        port: '8888'
    },
    method: 'POST',
    headers: headers,
    data: qs.stringify(form),
    url: 'http://yuanjian.cnki.com.cn/Search/Result'
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
    const records_per_page = 20;
    const records_num = parseInt($('#hidTotalCount').attr('value'));
    const pages_num = Math.ceil(records_num / records_per_page);
    console.log(records_num, pages_num);
}