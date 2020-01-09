let foo = seconds => new Promise((resolve, reject) => {
    setTimeout(() => {
        if (seconds === 0) {
            reject(seconds + 'fail');
        }
        resolve(seconds + 'success');
    }, seconds)
})


foo(1000).then((result) => {
    console.log(result);
    return foo(2000);
}).then((result) => {
    console.log(result);
    return foo(0);
}).catch((err) => {
    console.error(err);
}).finally(() => {
    console.log('done');
});