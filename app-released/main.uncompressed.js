
//>>>filename: /Users/aaron/Develop/loader-demo-with-builder/app/dojo/has.js, mid: dojo/has
define("dojo/has",["require","module"],function(require, module){
	// module:
	//		dojo/has
	// summary:
	//		Defines the has.js API and several feature tests used by dojo.
	// description:
	//		This module defines the has API as described by the project has.js with the following additional features:
	//
	//		- the has test cache is exposed at has.cache.
	//		- the method has.add includes a forth parameter that controls whether or not existing tests are replaced
	//		- the loader's has cache may be optionally copied into this module's has cahce.
	//
	//		This module adopted from https://github.com/phiggins42/has.js; thanks has.js team!

	// try to pull the has implementation from the loader; both the dojo loader and bdLoad provide one
	// if using a foreign loader, then the has cache may be initialized via the config object for this module
	// WARNING: if a foreign loader defines require.has to be something other than the has.js API, then this implementation fail
	var has = require.has || function(){};
	if(!has("dojo-has-api")){
		var
			isBrowser =
				// the most fundamental decision: are we in the browser?
				typeof window != "undefined" &&
				typeof location != "undefined" &&
				typeof document != "undefined" &&
				window.location == location && window.document == document,

			// has API variables
			global = (function () { return this; })(),
			doc = isBrowser && document,
			element = doc && doc.createElement("DiV"),
			cache = (module.config && module.config()) || {};

		has = function(name){
			// summary:
			//		Return the current value of the named feature.
			//
			// name: String|Integer
			//		The name (if a string) or identifier (if an integer) of the feature to test.
			//
			// description:
			//		Returns the value of the feature named by name. The feature must have been
			//		previously added to the cache by has.add.

			return typeof cache[name] == "function" ? (cache[name] = cache[name](global, doc, element)) : cache[name]; // Boolean
		};

		has.cache = cache;

		has.add = function(name, test, now, force){
			// summary:
			//	 	Register a new feature test for some named feature.
			// name: String|Integer
			//	 	The name (if a string) or identifier (if an integer) of the feature to test.
			// test: Function
			//		 A test function to register. If a function, queued for testing until actually
			//		 needed. The test function should return a boolean indicating
			//	 	the presence of a feature or bug.
			// now: Boolean?
			//		 Optional. Omit if `test` is not a function. Provides a way to immediately
			//		 run the test and cache the result.
			// force: Boolean?
			//	 	Optional. If the test already exists and force is truthy, then the existing
			//	 	test will be replaced; otherwise, add does not replace an existing test (that
			//	 	is, by default, the first test advice wins).
			// example:
			//		A redundant test, testFn with immediate execution:
			//	|	has.add("javascript", function(){ return true; }, true);
			//
			// example:
			//		Again with the redundantness. You can do this in your tests, but we should
			//		not be doing this in any internal has.js tests
			//	|	has.add("javascript", true);
			//
			// example:
			//		Three things are passed to the testFunction. `global`, `document`, and a generic element
			//		from which to work your test should the need arise.
			//	|	has.add("bug-byid", function(g, d, el){
			//	|		// g	== global, typically window, yadda yadda
			//	|		// d	== document object
			//	|		// el == the generic element. a `has` element.
			//	|		return false; // fake test, byid-when-form-has-name-matching-an-id is slightly longer
			//	|	});

			(typeof cache[name]=="undefined" || force) && (cache[name]= test);
			return now && has(name);
		};

		// since we're operating under a loader that doesn't provide a has API, we must explicitly initialize
		// has as it would have otherwise been initialized by the dojo loader; use has.add to the builder
		// can optimize these away iff desired
		has.add("host-browser", isBrowser);
		has.add("host-node", (typeof process == "object" && process.versions && process.versions.node && process.versions.v8));
		has.add("host-rhino", (typeof load == "function" && (typeof Packages == "function" || typeof Packages == "object")));
		has.add("dom", isBrowser);
		has.add("dojo-dom-ready-api", 1);
		has.add("dojo-sniff", 1);
	}

	if(has("host-browser")){
		// Common application level tests
		has.add("dom-addeventlistener", !!document.addEventListener);

		// Do the device and browser have touch capability?
		has.add("touch", "ontouchstart" in document
			|| ("onpointerdown" in document && navigator.maxTouchPoints > 0)
			|| window.navigator.msMaxTouchPoints);

		// Touch events support
		has.add("touch-events", "ontouchstart" in document);

		// Pointer Events support
		has.add("pointer-events", "onpointerdown" in document);
		has.add("MSPointer", "msMaxTouchPoints" in navigator); //IE10 (+IE11 preview)

		// I don't know if any of these tests are really correct, just a rough guess
		has.add("device-width", screen.availWidth || innerWidth);

		// Tests for DOMNode.attributes[] behavior:
		//	 - dom-attributes-explicit - attributes[] only lists explicitly user specified attributes
		//	 - dom-attributes-specified-flag (IE8) - need to check attr.specified flag to skip attributes user didn't specify
		//	 - Otherwise, in IE6-7. attributes[] will list hundreds of values, so need to do outerHTML to get attrs instead.
		var form = document.createElement("form");
		has.add("dom-attributes-explicit", form.attributes.length == 0); // W3C
		has.add("dom-attributes-specified-flag", form.attributes.length > 0 && form.attributes.length < 40);	// IE8
	}

	has.clearElement = function(element){
		// summary:
		//	 Deletes the contents of the element passed to test functions.
		element.innerHTML= "";
		return element;
	};

	has.normalize = function(id, toAbsMid){
		// summary:
		//	 Resolves id into a module id based on possibly-nested tenary expression that branches on has feature test value(s).
		//
		// toAbsMid: Function
		//	 Resolves a relative module id into an absolute module id
		var
			tokens = id.match(/[\?:]|[^:\?]*/g), i = 0,
			get = function(skip){
				var term = tokens[i++];
				if(term == ":"){
					// empty string module name, resolves to 0
					return 0;
				}else{
					// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
					if(tokens[i++] == "?"){
						if(!skip && has(term)){
							// matched the feature, get the first value from the options
							return get();
						}else{
							// did not match, get the second value, passing over the first
							get(true);
							return get(skip);
						}
					}
					// a module
					return term || 0;
				}
			};
		id = get();
		return id && toAbsMid(id);
	};

	has.load = function(id, parentRequire, loaded){
		// summary:
		//		Conditional loading of AMD modules based on a has feature test value.
		// id: String
		//		Gives the resolved module id to load.
		// parentRequire: Function
		//		The loader require function with respect to the module that contained the plugin resource in it's
		//		dependency list.
		// loaded: Function
		//	 Callback to loader that consumes result of plugin demand.

		if(id){
			parentRequire([id], loaded);
		}else{
			loaded();
		}
	};

	return has;
});

