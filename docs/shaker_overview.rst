========
Overview
========

.. _overview-what:

What is Shaker?
===============

Shaker is a powerful static asset manager for Mojito applications. It gives users absolute control in transforming, validating, uploading, organizing, and combining resources in order to build maximize performance and build dynamic applications.

Shaker provides contextualization of resources in order to serve different resources based on dimensions such as region, language, and device. The user can specify custom or default tasks such as JS/CSS minification and linting for transforming and validating resources. These resources can then be combined (or rolled up) in order to reduce HTTP requests and take advantage of caching. And finally resources can be uploaded to one or more CDN locations to optimize the delivery of resources to clients.

Why Shaker?
===========

By default, application and mojit assets must be added on the page manually by using the ac.assets addon.
This becomes especially challenging when particular assets are needed for different contexts.

Example
-------

.. code-block:: javascript

   // Controller logic
   var device = ac.context.device,
       path = '/static/device/assets/simple';

   if (device === 'iphone') {
       path += '.' + device;
   }

   path += '.css';
   ac.assets.addCss(path, 'top');

Shaker takes care of all this logic through the assets naming convention. In addition, Shaker gives the user the ability to validate, transform, and combine (roll up) resources and deploy to CDNs. All this is done through a :ref:`simple configuration <configuration>`, which the user can customize to maximize the performance of their application.


Features
========

Assets Organization and Contextualization
-----------------------------------------

Shaker automatically adds mojit and application level assets and picks the right versions based on the context.
See :ref:`Organizing Resources <organization>`.

Transformation/Validation Tasks
-------------------------------

Users can specify what kinds of transformation or validation tasks should be applied to each resource. They can define their own custom tasks or use the default tasks including JS/CSS linting and minification.
See :ref:`Tasks Configuration <configuration-tasks>`.

Rollups
-------

A rollup consists of many resources and their dependencies that are combined (or rolled up) to produce one or more files. Since the number of files is reduced, rollups can drastically reduce the number of HTTP request and allows browsers to cache the most common resources.
See :ref:`Route Rollups Configuration <configuration-rollups>`.

CDN Locations
-------------

Rollups and transformed resources can be uploaded to one or more CDN locations. This allows resources to be served from fast servers designed to quickly deliver resources to clients.
See :ref:`Locations Configuration <configuration-locations>`.

Settings and Runtime API
------------------------

The user has absolute control in deciding where on the page particular resources should appear, whether they should be combo-loaded, and which CDN location should be used. During runtime, the Shaker API can be used on the server side to change any of these settings and data on the page such as the title and html class.
See :ref:`Settings and Runtime API <configuration-settings>`.


