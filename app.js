#! /usr/local/bin/node

const axios = require('axios');
const qs = require('querystring');
const cheerio = require('cheerio');
const headers = require('./data/headers.json');

function parse_1(data) {
    const $ = cheerio.load(data);
    const records_per_page = 20;
    const records_num = parseInt($('#hidTotalCount').attr('value'));
    const pages_num = Math.ceil(records_num / records_per_page);
    return {
        'records_num': records_num,
        'pages_num': pages_num
    }
}

function parse_2(data) {
    const $ = cheerio.load(data);
    const links = $('a.left[target][title]').map((idx, item) => {
        return $(item).attr('href');
    }).toArray();
    return links;
}

function parse_3(data) {
    const $ = cheerio.load(data);
    const journal = $('#content > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > a:nth-child(1)');
    const journal_link = journal.attr('href');
    const journal_name = journal.find('b').text();
    const publish_year = journal.find('font').text();
    const title = $('.xx_title').text();
    const authors = $('#content > div:nth-child(2) > div:nth-child(3) > a').map((idx, item) => {
        return name = $(item).text().trim();
    }).toArray().join(';');
    const abstract = $('div.xx_font:nth-child(4)').text();
    const others = $('div.xx_font:nth-child(5)').text().replace(/\s+/g, ' ');

    let institution = 'NULL';
    if (others.indexOf('【作者单位】') !== -1) {
        institution = others.match(/(【作者单位】.*?)【/)[1];
    }

    let foundation = 'NULL';
    if (others.indexOf('【基金】') !== -1) {
        foundation = others.match(/(【基金】.*?)【/)[1];
    }

    let class_code = 'NULL';
    if (others.indexOf('【分类号】') !== -1) {
        class_code = others.match(/(【分类号】.*?)$/)[1];
    }

    let result = [journal_link, journal_name,
        publish_year, title, authors,
        abstract, institution, foundation, class_code];
    result = result.map(item => {
        return item.replace(',', '，').replace(/\s+/g, ' ').trim();
    }).join('\n');
    return result;
}

function flaten_1(data) {
    return data.filter(item => {
        return item['status'] === "fulfilled"
    }).map(item => item['value']).reduce((prev, curr) => {
        return prev.concat(curr);
    }, []);
}

const app = journal => {
    const form = {
        searchType: 'MulityTermsSearch',
        Originate: journal,
        Order: '1'
    };
    const options = {
        method: 'POST',
        headers: headers,
        data: qs.stringify(form),
        url: 'http://yuanjian.cnki.com.cn/Search/Result'
    };
    return axios(options).then(response => new Promise(resolve => {
        const result = parse_1(response.data);
        result['journal'] = journal;
        resolve(result);
    })).catch((error) => {
        console.error(error);
    });
}

app('情报学报').then(result => {
    const pages_num = []
    for (let i = 1; i <= result['pages_num'] / 50; i++) {
        pages_num.push(i);
    }
    const promise_list = pages_num.map(page => {
        const form = {
            searchType: 'MulityTermsSearch',
            ParamIsNullOrEmpty: 'true',
            Islegal: 'false',
            Originate: result['journal'],
            Order: '1',
            Page: page
        }
        const options = {
            method: 'POST',
            headers: headers,
            data: qs.stringify(form),
            url: 'http://yuanjian.cnki.com.cn/Search/ListResult'
        };
        return axios(options).then(response => new Promise(resolve => {
            const result = parse_2(response.data);
            resolve(result);
        })).catch(error => {
            console.error(error);
        });
    });
    return Promise.allSettled(promise_list);
}).then(result => {
    const link_list = flaten_1(result);
    const promise_list = link_list.map(link => {
        const options = {
            method: 'GET',
            url: link
        };
        return axios(options).then(response => new Promise(resolve => {
            const result = parse_3(response.data);
            resolve(result);
        })).catch(error => {
            console.error(error);
        });
    })
    return Promise.allSettled(promise_list);
}).then(result => {
    console.log(result);
});