//>>>filename: /Users/aaron/Develop/loader-demo-with-builder/app/dojo/_base/config.js, mid: dojo/_base/config
define("dojo/_base/config",["dojo/has","require"],function(has, require){
	// module:
	//		dojo/_base/config

/*=====
return {
	// summary:
	//		This module defines the user configuration during bootstrap.
	// description:
	//		By defining user configuration as a module value, an entire configuration can be specified in a build,
	//		thereby eliminating the need for sniffing and or explicitly setting in the global variable dojoConfig.
	//		Also, when multiple instances of dojo exist in a single application, each will necessarily be located
	//		at an unique absolute module identifier as given by the package configuration. Implementing configuration
	//		as a module allows for specifying unique, per-instance configurations.
	// example:
	//		Create a second instance of dojo with a different, instance-unique configuration (assume the loader and
	//		dojo.js are already loaded).
	//		|	// specify a configuration that creates a new instance of dojo at the absolute module identifier "myDojo"
	//		|	require({
	//		|		packages:[{
	//		|			name:"myDojo",
	//		|			location:".", //assume baseUrl points to dojo.js
	//		|		}]
	//		|	});
	//		|
	//		|	// specify a configuration for the myDojo instance
	//		|	define("myDojo/config", {
	//		|		// normal configuration variables go here, e.g.,
	//		|		locale:"fr-ca"
	//		|	});
	//		|
	//		|	// load and use the new instance of dojo
	//		|	require(["myDojo"], function(dojo){
	//		|		// dojo is the new instance of dojo
	//		|		// use as required
	//		|	});

	// isDebug: Boolean
	//		Defaults to `false`. If set to `true`, ensures that Dojo provides
	//		extended debugging feedback via Firebug. If Firebug is not available
	//		on your platform, setting `isDebug` to `true` will force Dojo to
	//		pull in (and display) the version of Firebug Lite which is
	//		integrated into the Dojo distribution, thereby always providing a
	//		debugging/logging console when `isDebug` is enabled. Note that
	//		Firebug's `console.*` methods are ALWAYS defined by Dojo. If
	//		`isDebug` is false and you are on a platform without Firebug, these
	//		methods will be defined as no-ops.
	isDebug: false,

	// locale: String
	//		The locale to assume for loading localized resources in this page,
	//		specified according to [RFC 3066](http://www.ietf.org/rfc/rfc3066.txt).
	//		Must be specified entirely in lowercase, e.g. `en-us` and `zh-cn`.
	//		See the documentation for `dojo.i18n` and `dojo.requireLocalization`
	//		for details on loading localized resources. If no locale is specified,
	//		Dojo assumes the locale of the user agent, according to `navigator.userLanguage`
	//		or `navigator.language` properties.
	locale: undefined,

	// extraLocale: Array
	//		No default value. Specifies additional locales whose
	//		resources should also be loaded alongside the default locale when
	//		calls to `dojo.requireLocalization()` are processed.
	extraLocale: undefined,

	// baseUrl: String
	//		The directory in which `dojo.js` is located. Under normal
	//		conditions, Dojo auto-detects the correct location from which it
	//		was loaded. You may need to manually configure `baseUrl` in cases
	//		where you have renamed `dojo.js` or in which `<base>` tags confuse
	//		some browsers (e.g. IE 6). The variable `dojo.baseUrl` is assigned
	//		either the value of `djConfig.baseUrl` if one is provided or the
	//		auto-detected root if not. Other modules are located relative to
	//		this path. The path should end in a slash.
	baseUrl: undefined,

	// modulePaths: [deprecated] Object
	//		A map of module names to paths relative to `dojo.baseUrl`. The
	//		key/value pairs correspond directly to the arguments which
	//		`dojo.registerModulePath` accepts. Specifying
	//		`djConfig.modulePaths = { "foo": "../../bar" }` is the equivalent
	//		of calling `dojo.registerModulePath("foo", "../../bar");`. Multiple
	//		modules may be configured via `djConfig.modulePaths`.
	modulePaths: {},

	// addOnLoad: Function|Array
	//		Adds a callback via dojo/ready. Useful when Dojo is added after
	//		the page loads and djConfig.afterOnLoad is true. Supports the same
	//		arguments as dojo/ready. When using a function reference, use
	//		`djConfig.addOnLoad = function(){};`. For object with function name use
	//		`djConfig.addOnLoad = [myObject, "functionName"];` and for object with
	//		function reference use
	//		`djConfig.addOnLoad = [myObject, function(){}];`
	addOnLoad: null,

	// parseOnLoad: Boolean
	//		Run the parser after the page is loaded
	parseOnLoad: false,

	// require: String[]
	//		An array of module names to be loaded immediately after dojo.js has been included
	//		in a page.
	require: [],

	// defaultDuration: Number
	//		Default duration, in milliseconds, for wipe and fade animations within dijits.
	//		Assigned to dijit.defaultDuration.
	defaultDuration: 200,

	// dojoBlankHtmlUrl: String
	//		Used by some modules to configure an empty iframe. Used by dojo/io/iframe and
	//		dojo/back, and dijit/popup support in IE where an iframe is needed to make sure native
	//		controls do not bleed through the popups. Normally this configuration variable
	//		does not need to be set, except when using cross-domain/CDN Dojo builds.
	//		Save dojo/resources/blank.html to your domain and set `djConfig.dojoBlankHtmlUrl`
	//		to the path on your domain your copy of blank.html.
	dojoBlankHtmlUrl: undefined,

	// ioPublish: Boolean?
	//		Set this to true to enable publishing of topics for the different phases of
	//		IO operations. Publishing is done via dojo/topic.publish(). See dojo/main.__IoPublish for a list
	//		of topics that are published.
	ioPublish: false,

	// useCustomLogger: Anything?
	//		If set to a value that evaluates to true such as a string or array and
	//		isDebug is true and Firebug is not available or running, then it bypasses
	//		the creation of Firebug Lite allowing you to define your own console object.
	useCustomLogger: undefined,

	// transparentColor: Array
	//		Array containing the r, g, b components used as transparent color in dojo.Color;
	//		if undefined, [255,255,255] (white) will be used.
	transparentColor: undefined,
	
	// deps: Function|Array
	//		Defines dependencies to be used before the loader has been loaded.
	//		When provided, they cause the loader to execute require(deps, callback) 
	//		once it has finished loading. Should be used with callback.
	deps: undefined,
	
	// callback: Function|Array
	//		Defines a callback to be used when dependencies are defined before 
	//		the loader has been loaded. When provided, they cause the loader to 
	//		execute require(deps, callback) once it has finished loading. 
	//		Should be used with deps.
	callback: undefined,
	
	// deferredInstrumentation: Boolean
	//		Whether deferred instrumentation should be loaded or included
	//		in builds.
	deferredInstrumentation: true,

	// useDeferredInstrumentation: Boolean|String
	//		Whether the deferred instrumentation should be used.
	//
	//		* `"report-rejections"`: report each rejection as it occurs.
	//		* `true` or `1` or `"report-unhandled-rejections"`: wait 1 second
	//			in an attempt to detect unhandled rejections.
	useDeferredInstrumentation: "report-unhandled-rejections"
};
=====*/

	var result = {};
	if(has("dojo-config-api")){
		// must be the dojo loader; take a shallow copy of require.rawConfig
		var src = require.rawConfig, p;
		for(p in src){
			result[p] = src[p];
		}
	}else{
		var adviseHas = function(featureSet, prefix, booting){
			for(p in featureSet){
				p!="has" && has.add(prefix + p, featureSet[p], 0, booting);
			}
		};
		var global = (function () { return this; })();
		result = has("dojo-loader") ?
			// must be a built version of the dojo loader; all config stuffed in require.rawConfig
			require.rawConfig :
			// a foreign loader
			global.dojoConfig || global.djConfig || {};
		adviseHas(result, "config", 1);
		adviseHas(result.has, "", 1);
	}

	if(!result.locale && typeof navigator != "undefined"){
		// Default locale for browsers.
		var language = (navigator.language || navigator.userLanguage);
		if(language){
			result.locale = language.toLowerCase();
		}
	}

	return result;
});


