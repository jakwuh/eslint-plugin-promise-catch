var rule = require('../../../lib/rules/throw-or-log'),
    RuleTester = require('eslint').RuleTester,
    ruleTester = new RuleTester();

function message(name) {
    return 'Throw or log ' + (name || 'err') + ' inside catch block.';
}

function prettify(needError) {
    return function (item) {
        if (typeof item === 'string') {
            item = {code: item};
        }

        item.parserOptions = {ecmaVersion: 6};

        if (needError) {
            item.errors = item.errors || [{message: message()}];
        }

        return item;
    }
}

ruleTester.run('throw-or-log', rule, {

    valid: [
        `promise.catch(err => {
            console.log(err);
            throw err;
        });`,
        `promise.catch(err => {
            console.log(err);
            return [1, 2];
        });`,
        `promise.catch(err => {
            if (isArmaggedon) {
                throw err;
            } else {
                console.error(err);
            }
        });`,
        `promise.catch(err => {
            if (isArmaggedon) {
                if (really) {
                    console.info(err);
                } else {
                    throw err;
                }
            } else {
                console.error(err);
            }
        });`,
        `promise.catch(function(error) {
            console.error(error);
        });`,
        `promise.catch(error => console.error(error));`
    ].map(prettify(false)),

    invalid: [
        // ignoring error
        'promise.catch(err => "success")',
        {
            code: 'promise.catch(({message}) => console.error(new Error(message)))',
            errors: [{
                message: 'Don\'t use destructuring in catch block as you might miss some data (e.g. stack traces).'
            }]
        },
        {
            code: `promise.catch(({message}) => {
            console.log(1);
            throw new Error(message);
        })`,
            errors: [{
                message: 'Don\'t use destructuring in catch block as you might miss some data (e.g. stack traces).'
            }]
        },
        {
            code: 'promise.catch(() => "success")',
            errors: [{message: 'You shouldn\'t ignore error inside catch block.'}]
        },
        `promise.catch(function(err) {
            return [1, 2];
        });`,
        {
            code: `promise.catch(() => {
                throw err;
            });`,
            errors: [{message: 'You shouldn\'t ignore error inside catch block.'}]
        },
        // logging smth else
        `promise.catch(err => {
            if (isArmaggedon) {
                throw err;
            } else {
                console.error(2);
            }
        });`,
        // throwing smth else
        `promise.catch(err => {
            if (isArmaggedon) {
                throw new Error('2');
            } else {
                console.error(err);
            }
        });`,
        // nested throwing smth else
        `promise.catch(err => {
            if (isArmaggedon) {
                if (really) {
                    throw 2;
                } else {
                    throw err;
                }
            } else {
                console.error(err);
            }
        });`,
        {
            code: `promise.catch((err) => {
                   throw err;
               })`,
            errors: [{
                message: 'Only throwing error inside catch block is no-op.'
            }]
        }
    ].map(prettify(true))
});
