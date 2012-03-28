YUI.add("shaker/metaMojits", function(Y, NAME) { 
YUI.namespace("_mojito._cache.shaker");
YUI._mojito._cache.shaker.meta = 
{
	"mojits": {
		"ShakerHTMLFrameMojit": {
			"*": {
				"shaken": {
					"common": [],
					"common-action": [],
					"common-action-device": [],
					"common-action-device-skin": [],
					"common-action-device-skin-region": []
				},
				"meta": {
					"order": [
						"common-action-device-skin-region"
					],
					"dependencies": []
				}
			}
		},
		"master": {
			"*": {
				"shaken": {
					"common": [
						"/static/master/assets/common/master.css"
					],
					"common-action": [
						"/static/master/assets/common/master.css"
					],
					"common-action-smartphone": [
						"/static/master/assets/common/master.css",
						"/static/master/assets/device/smartphone/master-smartphone.css"
					],
					"common-action-device": [
						"/static/master/assets/common/master.css"
					],
					"common-action-smartphone-grey": [
						"/static/master/assets/common/master.css",
						"/static/master/assets/device/smartphone/master-smartphone.css",
						"/static/master/assets/skin/grey/master-grey.css"
					],
					"common-action-smartphone-skin": [
						"/static/master/assets/common/master.css",
						"/static/master/assets/device/smartphone/master-smartphone.css"
					],
					"common-action-device-grey": [
						"/static/master/assets/common/master.css",
						"/static/master/assets/skin/grey/master-grey.css"
					],
					"common-action-device-skin": [
						"/static/master/assets/common/master.css"
					]
				},
				"meta": {
					"order": [
						"common-action-device-skin-region"
					],
					"dependencies": []
				}
			}
		},
		"primary": {
			"*": {
				"shaken": {
					"common": [
						"/static/primary/assets/common/primary.css"
					],
					"common-action": [
						"/static/primary/assets/common/primary.css"
					],
					"common-action-device": [
						"/static/primary/assets/common/primary.css"
					],
					"common-action-device-grey": [
						"/static/primary/assets/common/primary.css",
						"/static/primary/assets/skin/grey/primary-grey.css"
					],
					"common-action-device-skin": [
						"/static/primary/assets/common/primary.css"
					],
					"common-action-device-grey-CA": [
						"/static/primary/assets/common/primary.css",
						"/static/primary/assets/skin/grey/primary-grey.css",
						"/static/primary/assets/region/CA/primary-CA.css"
					],
					"common-action-device-grey-region": [
						"/static/primary/assets/common/primary.css",
						"/static/primary/assets/skin/grey/primary-grey.css"
					],
					"common-action-device-skin-CA": [
						"/static/primary/assets/common/primary.css",
						"/static/primary/assets/region/CA/primary-CA.css"
					],
					"common-action-device-skin-region": [
						"/static/primary/assets/common/primary.css"
					]
				},
				"meta": {
					"order": [
						"common-action-device-skin-region"
					],
					"dependencies": []
				}
			}
		},
		"secondary": {
			"*": {
				"shaken": {
					"common": [
						"/static/secondary/assets/common/secondary.css"
					],
					"common-action": [
						"/static/secondary/assets/common/secondary.css"
					],
					"common-action-smartphone": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/device/smartphone/secondary-smartphone.css"
					],
					"common-action-device": [
						"/static/secondary/assets/common/secondary.css"
					],
					"common-action-smartphone-grey": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/device/smartphone/secondary-smartphone.css",
						"/static/secondary/assets/skin/grey/secondary-grey.css"
					],
					"common-action-smartphone-skin": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/device/smartphone/secondary-smartphone.css"
					],
					"common-action-device-grey": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/skin/grey/secondary-grey.css"
					],
					"common-action-device-skin": [
						"/static/secondary/assets/common/secondary.css"
					],
					"common-action-smartphone-grey-CA": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/device/smartphone/secondary-smartphone.css",
						"/static/secondary/assets/skin/grey/secondary-grey.css",
						"/static/secondary/assets/region/CA/secondary-CA.css"
					],
					"common-action-smartphone-grey-region": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/device/smartphone/secondary-smartphone.css",
						"/static/secondary/assets/skin/grey/secondary-grey.css"
					],
					"common-action-smartphone-skin-CA": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/device/smartphone/secondary-smartphone.css",
						"/static/secondary/assets/region/CA/secondary-CA.css"
					],
					"common-action-smartphone-skin-region": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/device/smartphone/secondary-smartphone.css"
					],
					"common-action-device-grey-CA": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/skin/grey/secondary-grey.css",
						"/static/secondary/assets/region/CA/secondary-CA.css"
					],
					"common-action-device-grey-region": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/skin/grey/secondary-grey.css"
					],
					"common-action-device-skin-CA": [
						"/static/secondary/assets/common/secondary.css",
						"/static/secondary/assets/region/CA/secondary-CA.css"
					],
					"common-action-device-skin-region": [
						"/static/secondary/assets/common/secondary.css"
					]
				},
				"meta": {
					"order": [
						"common-action-device-skin-region"
					],
					"dependencies": []
				}
			}
		}
	},
	"app": {
		"*": {
			"shaken": {
				"common": [
					"/static/shakerdemo/assets/common/utils.css",
					"/static/shakerdemo/assets/common/yui-base.css",
					"/static/shakerdemo/assets/common/yui-reset.css",
					"/static/shakerdemo/assets/common/yui-fonts.css"
				],
				"common-action": [
					"/static/shakerdemo/assets/common/utils.css",
					"/static/shakerdemo/assets/common/yui-base.css",
					"/static/shakerdemo/assets/common/yui-reset.css",
					"/static/shakerdemo/assets/common/yui-fonts.css"
				],
				"common-action-device": [
					"/static/shakerdemo/assets/common/utils.css",
					"/static/shakerdemo/assets/common/yui-base.css",
					"/static/shakerdemo/assets/common/yui-reset.css",
					"/static/shakerdemo/assets/common/yui-fonts.css"
				],
				"common-action-device-skin": [
					"/static/shakerdemo/assets/common/utils.css",
					"/static/shakerdemo/assets/common/yui-base.css",
					"/static/shakerdemo/assets/common/yui-reset.css",
					"/static/shakerdemo/assets/common/yui-fonts.css"
				],
				"common-action-device-skin-region": [
					"/static/shakerdemo/assets/common/utils.css",
					"/static/shakerdemo/assets/common/yui-base.css",
					"/static/shakerdemo/assets/common/yui-reset.css",
					"/static/shakerdemo/assets/common/yui-fonts.css"
				]
			},
			"meta": {
				"order": [
					"common-action-device-skin-region"
				],
				"dependencies": []
			}
		}
	}
}});