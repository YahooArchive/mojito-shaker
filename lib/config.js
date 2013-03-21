exports.validateConfig = function () {
    var config =
    {
        tasks: {
            binders: {
                lint: true,
                minify: {
                    level: 5
                }
            },
            controllers: {
                lint: true,
                minify: false
            },
            css: {
                lint: true,
                minify: {
                    level: 2
                }
            },
            views: {
                htmlToJs: true
            }
        },

        rollups: {
            js: {
                jsRollup: {
                    "device:iphone": {
                        "search-home-page": {
                            highCoverageMojits: [
                                "SearchDirect.index",
                                "NewsTopicDD.index",
                                "AlsoTry.index",
                                "Footer.index"
                            ],
                            split: 3
                        }
                    }
                }
            }
        },

        locations: {
            mobstor: {
                expiration: 1000,
                comboUrl: "/combo?",
                comboDelimiter: "&"
            },
            amazon: {
                expiration: 1000
            },
            local: {
                comboUrl: "/combo~",
                comboDelimiter: "~"
            }
        },

        settings: {
            serveLocation: 'mobstor',
            serveJs: {
                method: 'combo',
                location: 'top'
            },
            serveCss: {
                method: 'inline'
            },
            serveViews: true,
            optimizeBootstrap: true
        }
    }
    return config;
};