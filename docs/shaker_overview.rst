

========
Overview
========

What is Shaker?
###############

Shaker is a static asset rollup manager for Mojito applications.
A rollup consists of one or more input files that are combined (rolled up) to produce a single output file. Rollups can be as simple as a single file, a single mojit binder and its dependencies, or any combination thereof.
Shaker allows you to create rollups regarding different combination of dimensions, for example you may want serve different assets when people are connected from different devices, different countries, etc.

Why Shaker?
###########

In short, Mojito's current asset management is basic. Its current rollup abilities are an all-or-nothing affair, lacking the flexibility to allow for a middle ground, or for surgical customization of rollup contents.
Shaker improves Mojito's rollup abilities in many ways.

**Example:** How you add your assets in Mojito dynamically, regarding some dimensions (in this case device):

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
With Shaker, we do all of this automatically for you. You just put your assets in the right folder (or throw configuration), and Shaker will take care of adding it  if needed.

Features
########

- Create production rollups at build time.
- Create and serve development rollups at run time.
- Optionally push rollups to CDN.
- Use production or development rollups transparently from Mojito.
- Leverage Mojito's context dimensions to generate optimized rollups.
- Use custom dimensions beyond those provided by Mojito.
- Centralized rollup configuration.
- Runtime on Both Client and Server


Benefits
########

Simple Conventions
==========================

Following a few Shaker conventions simplifies configuring your application to use Shaker and helps organize asset sources.


Powerful Customization
==========================

Shaker allows for customizing rollups based on any combination of context dimension values. And if desired, rollups can be further customized via powerful include/exclude/replace directives, and nesting dimension configurations.


Set-and-Forget
=======================

Shaker is designed to be mostly set-and-forget. Once an application is configured to use Shaker there is nothing left to do from a developer standpoint. Shaker takes care of everything from that point on.




