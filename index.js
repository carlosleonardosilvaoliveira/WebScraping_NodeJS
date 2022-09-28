const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://gamefaqs.gamespot.com';

const slug = (str) => {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to = "aaaaeeeeiiiioooouuuunc------";
    for (var i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

const writeToFile = (data, filename) => {
    const promiseCallBack = (resolve, reject) => {
        fs.writeFile(filename, data, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(true);
        });
    };
    return new Promise(promiseCallBack);
};

const readFromFile = (filename) => {
    const promiseCallBack = (resolve) => {
        fs.readFile(filename, 'utf8', (error, contents) => {
            if (error) {
                console.log('*** getFromFile', error);
                resolve(null);
            }
            resolve(contents);
        });
    };

    return new Promise(promiseCallBack);
};

const getPage = (path) => {
    const url = `${BASE_URL}${path}`;

    return axios.get(url).then(response => response.data);
};

const getCachedPage = (path) => {
    const filename = `cache/${slug(path)}.html`;

    const promiseCallBack = async (resolve, reject) => {

        const cachedHTML = await readFromFile(filename);
        if (!cachedHTML) {
            const html = await getPage(path);
            await writeToFile(html, filename);
            resolve(html);
            return;
        }
        resolve(cachedHTML);
    };


    return new Promise(promiseCallBack);
};

const getPageItems = (html) => {

    const $ = cheerio.load(html);
    const promiseCallBack = (resolve, reject) => {
        const selector = '#content > div.post_content.row > div > div:nth-child(1) > div.body > table > tbody > tr';

        const games = [];

        $(selector).each((i, element) => {
            const a = $('td.rtitle > a', element);
            const title = a.text();
            const href = a.attr('href');
            const id = href.split('/').pop();
            games.push({ id, title, path: href });
        });

        resolve(games);
    }


    return new Promise(promiseCallBack);
};

const saveData = (data, path) => {

    const promiseCallBack = async (resolve, reject) => {
        if(!data || data.length == 0) return resolve(true);

        const dataToStore = JSON.stringify({ data: data }, null, 2);
        const created = await writeToFile(dataToStore, path);
        resolve(true);
    };

    return new Promise(promiseCallBack);
};

const getAllPages = async (start, finish) => {
    let page = start;
    do {
        const path = `/n64/category/999-all?page=${page}`;
        await getCachedPage(path)
            .then(getPageItems)
            .then((data) => saveData(data, `./db-${page}.json`))
            .then(console.log)
            .catch(console.error);
        page++;
    } while (page < finish);
}

getAllPages(0, 10);