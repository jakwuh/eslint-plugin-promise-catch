# throw-or-log

This eslint rule checks error handling inside Promise catch block.

Examples of **incorrect** code for this rule:

```js

promise.catch(err => "success")

promise.catch(() => "success")

promise.catch(err => {
    return [1, 2];
});

promise.catch(() => {
    throw err;
});

promise.catch(err => {
    if (isArmaggedon) {
        throw err;
    } else {
        console.error(2);
    }
});

promise.catch(err => {
    if (isArmaggedon) {
        throw new Error('2');
    } else {
        console.error(err);
    }
});

promise.catch(err => {
    if (isArmaggedon) {
        if (really) {
            throw 2;
        } else {
            throw err;
        }
    } else {
        console.error(err);
    }
});

promise.catch((err) => {
    throw err;
})

```

Examples of **correct** code for this rule:

```js

promise.catch(err => {
    console.log(err);
    throw err;
});

promise.catch(err => {
    console.log(err);
    return [1, 2];
});

promise.catch(function (err) {
    console.log(1);
    throw err;
});

promise.catch(err => {
    if (isArmaggedon) {
        throw err;
    } else {
        console.error(err);
    }
});

promise.catch(err => {
    if (isArmaggedon) {
        if (really) {
            console.info(err);
        } else {
            throw err;
        }
    } else {
        console.error(err);
    }
});


```
