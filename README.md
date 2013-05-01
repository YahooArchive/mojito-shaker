# Shaker

[Shake it!](https://github.com/yahoo/mojito-shaker)

Shaker is a powerful static asset manager for [Mojito](https://github.com/yahoo/mojito) applications. It gives users absolute control in transforming, validating, uploading, organizing, and combining resources in order to maximize performance and build dynamic applications.

For more information, please see the [online documentation](http://developer.yahoo.com/cocktails/shaker).

[![Build Status](https://secure.travis-ci.org/yahoo/mojito-shaker.png)](http://travis-ci.org/yahoo/mojito-shaker)

## Installation

Shaker can be installed either locally or globally (using -g option), but we encourage you to install it locally,
since the reference to the inner mojits will be relative to the app.

1. Get the mojito-shaker npm package and install it:

        $ cd myMojitoApp
        $ npm install mojito-shaker [-g]

2. If you installed it locally you will have to link it:

        $ cd ./node_modules/mojito-shaker/ && sudo npm link

3. Confirm that Shaker has been installed correctly by running:

        $ mojito-shake

4. If you got some error, check if you have correctly configured the [Node environment](http://nodejs.org/api/modules.html#modules). You can try to set the right $NODE_PATH to the modules using:

        $ export NODE_PATH=:$NODE_PATH:`npm root -g`

## Quick Start

Within a Mojito application root folder:

Edit application.json to configure the mojitDirs and the HTMLFrame so that it looks like:

    [
        {
            "settings": [ "master" ],
            "mojitsDirs": ["mojits","node_modules/mojito-shaker/mojits"],
            "specs": {
                "htmlframe": {
                    "type": "ShakerHTMLFrameMojit"
                }
            }
        }
    ]

Note: If you installed `mojito-shaker` globally you will have to point to the absolute path instead.

Execute Shaker and Start the server:

    $ mojito-shake [--context "{key1}:{value1}[,{key2}:{value2}]"] [--run]
    $ mojito start [--context "{key1}:{value1}[,{key2}:{value2}]"]

Go to URL:

    http://localhost:8666/

## Documentation

You can access the documentation here: http://developer.yahoo.com/cocktails/shaker

If you want to build and contribute to the documentation, you will have to install [Sphinx](http://sphinx.pocoo.org) and under `/docs` run:

    $ make html

## Licensing and Contributions

Shaker is licensed under a [BSD license](https://github.com/yahoo/mojito-shaker/blob/master/LICENSE).

To contribute to the Shaker project, please review the [Mojito Contributor
License Agreement](http://developer.yahoo.com/cocktails/mojito/cla/).

## Dependencies (Third-party libraries)

[gear](https://github.com/yahoo/gear), [async](https://github.com/caolan/async), [mkdirp](https://github.com/substack/node-mkdirp), [mime](https://github.com/bentomas/node-mime), and optionally [knox](https://github.com/LearnBoost/knox) to use the S3 task.

## Credits

The following image is used in accordance with the [Creative Commons 2.0 License](http://creativecommons.org/licenses/by-sa/2.0/):

[http://www.flickr.com/photos/breatheindigital/4623226056/](http://www.flickr.com/photos/breatheindigital/4623226056/)

