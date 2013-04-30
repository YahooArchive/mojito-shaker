var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    Assert = YUITest.Assert,
    inlineCodeTest = function (node) {
        // make sure that there are no adjacent inline scripts
        var inlineScripts = node.all("script:not([src])"),
            inlineStyles = node.all("style"),
            prevElement = null;
        inlineStyles.each(function (inlineStyle) {
            Assert.areNotEqual(inlineStyle, prevElement, "Found two adjacent inline styles.");
            prevElement = inlineStyle.next();
        });

        prevElement = null;
        inlineScripts.each(function (inlineScript) {
            Assert.areNotEqual(inlineScript, prevElement, "Found two adjacent inline scripts.");
            prevElement = inlineScript.next();

        });
    },
    assetsLocationTest = function (node, shaker) {
        // test for serveJs position
        if (shaker.settings.serveJs.position === "top") {
            Assert.areEqual(0, node.all("body script[src]").size(), "There should be no scripts on the bottom position. serverJs = " + JSON.stringify(shaker.settings.serveJs));
        } else if (shaker.settings.serveJs.position === "bottom") {
            Assert.areEqual(0, node.all("head script[src]").size(), "There should be no scripts on the top position. serverJs = " + JSON.stringify(shaker.settings.serveJs));
        } else {
            Assert.fail("Invalid serveJs.position setting found: '" + shaker.settings.serveJs.position + "'");
        }

        // test for serveCss position
        if (shaker.settings.serveCss.position === "top") {
            Assert.areEqual(0, node.all("body link[rel='stylesheet']").size(), "There should be no stylesheets on the bottom position. serverCss = " + JSON.stringify(shaker.settings.serveCss));
        } else if (shaker.settings.serveCss.position === "bottom") {
            Assert.areEqual(0, node.all("head link[rel='stylesheet']").size(), "There should be no stylesheets on the top position. serverCss = " + JSON.stringify(shaker.settings.serveCss));
        } else {
            Assert.fail("Invalid serveCss.position setting found: '" + shaker.settings.serveJs.position + "'");
        }
    },
    jsTest = function (node, shaker) {
        var mojitoClientScript,
            seed = [];

        // check if js is disabled
        if (!shaker.settings.serveJs) {
            Assert.areEqual(0, node.all("script").size(), "There should be no scripts since JS is disabled.");
            return;
        }

        // make sure the mojito client is present
        node.all("body script:not([src])").some(function (script) {
            var scriptContent = script.getHTML();
            if (/window.YMojito\s*=.+new Y.mojito.Client/.test(scriptContent)) {
                return mojitoClientScript = scriptContent;
            }
        });
        Assert.isNotUndefined(mojitoClientScript, "The Mojito client was not found.");

        Y.Array.each(shaker.seed, function (yuiModule) {
            // remove any lang tag from module
            yuiModule = yuiModule.replace("{langPath}", "");
            if (yuiModule === "yui-base" || yuiModule === "loader-base" || yuiModule === "loader-yui3") {
                // these modules should be in rollup so ignore
                if (shaker.resources && shaker.resources.yui && shaker.routeRollups && shaker.locations && shaker.locations[shaker.settings.serveLocation]) {
                    return;
                }
                seed.push(yuiModule)
            } else {
                // if local location, add underscore since local path are followed by _{hash}
                seed.push(yuiModule + (shaker.settings.serveLocation === 'local' && shaker.locations && shaker.locations.local ? "_"  : ""));
            }

        });

        // if simple loader definition is found check for seed in simple loader call
        if (/SimpleLoader\s*=\s*function/.test(mojitoClientScript)) {
            Y.Array.each(seed, function (yuiModule) {
               if (!new RegExp("YUI.SimpleLoader.js\\(.*" + yuiModule + ".*\\)").test(mojitoClientScript)) {
                   Assert.fail("Did not find " + yuiModule + " in SimpleLoader call.");
               }
            });
            return;
        }

        // check that the yui seed is present
        Y.Array.each(seed, function (yuiModule) {
            // find the yuiModule
            var script = node.one("script[src*='" + yuiModule + "']");
            Assert.isNotNull(script, yuiModule + " seed is missing.");
        });

    }
    // test for yui, yui loader, loader-app (seed), mojito client
    // test for servejs and servecss

exports.test = function (url, node, shaker) {
    inlineCodeTest(node);
    assetsLocationTest(node, shaker);
    jsTest(node, shaker);
}

