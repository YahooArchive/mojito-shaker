# Shaker

Shaker is a static asset rollup manager for Mojito applications.

A rollup consists of one or more input files that are combined (rolled up) to produce a single output file. Rollups can be as simple as a single file, a single mojit binder and its dependencies, or any combination thereof. Rollups are used to reduce the number of HTTP requests, which helps improve the performance of web sites and web applications.

Shaker allows you to create rollups regarding different combination of dimensions, for example you may wanna serve different assets when people are connected from different devices, different countries, etc.

For more information, please see the online documentation.

## Installation

### via GitHub

	$ cd myMojitoApp
    $ git clone git://github.com/yahoo/shaker.git
    $ npm install

### via npm

	$ cd myMojitoApp
    $ npm install shaker

## Quick Start

Within a Mojito application root folder:

Edit application.json to configure the mojitDirs and the HTMLFrame so that it looks like:

    [
        {
            "settings": [ "master" ],
            "mojitsDirs": ["mojits","node_modules/shaker/mojits"]
            "specs": {
                "htmlframe": {
                    "type": "ShakerHTMLFrame"
                }
            }
        }
    ]

Execute Shaker and Start the server:

    $ mojito shake [--context "environment:{value}"] [--run]
    $ mojito start [--context "environment:{value}"]

Go to URL:

    http://localhost:8666/

## Documentation

http://developer.yahoo.com/cocktails/shaker

## Licensing and Contributions

Shaker is licensed under a [BSD license](https://github.com/yahoo/shaker/blob/master/LICENSE.txt).

To contribute to the Mojito project, please review the [Mojito Contributor
License Agreement](http://developer.yahoo.com/cocktails/mojito/cla/).

## Dependencies (Third-party libraries)

[mime](https://github.com/bentomas/node-mime), [buildy](https://github.com/mosen/buildy), [async](https://github.com/caolan/async), [mkdirp](https://github.com/substack/node-mkdirp), and optionally [knox](https://github.com/LearnBoost/knox) to use the S3 task.
