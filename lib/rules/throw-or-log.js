module.exports = {
    meta: {
        docs: {
            description: 'Requires to throw or log an error in catch block',
            category: 'promises',
            recommended: false
        },
        fixable: null,
        schema: [
            {
                'type': 'object',
                'properties': {
                    'customLoggers': {'type': 'boolean'}
                },
                'additionalProperties': false
            }
        ]
    },

    create: function (context) {
        var Traverser = require('eslint/lib/util/traverser');
        var traverser = new Traverser();
        var allowCustomLoggers = Boolean((context.options[0] || {}).customLoggers);

        function isFunctionExpression(node) {
            return ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type);
        }

        function isObjectPattern(node) {
            return node.type === 'ObjectPattern';

        }

        function isMemberExpression(node) {
            return node.type === 'MemberExpression';
        }

        function isCallExpression(node) {
            return node.type === 'CallExpression';
        }

        function isNewExpression(node) {
            return node.type === 'NewExpression';
        }

        function isIfStatement(node) {
            return node.type === 'IfStatement';
        }

        function isReturnStatement(node) {
            return node.type === 'ReturnStatement';
        }

        function isBlockStatement(node) {
            return node.type === 'BlockStatement';
        }

        function isThrowStatement(node) {
            return node.type === 'ThrowStatement';
        }

        function isIdentifier(node, name) {
            var names = [].concat(name);
            return node.type === 'Identifier' && names.includes(node.name);
        }

        function sameScope(top, inner) {
            while (inner.parent && inner.parent !== top) {
                if (isFunctionExpression(inner)) {
                    return false;
                }
                inner = inner.parent;
            }

            return true;
        }

        function getErrorCallback(node) {
            if (isMemberExpression(node.callee)) {
                function checkAndReturn(length, method) {
                    if (node.arguments.length === length && isIdentifier(node.callee.property, method)) {
                        var callback = node.arguments[length - 1];

                        if (isFunctionExpression(callback)) {
                            return callback;
                        }
                    }
                }

                return checkAndReturn(1, 'catch') || checkAndReturn(2, 'then');
            }
        }

        function identifiersEql(a, b) {
            return isIdentifier(a, b.name) && isIdentifier(b, a.name);
        }

        function buildResolver(body, traverser) {
            var resolved = [];

            function getClosestBranch(node) {
                while (node.parent && node.parent !== body && !isIfStatement(node.parent)) {
                    node = node.parent;
                }
                return node;
            }

            function addNode(node) {
                if (node.parent === body) {
                    resolved.push(node.parent);
                } else if (isIfStatement(node.parent)) {
                    resolved.push(node);
                    avalancheResolveUp(node.parent);
                }
            }

            function avalancheResolveUp(ifStatementNode) {
                if (resolved.includes(ifStatementNode.consequent) &&
                    resolved.includes(ifStatementNode.alternate)) {
                    addNode(getClosestBranch(ifStatementNode));
                }
            }

            return {
                addPath: function (node) {
                    addNode(getClosestBranch(node));
                },
                isValid: function () {
                    if (!resolved.includes(body)) {
                        return false;
                    }

                    var allIfStatementsResolved = true;

                    var validate = function (node) {
                        if (!resolved.includes(node)) {
                            allIfStatementsResolved = false;
                        }
                    };

                    traverser.traverse(body, {
                        IfStatement: function (node) {
                            if (allIfStatementsResolved && sameScope(body, node)) {
                                validate(node.consequent.type);
                                validate(node.alternate.type);
                            }
                        }
                    });

                    return allIfStatementsResolved;
                }
            };
        }

        function aryError(error, fn) {
            return function (node) {
                return fn(node, error);
            }
        }

        function nodeContainsError(node, error) {
            return identifiersEql(node, error) || (
                (isNewExpression(node) || isCallExpression(node)) &&
                (node.arguments || []).some(aryError(error, nodeContainsError))
            );
        }

        function isLogger(node, error) {
            var callee = node.callee;
            var isValidLogger = allowCustomLoggers ||
                (isMemberExpression(callee) &&
                    isIdentifier(callee.object, 'console') &&
                    isIdentifier(callee.property, ['log', 'info', 'error', 'warn']));

            var isValidArgs = nodeContainsError(node, error);

            return isValidLogger && isValidArgs;

        }

        function isFoolishPromiseReject(node, error) {
            if (isCallExpression(node) &&
                isMemberExpression(node.callee)) {
                if (isIdentifier(node.callee.object, 'Promise') &&
                    isIdentifier(node.callee.property, 'reject') &&
                    identifiersEql(node.arguments[0], error)) {
                    return true;
                }
            }
            return false;
        }

        return {
            CallExpression: function (node) {
                var catchNode = getErrorCallback(node);

                if (catchNode) {
                    var body = catchNode.body;
                    var error = catchNode.params[0];

                    if (!error) {
                        return context.report(catchNode, 'You shouldn\'t ignore error inside catch block.');
                    }

                    if (isObjectPattern(error)) {
                        return context.report(error,
                            'Don\'t use destructuring in catch block as you might miss some data (e.g. stack traces).');
                    }

                    if (isBlockStatement(body)) {
                        if (body.body.length) {
                            var firstNode = body.body[0];

                            if (isThrowStatement(firstNode) && identifiersEql(firstNode.argument, error)) {
                                return context.report(firstNode, 'Only throwing error inside catch block is no-op.');
                            }

                            if (isReturnStatement(firstNode) && isFoolishPromiseReject(firstNode.argument, error)) {
                                return context.report(firstNode.argument, 'Only rejecting Promise with error inside catch block is no-op.');
                            }
                        }
                    } else if (isFoolishPromiseReject(body, error)) {
                        return context.report(body, 'Only rejecting Promise with error inside catch block is no-op.');
                    } else {
                        body = catchNode;
                    }

                    var resolver = buildResolver(body, traverser);

                    traverser.traverse(body, {
                        enter: function (node, parent) {
                            if (parent) {
                                node.parent = parent;
                            }
                            if (isThrowStatement(node) && nodeContainsError(node.argument, error) && sameScope(body, node)) {
                                resolver.addPath(node);
                            }
                            if (isCallExpression(node) && isLogger(node, error) && sameScope(body, node)) {
                                resolver.addPath(node);
                            }
                        }
                    });

                    if (!resolver.isValid()) {
                        context.report(catchNode, 'Throw or log ' + error.name + ' inside catch block.');
                    }
                }
            }

        };
    }
};
