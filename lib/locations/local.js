var Y = require('yui').YUI({useSync: true}).use('base-base');
var fs = require('fs');
var basedir = 'assets/compiled';


exports.location = function (config) {
    var root = "/" + config.appConfig.prefix + "/" + config.appConfig.appName + "/" + basedir + "/";
    this.yuiConfig = {
        "groups": {
            "app": {
                "base": "/",
                "comboBase": "/combo~",
                "comboSep": "~",
                "combine": true,
                "root": root
            }
        }
    };

    // create compile directory under assets
    fs.mkdir(basedir);

    this.store = function (resource, done) {
        var hash = resource.getHash(),
            filename = resource.basename + "_" + hash + "." + resource.subtype,
            filepath =  basedir + '/' + filename;

        // check if file exists, if so do not write file
        fs.exists(filepath, function (exists) {
            var url = root + filename;
            if (exists) {
                done(null, url);
            } else {
                require('fs').writeFile(filepath, resource.content, function (err) {
                    done(err, url);
                });
            }
       });
    };
};