//>>>filename: /Users/aaron/Develop/loader-demo-with-builder/app/dojo/_base/kernel.js, mid: dojo/_base/kernel
define("dojo/_base/kernel",["dojo/has","dojo/_base/config","require","module"],function(has, config, require, module){
	// module:
	//		dojo/_base/kernel

	// This module is the foundational module of the dojo boot sequence; it defines the dojo object.

	var
		// loop variables for this module
		i, p,

		// create dojo, dijit, and dojox
		// FIXME: in 2.0 remove dijit, dojox being created by dojo
		global = (function () { return this; })(),
		dijit = {},
		dojox = {},
		dojo = {
			// summary:
			//		This module is the foundational module of the dojo boot sequence; it defines the dojo object.

			// notice dojo takes ownership of the value of the config module
			config:config,
			global:global,
			dijit:dijit,
			dojox:dojox
		};


	// Configure the scope map. For a 100% AMD application, the scope map is not needed other than to provide
	// a _scopeName property for the dojo, dijit, and dojox root object so those packages can create
	// unique names in the global space.
	//
	// Built, legacy modules use the scope map to allow those modules to be expressed as if dojo, dijit, and dojox,
	// where global when in fact they are either global under different names or not global at all. In v1.6-, the
	// config variable "scopeMap" was used to map names as used within a module to global names. This has been
	// subsumed by the AMD map configuration variable which can relocate packages to different names. For backcompat,
	// only the "*" mapping is supported. See http://livedocs.dojotoolkit.org/developer/design/loader#legacy-cross-domain-mode for details.
	//
	// The following computations contort the packageMap for this dojo instance into a scopeMap.
	var scopeMap =
			// a map from a name used in a legacy module to the (global variable name, object addressed by that name)
			// always map dojo, dijit, and dojox
			{
				dojo:["dojo", dojo],
				dijit:["dijit", dijit],
				dojox:["dojox", dojox]
			},

		packageMap =
			// the package map for this dojo instance; note, a foreign loader or no pacakgeMap results in the above default config
			(require.map && require.map[module.id.match(/[^\/]+/)[0]]),

		item;


	// process all mapped top-level names for this instance of dojo
	for(p in packageMap){
		if(scopeMap[p]){
			// mapped dojo, dijit, or dojox
			scopeMap[p][0] = packageMap[p];
		}else{
			// some other top-level name
			scopeMap[p] = [packageMap[p], {}];
		}
	}

	// publish those names to _scopeName and, optionally, the global namespace
	for(p in scopeMap){
		item = scopeMap[p];
		item[1]._scopeName = item[0];
		if(!config.noGlobals){
			global[item[0]] = item[1];
		}
	}
	dojo.scopeMap = scopeMap;

	/*===== dojo.__docParserConfigureScopeMap(scopeMap); =====*/

	// FIXME: dojo.baseUrl and dojo.config.baseUrl should be deprecated
	dojo.baseUrl = dojo.config.baseUrl = require.baseUrl;
	dojo.isAsync = !has("dojo-loader") || require.async;
	dojo.locale = config.locale;

	var rev = "$Rev: f4fef70 $".match(/[0-9a-f]{7,}/);
	dojo.version = {
		// summary:
		//		Version number of the Dojo Toolkit
		// description:
		//		Hash about the version, including
		//
		//		- major: Integer: Major version. If total version is "1.2.0beta1", will be 1
		//		- minor: Integer: Minor version. If total version is "1.2.0beta1", will be 2
		//		- patch: Integer: Patch version. If total version is "1.2.0beta1", will be 0
		//		- flag: String: Descriptor flag. If total version is "1.2.0beta1", will be "beta1"
		//		- revision: Number: The Git rev from which dojo was pulled

		major: 1, minor: 10, patch: 4, flag: "",
		revision: rev ? rev[0] : NaN,
		toString: function(){
			var v = dojo.version;
			return v.major + "." + v.minor + "." + v.patch + v.flag + " (" + v.revision + ")";	// String
		}
	};

	// If has("extend-dojo") is truthy, then as a dojo module is defined it should push it's definitions
	// into the dojo object, and conversely. In 2.0, it will likely be unusual to augment another object
	// as a result of defining a module. This has feature gives a way to force 2.0 behavior as the code
	// is migrated. Absent specific advice otherwise, set extend-dojo to truthy.
	has.add("extend-dojo", 1);


	(Function("d", "d.eval = function(){return d.global.eval ? d.global.eval(arguments[0]) : eval(arguments[0]);}"))(dojo);
	/*=====
	dojo.eval = function(scriptText){
		// summary:
		//		A legacy method created for use exclusively by internal Dojo methods. Do not use this method
		//		directly unless you understand its possibly-different implications on the platforms your are targeting.
		// description:
		//		Makes an attempt to evaluate scriptText in the global scope. The function works correctly for browsers
		//		that support indirect eval.
		//
		//		As usual, IE does not. On IE, the only way to implement global eval is to
		//		use execScript. Unfortunately, execScript does not return a value and breaks some current usages of dojo.eval.
		//		This implementation uses the technique of executing eval in the scope of a function that is a single scope
		//		frame below the global scope; thereby coming close to the global scope. Note carefully that
		//
		//		dojo.eval("var pi = 3.14;");
		//
		//		will define global pi in non-IE environments, but define pi only in a temporary local scope for IE. If you want
		//		to define a global variable using dojo.eval, write something like
		//
		//		dojo.eval("window.pi = 3.14;")
		// scriptText:
		//		The text to evaluation.
		// returns:
		//		The result of the evaluation. Often `undefined`
	};
	=====*/


	if(has("host-rhino")){
		dojo.exit = function(exitcode){
			quit(exitcode);
		};
	}else{
		dojo.exit = function(){
		};
	}

	has.add("dojo-guarantee-console",
		// ensure that console.log, console.warn, etc. are defined
		1
	);
	if(has("dojo-guarantee-console")){
		typeof console != "undefined" || (console = {});
		//	Be careful to leave 'log' always at the end
		var cn = [
			"assert", "count", "debug", "dir", "dirxml", "error", "group",
			"groupEnd", "info", "profile", "profileEnd", "time", "timeEnd",
			"trace", "warn", "log"
		];
		var tn;
		i = 0;
		while((tn = cn[i++])){
			if(!console[tn]){
				(function(){
					var tcn = tn + "";
					console[tcn] = ('log' in console) ? function(){
						var a = Array.prototype.slice.call(arguments);
						a.unshift(tcn + ":");
						console["log"](a.join(" "));
					} : function(){};
					console[tcn]._fake = true;
				})();
			}
		}
	}

	has.add("dojo-debug-messages",
		// include dojo.deprecated/dojo.experimental implementations
		!!config.isDebug
	);
	dojo.deprecated = dojo.experimental =  function(){};
	if(has("dojo-debug-messages")){
		dojo.deprecated = function(/*String*/ behaviour, /*String?*/ extra, /*String?*/ removal){
			// summary:
			//		Log a debug message to indicate that a behavior has been
			//		deprecated.
			// behaviour: String
			//		The API or behavior being deprecated. Usually in the form
			//		of "myApp.someFunction()".
			// extra: String?
			//		Text to append to the message. Often provides advice on a
			//		new function or facility to achieve the same goal during
			//		the deprecation period.
			// removal: String?
			//		Text to indicate when in the future the behavior will be
			//		removed. Usually a version number.
			// example:
			//	| dojo.deprecated("myApp.getTemp()", "use myApp.getLocaleTemp() instead", "1.0");

			var message = "DEPRECATED: " + behaviour;
			if(extra){ message += " " + extra; }
			if(removal){ message += " -- will be removed in version: " + removal; }
			console.warn(message);
		};

		dojo.experimental = function(/* String */ moduleName, /* String? */ extra){
			// summary:
			//		Marks code as experimental.
			// description:
			//		This can be used to mark a function, file, or module as
			//		experimental.	 Experimental code is not ready to be used, and the
			//		APIs are subject to change without notice.	Experimental code may be
			//		completed deleted without going through the normal deprecation
			//		process.
			// moduleName: String
			//		The name of a module, or the name of a module file or a specific
			//		function
			// extra: String?
			//		some additional message for the user
			// example:
			//	| dojo.experimental("dojo.data.Result");
			// example:
			//	| dojo.experimental("dojo.weather.toKelvin()", "PENDING approval from NOAA");

			var message = "EXPERIMENTAL: " + moduleName + " -- APIs subject to change without notice.";
			if(extra){ message += " " + extra; }
			console.warn(message);
		};
	}

	has.add("dojo-modulePaths",
		// consume dojo.modulePaths processing
		1
	);
	if(has("dojo-modulePaths")){
		// notice that modulePaths won't be applied to any require's before the dojo/_base/kernel factory is run;
		// this is the v1.6- behavior.
		if(config.modulePaths){
			dojo.deprecated("dojo.modulePaths", "use paths configuration");
			var paths = {};
			for(p in config.modulePaths){
				paths[p.replace(/\./g, "/")] = config.modulePaths[p];
			}
			require({paths:paths});
		}
	}

	has.add("dojo-moduleUrl",
		// include dojo.moduleUrl
		1
	);
	if(has("dojo-moduleUrl")){
		dojo.moduleUrl = function(/*String*/module, /*String?*/url){
			// summary:
			//		Returns a URL relative to a module.
			// example:
			//	|	var pngPath = dojo.moduleUrl("acme","images/small.png");
			//	|	console.dir(pngPath); // list the object properties
			//	|	// create an image and set it's source to pngPath's value:
			//	|	var img = document.createElement("img");
			//	|	img.src = pngPath;
			//	|	// add our image to the document
			//	|	dojo.body().appendChild(img);
			// example:
			//		you may de-reference as far as you like down the package
			//		hierarchy.  This is sometimes handy to avoid lengthy relative
			//		urls or for building portable sub-packages. In this example,
			//		the `acme.widget` and `acme.util` directories may be located
			//		under different roots (see `dojo.registerModulePath`) but the
			//		the modules which reference them can be unaware of their
			//		relative locations on the filesystem:
			//	|	// somewhere in a configuration block
			//	|	dojo.registerModulePath("acme.widget", "../../acme/widget");
			//	|	dojo.registerModulePath("acme.util", "../../util");
			//	|
			//	|	// ...
			//	|
			//	|	// code in a module using acme resources
			//	|	var tmpltPath = dojo.moduleUrl("acme.widget","templates/template.html");
			//	|	var dataPath = dojo.moduleUrl("acme.util","resources/data.json");

			dojo.deprecated("dojo.moduleUrl()", "use require.toUrl", "2.0");

			// require.toUrl requires a filetype; therefore, just append the suffix "/*.*" to guarantee a filetype, then
			// remove the suffix from the result. This way clients can request a url w/out a filetype. This should be
			// rare, but it maintains backcompat for the v1.x line (note: dojo.moduleUrl will be removed in v2.0).
			// Notice * is an illegal filename so it won't conflict with any real path map that may exist the paths config.
			var result = null;
			if(module){
				result = require.toUrl(module.replace(/\./g, "/") + (url ? ("/" + url) : "") + "/*.*").replace(/\/\*\.\*/, "") + (url ? "" : "/");
			}
			return result;
		};
	}

	dojo._hasResource = {}; // for backward compatibility with layers built with 1.6 tooling

	return dojo;
});

//>>>filename: /Users/aaron/Develop/loader-demo-with-builder/app/dojo/sniff.js, mid: dojo/sniff
define("dojo/sniff",["dojo/has"],function(has){
	// module:
	//		dojo/sniff

	/*=====
	return function(){
		// summary:
		//		This module sets has() flags based on the current browser.
		//		It returns the has() function.
	};
	=====*/

	if(has("host-browser")){
		var n = navigator,
			dua = n.userAgent,
			dav = n.appVersion,
			tv = parseFloat(dav);

		has.add("air", dua.indexOf("AdobeAIR") >= 0);
		has.add("msapp", parseFloat(dua.split("MSAppHost/")[1]) || undefined);
		has.add("khtml", dav.indexOf("Konqueror") >= 0 ? tv : undefined);
		has.add("webkit", parseFloat(dua.split("WebKit/")[1]) || undefined);
		has.add("chrome", parseFloat(dua.split("Chrome/")[1]) || undefined);
		has.add("safari", dav.indexOf("Safari")>=0 && !has("chrome") ? parseFloat(dav.split("Version/")[1]) : undefined);
		has.add("mac", dav.indexOf("Macintosh") >= 0);
		has.add("quirks", document.compatMode == "BackCompat");
		if(dua.match(/(iPhone|iPod|iPad)/)){
			var p = RegExp.$1.replace(/P/, "p");
			var v = dua.match(/OS ([\d_]+)/) ? RegExp.$1 : "1";
			var os = parseFloat(v.replace(/_/, ".").replace(/_/g, ""));
			has.add(p, os);		// "iphone", "ipad" or "ipod"
			has.add("ios", os);
		}
		has.add("android", parseFloat(dua.split("Android ")[1]) || undefined);
		has.add("bb", (dua.indexOf("BlackBerry") >= 0 || dua.indexOf("BB10") >= 0) && parseFloat(dua.split("Version/")[1]) || undefined);
		has.add("trident", parseFloat(dav.split("Trident/")[1]) || undefined);

		has.add("svg", typeof SVGAngle !== "undefined");

		if(!has("webkit")){
			// Opera
			if(dua.indexOf("Opera") >= 0){
				// see http://dev.opera.com/articles/view/opera-ua-string-changes and http://www.useragentstring.com/pages/Opera/
				// 9.8 has both styles; <9.8, 9.9 only old style
				has.add("opera", tv >= 9.8 ? parseFloat(dua.split("Version/")[1]) || tv : tv);
			}

			// Mozilla and firefox
			if(dua.indexOf("Gecko") >= 0 && !has("khtml") && !has("webkit") && !has("trident")){
				has.add("mozilla", tv);
			}
			if(has("mozilla")){
				//We really need to get away from this. Consider a sane isGecko approach for the future.
				has.add("ff", parseFloat(dua.split("Firefox/")[1] || dua.split("Minefield/")[1]) || undefined);
			}

			// IE
			if(document.all && !has("opera")){
				var isIE = parseFloat(dav.split("MSIE ")[1]) || undefined;

				//In cases where the page has an HTTP header or META tag with
				//X-UA-Compatible, then it is in emulation mode.
				//Make sure isIE reflects the desired version.
				//document.documentMode of 5 means quirks mode.
				//Only switch the value if documentMode's major version
				//is different from isIE's major version.
				var mode = document.documentMode;
				if(mode && mode != 5 && Math.floor(isIE) != mode){
					isIE = mode;
				}

				has.add("ie", isIE);
			}

			// Wii
			has.add("wii", typeof opera != "undefined" && opera.wiiremote);
		}
	}

	return has;
});

