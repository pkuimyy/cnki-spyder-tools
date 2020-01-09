function level_1(raw_string) {
    return new Promise(function (resolve, reject) {
        if (raw_string === "") {
            reject(new Error('empty raw string'));
        } else {
            resolve(raw_string);
        }
    })
}

function level_2(character) {
    const seconds = (character.charCodeAt(0) - 'a'.charCodeAt(0)) * 100;
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve(`${character}:${seconds}`)
        }, seconds);
    })
}

level_1("last train home")
    .then(function (result) {
        return Promise.all(result.split('').map(item => {
            return level_2(item);
        }))
    })
    .then(function (results) {
        console.log(results);
    })
    .catch(function (err) {
        console.error(err);
    })