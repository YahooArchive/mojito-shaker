========
Overview
========

.. _overview-what:

What is Shaker?
###############

Shaker is an asset rollup management tool for Mojito applications that improves 
performance by reducing the number of HTTP requests. 

A rollup consists of one or more input files that are combined (rolled up) to produce a 
single output file. Rollups can be as simple as a single file, a single mojit binder and 
its dependencies, or any combination thereof.

Shaker allows you to create rollups using different combination of dimensions. For 
example, you may want to serve different assets when people are connected from different 
devices, different countries, etc.

.. _overview-why:

Why Shaker?
###########

Mojito does not have the ability to serve complex rollups. Shaker improves Mojito’s 
rollup abilities in many ways.

Examples
--------

This is how you dynamically add your assets in Mojito, based on some
dimension (in this case, the device):

.. code-block:: javascript

   // Controller logic
   var device = ac.context.device,
       css = '/static/device/assets/simple';

   if (device === 'iphone') {
     css += '.' + device;
   }

   css += '.css';
   ac.assets.addCss(css, 'top');

This is how you dynamically add your assets with **Shaker:**

::

	// No logic to write!
	// Rollups are picked up automatically based on dependencies, context and file names :)

When dealing with multiple dimensions, the logic that you have to write can quickly become 
complicated. With Shaker, we do all of this automatically for you. You just put your assets 
with the right name and Shaker will take care of adding them if needed.

.. _overview-goals:

Overall Goals
#############

The overall goal for Shaker is to deploy all client-side assets (such as CSS and JavaScript 
code) in the most performant way possible. This means serving optimized CSS and JavaScript 
for every set of contexts (devices, buckets, regions, languages,...), minimizing the time 
and the bandwidth used.

Moreover, this optimization is done without any effort by developers (set-and-forget).

.. _overview-features:

Features
########

+--------------------+----------------------------------------------------------------------+
| Stories ID         | Goals                                                                |
+====================+======================================================================+
| ``AUTO-COMPILER``  | The process of optimizing the assets should be completely            |
|                    | automated through configuration.                                     |
+--------------------+----------------------------------------------------------------------+
| ``CONTEXTUALIZE``  | Serve the right and minimum CSS/Javascript depending on the context. |
+--------------------+----------------------------------------------------------------------+
| ``BUNDLE-CSS``     | In one request, all CSS has to be bundled and loaded                 |
|                    | from the top of the page.                                            |
+--------------------+----------------------------------------------------------------------+
| ``BUNDLE-JS``      | All Javascript should be bundled to reduce the number of requests.   |
+--------------------+----------------------------------------------------------------------+
| ``DYNAMIC-JS``     | All scripts load dynamically and in parallel. Rendering is           |
|                    | never blocked.                                                       |
+--------------------+----------------------------------------------------------------------+
| ``CDN``            | All assets are coming from a CDN.                                    |
+--------------------+----------------------------------------------------------------------+
| ``COMPRESS``       | All assets should be CSS/Javascript-linted (for development) and     |
|                    | minified (for production).                                           |
+--------------------+----------------------------------------------------------------------+
| ``INLINE``         | Inline any given CSS/Javascript file through naming/configuration.   |
+--------------------+----------------------------------------------------------------------+
| ``HIGH-COVERAGE``  | Ability to define in advance which mojits to bundle together         |
|                    | for the first flush of the page.                                     |
+--------------------+----------------------------------------------------------------------+
| ``LOW-COVERAGE``   | Load at any given time (lazily/dynamically) a mojit with its         |
|                    | own JavaScript and CSS bundle.                                       |
+--------------------+----------------------------------------------------------------------+
| ``MOJIT-BUNDLE``   | Define (through configuration) which resources of a mojit to include |
|                    | in a given bundle (views, binders, controllers, langs,...).          |
+--------------------+----------------------------------------------------------------------+
| ``K-WEIGHT``       | Split JavaScript bundles in small chunks so multiple requests can    |
|                    | be made in parallel.                                                 | 
+--------------------+----------------------------------------------------------------------+

.. _overview-benefits:

Benefits
########

.. _benefits-conventions:

Simple Conventions
==================

Following simple conventions, configuring applications to use 
Shaker is easy and straightforward.

.. _benefits-customization:

Powerful Customization
======================

Shaker allows you to customize your rollups based on any combination of context  
configurations. And if desired, rollups can be further customized via powerful 
options/features.

.. _benefits-set_forget:

Set-and-Forget
==============

Shaker is designed to eliminate the long-term costs associated with maintaining a large 
number of rollups. Once an application is configured to use Shaker, developers do 
not need to do anything else. Shaker takes care of everything from that point on.

.. _benefits-zero_prod_costs:

Zero Production Costs
=====================

Once your application is configured properly to use Shaker, you will be able to push to 
production automatically just invoking ``shaker`` at build time to prepare the updated 
necessary assets.
