#! /usr/local/bin/node

const axios = require('axios');
const qs = require('querystring');
const cheerio = require('cheerio');
const headers = require('./headers.json');
const log4js = require('log4js');
const fs = require('fs');

const mapping_file = './result/mapping.csv';
const result_file = './result/result.csv';
const log_file = './log/app.log';

if (fs.existsSync(mapping_file)) {
    fs.unlinkSync(mapping_file)
}
if (fs.existsSync(result_file)) {
    fs.unlinkSync(result_file);
}
if (fs.existsSync(log_file)) {
    fs.unlinkSync(log_file);
}
const result_header = ['journal_link', 'journal_name',
    'publish_year', 'title', 'authors',
    'abstract', 'institution',
    'foundation', 'class_code'
];
fs.writeFileSync(result_file, `${result_header.join(',')}\n`);

log4js.configure({
    appenders: {
        log_file: { type: 'file', filename: log_file },
        log_console: { type: 'console' }
    },
    categories: {
        for_machine: { appenders: ['log_file'], level: 'info' },
        for_human: { appenders: ['log_console'], level: 'info' },
        default: { appenders: ['log_console'], level: 'info' }
    }
})
const logger_f = log4js.getLogger('for_machine');
const logger_c = log4js.getLogger('for_human');

const step_1 = journal => {
    const form = {
        searchType: 'MulityTermsSearch',
        Originate: journal,
        Order: '1'
    };
    const options = {
        method: 'POST',
        headers: headers,
        data: qs.stringify(form),
        url: 'http://yuanjian.cnki.com.cn/Search/Result',
        transformResponse: [parse_1]
        //比较高级的用法，在返回response之前改写response内容
        //可以简化异步流程控制的代码
        //parse_1的输入是原response的html代码
        //相当于使用parse_1函数的返回值替代了原有的html
    };
    function parse_1(html) {
        const $ = cheerio.load(html);
        const records_per_page = 20;
        const records_num = parseInt($('#hidTotalCount').attr('value'));
        const pages_num = Math.ceil(records_num / records_per_page);
        logger_c.info(`${journal} step_1 success`);
        return {
            'records_num': records_num,
            'pages_num': pages_num,
            'journal': journal //使用闭包特性，可以访问到参数journal
        }
    }
    return axios(options)//错误处理可能还有异步方面的问题
}

const step_2 = response => {
    const result = response.data;
    const pages_num = []
    for (let i = 1; i <= result['pages_num'] / 40; i++) {
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
            url: 'http://yuanjian.cnki.com.cn/Search/ListResult',
            transformResponse: [parse_2]
        };
        function parse_2(response) {
            const $ = cheerio.load(response);
            const links = $('a.left[target][title]').map((_, item) => {
                return $(item).attr('href');
            }).toArray();
            logger_f.info(`${form.Originate} ${page} step_2 success`);
            logger_c.info(`${form.Originate} ${page} step_2 success`);
            fs.appendFileSync(mapping_file, `${form.Originate},${page},${links.join('##')}\n`)
            return links;
        }
        return axios(options);
    });
    return Promise.allSettled(promise_list);
}

const step_3 = result => {
    function flaten_1(data) {
        return data.filter(item => {
            return item['status'] === "fulfilled"
        }).map(item => item['value']['data']).reduce((prev, curr) => {
            return prev.concat(curr);
        }, []);
    }
    const link_list = flaten_1(result);;
    const promise_list = link_list.map(link => {
        const options = {
            method: 'GET',
            url: link,
            transformResponse: [parse_3]
        };
        function parse_3(response) {
            const $ = cheerio.load(response);
            const journal = $('#content > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > a:nth-child(1)');
            const journal_link = journal.attr('href');
            const journal_name = journal.find('b').text();
            const publish_year = journal.find('font').text();
            const title = $('.xx_title').text();
            const authors = $('#content > div:nth-child(2) > div:nth-child(3) > a').map((_, item) => {
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
                return item.replace(/,/g, '，').replace(/\s+/g, ' ').trim();
            });
            logger_f.info(`${options.url} step_3 success`);
            logger_c.info(`${options.url} step_3 success`);
            fs.appendFileSync(result_file, `${result.join(',')}\n`);
            return result;
        }
        return axios(options);
    })
    return Promise.allSettled(promise_list);
}

step_1('情报学报').then(step_2).then(step_3).finally(() => {
    console.log('done');
});