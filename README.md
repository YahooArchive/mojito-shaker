# Shaker

Shaker is a static asset rollup manager for Mojito applications which minimizes the number of client side requests. 

A rollup consists of one or more input files that are combined (rolled up) to produce a single output file. Rollups can be as simple as a single file, a single mojit binder and its dependencies, or any combination thereof.

<<<<<<< HEAD
Shaker allows you to create rollups regarding different combination of dimensions, for example you may wanna serve different assets when people are connected from different devices, different countries, etc.

For more information please see the docs.
=======
Shaker allows you to create rollups regarding different combination of dimensions, for example you may wanna serve different assets when people are connected from different devices, different countries, etc. 
>>>>>>> Restructured shaker in preparation for open sourcing

## Dependencies

[mime](https://github.com/bentomas/node-mime), [buildy](https://github.com/mosen/buildy), [async](https://github.com/caolan/async), [mkdirp](https://github.com/substack/node-mkdirp), and optionally [knox](https://github.com/LearnBoost/knox) to use the S3 task.