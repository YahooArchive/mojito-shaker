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
							},
							"*": {
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
					"/static/shakerdemo/assets/r/app_default_common_6d9176e2c840759c775c44a2bc00b167.css"
				],
				"common-action": [
					"/static/shakerdemo/assets/r/app_default_common-action_6d9176e2c840759c775c44a2bc00b167.css"
				],
				"common-action-device": [
					"/static/shakerdemo/assets/r/app_default_common-action-device_6d9176e2c840759c775c44a2bc00b167.css"
				],
				"common-action-smartphone": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone_23ed962a92e4e177290921144c8a2de9.css"
				],
				"common-action-device-skin": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-skin_6d9176e2c840759c775c44a2bc00b167.css"
				],
				"common-action-device-grey": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-grey_1e6ea8db260544a6a6af2285b137694a.css"
				],
				"common-action-smartphone-skin": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-skin_23ed962a92e4e177290921144c8a2de9.css"
				],
				"common-action-smartphone-grey": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-grey_34bafd12f8e68e3c099d4a551a0893dc.css"
				],
				"common-action-device-skin-region": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-skin-region_6d9176e2c840759c775c44a2bc00b167.css"
				],
				"common-action-device-skin-CA": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-skin-CA_194e17472342cadae92d4b469eb648f8.css"
				],
				"common-action-device-grey-region": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-grey-region_1e6ea8db260544a6a6af2285b137694a.css"
				],
				"common-action-device-grey-CA": [
					"/static/shakerdemo/assets/r/app_default_common-action-device-grey-CA_7b9628253182f281154db2631c681474.css"
				],
				"common-action-smartphone-skin-region": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-skin-region_23ed962a92e4e177290921144c8a2de9.css"
				],
				"common-action-smartphone-skin-CA": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-skin-CA_d889a8f57a76d76eb63a786063d804ac.css"
				],
				"common-action-smartphone-grey-region": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-grey-region_34bafd12f8e68e3c099d4a551a0893dc.css"
				],
				"common-action-smartphone-grey-CA": [
					"/static/shakerdemo/assets/r/app_default_common-action-smartphone-grey-CA_b2e8b58e59deb4f9174239871bf80aee.css"
				]
			},
			"meta": {
				"order": [
					"common-action-device-skin-region"
				],
				"dimensions": {
					"common": {
						"files": [
							"./assets/common/utils.css",
							"./assets/common/yui-base.css",
							"./assets/common/yui-fonts.css",
							"./assets/common/yui-reset.css",
							"./mojits/master/assets/common/master.css",
							"./mojits/primary/assets/common/primary.css",
							"./mojits/secondary/assets/common/secondary.css"
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
								"./mojits/master/assets/device/smartphone/master-smartphone.css",
								"./mojits/secondary/assets/device/smartphone/secondary-smartphone.css"
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
								"./mojits/primary/assets/skin/grey/primary-grey.css",
								"./mojits/secondary/assets/skin/grey/secondary-grey.css"
							]
						}
					},
					"region": {
						"region": {
							"files": []
						},
						"CA": {
							"files": [
								"./mojits/primary/assets/region/CA/primary-CA.css",
								"./mojits/secondary/assets/region/CA/secondary-CA.css"
							]
						}
					}
				},
				"dependencies": []
			},
			"mojits": [
				"master",
				"primary",
				"secondary"
			]
		}
	}
}});