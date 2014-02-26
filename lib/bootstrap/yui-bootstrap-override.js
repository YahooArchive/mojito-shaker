/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
/*jslint nomen: true */
/*global _YUI: true */

// During the build process, the content of this file should be output in the
// same bundle as - and right before - the definition of the YUI global object
// (e.g., yui-core.js) If you look at the code located in the standard YUI
// distribution right before the definition of the YUI global object, you will
// see that it does something similar to what we do here in an attempt to
// preserve namespaces when multiple YUI seed files are loaded on the same
// page. However, we cannot use that functionality because the standard YUI
// code expects to have a real YUI object if the YUI symbol was defined.
// That is not the case here because at this point, YUI is not a real YUI
// object! So in order to get things to work smoothly, we just clean things up.
// The global _YUI symbol will be cleaned up later on (see core.js towards the
// bottom of the file)

// For more information, please refer to: http://tiny.corp.yahoo.com/Zu7beG

// Save a reference to our fake YUI object before the real one gets defined.
if (typeof YUI !== 'undefined') {
    _YUI = YUI;
    YUI = undefined;
}
