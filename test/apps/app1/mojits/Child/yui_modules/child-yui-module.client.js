YUI.add('child-yui-module', function(Y, NAME) {
    Y.one(".log").append("<div>YUI: child-yui-module added</div>");
}, '0.0.1', {requires: []});