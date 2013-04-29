/*jslint forin: true */
var basedir = process.cwd() + '/node_modules/mojito-shaker/lib/bootstrap/',
    bootstrapFiles = [
        'yui-bootstrap-core',
        'yui-bootstrap-inline',
        'yui-bootstrap-override'
    ],
    resources = {},
    i,
    bootstrapFile;

for (i in bootstrapFiles) {
    bootstrapFile = bootstrapFiles[i];
    resources[bootstrapFile] = {
        name: bootstrapFile,
        source: {
            fs: {
                basename: bootstrapFile,
                fullPath: basedir + bootstrapFile + '.js'
            }
        },
        url: 'yui-bootstrap--' + bootstrapFile,
        type: 'bootstrap',
        selector: '*'
    };
}

resources['yui-bootstrap-inline'].inline = true;

resources['yui-bootstrap-core'].yui = {
    meta: {
        requires: [
            'yui-later',
            'yui-log',
            'loader-rollup',
            'loader-yui3',
            'event-custom-base',
            'array-extras'
        ]
    }
};


exports.resources = resources;
