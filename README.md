# eslint-plugin-promise-catch

eslint plugin to sanitize catch promise block

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-promise-catch`:

```
$ npm install eslint-plugin-promise-catch --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-promise-catch` globally.

## Usage

Add `promise-catch` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "promise-catch"
    ]
}
```


Then configure the rules you want to use under the rules section.

```js
{
    "rules": {
        "promise-catch/throw-or-log": [2, {
            "customLoggers": true
            // allow any CallExpression to be a logging function
        }]
    }
}
```

## Supported Rules

* [throw-or-log](docs/rules/throw-or-log.md)
