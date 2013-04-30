var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    Assert = YUITest.Assert,
    crypto = require('crypto');

exports.test = function test(err, url, content, config, test) {
    console.log(config.compilation.name + " > " + config.runtime.name + " > " + url)
    Assert.isNull(err, "There was an error when visiting: " + err);
    var checksum = crypto.createHash('md5').update(content).digest('hex'),
        expectedChecksum = config.test[config.compilation.name] && config.test[config.compilation.name][config.runtime.name];
    if (!expectedChecksum) {
        console.log("Checksum for " + url + ": " + checksum);
    } else {
        Assert.areEqual(expectedChecksum, checksum, "Unexpected checksum for page " + url);
    }

}
