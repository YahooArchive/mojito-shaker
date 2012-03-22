var mobstor = require('mobstor'); // requires: ynodejs_mobstor

function MobstorProcessor() {
    var config = {
        host: MobstorProcessor.HOST,
        proxy: MobstorProcessor.PROXY
    };
    this._client = mobstor.createClient(config);
}

MobstorProcessor.HOST = "playground.yahoofs.com";
MobstorProcessor.PROXY = {
    host : "yca-proxy.corp.yahoo.com",
    port : 3128
};

MobstorProcessor.prototype.process = function(files) {
    return true;
};

module.exports.MobstorProcessor = MobstorProcessor;