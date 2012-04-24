

========
Overview
========

<<<<<<< HEAD

What is Shaker?
###############


Shaker is a static asset rollup manager for Mojito applications.
A rollup consists of one or more input files that are combined (rolled up) to produce a single output file. Rollups can be as simple as a single file, a single mojit binder and its dependencies, or any combination thereof. Shaker allows you to create rollups regarding different combinations of dimensions. For example, you may want to serve different assets when people access your web site or web application using different devices, from different countries, etc.

=======
What is Shaker?
###############

Shaker is a static asset rollup manager for Mojito applications.
A rollup consists of one or more input files that are combined (rolled up) to produce a single output file. Rollups can be as simple as a single file, a single mojit binder and its dependencies, or any combination thereof.
Shaker allows you to create rollups regarding different combination of dimensions, for example you may wanna serve different assets when people are connected from different devices, different countries, etc.
>>>>>>> Restructured shaker in preparation for open sourcing

Why Shaker?
###########

<<<<<<< HEAD

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

=======
In short, Mojito's current asset management is basic. Its current rollup abilities are an all-or-nothing affair, lacking the flexibility to allow for a middle ground, or for surgical customization of rollup contents.
Shaker improves Mojito's rollup abilities in many ways.

**Example:** How you add dynamically in **Mojito** your assets, regargding some dimensions (in this case device):

::

	//controller logic
	var device = ac.context.device, css = '/static/device/assets/simple';
	if (device === 'iphone') {
		css += '.' + device;
	}
	css += '.css';
	ac.assets.addCss(css, 'top');

**Example:** How you add dynamically your assets with **Shaker:**

::

	//no logic to write
	//rollups are picked up automatically :)


So if you extrapolate to other dimensions, you will have to create all this logic by yourself.
With Shaker, we do all of this automatically for you. You just put your asset in the right folder (or throw configuration), and Shaker will take care of adding it need it.
>>>>>>> Restructured shaker in preparation for open sourcing

Features
########

- Create production rollups at build time.
- Create and serve development rollups at run time.
- Optionally push rollups to CDN.
- Use production or development rollups transparently from Mojito.
- Leverage Mojito's context dimensions to generate optimized rollups.
- Use custom dimensions beyond those provided by Mojito.
- Centralized rollup configuration.
<<<<<<< HEAD
- Code can transparently run on either the client or the server.
=======
- Runtime on Both Client and Server
>>>>>>> Restructured shaker in preparation for open sourcing


Benefits
########

<<<<<<< HEAD

Simple Conventions
==========================

Following the Shaker conventions greatly simplifies configuring your application to use Shaker.
=======
Simple Conventions
==========================

Following a few Shaker conventions simplifies configuring your application to use Shaker and helps organize asset sources.
>>>>>>> Restructured shaker in preparation for open sourcing


Powerful Customization
==========================

<<<<<<< HEAD
Shaker allows you to customize your rollups based on any combination of context dimension values. And if desired, rollups can be further customized via powerful include/exclude/replace directives.
=======
Shaker allows for customizing rollups based on any combination of context dimension values. And if desired, rollups can be further customized via powerful include/exclude/replace directives, and nesting dimension configurations.
>>>>>>> Restructured shaker in preparation for open sourcing


Set-and-Forget
=======================

<<<<<<< HEAD
Shaker is designed to eliminate the long term costs associated with maintaining a large number of rollups. Once an application is configured to use Shaker, there is nothing left to do from a developer standpoint. Shaker takes care of everything from that point on.
=======
Shaker is designed to be mostly set-and-forget. Once an application is configured to use Shaker there is nothing left to do from a developer standpoint. Shaker takes care of everything from that point on.
>>>>>>> Restructured shaker in preparation for open sourcing




