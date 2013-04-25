YUI.add('child-yui-module2', function(Y, NAME) {
    Y.one(".log").append("<div>YUI: child-yui-module added</div>");
}, '0.0.1', {requires: []});
