'use strict';

var express = require('express'),
    libmojito = require('mojito'),
    app;

app = express();

libmojito.extend(app);

app.set('port', process.env.PORT || 8666);

app.use(libmojito.middleware());
app.mojito.attachRoutes();

app.listen(app.get('port'));