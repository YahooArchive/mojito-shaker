var Y = require('yui').YUI({useSync: true}).use('base-base'),
    fs = require('fs'),
    basedir = 'assets/compiled';

exports.location = function (config) {
    'use strict';
    var appRoot = config.app.root,
        root = '/' + config.app.prefix + '/' + config.app.appName + '/' + basedir + '/',
        files,
        i;

    this.yuiConfig = {
        'groups': {
            'app': {
                'base': '/',
                'comboBase': '/combo~',
                'comboSep': '~',
                'combine': true,
                'root': root
            }
        }
    };

    // create compiled directory under assets
    try {
        // make assets directory if does not exist
        if (!fs.existsSync(appRoot + '/assets')) {
            fs.mkdirSync(appRoot + '/assets');
        }
        fs.mkdirSync(appRoot + '/' +  basedir)
    } catch (e) {
        throw 'Unable to create ' + basedir + ' - ' + e;
    }

    this.store = function (resource, done) {
        var checksum = resource.getChecksum(),
            // replace any '.' in the basename to make sure it does not serve to add a selector to the resource
            filename = resource.basename.replace(/\./g, '_') + '_' + checksum + '.' + resource.subtype,
            filepath =  appRoot + '/' + basedir + '/' + filename;

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
