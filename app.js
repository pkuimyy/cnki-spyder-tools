#! /usr/local/bin/node

const axios = require('axios');
const headers = require('./data/headers.json')

function task(Originate, Page) {
    const form = {
        searchType: "MulityTermsSearch",
        ParamIsNullOrEmpty: "true",
        Islegal: "false",
        Originate: Originate,
        Order: "1",
        Page: Page
    }
    const options = {
        method: 'POST',
        headers: headers,
        data: JSON.stringify(form),
        url: 'http://yuanjian.cnki.com.cn/Search/ListResult'
    };
    setTimeout(() => {
        return axios(options)
            .then((response) => {
                console.log(response.data);
            })
            .catch((error) => {
                console.error(error);
            })
            .finally(() => {
                console.log('done!');
            })
    }, 100);
}

task("情报学报", 150);