//>>>filename: /Users/aaron/Develop/loader-demo-with-builder/app/dojo/_base/lang.js, mid: dojo/_base/lang
define("dojo/_base/lang",["dojo/_base/kernel","dojo/has","dojo/sniff"],function(dojo, has){
	// module:
	//		dojo/_base/lang

	has.add("bug-for-in-skips-shadowed", function(){
		// if true, the for-in iterator skips object properties that exist in Object's prototype (IE 6 - ?)
		for(var i in {toString: 1}){
			return 0;
		}
		return 1;
	});

	// Helper methods
	var _extraNames =
			has("bug-for-in-skips-shadowed") ?
				"hasOwnProperty.valueOf.isPrototypeOf.propertyIsEnumerable.toLocaleString.toString.constructor".split(".") : [],

		_extraLen = _extraNames.length,

		getProp = function(/*Array*/parts, /*Boolean*/create, /*Object*/context){
			if(!context){
				if(parts[0] && dojo.scopeMap[parts[0]]) {
					// Voodoo code from the old days where "dojo" or "dijit" maps to some special object
					// rather than just window.dojo
					context = dojo.scopeMap[parts.shift()][1];
				}else{
					context = dojo.global;
				}
			}

			try{
				for(var i = 0; i < parts.length; i++){
					var p = parts[i];
					if(!(p in context)){
						if(create){
							context[p] = {};
						}else{
							return;		// return undefined
						}
					}
					context = context[p];
				}
				return context; // mixed
			}catch(e){
				// "p in context" throws an exception when context is a number, boolean, etc. rather than an object,
				// so in that corner case just return undefined (by having no return statement)
			}
		},

		opts = Object.prototype.toString,

		efficient = function(obj, offset, startWith){
			return (startWith||[]).concat(Array.prototype.slice.call(obj, offset||0));
		},

		_pattern = /\{([^\}]+)\}/g;

	// Module export
	var lang = {
		// summary:
		//		This module defines Javascript language extensions.

		// _extraNames: String[]
		//		Lists property names that must be explicitly processed during for-in iteration
		//		in environments that have has("bug-for-in-skips-shadowed") true.
		_extraNames:_extraNames,

		_mixin: function(dest, source, copyFunc){
			// summary:
			//		Copies/adds all properties of source to dest; returns dest.
			// dest: Object
			//		The object to which to copy/add all properties contained in source.
			// source: Object
			//		The object from which to draw all properties to copy into dest.
			// copyFunc: Function?
			//		The process used to copy/add a property in source; defaults to the Javascript assignment operator.
			// returns:
			//		dest, as modified
			// description:
			//		All properties, including functions (sometimes termed "methods"), excluding any non-standard extensions
			//		found in Object.prototype, are copied/added to dest. Copying/adding each particular property is
			//		delegated to copyFunc (if any); copyFunc defaults to the Javascript assignment operator if not provided.
			//		Notice that by default, _mixin executes a so-called "shallow copy" and aggregate types are copied/added by reference.
			var name, s, i, empty = {};
			for(name in source){
				// the (!(name in empty) || empty[name] !== s) condition avoids copying properties in "source"
				// inherited from Object.prototype.	 For example, if dest has a custom toString() method,
				// don't overwrite it with the toString() method that source inherited from Object.prototype
				s = source[name];
				if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
					dest[name] = copyFunc ? copyFunc(s) : s;
				}
			}

			if(has("bug-for-in-skips-shadowed")){
				if(source){
					for(i = 0; i < _extraLen; ++i){
						name = _extraNames[i];
						s = source[name];
						if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
							dest[name] = copyFunc ? copyFunc(s) : s;
						}
					}
				}
			}

			return dest; // Object
		},

		mixin: function(dest, sources){
			// summary:
			//		Copies/adds all properties of one or more sources to dest; returns dest.
			// dest: Object
			//		The object to which to copy/add all properties contained in source. If dest is falsy, then
			//		a new object is manufactured before copying/adding properties begins.
			// sources: Object...
			//		One of more objects from which to draw all properties to copy into dest. sources are processed
			//		left-to-right and if more than one of these objects contain the same property name, the right-most
			//		value "wins".
			// returns: Object
			//		dest, as modified
			// description:
			//		All properties, including functions (sometimes termed "methods"), excluding any non-standard extensions
			//		found in Object.prototype, are copied/added from sources to dest. sources are processed left to right.
			//		The Javascript assignment operator is used to copy/add each property; therefore, by default, mixin
			//		executes a so-called "shallow copy" and aggregate types are copied/added by reference.
			// example:
			//		make a shallow copy of an object
			//	|	var copy = lang.mixin({}, source);
			// example:
			//		many class constructors often take an object which specifies
			//		values to be configured on the object. In this case, it is
			//		often simplest to call `lang.mixin` on the `this` object:
			//	|	declare("acme.Base", null, {
			//	|		constructor: function(properties){
			//	|			// property configuration:
			//	|			lang.mixin(this, properties);
			//	|
			//	|			console.log(this.quip);
			//	|			//	...
			//	|		},
			//	|		quip: "I wasn't born yesterday, you know - I've seen movies.",
			//	|		// ...
			//	|	});
			//	|
			//	|	// create an instance of the class and configure it
			//	|	var b = new acme.Base({quip: "That's what it does!" });
			// example:
			//		copy in properties from multiple objects
			//	|	var flattened = lang.mixin(
			//	|		{
			//	|			name: "Frylock",
			//	|			braces: true
			//	|		},
			//	|		{
			//	|			name: "Carl Brutanananadilewski"
			//	|		}
			//	|	);
			//	|
			//	|	// will print "Carl Brutanananadilewski"
			//	|	console.log(flattened.name);
			//	|	// will print "true"
			//	|	console.log(flattened.braces);

			if(!dest){ dest = {}; }
			for(var i = 1, l = arguments.length; i < l; i++){
				lang._mixin(dest, arguments[i]);
			}
			return dest; // Object
		},

		setObject: function(name, value, context){
			// summary:
			//		Set a property from a dot-separated string, such as "A.B.C"
			// description:
			//		Useful for longer api chains where you have to test each object in
			//		the chain, or when you have an object reference in string format.
			//		Objects are created as needed along `path`. Returns the passed
			//		value if setting is successful or `undefined` if not.
			// name: String
			//		Path to a property, in the form "A.B.C".
			// value: anything
			//		value or object to place at location given by name
			// context: Object?
			//		Optional. Object to use as root of path. Defaults to
			//		`dojo.global`.
			// example:
			//		set the value of `foo.bar.baz`, regardless of whether
			//		intermediate objects already exist:
			//	| lang.setObject("foo.bar.baz", value);
			// example:
			//		without `lang.setObject`, we often see code like this:
			//	| // ensure that intermediate objects are available
			//	| if(!obj["parent"]){ obj.parent = {}; }
			//	| if(!obj.parent["child"]){ obj.parent.child = {}; }
			//	| // now we can safely set the property
			//	| obj.parent.child.prop = "some value";
			//		whereas with `lang.setObject`, we can shorten that to:
			//	| lang.setObject("parent.child.prop", "some value", obj);

			var parts = name.split("."), p = parts.pop(), obj = getProp(parts, true, context);
			return obj && p ? (obj[p] = value) : undefined; // Object
		},

		getObject: function(name, create, context){
			// summary:
			//		Get a property from a dot-separated string, such as "A.B.C"
			// description:
			//		Useful for longer api chains where you have to test each object in
			//		the chain, or when you have an object reference in string format.
			// name: String
			//		Path to an property, in the form "A.B.C".
			// create: Boolean?
			//		Optional. Defaults to `false`. If `true`, Objects will be
			//		created at any point along the 'path' that is undefined.
			// context: Object?
			//		Optional. Object to use as root of path. Defaults to
			//		'dojo.global'. Null may be passed.
			return getProp(name ? name.split(".") : [], create, context); // Object
		},

		exists: function(name, obj){
			// summary:
			//		determine if an object supports a given method
			// description:
			//		useful for longer api chains where you have to test each object in
			//		the chain. Useful for object and method detection.
			// name: String
			//		Path to an object, in the form "A.B.C".
			// obj: Object?
			//		Object to use as root of path. Defaults to
			//		'dojo.global'. Null may be passed.
			// example:
			//	| // define an object
			//	| var foo = {
			//	|		bar: { }
			//	| };
			//	|
			//	| // search the global scope
			//	| lang.exists("foo.bar"); // true
			//	| lang.exists("foo.bar.baz"); // false
			//	|
			//	| // search from a particular scope
			//	| lang.exists("bar", foo); // true
			//	| lang.exists("bar.baz", foo); // false
			return lang.getObject(name, false, obj) !== undefined; // Boolean
		},

		// Crockford (ish) functions

		isString: function(it){
			// summary:
			//		Return true if it is a String
			// it: anything
			//		Item to test.
			return (typeof it == "string" || it instanceof String); // Boolean
		},

		isArray: function(it){
			// summary:
			//		Return true if it is an Array.
			//		Does not work on Arrays created in other windows.
			// it: anything
			//		Item to test.
			return it && (it instanceof Array || typeof it == "array"); // Boolean
		},

		isFunction: function(it){
			// summary:
			//		Return true if it is a Function
			// it: anything
			//		Item to test.
			return opts.call(it) === "[object Function]";
		},

		isObject: function(it){
			// summary:
			//		Returns true if it is a JavaScript object (or an Array, a Function
			//		or null)
			// it: anything
			//		Item to test.
			return it !== undefined &&
				(it === null || typeof it == "object" || lang.isArray(it) || lang.isFunction(it)); // Boolean
		},

		isArrayLike: function(it){
			// summary:
			//		similar to isArray() but more permissive
			// it: anything
			//		Item to test.
			// returns:
			//		If it walks like a duck and quacks like a duck, return `true`
			// description:
			//		Doesn't strongly test for "arrayness".  Instead, settles for "isn't
			//		a string or number and has a length property". Arguments objects
			//		and DOM collections will return true when passed to
			//		isArrayLike(), but will return false when passed to
			//		isArray().
			return it && it !== undefined && // Boolean
				// keep out built-in constructors (Number, String, ...) which have length
				// properties
				!lang.isString(it) && !lang.isFunction(it) &&
				!(it.tagName && it.tagName.toLowerCase() == 'form') &&
				(lang.isArray(it) || isFinite(it.length));
		},

		isAlien: function(it){
			// summary:
			//		Returns true if it is a built-in function or some other kind of
			//		oddball that *should* report as a function but doesn't
			return it && !lang.isFunction(it) && /\{\s*\[native code\]\s*\}/.test(String(it)); // Boolean
		},

		extend: function(ctor, props){
			// summary:
			//		Adds all properties and methods of props to constructor's
			//		prototype, making them available to all instances created with
			//		constructor.
			// ctor: Object
			//		Target constructor to extend.
			// props: Object
			//		One or more objects to mix into ctor.prototype
			for(var i=1, l=arguments.length; i<l; i++){
				lang._mixin(ctor.prototype, arguments[i]);
			}
			return ctor; // Object
		},

		_hitchArgs: function(scope, method){
			var pre = lang._toArray(arguments, 2);
			var named = lang.isString(method);
			return function(){
				// arrayify arguments
				var args = lang._toArray(arguments);
				// locate our method
				var f = named ? (scope||dojo.global)[method] : method;
				// invoke with collected args
				return f && f.apply(scope || this, pre.concat(args)); // mixed
			}; // Function
		},

		hitch: function(scope, method){
			// summary:
			//		Returns a function that will only ever execute in the given scope.
			//		This allows for easy use of object member functions
			//		in callbacks and other places in which the "this" keyword may
			//		otherwise not reference the expected scope.
			//		Any number of default positional arguments may be passed as parameters
			//		beyond "method".
			//		Each of these values will be used to "placehold" (similar to curry)
			//		for the hitched function.
			// scope: Object
			//		The scope to use when method executes. If method is a string,
			//		scope is also the object containing method.
			// method: Function|String...
			//		A function to be hitched to scope, or the name of the method in
			//		scope to be hitched.
			// example:
			//	|	lang.hitch(foo, "bar")();
			//		runs foo.bar() in the scope of foo
			// example:
			//	|	lang.hitch(foo, myFunction);
			//		returns a function that runs myFunction in the scope of foo
			// example:
			//		Expansion on the default positional arguments passed along from
			//		hitch. Passed args are mixed first, additional args after.
			//	|	var foo = { bar: function(a, b, c){ console.log(a, b, c); } };
			//	|	var fn = lang.hitch(foo, "bar", 1, 2);
			//	|	fn(3); // logs "1, 2, 3"
			// example:
			//	|	var foo = { bar: 2 };
			//	|	lang.hitch(foo, function(){ this.bar = 10; })();
			//		execute an anonymous function in scope of foo
			if(arguments.length > 2){
				return lang._hitchArgs.apply(dojo, arguments); // Function
			}
			if(!method){
				method = scope;
				scope = null;
			}
			if(lang.isString(method)){
				scope = scope || dojo.global;
				if(!scope[method]){ throw(['lang.hitch: scope["', method, '"] is null (scope="', scope, '")'].join('')); }
				return function(){ return scope[method].apply(scope, arguments || []); }; // Function
			}
			return !scope ? method : function(){ return method.apply(scope, arguments || []); }; // Function
		},

		delegate: (function(){
			// boodman/crockford delegation w/ cornford optimization
			function TMP(){}
			return function(obj, props){
				TMP.prototype = obj;
				var tmp = new TMP();
				TMP.prototype = null;
				if(props){
					lang._mixin(tmp, props);
				}
				return tmp; // Object
			};
		})(),
		/*=====
		delegate: function(obj, props){
			// summary:
			//		Returns a new object which "looks" to obj for properties which it
			//		does not have a value for. Optionally takes a bag of properties to
			//		seed the returned object with initially.
			// description:
			//		This is a small implementation of the Boodman/Crockford delegation
			//		pattern in JavaScript. An intermediate object constructor mediates
			//		the prototype chain for the returned object, using it to delegate
			//		down to obj for property lookup when object-local lookup fails.
			//		This can be thought of similarly to ES4's "wrap", save that it does
			//		not act on types but rather on pure objects.
			// obj: Object
			//		The object to delegate to for properties not found directly on the
			//		return object or in props.
			// props: Object...
			//		an object containing properties to assign to the returned object
			// returns:
			//		an Object of anonymous type
			// example:
			//	|	var foo = { bar: "baz" };
			//	|	var thinger = lang.delegate(foo, { thud: "xyzzy"});
			//	|	thinger.bar == "baz"; // delegated to foo
			//	|	foo.thud == undefined; // by definition
			//	|	thinger.thud == "xyzzy"; // mixed in from props
			//	|	foo.bar = "thonk";
			//	|	thinger.bar == "thonk"; // still delegated to foo's bar
		},
		=====*/

		_toArray: has("ie") ?
			(function(){
				function slow(obj, offset, startWith){
					var arr = startWith||[];
					for(var x = offset || 0; x < obj.length; x++){
						arr.push(obj[x]);
					}
					return arr;
				}
				return function(obj){
					return ((obj.item) ? slow : efficient).apply(this, arguments);
				};
			})() : efficient,
		/*=====
		 _toArray: function(obj, offset, startWith){
			 // summary:
			 //		Converts an array-like object (i.e. arguments, DOMCollection) to an
			 //		array. Returns a new Array with the elements of obj.
			 // obj: Object
			 //		the object to "arrayify". We expect the object to have, at a
			 //		minimum, a length property which corresponds to integer-indexed
			 //		properties.
			 // offset: Number?
			 //		the location in obj to start iterating from. Defaults to 0.
			 //		Optional.
			 // startWith: Array?
			 //		An array to pack with the properties of obj. If provided,
			 //		properties in obj are appended at the end of startWith and
			 //		startWith is the returned array.
		 },
		 =====*/

		partial: function(/*Function|String*/ method /*, ...*/){
			// summary:
			//		similar to hitch() except that the scope object is left to be
			//		whatever the execution context eventually becomes.
			// description:
			//		Calling lang.partial is the functional equivalent of calling:
			//		|	lang.hitch(null, funcName, ...);
			// method:
			//		The function to "wrap"
			var arr = [ null ];
			return lang.hitch.apply(dojo, arr.concat(lang._toArray(arguments))); // Function
		},

		clone: function(/*anything*/ src){
			// summary:
			//		Clones objects (including DOM nodes) and all children.
			//		Warning: do not clone cyclic structures.
			// src:
			//		The object to clone
			if(!src || typeof src != "object" || lang.isFunction(src)){
				// null, undefined, any non-object, or function
				return src;	// anything
			}
			if(src.nodeType && "cloneNode" in src){
				// DOM Node
				return src.cloneNode(true); // Node
			}
			if(src instanceof Date){
				// Date
				return new Date(src.getTime());	// Date
			}
			if(src instanceof RegExp){
				// RegExp
				return new RegExp(src);   // RegExp
			}
			var r, i, l;
			if(lang.isArray(src)){
				// array
				r = [];
				for(i = 0, l = src.length; i < l; ++i){
					if(i in src){
						r.push(lang.clone(src[i]));
					}
				}
				// we don't clone functions for performance reasons
				//		}else if(d.isFunction(src)){
				//			// function
				//			r = function(){ return src.apply(this, arguments); };
			}else{
				// generic objects
				r = src.constructor ? new src.constructor() : {};
			}
			return lang._mixin(r, src, lang.clone);
		},


		trim: String.prototype.trim ?
			function(str){ return str.trim(); } :
			function(str){ return str.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); },
		/*=====
		 trim: function(str){
			 // summary:
			 //		Trims whitespace from both sides of the string
			 // str: String
			 //		String to be trimmed
			 // returns: String
			 //		Returns the trimmed string
			 // description:
			 //		This version of trim() was selected for inclusion into the base due
			 //		to its compact size and relatively good performance
			 //		(see [Steven Levithan's blog](http://blog.stevenlevithan.com/archives/faster-trim-javascript)
			 //		Uses String.prototype.trim instead, if available.
			 //		The fastest but longest version of this function is located at
			 //		lang.string.trim()
		 },
		 =====*/

		replace: function(tmpl, map, pattern){
			// summary:
			//		Performs parameterized substitutions on a string. Throws an
			//		exception if any parameter is unmatched.
			// tmpl: String
			//		String to be used as a template.
			// map: Object|Function
			//		If an object, it is used as a dictionary to look up substitutions.
			//		If a function, it is called for every substitution with following parameters:
			//		a whole match, a name, an offset, and the whole template
			//		string (see https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/String/replace
			//		for more details).
			// pattern: RegEx?
			//		Optional regular expression objects that overrides the default pattern.
			//		Must be global and match one item. The default is: /\{([^\}]+)\}/g,
			//		which matches patterns like that: "{xxx}", where "xxx" is any sequence
			//		of characters, which doesn't include "}".
			// returns: String
			//		Returns the substituted string.
			// example:
			//	|	// uses a dictionary for substitutions:
			//	|	lang.replace("Hello, {name.first} {name.last} AKA {nick}!",
			//	|		{
			//	|			nick: "Bob",
			//	|			name: {
			//	|				first:	"Robert",
			//	|				middle: "X",
			//	|				last:		"Cringely"
			//	|			}
			//	|		});
			//	|	// returns: Hello, Robert Cringely AKA Bob!
			// example:
			//	|	// uses an array for substitutions:
			//	|	lang.replace("Hello, {0} {2}!",
			//	|		["Robert", "X", "Cringely"]);
			//	|	// returns: Hello, Robert Cringely!
			// example:
			//	|	// uses a function for substitutions:
			//	|	function sum(a){
			//	|		var t = 0;
			//	|		arrayforEach(a, function(x){ t += x; });
			//	|		return t;
			//	|	}
			//	|	lang.replace(
			//	|		"{count} payments averaging {avg} USD per payment.",
			//	|		lang.hitch(
			//	|			{ payments: [11, 16, 12] },
			//	|			function(_, key){
			//	|				switch(key){
			//	|					case "count": return this.payments.length;
			//	|					case "min":		return Math.min.apply(Math, this.payments);
			//	|					case "max":		return Math.max.apply(Math, this.payments);
			//	|					case "sum":		return sum(this.payments);
			//	|					case "avg":		return sum(this.payments) / this.payments.length;
			//	|				}
			//	|			}
			//	|		)
			//	|	);
			//	|	// prints: 3 payments averaging 13 USD per payment.
			// example:
			//	|	// uses an alternative PHP-like pattern for substitutions:
			//	|	lang.replace("Hello, ${0} ${2}!",
			//	|		["Robert", "X", "Cringely"], /\$\{([^\}]+)\}/g);
			//	|	// returns: Hello, Robert Cringely!

			return tmpl.replace(pattern || _pattern, lang.isFunction(map) ?
				map : function(_, k){ return lang.getObject(k, false, map); });
		}
	};

	has("extend-dojo") && lang.mixin(dojo, lang);

	return lang;
});


