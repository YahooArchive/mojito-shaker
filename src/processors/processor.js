var Registry = require('../../node_modules/buildy').Registry,
    Queue = require('../../node_modules/buildy').Queue,
    customRegistry, testq;

customRegistry = new Registry();
customRegistry.load(__dirname + '/mobstor.js');

var q = new Queue('Testing queue', {registry: customRegistry});

q.task('mobstor', {name: './mobstor.txt'});
q.run();