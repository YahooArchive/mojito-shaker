var YUITest = require('yuitest').YUITest,
    Assert = YUITest.Assert,
    jsdom = require('jsdom'),
    YUI = require('yui').YUI;

exports.RuntimeSuite = function (runtimeConfig, compilationSuite, appSuite, shakerSuite) {
    this.name = runtimeConfig.name;

    this.root = appSuite.root;
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
            self.mojitoServer.close();
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
        var self = this;
        process.shakerCompiler = false;
        self.mojitoServer = self.mojito.createServer({
            context: self.context,
            root: self.root
        });

        self.port = self.mojitoServer._app.store._appConfigStatic.appPort || 8666;
        self.config.shaker = self.mojitoServer._app.store._appConfigStatic.shaker;
        self.config.shaker.seed = self.mojitoServer._app.store.yui.yuiConfig.seed;

        self.mojitoServer.listen(null, null, function (err) {
            self.test.resume(function () {
                Assert.isUndefined(err, "There was an error starting the server.");
            });
        });
        self.test.wait();
    },

    getWebPage: function (path, done) {
        var self = this;
        this.mojitoServer.getWebPage(path, {
            port: self.port
        }, function (err, url, content) {

/*            content = " \
<html> \
    <head> \
    <script src='abc'></script> \
    </head> \
    <body> \
    <script> \
        123 \
    </script> \
    <link rel='stylesheet' href='abc'/> \
        <link rel='stylesheet' href='abc'/> \
    </body> \
</html>"*/

            Assert.isNull(err, "There was an error when visiting '" + path + "': " + err);
            var document = jsdom.jsdom(content),
                window = document.createWindow();
            YUI({
                win: window,
                doc: document
            }).use('node', function (node) {
                done(node, content)
            });
        });
    }
}