//>>>filename: /Users/aaron/Develop/loader-demo-with-builder/app/dojo/_base/declare.js, mid: dojo/_base/declare
define("dojo/_base/declare",["dojo/_base/kernel","dojo/has","dojo/_base/lang"],function(dojo, has, lang){
	// module:
	//		dojo/_base/declare

	var mix = lang.mixin, op = Object.prototype, opts = op.toString,
		xtor = new Function, counter = 0, cname = "constructor";

	function err(msg, cls){ throw new Error("declare" + (cls ? " " + cls : "") + ": " + msg); }

	// C3 Method Resolution Order (see http://www.python.org/download/releases/2.3/mro/)
	function c3mro(bases, className){
		var result = [], roots = [{cls: 0, refs: []}], nameMap = {}, clsCount = 1,
			l = bases.length, i = 0, j, lin, base, top, proto, rec, name, refs;

		// build a list of bases naming them if needed
		for(; i < l; ++i){
			base = bases[i];
			if(!base){
				err("mixin #" + i + " is unknown. Did you use dojo.require to pull it in?", className);
			}else if(opts.call(base) != "[object Function]"){
				err("mixin #" + i + " is not a callable constructor.", className);
			}
			lin = base._meta ? base._meta.bases : [base];
			top = 0;
			// add bases to the name map
			for(j = lin.length - 1; j >= 0; --j){
				proto = lin[j].prototype;
				if(!proto.hasOwnProperty("declaredClass")){
					proto.declaredClass = "uniqName_" + (counter++);
				}
				name = proto.declaredClass;
				if(!nameMap.hasOwnProperty(name)){
					nameMap[name] = {count: 0, refs: [], cls: lin[j]};
					++clsCount;
				}
				rec = nameMap[name];
				if(top && top !== rec){
					rec.refs.push(top);
					++top.count;
				}
				top = rec;
			}
			++top.count;
			roots[0].refs.push(top);
		}

		// remove classes without external references recursively
		while(roots.length){
			top = roots.pop();
			result.push(top.cls);
			--clsCount;
			// optimization: follow a single-linked chain
			while(refs = top.refs, refs.length == 1){
				top = refs[0];
				if(!top || --top.count){
					// branch or end of chain => do not end to roots
					top = 0;
					break;
				}
				result.push(top.cls);
				--clsCount;
			}
			if(top){
				// branch
				for(i = 0, l = refs.length; i < l; ++i){
					top = refs[i];
					if(!--top.count){
						roots.push(top);
					}
				}
			}
		}
		if(clsCount){
			err("can't build consistent linearization", className);
		}

		// calculate the superclass offset
		base = bases[0];
		result[0] = base ?
			base._meta && base === result[result.length - base._meta.bases.length] ?
				base._meta.bases.length : 1 : 0;

		return result;
	}

	function inherited(args, a, f){
		var name, chains, bases, caller, meta, base, proto, opf, pos,
			cache = this._inherited = this._inherited || {};

		// crack arguments
		if(typeof args == "string"){
			name = args;
			args = a;
			a = f;
		}
		f = 0;

		caller = args.callee;
		name = name || caller.nom;
		if(!name){
			err("can't deduce a name to call inherited()", this.declaredClass);
		}

		meta = this.constructor._meta;
		bases = meta.bases;

		pos = cache.p;
		if(name != cname){
			// method
			if(cache.c !== caller){
				// cache bust
				pos = 0;
				base = bases[0];
				meta = base._meta;
				if(meta.hidden[name] !== caller){
					// error detection
					chains = meta.chains;
					if(chains && typeof chains[name] == "string"){
						err("calling chained method with inherited: " + name, this.declaredClass);
					}
					// find caller
					do{
						meta = base._meta;
						proto = base.prototype;
						if(meta && (proto[name] === caller && proto.hasOwnProperty(name) || meta.hidden[name] === caller)){
							break;
						}
					}while(base = bases[++pos]); // intentional assignment
					pos = base ? pos : -1;
				}
			}
			// find next
			base = bases[++pos];
			if(base){
				proto = base.prototype;
				if(base._meta && proto.hasOwnProperty(name)){
					f = proto[name];
				}else{
					opf = op[name];
					do{
						proto = base.prototype;
						f = proto[name];
						if(f && (base._meta ? proto.hasOwnProperty(name) : f !== opf)){
							break;
						}
					}while(base = bases[++pos]); // intentional assignment
				}
			}
			f = base && f || op[name];
		}else{
			// constructor
			if(cache.c !== caller){
				// cache bust
				pos = 0;
				meta = bases[0]._meta;
				if(meta && meta.ctor !== caller){
					// error detection
					chains = meta.chains;
					if(!chains || chains.constructor !== "manual"){
						err("calling chained constructor with inherited", this.declaredClass);
					}
					// find caller
					while(base = bases[++pos]){ // intentional assignment
						meta = base._meta;
						if(meta && meta.ctor === caller){
							break;
						}
					}
					pos = base ? pos : -1;
				}
			}
			// find next
			while(base = bases[++pos]){	// intentional assignment
				meta = base._meta;
				f = meta ? meta.ctor : base;
				if(f){
					break;
				}
			}
			f = base && f;
		}

		// cache the found super method
		cache.c = f;
		cache.p = pos;

		// now we have the result
		if(f){
			return a === true ? f : f.apply(this, a || args);
		}
		// intentionally no return if a super method was not found
	}

	function getInherited(name, args){
		if(typeof name == "string"){
			return this.__inherited(name, args, true);
		}
		return this.__inherited(name, true);
	}

	function inherited__debug(args, a1, a2){
		var f = this.getInherited(args, a1);
		if(f){ return f.apply(this, a2 || a1 || args); }
		// intentionally no return if a super method was not found
	}

	var inheritedImpl = dojo.config.isDebug ? inherited__debug : inherited;

	// emulation of "instanceof"
	function isInstanceOf(cls){
		var bases = this.constructor._meta.bases;
		for(var i = 0, l = bases.length; i < l; ++i){
			if(bases[i] === cls){
				return true;
			}
		}
		return this instanceof cls;
	}

	function mixOwn(target, source){
		// add props adding metadata for incoming functions skipping a constructor
		for(var name in source){
			if(name != cname && source.hasOwnProperty(name)){
				target[name] = source[name];
			}
		}
		if(has("bug-for-in-skips-shadowed")){
			for(var extraNames= lang._extraNames, i= extraNames.length; i;){
				name = extraNames[--i];
				if(name != cname && source.hasOwnProperty(name)){
					  target[name] = source[name];
				}
			}
		}
	}

	// implementation of safe mixin function
	function safeMixin(target, source){
		// summary:
		//		Mix in properties skipping a constructor and decorating functions
		//		like it is done by declare().
		// target: Object
		//		Target object to accept new properties.
		// source: Object
		//		Source object for new properties.
		// description:
		//		This function is used to mix in properties like lang.mixin does,
		//		but it skips a constructor property and decorates functions like
		//		declare() does.
		//
		//		It is meant to be used with classes and objects produced with
		//		declare. Functions mixed in with dojo.safeMixin can use
		//		this.inherited() like normal methods.
		//
		//		This function is used to implement extend() method of a constructor
		//		produced with declare().
		//
		// example:
		//	|	var A = declare(null, {
		//	|		m1: function(){
		//	|			console.log("A.m1");
		//	|		},
		//	|		m2: function(){
		//	|			console.log("A.m2");
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		m1: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("B.m1");
		//	|		}
		//	|	});
		//	|	B.extend({
		//	|		m2: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("B.m2");
		//	|		}
		//	|	});
		//	|	var x = new B();
		//	|	dojo.safeMixin(x, {
		//	|		m1: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("X.m1");
		//	|		},
		//	|		m2: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("X.m2");
		//	|		}
		//	|	});
		//	|	x.m2();
		//	|	// prints:
		//	|	// A.m1
		//	|	// B.m1
		//	|	// X.m1

		var name, t;
		// add props adding metadata for incoming functions skipping a constructor
		for(name in source){
			t = source[name];
			if((t !== op[name] || !(name in op)) && name != cname){
				if(opts.call(t) == "[object Function]"){
					// non-trivial function method => attach its name
					t.nom = name;
				}
				target[name] = t;
			}
		}
		if(has("bug-for-in-skips-shadowed")){
			for(var extraNames= lang._extraNames, i= extraNames.length; i;){
				name = extraNames[--i];
				t = source[name];
				if((t !== op[name] || !(name in op)) && name != cname){
					if(opts.call(t) == "[object Function]"){
						// non-trivial function method => attach its name
						  t.nom = name;
					}
					target[name] = t;
				}
			}
		}
		return target;
	}

	function extend(source){
		declare.safeMixin(this.prototype, source);
		return this;
	}

    function createSubclass(mixins, props){
        // crack parameters
        if(!(mixins instanceof Array || typeof mixins == 'function')){
            props = mixins;
            mixins = undefined;
        }

        props = props || {};
        mixins = mixins || [];

        return declare([this].concat(mixins), props);
    }

	// chained constructor compatible with the legacy declare()
	function chainedConstructor(bases, ctorSpecial){
		return function(){
			var a = arguments, args = a, a0 = a[0], f, i, m,
				l = bases.length, preArgs;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) call two types of the preamble
			if(ctorSpecial && (a0 && a0.preamble || this.preamble)){
				// full blown ritual
				preArgs = new Array(bases.length);
				// prepare parameters
				preArgs[0] = a;
				for(i = 0;;){
					// process the preamble of the 1st argument
					a0 = a[0];
					if(a0){
						f = a0.preamble;
						if(f){
							a = f.apply(this, a) || a;
						}
					}
					// process the preamble of this class
					f = bases[i].prototype;
					f = f.hasOwnProperty("preamble") && f.preamble;
					if(f){
						a = f.apply(this, a) || a;
					}
					// one peculiarity of the preamble:
					// it is called if it is not needed,
					// e.g., there is no constructor to call
					// let's watch for the last constructor
					// (see ticket #9795)
					if(++i == l){
						break;
					}
					preArgs[i] = a;
				}
			}
			// 2) call all non-trivial constructors using prepared arguments
			for(i = l - 1; i >= 0; --i){
				f = bases[i];
				m = f._meta;
				f = m ? m.ctor : f;
				if(f){
					f.apply(this, preArgs ? preArgs[i] : a);
				}
			}
			// 3) continue the original ritual: call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, args);
			}
		};
	}


	// chained constructor compatible with the legacy declare()
	function singleConstructor(ctor, ctorSpecial){
		return function(){
			var a = arguments, t = a, a0 = a[0], f;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) call two types of the preamble
			if(ctorSpecial){
				// full blown ritual
				if(a0){
					// process the preamble of the 1st argument
					f = a0.preamble;
					if(f){
						t = f.apply(this, t) || t;
					}
				}
				f = this.preamble;
				if(f){
					// process the preamble of this class
					f.apply(this, t);
					// one peculiarity of the preamble:
					// it is called even if it is not needed,
					// e.g., there is no constructor to call
					// let's watch for the last constructor
					// (see ticket #9795)
				}
			}
			// 2) call a constructor
			if(ctor){
				ctor.apply(this, a);
			}
			// 3) continue the original ritual: call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, a);
			}
		};
	}

	// plain vanilla constructor (can use inherited() to call its base constructor)
	function simpleConstructor(bases){
		return function(){
			var a = arguments, i = 0, f, m;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) do not call the preamble
			// 2) call the top constructor (it can use this.inherited())
			for(; f = bases[i]; ++i){ // intentional assignment
				m = f._meta;
				f = m ? m.ctor : f;
				if(f){
					f.apply(this, a);
					break;
				}
			}
			// 3) call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, a);
			}
		};
	}

	function chain(name, bases, reversed){
		return function(){
			var b, m, f, i = 0, step = 1;
			if(reversed){
				i = bases.length - 1;
				step = -1;
			}
			for(; b = bases[i]; i += step){ // intentional assignment
				m = b._meta;
				f = (m ? m.hidden : b.prototype)[name];
				if(f){
					f.apply(this, arguments);
				}
			}
		};
	}

	// forceNew(ctor)
	// return a new object that inherits from ctor.prototype but
	// without actually running ctor on the object.
	function forceNew(ctor){
		// create object with correct prototype using a do-nothing
		// constructor
		xtor.prototype = ctor.prototype;
		var t = new xtor;
		xtor.prototype = null;	// clean up
		return t;
	}

	// applyNew(args)
	// just like 'new ctor()' except that the constructor and its arguments come
	// from args, which must be an array or an arguments object
	function applyNew(args){
		// create an object with ctor's prototype but without
		// calling ctor on it.
		var ctor = args.callee, t = forceNew(ctor);
		// execute the real constructor on the new object
		ctor.apply(t, args);
		return t;
	}

	function declare(className, superclass, props){
		// summary:
		//		Create a feature-rich constructor from compact notation.
		// className: String?
		//		The optional name of the constructor (loosely, a "class")
		//		stored in the "declaredClass" property in the created prototype.
		//		It will be used as a global name for a created constructor.
		// superclass: Function|Function[]
		//		May be null, a Function, or an Array of Functions. This argument
		//		specifies a list of bases (the left-most one is the most deepest
		//		base).
		// props: Object
		//		An object whose properties are copied to the created prototype.
		//		Add an instance-initialization function by making it a property
		//		named "constructor".
		// returns: dojo/_base/declare.__DeclareCreatedObject
		//		New constructor function.
		// description:
		//		Create a constructor using a compact notation for inheritance and
		//		prototype extension.
		//
		//		Mixin ancestors provide a type of multiple inheritance.
		//		Prototypes of mixin ancestors are copied to the new class:
		//		changes to mixin prototypes will not affect classes to which
		//		they have been mixed in.
		//
		//		Ancestors can be compound classes created by this version of
		//		declare(). In complex cases all base classes are going to be
		//		linearized according to C3 MRO algorithm
		//		(see http://www.python.org/download/releases/2.3/mro/ for more
		//		details).
		//
		//		"className" is cached in "declaredClass" property of the new class,
		//		if it was supplied. The immediate super class will be cached in
		//		"superclass" property of the new class.
		//
		//		Methods in "props" will be copied and modified: "nom" property
		//		(the declared name of the method) will be added to all copied
		//		functions to help identify them for the internal machinery. Be
		//		very careful, while reusing methods: if you use the same
		//		function under different names, it can produce errors in some
		//		cases.
		//
		//		It is possible to use constructors created "manually" (without
		//		declare()) as bases. They will be called as usual during the
		//		creation of an instance, their methods will be chained, and even
		//		called by "this.inherited()".
		//
		//		Special property "-chains-" governs how to chain methods. It is
		//		a dictionary, which uses method names as keys, and hint strings
		//		as values. If a hint string is "after", this method will be
		//		called after methods of its base classes. If a hint string is
		//		"before", this method will be called before methods of its base
		//		classes.
		//
		//		If "constructor" is not mentioned in "-chains-" property, it will
		//		be chained using the legacy mode: using "after" chaining,
		//		calling preamble() method before each constructor, if available,
		//		and calling postscript() after all constructors were executed.
		//		If the hint is "after", it is chained as a regular method, but
		//		postscript() will be called after the chain of constructors.
		//		"constructor" cannot be chained "before", but it allows
		//		a special hint string: "manual", which means that constructors
		//		are not going to be chained in any way, and programmer will call
		//		them manually using this.inherited(). In the latter case
		//		postscript() will be called after the construction.
		//
		//		All chaining hints are "inherited" from base classes and
		//		potentially can be overridden. Be very careful when overriding
		//		hints! Make sure that all chained methods can work in a proposed
		//		manner of chaining.
		//
		//		Once a method was chained, it is impossible to unchain it. The
		//		only exception is "constructor". You don't need to define a
		//		method in order to supply a chaining hint.
		//
		//		If a method is chained, it cannot use this.inherited() because
		//		all other methods in the hierarchy will be called automatically.
		//
		//		Usually constructors and initializers of any kind are chained
		//		using "after" and destructors of any kind are chained as
		//		"before". Note that chaining assumes that chained methods do not
		//		return any value: any returned value will be discarded.
		//
		// example:
		//	|	declare("my.classes.bar", my.classes.foo, {
		//	|		// properties to be added to the class prototype
		//	|		someValue: 2,
		//	|		// initialization function
		//	|		constructor: function(){
		//	|			this.myComplicatedObject = new ReallyComplicatedObject();
		//	|		},
		//	|		// other functions
		//	|		someMethod: function(){
		//	|			doStuff();
		//	|		}
		//	|	});
		//
		// example:
		//	|	var MyBase = declare(null, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyClass1 = declare(MyBase, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyClass2 = declare(MyBase, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyDiamond = declare([MyClass1, MyClass2], {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//
		// example:
		//	|	var F = function(){ console.log("raw constructor"); };
		//	|	F.prototype.method = function(){
		//	|		console.log("raw method");
		//	|	};
		//	|	var A = declare(F, {
		//	|		constructor: function(){
		//	|			console.log("A.constructor");
		//	|		},
		//	|		method: function(){
		//	|			console.log("before calling F.method...");
		//	|			this.inherited(arguments);
		//	|			console.log("...back in A");
		//	|		}
		//	|	});
		//	|	new A().method();
		//	|	// will print:
		//	|	// raw constructor
		//	|	// A.constructor
		//	|	// before calling F.method...
		//	|	// raw method
		//	|	// ...back in A
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			destroy: "before"
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		constructor: function(){
		//	|			console.log("B.constructor");
		//	|		},
		//	|		destroy: function(){
		//	|			console.log("B.destroy");
		//	|		}
		//	|	});
		//	|	var C = declare(B, {
		//	|		constructor: function(){
		//	|			console.log("C.constructor");
		//	|		},
		//	|		destroy: function(){
		//	|			console.log("C.destroy");
		//	|		}
		//	|	});
		//	|	new C().destroy();
		//	|	// prints:
		//	|	// B.constructor
		//	|	// C.constructor
		//	|	// C.destroy
		//	|	// B.destroy
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			constructor: "manual"
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		constructor: function(){
		//	|			// ...
		//	|			// call the base constructor with new parameters
		//	|			this.inherited(arguments, [1, 2, 3]);
		//	|			// ...
		//	|		}
		//	|	});
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			m1: "before"
		//	|		},
		//	|		m1: function(){
		//	|			console.log("A.m1");
		//	|		},
		//	|		m2: function(){
		//	|			console.log("A.m2");
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		"-chains-": {
		//	|			m2: "after"
		//	|		},
		//	|		m1: function(){
		//	|			console.log("B.m1");
		//	|		},
		//	|		m2: function(){
		//	|			console.log("B.m2");
		//	|		}
		//	|	});
		//	|	var x = new B();
		//	|	x.m1();
		//	|	// prints:
		//	|	// B.m1
		//	|	// A.m1
		//	|	x.m2();
		//	|	// prints:
		//	|	// A.m2
		//	|	// B.m2

		// crack parameters
		if(typeof className != "string"){
			props = superclass;
			superclass = className;
			className = "";
		}
		props = props || {};

		var proto, i, t, ctor, name, bases, chains, mixins = 1, parents = superclass;

		// build a prototype
		if(opts.call(superclass) == "[object Array]"){
			// C3 MRO
			bases = c3mro(superclass, className);
			t = bases[0];
			mixins = bases.length - t;
			superclass = bases[mixins];
		}else{
			bases = [0];
			if(superclass){
				if(opts.call(superclass) == "[object Function]"){
					t = superclass._meta;
					bases = bases.concat(t ? t.bases : superclass);
				}else{
					err("base class is not a callable constructor.", className);
				}
			}else if(superclass !== null){
				err("unknown base class. Did you use dojo.require to pull it in?", className);
			}
		}
		if(superclass){
			for(i = mixins - 1;; --i){
				proto = forceNew(superclass);
				if(!i){
					// stop if nothing to add (the last base)
					break;
				}
				// mix in properties
				t = bases[i];
				(t._meta ? mixOwn : mix)(proto, t.prototype);
				// chain in new constructor
				ctor = new Function;
				ctor.superclass = superclass;
				ctor.prototype = proto;
				superclass = proto.constructor = ctor;
			}
		}else{
			proto = {};
		}
		// add all properties
		declare.safeMixin(proto, props);
		// add constructor
		t = props.constructor;
		if(t !== op.constructor){
			t.nom = cname;
			proto.constructor = t;
		}

		// collect chains and flags
		for(i = mixins - 1; i; --i){ // intentional assignment
			t = bases[i]._meta;
			if(t && t.chains){
				chains = mix(chains || {}, t.chains);
			}
		}
		if(proto["-chains-"]){
			chains = mix(chains || {}, proto["-chains-"]);
		}

		// build ctor
		t = !chains || !chains.hasOwnProperty(cname);
		bases[0] = ctor = (chains && chains.constructor === "manual") ? simpleConstructor(bases) :
			(bases.length == 1 ? singleConstructor(props.constructor, t) : chainedConstructor(bases, t));

		// add meta information to the constructor
		ctor._meta  = {bases: bases, hidden: props, chains: chains,
			parents: parents, ctor: props.constructor};
		ctor.superclass = superclass && superclass.prototype;
		ctor.extend = extend;
		ctor.createSubclass = createSubclass;
		ctor.prototype = proto;
		proto.constructor = ctor;

		// add "standard" methods to the prototype
		proto.getInherited = getInherited;
		proto.isInstanceOf = isInstanceOf;
		proto.inherited    = inheritedImpl;
		proto.__inherited  = inherited;

		// add name if specified
		if(className){
			proto.declaredClass = className;
			lang.setObject(className, ctor);
		}

		// build chains and add them to the prototype
		if(chains){
			for(name in chains){
				if(proto[name] && typeof chains[name] == "string" && name != cname){
					t = proto[name] = chain(name, bases, chains[name] === "after");
					t.nom = name;
				}
			}
		}
		// chained methods do not return values
		// no need to chain "invisible" functions

		return ctor;	// Function
	}

	/*=====
	declare.__DeclareCreatedObject = {
		// summary:
		//		dojo/_base/declare() returns a constructor `C`.   `new C()` returns an Object with the following
		//		methods, in addition to the methods and properties specified via the arguments passed to declare().

		inherited: function(name, args, newArgs){
			// summary:
			//		Calls a super method.
			// name: String?
			//		The optional method name. Should be the same as the caller's
			//		name. Usually "name" is specified in complex dynamic cases, when
			//		the calling method was dynamically added, undecorated by
			//		declare(), and it cannot be determined.
			// args: Arguments
			//		The caller supply this argument, which should be the original
			//		"arguments".
			// newArgs: Object?
			//		If "true", the found function will be returned without
			//		executing it.
			//		If Array, it will be used to call a super method. Otherwise
			//		"args" will be used.
			// returns:
			//		Whatever is returned by a super method, or a super method itself,
			//		if "true" was specified as newArgs.
			// description:
			//		This method is used inside method of classes produced with
			//		declare() to call a super method (next in the chain). It is
			//		used for manually controlled chaining. Consider using the regular
			//		chaining, because it is faster. Use "this.inherited()" only in
			//		complex cases.
			//
			//		This method cannot me called from automatically chained
			//		constructors including the case of a special (legacy)
			//		constructor chaining. It cannot be called from chained methods.
			//
			//		If "this.inherited()" cannot find the next-in-chain method, it
			//		does nothing and returns "undefined". The last method in chain
			//		can be a default method implemented in Object, which will be
			//		called last.
			//
			//		If "name" is specified, it is assumed that the method that
			//		received "args" is the parent method for this call. It is looked
			//		up in the chain list and if it is found the next-in-chain method
			//		is called. If it is not found, the first-in-chain method is
			//		called.
			//
			//		If "name" is not specified, it will be derived from the calling
			//		method (using a methoid property "nom").
			//
			// example:
			//	|	var B = declare(A, {
			//	|		method1: function(a, b, c){
			//	|			this.inherited(arguments);
			//	|		},
			//	|		method2: function(a, b){
			//	|			return this.inherited(arguments, [a + b]);
			//	|		}
			//	|	});
			//	|	// next method is not in the chain list because it is added
			//	|	// manually after the class was created.
			//	|	B.prototype.method3 = function(){
			//	|		console.log("This is a dynamically-added method.");
			//	|		this.inherited("method3", arguments);
			//	|	};
			// example:
			//	|	var B = declare(A, {
			//	|		method: function(a, b){
			//	|			var super = this.inherited(arguments, true);
			//	|			// ...
			//	|			if(!super){
			//	|				console.log("there is no super method");
			//	|				return 0;
			//	|			}
			//	|			return super.apply(this, arguments);
			//	|		}
			//	|	});
			return	{};	// Object
		},

		getInherited: function(name, args){
			// summary:
			//		Returns a super method.
			// name: String?
			//		The optional method name. Should be the same as the caller's
			//		name. Usually "name" is specified in complex dynamic cases, when
			//		the calling method was dynamically added, undecorated by
			//		declare(), and it cannot be determined.
			// args: Arguments
			//		The caller supply this argument, which should be the original
			//		"arguments".
			// returns:
			//		Returns a super method (Function) or "undefined".
			// description:
			//		This method is a convenience method for "this.inherited()".
			//		It uses the same algorithm but instead of executing a super
			//		method, it returns it, or "undefined" if not found.
			//
			// example:
			//	|	var B = declare(A, {
			//	|		method: function(a, b){
			//	|			var super = this.getInherited(arguments);
			//	|			// ...
			//	|			if(!super){
			//	|				console.log("there is no super method");
			//	|				return 0;
			//	|			}
			//	|			return super.apply(this, arguments);
			//	|		}
			//	|	});
			return	{};	// Object
		},

		isInstanceOf: function(cls){
			// summary:
			//		Checks the inheritance chain to see if it is inherited from this
			//		class.
			// cls: Function
			//		Class constructor.
			// returns:
			//		"true", if this object is inherited from this class, "false"
			//		otherwise.
			// description:
			//		This method is used with instances of classes produced with
			//		declare() to determine of they support a certain interface or
			//		not. It models "instanceof" operator.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var B = declare(null, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var C = declare([A, B], {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var D = declare(A, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|
			//	|	var a = new A(), b = new B(), c = new C(), d = new D();
			//	|
			//	|	console.log(a.isInstanceOf(A)); // true
			//	|	console.log(b.isInstanceOf(A)); // false
			//	|	console.log(c.isInstanceOf(A)); // true
			//	|	console.log(d.isInstanceOf(A)); // true
			//	|
			//	|	console.log(a.isInstanceOf(B)); // false
			//	|	console.log(b.isInstanceOf(B)); // true
			//	|	console.log(c.isInstanceOf(B)); // true
			//	|	console.log(d.isInstanceOf(B)); // false
			//	|
			//	|	console.log(a.isInstanceOf(C)); // false
			//	|	console.log(b.isInstanceOf(C)); // false
			//	|	console.log(c.isInstanceOf(C)); // true
			//	|	console.log(d.isInstanceOf(C)); // false
			//	|
			//	|	console.log(a.isInstanceOf(D)); // false
			//	|	console.log(b.isInstanceOf(D)); // false
			//	|	console.log(c.isInstanceOf(D)); // false
			//	|	console.log(d.isInstanceOf(D)); // true
			return	{};	// Object
		},

		extend: function(source){
			// summary:
			//		Adds all properties and methods of source to constructor's
			//		prototype, making them available to all instances created with
			//		constructor. This method is specific to constructors created with
			//		declare().
			// source: Object
			//		Source object which properties are going to be copied to the
			//		constructor's prototype.
			// description:
			//		Adds source properties to the constructor's prototype. It can
			//		override existing properties.
			//
			//		This method is similar to dojo.extend function, but it is specific
			//		to constructors produced by declare(). It is implemented
			//		using dojo.safeMixin, and it skips a constructor property,
			//		and properly decorates copied functions.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		m1: function(){},
			//	|		s1: "Popokatepetl"
			//	|	});
			//	|	A.extend({
			//	|		m1: function(){},
			//	|		m2: function(){},
			//	|		f1: true,
			//	|		d1: 42
			//	|	});
		},

		createSubclass: function(mixins, props){
			// summary:
			//		Create a subclass of the declared class from a list of base classes.
			// mixins: Function[]
			//		Specifies a list of bases (the left-most one is the most deepest
			//		base).
			// props: Object?
			//		An optional object whose properties are copied to the created prototype.
			// returns: dojo/_base/declare.__DeclareCreatedObject
			//		New constructor function.
			// description:
			//		Create a constructor using a compact notation for inheritance and
			//		prototype extension.
			//
			//		Mixin ancestors provide a type of multiple inheritance.
			//		Prototypes of mixin ancestors are copied to the new class:
			//		changes to mixin prototypes will not affect classes to which
			//		they have been mixed in.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		m1: function(){},
			//	|		s1: "bar"
			//	|	});
			//	|	var B = declare(null, {
			//	|		m2: function(){},
			//	|		s2: "foo"
			//	|	});
			//	|	var C = declare(null, {
			//	|	});
			//	|	var D1 = A.createSubclass([B, C], {
			//	|		m1: function(){},
			//	|		d1: 42
			//	|	});
			//	|	var d1 = new D1();
			//	|
			//	|	// this is equivalent to:
			//	|	var D2 = declare([A, B, C], {
			//	|		m1: function(){},
			//	|		d1: 42
			//	|	});
			//	|	var d2 = new D2();
		}
	};
	=====*/

	// For back-compat, remove for 2.0
	dojo.safeMixin = declare.safeMixin = safeMixin;
	dojo.declare = declare;

	return declare;
});

//>>>filename: /Users/aaron/Develop/loader-demo-with-builder/app/main.js, mid: main
define("main",["dojo/_base/declare"],function(declare) {
	return declare("Test.Dialog.Extend", null, {
		fn: function() {
			console.log("hello world");
		}
	});
});