'use strict';

/*jslint nomen: true */

var YUITest = require('yuitest').YUITest,
    Assert = YUITest.Assert,
    jsdom = require('jsdom'),
    YUI = require('yui').YUI,
    http = require('http');

exports.RuntimeSuite = function (runtimeConfig, compilationSuite, appSuite, shakerSuite) {

    this.name = runtimeConfig.name;

    this.root = appSuite.root;
    this.express = require(this.root + '/node_modules/express');
    this.mojito = require(this.root + '/node_modules/mojito');
    this.config = runtimeConfig;
    this.context = runtimeConfig.context;

    var self = this;

    this.fullName = appSuite.name + " > " + compilationSuite.name + " > " + runtimeConfig.name;
    this.suite = new YUITest.TestSuite({
        name: runtimeConfig.name,
        fullName: self.fullName,
        setUp: function () {
            shakerSuite.print(this.fullName);
        },
        tearDown: function () {
            self.server.close();
        }
    });

    this.test = new YUITest.TestCase({
        name: "Server Start",
        "Starting Server": function () {
            self.startServer(self);
        }
    });

    this.suite.add(this.test);
};

exports.RuntimeSuite.prototype = {
    startServer: function (self) {
        var cwd = process.cwd(),
            express = this.express,
            mojito = this.mojito,
            app;

        process.shakerCompiler = false;

        // Change to the application root.
        // TODO: mojito should allow to set the appRoot.
        process.chdir(self.root);

        app = express();

        app.set('port', 8666);
        mojito.extend(app, {
            context: self.context
        });

        // Revert to current directory.
        process.chdir(cwd);

        app.use(mojito.middleware());
        app.mojito.attachRoutes();

        self.port = app.mojito.store._appConfigStatic.appPort || 8666;
        self.config.shaker = app.mojito.store._appConfigStatic.shaker;
        self.config.shaker.seed = app.mojito.store.yui.yuiConfig.seed;

        self.server = app.listen(app.get('port'), function (err) {
            self.test.resume(function () {
                Assert.isUndefined(err, "There was an error starting the server.");
            });
        });
        self.test.wait();
    },

    getWebPage: function (path, done) {
        var self = this,
            options = {
                host: '127.0.0.1',
                port: this.port,
                path: path,
                method: 'get'
            };

        http.request(options, function (res) {
            var content = '';

            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                content += chunk;
            });

            res.on('end', function () {
                Assert.areEqual(res.statusCode, 200, "Unexpected status code when visiting '" + path + "': " + res.statusCode);
                var document = jsdom.jsdom(content),
                    window = document.createWindow();

                YUI({
                    win: window,
                    doc: document
                }).use('node', function (node) {
                    done(node, content);
                });
            });
        }).on('error', function (err) {
            done(null, null);
        }).end();
    }
};
