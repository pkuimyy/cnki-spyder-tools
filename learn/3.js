#! /usr/local/bin/node

/*
根据第二阶段请求返回的链接，访问这些链接，获取题录信息
*/

const axios = require('axios');
const cheerio = require('cheerio');


const options = {
    // proxy: {
    //     host: '127.0.0.1',
    //     port: '8888'
    // },
    method: 'GET',
    url: 'http://www.cnki.com.cn/Article/CJFDTOTAL-QBXB201501005.htm'
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

    const institution = others.match(/(【作者单位】.*?)【/)[1];
    const foundation = others.match(/(【基金】.*?)【/)[1];
    const class_code = others.match(/(【分类号】.*?)$/)[1];

    let result = [journal_link, journal_name,
        publish_year, title, authors,
        abstract, institution, foundation, class_code];
    result = result.map(item => {
        return item.replace(',', '，').replace(/\s+/g, ' ').trim();
    }).join('\n');
    console.log(result);
}