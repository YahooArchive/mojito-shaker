var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    Assert = YUITest.Assert;

exports.test = function (shakerCompiler, config) {
	var summary = shakerCompiler.logger.summary;
		expectedSummary = config.summary || {};

	// check that the compilation summary is the same as expected in the config
	Assert.areEqual(Y.Object.size(expectedSummary), Y.Object.size(summary),
				"Unexpected number of summaries.");
	Y.Object.each(summary, function (specificSummary, summaryType) {
		var expectedSpecificSummary = expectedSummary[summaryType] || {};
		Y.Object.each(specificSummary, function (logArray, logType) {
			expectedLogArray = expectedSpecificSummary[logType] || [];
			Assert.areEqual(expectedLogArray.length, logArray.length,
				"Unexpected " + logType + " log length for '" + summaryType + "'.");
			Y.Array.each(logArray, function (message, index) {
				Assert.areEqual(expectedLogArray[index], message, "Unexptected log message.")
			});
		});
	})
}
