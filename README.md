# Shaker

![Shake it!](/yahoo/mojito-shaker/blob/master/docs/images/shaker.jpg?raw=true)

Shaker is a static asset rollup manager for Mojito applications.

A rollup consists of one or more input files that are combined (rolled up) to produce a single output file. Rollups can be as simple as a single file, a single mojit binder and its dependencies, or any combination thereof. Rollups are used to reduce the number of HTTP requests, which helps improve the performance of web sites and web applications.

Shaker allows you to create rollups regarding different combination of dimensions, for example you may wanna serve different assets when people are connected from different devices, different countries, etc.

For more information, please see the online documentation.

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
            "mojitsDirs": ["mojits","node_modules/shaker/mojits"]
            "specs": {
                "htmlframe": {
                    "type": "ShakerHTMLFrameMojit"
                }
            }
        }
    ]

Note: If you installed `mojito-shaker` globally you will have to point to the absolute path instead.

Execute Shaker and Start the server:

    $ mojito-shake [--context "environment:{value}"] [--run]
    $ mojito-start [--context "environment:{value}"]

Go to URL:

    http://localhost:8666/

## Documentation

You can access the documentation here: http://developer.yahoo.com/cocktails/shaker

If you want to build and contribute to the documentation, you will have to install [Sphinx](http://sphinx.pocoo.org) and under `/docs` run:

    $ make html

## Licensing and Contributions

Shaker is licensed under a [BSD license](https://github.com/yahoo/shaker/blob/master/LICENSE.txt).

To contribute to the Shaker project, please review the [Mojito Contributor
License Agreement](http://developer.yahoo.com/cocktails/mojito/cla/).

## Dependencies (Third-party libraries)

[buildy](https://github.com/mosen/buildy), [async](https://github.com/caolan/async), [mkdirp](https://github.com/substack/node-mkdirp), [mime](https://github.com/bentomas/node-mime), and optionally [knox](https://github.com/LearnBoost/knox) to use the S3 task.

## Credits

The following image is used in accordance with the [Creative Commons 2.0 License](http://creativecommons.org/licenses/by-sa/2.0/):

[http://www.flickr.com/photos/breatheindigital/4623226056/](http://www.flickr.com/photos/breatheindigital/4623226056/)

