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
            prevElement = inlineStyles.next();
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
    }

exports.test = function (url, node, shaker) {
    inlineCodeTest(node);
    assetsLocationTest(node, shaker);
}

