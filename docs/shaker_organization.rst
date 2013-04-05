.. _organization:

====================
Organizing Resources
====================

Resources are automatically processed by Shaker as long as they follow `Mojito's
standard organization and naming conventions <http://developer.yahoo.com/cocktails/mojito/docs/topics/mojito_assets.html>`_.
Shaker has additional conventions to facilitate certain features such as inlining and ignoring particular resources.

Naming Conventions
==================

Contextualization
-----------------

Resources such as controllers, views, assets, and binders can be contextualize by appending the selector of a dimension to a resource's filename.
For example: a mojit may have two assets, styles.css and styles.iphone.css. styles.css is served for all contexts that do not
contain the iphone dimension, while styles.iphone.css only appears in contexts that include the 'iphone' dimension.
The dimension must be defined in dimensions.json
(see `Creating Custom Contexts <http://developer.yahoo.com/cocktails/mojito/docs/topics/mojito_using_contexts.html#context-configs-custom>`_).
The selector must be defined in application.json
(see `Selector Property <http://developer.yahoo.com/cocktails/mojito/docs/topics/mojito_resource_store.html#selector-property>`_).

Action Specific Resources
-------------------------

In order to associate a resource with a particular mojit action, the asset's name should match the mojit action. For example the assets home.css and
home-base.js would only appear in the 'home' action. Resources that do not match the name of any action within the mojit, appear in all actions.
This applies to assets, views, and binders.


Ordering Resources
------------------

Since the order of assets on the page can matter, Shaker always processes resources in alphabetical order. This ensures that assets of any particular type appear
on the page in the same order regardless of inlining or the presence of rollups.

.. _organization-naming-inlining:

Inlining Assets
---------------

Assets can be inlined by appending '-inline' to the filename. For example, the asset
style-inline.css lets Shaker know that it should be inlined. To inline a group of assets, the assets can be moved to a directory called
'inline' within 'assets', without the need of renaming any asset. See :ref:`Inlining Assets <organization-inlining>` for more details on inlining.


Voiding Assets
--------------

Assets can be ignored by appending '-void' to the filename. For example, the asset style-void.css lets Shaker know that it should be ignored.
To ignore a group of assets, the assets can be moved to a directory called
'void' within 'assets', without the need of renaming any asset. This gives the user flexibility on how to handle certain assets manually.

.. _organization-inlining:

Inlining
========

Inlining an asset means that the asset's content appears on the page's html instead of being downloaded. This presents performance tradeoffs by
increasing the size of the html page in order to reduce HTTP requests. Also an inlined asset can be placed right next to a mojit's html
(css appears above, and js appears below). Since the asset appears immediately next to the mojit,
no jittering occurs, which can happen when styling or scripts affecting a mojit is downloaded. To ensure that inlined mojit assets appear next
to the mojit's html, the mojit's controller must include 'mojito-shaker-mobstor', otherwise the inline asset will appear next to the closest ancestor
that includes the addon, or the application itself.

Assets can be inlined by naming convention as described in :ref:`Inlining Assets <organization-naming-inlining>` above. To inline all JS or CSS assets the 'inline'
value can be specified for the type of resource under the 'resources' -> 'assets' configuration (see :ref:`Assets Configuration <configuration-assets>`).
Finally an application level asset can be inlined by a mojit by using the shakerInline.inlineFile API as described below.

.. note:: Assets that appear in a route rollup are never inlined on the page since they are already present in a rollup.

.. _organization-inlineFile:

Inlining Using inlineFile
-------------------------

A mojit can request to inline a particular application level resource by using the shakerInline.inlineFile API method. This is useful if a particular
asset exists in a separate package and a mojit would like the asset to appear inline next to its HTML. The application level asset must have
the '-inline' marker in its filename (see :ref:`Inlining Assets <organization-naming-inlining>`). The mojit that needs the asset must call shakerInline.inlineFile,
with the first argument being the file's basename, without the '-inline' marker. The second argument is optional string specifying the type ('css', or 'js').
The mojit must include the 'shaker-inline-addon' to use the method.