/*jslint indent: 4, stupid: true, nomen: true, plusplus: true */

YUI.add('addon-shaker-test-addon', function (Y, NAME) {
    'use strict';

	function TestAddon() {
		TestAddon.superclass.constructor.apply(this, arguments);
	}
	TestAddon.NS = 'test-addon';

	Y.extend(TestAddon, Y.Plugin.Base, {
		initializer: function (config) {},
		destructor: function () {}
	});

    Y.namespace('mojito.addons.shaker');
    Y.mojito.addons.shaker['test-addon'] = TestAddon;
}, '0.0.1', { requires: ['plugin', 'oop']});
