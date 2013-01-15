

========
Overview
========


What is Shaker?
###############

Shaker is an asset rollup management tool for Mojito applications which reduces the number of HTTP requests, thus improving performance. 

A rollup consists of one or more input files that are combined (rolled up) to produce a single output file. Rollups can be as simple as a single file, a single mojit binder and its dependencies, or any combination thereof.

Shaker allows you to create rollups using different combination of dimensions. For example, you may want to serve different assets when people are connected from different devices, different countries, etc.


Why Shaker?
###########

Mojito does not have the ability to serve complex rollups. Shaker improves Mojito’s rollup abilities in many ways.

**Example:** This is how you dynamically add your assets in Mojito, based on some dimension (in this case, the device):

::

	// controller logic
	var device = ac.context.device,
        css = '/static/device/assets/simple';

	if (device === 'iphone') {
		css += '.' + device;
	}

	css += '.css';

	ac.assets.addCss(css, 'top');

**Example:** this is how you dynamically add your assets with **Shaker:**

::

	// No logic to write!
	// Rollups are picked up automatically based on dependencies, context and filenames :)

When dealing with multiple dimensions, the logic that you have to write can quickly become complicated. With Shaker, we do all of this automatically for you. You just put your assets with the right name and Shaker will take care of adding them if needed.


Overall Goals
#############

The overall goal for Shaker is to deploy all client-side assets (such as CSS and JavaScript code), in the most performant way possible. This means serving optimized CSS and JS for every set of contexts (devices, buckets, regions, languages...), minimizing the time and the bandwidth used.

Moreover, this optimization has to be done with no effort by developers (set-and-forget).

Features
########

+--------------------+-----------------------------------------------------------------+
| Stories ID         | Goals                                                           |
+====================+=================================+++++===========================+
| ``AUTO-COMPILER``  | The process of optimizing the assets should be totally          |
|                    | automated, just configuration.                                  |
+--------------------+-----------------------------------------------------------------+
| ``CONTEXTUALIZE``  | Serve the right and minimum CSS/JS depending on the context.    |
+--------------------+-----------------------------------------------------------------+
| ``BUNDLE-CSS``     | All CSS has to be bundled and loaded in one single request      |
|                    | on the top of the page.                                         |
+--------------------+-----------------------------------------------------------------+
| ``BUNDLE-JS``      | All JS should be bundled to reduce the number of requests.      |
+--------------------+-----------------------------------------------------------------+
| ``DYNAMIC-JS``     | All scripts load dynamically and in parallel. Rendering is      |
|                    | never blocked.                                                  |
+--------------------+-----------------------------------------------------------------+
| ``CDN``            | All assets are comming from CDN.                                |
+--------------------+-----------------------------------------------------------------+
| ``COMPRESS``       | All assets should be CSS/JS-linted (for develop) and minified   |
|                    | (for production).                                               |
+--------------------+-----------------------------------------------------------------+
| ``INLINE``         | Inline any given CSS/JS file through naming/configuration.      |
+--------------------+-----------------------------------------------------------------+
| ``HIGH-COVERAGE``  | Ability to define ahead of time which mojits to bundle together |
|                    | for the first flush of the page.                                |
+--------------------+-----------------------------------------------------------------+
| ``LOW-COVERAGE``   | Load at any given time (lazy/dynamic load) a mojit with its     |
|                    | own JS and CSS bundle.                                          |
+--------------------+-----------------------------------------------------------------+
| ``MOJIT-BUNDLE``   | Define (through config) which resources of a mojit to include   |
|                    | in a given bundle (views, binders, controllers, langs...)       |
+--------------------+-----------------------------------------------------------------+
| ``K-WEIGHT``       | Split JavaScript bundles in small chunks in order to            |
|                    | parallelize requests.                                           |
+--------------------+-----------------------------------------------------------------+

Benefits
###############

Simple Conventions
==========================

Following the Shaker conventions greatly simplifies configuring your application to use Shaker.


Powerful Customization
==========================

Shaker allows you to customize your rollups based on any combination of context dimension values. And if desired, rollups can be further customized via powerful options/features.


Set-and-Forget
=======================

Shaker is designed to eliminate the long term costs associated with maintaining a large number of rollups. Once an application is configured to use Shaker, there is nothing left to do from a developer standpoint. Shaker takes care of everything from that point on.

Zero Produtionize work-cost
============================

Once your app is configured properly to use Shaker, you will be able to push to production automatically just invoking shaker on build time to prepare the updated necessary assets
