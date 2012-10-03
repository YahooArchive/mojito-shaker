YUI.add("shaker/metaMojits", function (Y, NAME) {
YUI.namespace("_mojito._cache.shaker");
YUI._mojito._cache.shaker.meta = 
{
	"app": {
		"iphone-*": {
			"mojits": {
				"Composite": {
					"index": {
						"js": [
							"/static/Composite/controller.common.js",
							"/static/Composite/binders/index.js",
							"/static/Composite/views/index.mu.html"
						],
						"css": [
							"/static/Composite/assets/c.css"
						]
					}
				},
				"Mock": {
					"index": {
						"js": [
							"/static/Mock/binders/index.js",
							"/static/Mock/views/index.mu.html"
						],
						"css": [
							"/static/Mock/assets/mock.css"
						]
					}
				},
				"Test": {
					"index": {
						"js": [
							"/static/Test/binders/index.js",
							"/static/Test/views/index.mu.html"
						],
						"css": [
							"/static/Test/assets/test.css"
						]
					}
				},
				"DaliProxy": {},
				"HTMLFrameMojit": {
					"index": {
						"js": [
							"/static/HTMLFrameMojit/views/index.iphone.mu.html"
						],
						"css": []
					}
				},
				"ShakerHTMLFrameMojit": {
					"index": {
						"js": [
							"/static/ShakerHTMLFrameMojit/views/index.iphone.mu.html"
						],
						"css": []
					}
				},
				"LazyLoad": {
					"index": {
						"js": [],
						"css": []
					}
				},
				"TunnelProxy": {}
			},
			"app": [
				"/static/test_routes/assets/base.css"
			],
			"routesBundle": []
		},
		"*": {
			"mojits": {
				"Composite": {
					"index": {
						"js": [
							"/static/Composite/controller.common.js",
							"/static/Composite/binders/index.js",
							"/static/Composite/views/index.mu.html"
						],
						"css": [
							"/static/Composite/assets/c.css"
						]
					}
				},
				"Mock": {
					"index": {
						"js": [
							"/static/Mock/binders/index.js",
							"/static/Mock/views/index.mu.html"
						],
						"css": [
							"/static/Mock/assets/mock.css"
						]
					}
				},
				"Test": {
					"index": {
						"js": [
							"/static/Test/binders/index.js",
							"/static/Test/views/index.mu.html"
						],
						"css": [
							"/static/Test/assets/test.css"
						]
					}
				},
				"DaliProxy": {},
				"HTMLFrameMojit": {
					"index": {
						"js": [
							"/static/HTMLFrameMojit/views/index.mu.html"
						],
						"css": []
					}
				},
				"ShakerHTMLFrameMojit": {
					"index": {
						"js": [
							"/static/ShakerHTMLFrameMojit/views/index.mu.html"
						],
						"css": []
					}
				},
				"LazyLoad": {
					"index": {
						"js": [],
						"css": []
					}
				},
				"TunnelProxy": {}
			},
			"app": [
				"/static/test_routes/assets/base.css"
			],
			"routesBundle": []
		}
	},
	"core": [
		"/static/mojito/addons/ac/analytics.common.js",
		"/static/mojito/addons/ac/assets.common.js",
		"/static/mojito/addons/ac/composite.common.js",
		"/static/mojito/addons/ac/config.common.js",
		"/static/mojito/addons/ac/cookie.client.js",
		"/static/mojito/addons/ac/i13n.common.js",
		"/static/mojito/addons/ac/intl.common.js",
		"/static/mojito/addons/ac/meta.common.js",
		"/static/mojito/addons/ac/output-adapter.common.js",
		"/static/mojito/addons/ac/params.common.js",
		"/static/mojito/addons/ac/partial.common.js",
		"/static/mojito/addons/ac/url.common.js",
		"/static/mojito/addons/view-engines/hb.client.js",
		"/static/mojito/addons/view-engines/mu.client.js",
		"/static/mojito/autoload/action-context.common.js",
		"/static/mojito/autoload/controller-context.common.js",
		"/static/mojito/autoload/dispatch.common.js",
		"/static/mojito/autoload/loader.common.js",
		"/static/mojito/autoload/logger.common.js",
		"/static/mojito/autoload/mojit-proxy.client.js",
		"/static/mojito/autoload/mojito-client.client.js",
		"/static/mojito/autoload/mojito-test.common.js",
		"/static/mojito/autoload/mojito.common.js",
		"/static/mojito/autoload/output-handler.client.js",
		"/static/mojito/autoload/perf.client.js",
		"/static/mojito/autoload/resource-store-adapter.common.js",
		"/static/mojito/autoload/rest.common.js",
		"/static/mojito/autoload/route-maker.common.js",
		"/static/mojito/autoload/store.client.js",
		"/static/mojito/autoload/tunnel.client-optional.js",
		"/static/mojito/autoload/util.common.js",
		"/static/mojito/autoload/view-renderer.common.js"
	]
}});