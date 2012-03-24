var Registry = require('../../node_modules/buildy').Registry,
    Queue = require('../../node_modules/buildy').Queue,
    reg = new Registry(),
    mobstor_config = {
        host: 'playground.yahoofs.com',
        proxy: {host : "yca-proxy.corp.yahoo.com", port : 3128}
    };

reg.load(__dirname + '/mobstor.js'); // Path to mobstor task

new Queue('deploy', {registry: reg})
    .task('files', ['mobstor.js'])
    .task('concat')
    .task('jsminify')
    .task('mobstor', {name: '/foo/bar/baz.js', config: mobstor_config})
    .task('write', {name: 'baz.js'})
    .task('inspect')
    .run();