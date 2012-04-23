

========
Overview
========


What is Shaker?
###############


Shaker is a static asset rollup manager for Mojito applications.
A rollup consists of one or more input files that are combined (rolled up) to produce a single output file. Rollups can be as simple as a single file, a single mojit binder and its dependencies, or any combination thereof. Shaker allows you to create rollups regarding different combinations of dimensions. For example, you may want to serve different assets when people access your web site or web application using different devices, from different countries, etc.


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
	// Rollups are picked up automatically :)

When dealing with multiple dimensions, the logic that you have to write can quickly become complicated. With Shaker, we do all of this automatically for you. You just put your assets in the right folders and Shaker will take care of adding them if needed.


Features
########

- Create production rollups at build time.
- Create and serve development rollups at run time.
- Optionally push rollups to CDN.
- Use production or development rollups transparently from Mojito.
- Leverage Mojito's context dimensions to generate optimized rollups.
- Use custom dimensions beyond those provided by Mojito.
- Centralized rollup configuration.
- Code can transparently run on either the client or the server.


Benefits
########


Simple Conventions
==========================

Following the Shaker conventions greatly simplifies configuring your application to use Shaker.


Powerful Customization
==========================

Shaker allows you to customize your rollups based on any combination of context dimension values. And if desired, rollups can be further customized via powerful include/exclude/replace directives.


Set-and-Forget
=======================

Shaker is designed to eliminate the long term costs associated with maintaining a large number of rollups. Once an application is configured to use Shaker, there is nothing left to do from a developer standpoint. Shaker takes care of everything from that point on.




