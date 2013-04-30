exports.commonTests = {
	'Summary Validation': 'common/tests/compiler/summary-validation.js',
	'Standard Validation': 'common/tests/request/standard-validation.js',
	'Markup Validation': 'common/tests/request/markup-validation.js'
}

exports.tests = {
    apps: {
        app1: {
            compilation: {
                'Invalid Configuration': {
                    shaker: {
                        resources: "invalid",
                        tasks: "invalid",
                        routeRollups: "invalid",
                        locations: "invalid",
                        invalid: "invalid"
                    },
                    tests: {
                        'Summary Validation': {
                            summary: {
								'Config Validation': {
									error: [
										"resources option should be an object. Using default resources.",
 										"tasks option should be an object. Ignoring tasks.",
 										"locations option should be an object. Ignoring locations.",
 										"routeRollups option should be an object. Ignoring route rollups."
									],
									warn: [
										"Ignoring unknown option 'invalid'."
									]
								}
                            }
                        }
                    }
                },
            	'Invalid Tasks and Locations': {
            		shaker: {
                        tasks: {
                        	js: "invalid",
                        	"controller": {
                        		'task missing task function': {
                        			module: "../test/common/tasks/invalid.js"
                        		},
                        		'task with a syntax error': {
                        			module: "../test/common/tasks/syntaxError.js"
                        		},
                        		'task with an error': {
                        			module: "../test/common/tasks/error.js"
                        		}
                        	},
                        },
                    	locations: {
                    		nonExisting: true,
                    		invalid: {
                    			module: "../test/common/locations/invalid.js"
                    		}
                    	}
                    },
                    tests: {
						'Summary Validation': {
                            summary: {
								'Config Validation': {
									error: [
										"'js' tasks should be an object. Ignoring 'js' tasks.",
										"Task module '../test/common/tasks/invalid.js' must have a function called 'task'. Ignoring 'task missing task function' task.",
										"Unable to find the module 'mojito-shaker-nonExisting'. Ignoring 'nonExisting' location.",
 										"Location module '../test/common/locations/invalid.js' must have a constructor called 'location'. Ignoring 'invalid' location."
									],
								},
								'Tasks': {
									error: [
										"Error when applying task 'task with a syntax error' to apps/app1/mojits/Child/controller.common.js: ReferenceError: syntaxError is not defined"
									],
									warn: [
										"Error when applying task 'task with an error' to apps/app1/mojits/Child/controller.common.js: error"
									]
								}
                            }
                        }
                    }
            	},
            	'Development Environment': {
            		context: {
            			environment: "dev"
            		},
            		tests: {
						'Summary Validation': true
					}
            	},
            	'Production Environment': {
            		context: {
            			environment: "prod"
            		},
            		tests: {
						'Summary Validation': true
					}
            	},
            	'No Bootstrap': {
            	    shaker: {
            	        resources: {
            	            bootstrap: false
            	        },
	                    routeRollups: {
                            module: "mojitrollup"
                        },
                        locations: {
                            local: true
                        }
            	    },
                    tests: {
                        'Summary Validation': true
                    }
            	},
            	'No YUI, No Bootstrap': {
                    shaker: {
                        resources: {
                            yui: false,
                            bootstrap: false
                        },
                        routeRollups: {
                            module: "mojitrollup"
                        },
                        locations: {
                            local: true
                        }
                    },
                    tests: {
                        'Summary Validation': true
                    }
                }
            },
            runtime: {
                "Development Environment": {
                    context: {
                        environment: "dev"
                    }
                },
                "Production Environment": {
                    context: {
                        environment: "prod"
                    }
                }
            },
            request: {
                '/': {
                    tests: {
                        'Standard Validation': true,
                        'Markup Validation': {
                            disabled: true,
                            title: "Index Page",
                            checks: [
                                {
                                    markup: {
                                        ".parent.mojit": {
                                            ".child.mojit": {
                                                "span": {
                                                    element: {
                                                        innerText: "Child - Index View"
                                                    }
                                                }
                                            },
                                            ".log": {
                                                count: {
                                                    "div": 2
                                                },
                                                "div": {
                                                    innerText: "YUI: parent-yui-module added"
                                                }
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        }
    }
}
