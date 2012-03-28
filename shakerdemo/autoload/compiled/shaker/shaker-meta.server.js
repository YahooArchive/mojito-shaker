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
					"dimensions": {
						"action": {
							"action": {
								"files": []
							}
						},
						"common": {
							"files": []
						},
						"device": {
							"device": {
								"files": []
							}
						},
						"skin": {
							"skin": {
								"files": []
							}
						},
						"region": {
							"region": {
								"files": []
							}
						}
					},
					"dependencies": []
				}
			}
		},
		"master": {
			"*": {
				"shaken": {
					"common": [
						"/static/shakerdemo/assets/r/master_default_common_c75fe0cbaaf623aea7be93e50b7f3c7f.css"
					],
					"common-action": [
						"/static/shakerdemo/assets/r/master_default_common-action_c75fe0cbaaf623aea7be93e50b7f3c7f.css"
					],
					"common-action-smartphone": [
						"/static/shakerdemo/assets/r/master_default_common-action-smartphone_f85997cd85aa012dd3d82dda40bc0414.css"
					],
					"common-action-device": [
						"/static/shakerdemo/assets/r/master_default_common-action-device_c75fe0cbaaf623aea7be93e50b7f3c7f.css"
					],
					"common-action-smartphone-grey": [
						"/static/shakerdemo/assets/r/master_default_common-action-smartphone-grey_c7073a85504c3e292c97c059222cc051.css"
					],
					"common-action-smartphone-skin": [
						"/static/shakerdemo/assets/r/master_default_common-action-smartphone-skin_f85997cd85aa012dd3d82dda40bc0414.css"
					],
					"common-action-device-grey": [
						"/static/shakerdemo/assets/r/master_default_common-action-device-grey_b347e1cf67ee4b5520442825ce61f26c.css"
					],
					"common-action-device-skin": [
						"/static/shakerdemo/assets/r/master_default_common-action-device-skin_c75fe0cbaaf623aea7be93e50b7f3c7f.css"
					],
					"common-action-smartphone-grey-region": [
						"/static/shakerdemo/assets/r/master_default_common-action-smartphone-grey-region_c7073a85504c3e292c97c059222cc051.css"
					],
					"common-action-smartphone-skin-region": [
						"/static/shakerdemo/assets/r/master_default_common-action-smartphone-skin-region_f85997cd85aa012dd3d82dda40bc0414.css"
					],
					"common-action-device-grey-region": [
						"/static/shakerdemo/assets/r/master_default_common-action-device-grey-region_b347e1cf67ee4b5520442825ce61f26c.css"
					],
					"common-action-device-skin-region": [
						"/static/shakerdemo/assets/r/master_default_common-action-device-skin-region_c75fe0cbaaf623aea7be93e50b7f3c7f.css"
					]
				},
				"meta": {
					"order": [
						"common-action-device-skin-region"
					],
					"dimensions": {
						"common": {
							"files": [
								"./mojits/master/assets/common/master.css"
							]
						},
						"device": {
							"smartphone": {
								"files": [
									"./mojits/master/assets/device/smartphone/master-smartphone.css"
								]
							},
							"device": {
								"files": []
							}
						},
						"skin": {
							"grey": {
								"files": [
									"./mojits/master/assets/skin/grey/master-grey.css"
								]
							},
							"skin": {
								"files": []
							}
						},
						"action": {
							"action": {
								"files": []
							},
							"*": {
								"files": []
							}
						},
						"region": {
							"region": {
								"files": []
							}
						}
					},
					"dependencies": []
				}
			}
		},
		"primary": {
			"*": {
				"shaken": {
					"common": [
						"/static/shakerdemo/assets/r/primary_default_common_1e477436870f00543f0dcb8853ec66fa.css"
					],
					"common-action": [
						"/static/shakerdemo/assets/r/primary_default_common-action_1e477436870f00543f0dcb8853ec66fa.css"
					],
					"common-action-device": [
						"/static/shakerdemo/assets/r/primary_default_common-action-device_1e477436870f00543f0dcb8853ec66fa.css"
					],
					"common-action-device-grey": [
						"/static/shakerdemo/assets/r/primary_default_common-action-device-grey_84f5e5c85d08c4e00a59f07035eb170f.css"
					],
					"common-action-device-skin": [
						"/static/shakerdemo/assets/r/primary_default_common-action-device-skin_1e477436870f00543f0dcb8853ec66fa.css"
					],
					"common-action-device-grey-CA": [
						"/static/shakerdemo/assets/r/primary_default_common-action-device-grey-CA_75598c6f5ee37fc14be5ee14289af43f.css"
					],
					"common-action-device-grey-region": [
						"/static/shakerdemo/assets/r/primary_default_common-action-device-grey-region_84f5e5c85d08c4e00a59f07035eb170f.css"
					],
					"common-action-device-skin-CA": [
						"/static/shakerdemo/assets/r/primary_default_common-action-device-skin-CA_f4b124a8fca6b20791defb278281d0b6.css"
					],
					"common-action-device-skin-region": [
						"/static/shakerdemo/assets/r/primary_default_common-action-device-skin-region_1e477436870f00543f0dcb8853ec66fa.css"
					]
				},
				"meta": {
					"order": [
						"common-action-device-skin-region"
					],
					"dimensions": {
						"common": {
							"files": [
								"./mojits/primary/assets/common/primary.css"
							]
						},
						"skin": {
							"grey": {
								"files": [
									"./mojits/primary/assets/skin/grey/primary-grey.css"
								]
							},
							"skin": {
								"files": []
							}
						},
						"region": {
							"CA": {
								"files": [
									"./mojits/primary/assets/region/CA/primary-CA.css"
								]
							},
							"region": {
								"files": []
							}
						},
						"action": {
							"action": {
								"files": []
							},
							"*": {
								"files": []
							}
						},
						"device": {
							"device": {
								"files": []
							}
						}
					},
					"dependencies": []
				}
			}
		},
		"secondary": {
			"*": {
				"shaken": {
					"common": [
						"/static/shakerdemo/assets/r/secondary_default_common_d139d9b8eb6d55219f3ee0f9fdabd7e2.css"
					],
					"common-action": [
						"/static/shakerdemo/assets/r/secondary_default_common-action_d139d9b8eb6d55219f3ee0f9fdabd7e2.css"
					],
					"common-action-smartphone": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-smartphone_3f9ab2141044489fed782ee69a0e8338.css"
					],
					"common-action-device": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-device_d139d9b8eb6d55219f3ee0f9fdabd7e2.css"
					],
					"common-action-smartphone-grey": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-smartphone-grey_6554bb442cbcb06021dc86f8037a9229.css"
					],
					"common-action-smartphone-skin": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-smartphone-skin_3f9ab2141044489fed782ee69a0e8338.css"
					],
					"common-action-device-grey": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-device-grey_bb5076fa12807eef56aafc2c2e744a84.css"
					],
					"common-action-device-skin": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-device-skin_d139d9b8eb6d55219f3ee0f9fdabd7e2.css"
					],
					"common-action-smartphone-grey-CA": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-smartphone-grey-CA_894012675662df45ee9d8b407822f0b8.css"
					],
					"common-action-smartphone-grey-region": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-smartphone-grey-region_6554bb442cbcb06021dc86f8037a9229.css"
					],
					"common-action-smartphone-skin-CA": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-smartphone-skin-CA_f85b1e6b516aec6fe53c3e73a3c4534a.css"
					],
					"common-action-smartphone-skin-region": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-smartphone-skin-region_3f9ab2141044489fed782ee69a0e8338.css"
					],
					"common-action-device-grey-CA": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-device-grey-CA_976b4eefa881658cee9a96d4d1e6eff4.css"
					],
					"common-action-device-grey-region": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-device-grey-region_bb5076fa12807eef56aafc2c2e744a84.css"
					],
					"common-action-device-skin-CA": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-device-skin-CA_265076f3c6e75bec00879386d27dfcb0.css"
					],
					"common-action-device-skin-region": [
						"/static/shakerdemo/assets/r/secondary_default_common-action-device-skin-region_d139d9b8eb6d55219f3ee0f9fdabd7e2.css"
					]
				},
				"meta": {
					"order": [
						"common-action-device-skin-region"
					],
					"dimensions": {
						"common": {
							"files": [
								"./mojits/secondary/assets/common/secondary.css"
							]
						},
						"device": {
							"smartphone": {
								"files": [
									"./mojits/secondary/assets/device/smartphone/secondary-smartphone.css"
								]
							},
							"device": {
								"files": []
							}
						},
						"skin": {
							"grey": {
								"files": [
									"./mojits/secondary/assets/skin/grey/secondary-grey.css"
								]
							},
							"skin": {
								"files": []
							}
						},
						"region": {
							"CA": {
								"files": [
									"./mojits/secondary/assets/region/CA/secondary-CA.css"
								]
							},
							"region": {
								"files": []
							}
						},
						"action": {
							"action": {
								"files": []
							}
						}
					},
					"dependencies": []
				}
			}
		}
	},
	"app": {
		"*": {
			"shaken": {
				"common": [
					"/static/shakerdemo/assets/r/app_default_common_7f0aabdd584ec19ac92671545f31b595.css"
				],
				"common-action": [
					"/static/shakerdemo/assets/r/app_default_common-action_7f0aabdd584ec19ac92671545f31b595.css"
				],
				"common-action-device": [
					"/static/shakerdemo/assets/r/app_default_common-action-device_7f0aabdd584ec19ac92671545f31b595.css"
				],
				"common-action-smartphone": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone_31e9f8c2ca7ecffa8b12525bd87f4870.css"
				],
				"common-action-device-skin": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-skin_7f0aabdd584ec19ac92671545f31b595.css"
				],
				"common-action-device-grey": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-grey_487632b65cb7a397a2dc2d2849ea760b.css"
				],
				"common-action-smartphone-skin": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-skin_31e9f8c2ca7ecffa8b12525bd87f4870.css"
				],
				"common-action-smartphone-grey": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-grey_04ce2c10fe9d4cc06d355f4619d46ad6.css"
				],
				"common-action-device-skin-region": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-skin-region_7f0aabdd584ec19ac92671545f31b595.css"
				],
				"common-action-device-skin-CA": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-skin-CA_fac4b42a0bd4f713659a62f37e10b13e.css"
				],
				"common-action-device-grey-region": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-grey-region_487632b65cb7a397a2dc2d2849ea760b.css"
				],
				"common-action-device-grey-CA": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-grey-CA_53999c7da8409ddf5ff2c29885c87221.css"
				],
				"common-action-smartphone-skin-region": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-skin-region_31e9f8c2ca7ecffa8b12525bd87f4870.css"
				],
				"common-action-smartphone-skin-CA": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-skin-CA_0edb7f7770ca69f4cd588632745b5ad2.css"
				],
				"common-action-smartphone-grey-region": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-grey-region_04ce2c10fe9d4cc06d355f4619d46ad6.css"
				],
				"common-action-smartphone-grey-CA": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-grey-CA_8c441fc5618d22b117081a06e979378b.css"
				]
			},
			"meta": {
				"order": [
					"common-action-device-skin-region"
				],
				"dimensions": {
					"common": {
						"files": [
							"./assets/common/yui-base.css",
							"./assets/common/utils.css",
							"./assets/common/yui-reset.css",
							"./assets/common/yui-fonts.css",
							"./mojits/master/assets/common/master.css",
							"./mojits/primary/assets/common/primary.css"
						]
					},
					"action": {
						"action": {
							"files": []
						}
					},
					"device": {
						"device": {
							"files": []
						},
						"smartphone": {
							"files": [
								"./mojits/master/assets/device/smartphone/master-smartphone.css"
							]
						}
					},
					"skin": {
						"skin": {
							"files": []
						},
						"grey": {
							"files": [
								"./mojits/master/assets/skin/grey/master-grey.css",
								"./mojits/primary/assets/skin/grey/primary-grey.css"
							]
						}
					},
					"region": {
						"region": {
							"files": []
						},
						"CA": {
							"files": [
								"./mojits/primary/assets/region/CA/primary-CA.css"
							]
						}
					}
				},
				"dependencies": []
			},
			"mojits": [
				"master",
				"primary"
			]
		}
	}
}});