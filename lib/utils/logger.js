/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var Y = require('yui').YUI({useSync: true}).use('base-base'),
    colors = require('./colors');

exports.Logger = function (summary) {
    'use strict';
    var messageTypes = {},
        MAX_MESSAGES = 5;
    this.summary = {};
    this.data = {};

    this.print = function (message, messageType, printSymbol) {
        if (messageType === 'error') {
            console.log(((printSymbol ? '✖ ' : '') + message).red.bold);
        } else if (messageType === 'warn') {
            console.log(((printSymbol ? '⚠ ' : '') + message).yellow);
        } else if (messageType === 'info') {
            console.log((message).blue.bold);
        } else if (messageType === 'success') {
            console.log((message + (printSymbol ? ' ✔' : '')).green.bold);
        }
    };

    this.log = function (logType, messageType, message, addToSummary) {
        messageTypes[messageType] = true;
        if (logType) {
            this.summary[logType] = this.summary[logType] || {
                error: [],
                warn: [],
                info: [],
                success: []
            };

            this.summary[logType][messageType].push(message);
            message = '[' + logType + '] ' + message;
        }

        this.print(message, messageType, true);
    };

    this.error = function (logType, message) {
        this.log(logType, 'error', message, true);
    };

    this.warn = function (logType, message) {
        this.log(logType, 'warn', message, true);
    };

    this.info = function (message) {
        this.log('', 'info', message, false);
    };

    this.printSummary = function () {
        if (messageTypes.error) {
            this.print('\nShaker compilation finished with errors:', 'error');
        } else if (messageTypes.warn) {
            this.print('\nShaker compilation finished with warnings:', 'warn');
        }
        var self = this;
        Y.Object.each(self.summary, function (typeSummary, logType) {
            var summaryType = !Y.Object.isEmpty(typeSummary.error) ? 'error' : !Y.Object.isEmpty(typeSummary.warn) ? 'warn' : !Y.Object.isEmpty(typeSummary.success) ? 'success' : 'info';
            self.print(logType, summaryType);
            Y.Object.each(typeSummary, function (messages, messagesType) {
                if (messages.length > MAX_MESSAGES) {
                    messages.splice(MAX_MESSAGES - 1, messages.length - MAX_MESSAGES + 1, (messages.length - MAX_MESSAGES + 1) + ' more...');
                }
                Y.Array.each(messages, function (message) {
                    self.print(' - ' + message, messagesType);
                });
            });
        });
    };
};