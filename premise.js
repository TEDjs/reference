'use strict;'

var Premise = {
	getExt: getExt = function(source) {
		return source.split('.').pop();
	},
	getDir: getDir = function(path) {
		return path.substring(0, path.lastIndexOf("/")) + "/"
	},
	here: here = function() {
		var script = document.getElementsByTagName('script');
		if (script == undefined)
			return getDir(window.location.href);
		else
			return getDir(script[script.length + -1].src);
	},

	partial: partial = function(source) {
		if (!source.includes("http")) 
			source = Premise.here() + source;

		e.fetch({
			url: source,
			events: {
				success: function(data) {
					switch(getExt(source)) {
						case "coffee":
						case "coffeescript":
						case "typescript":
						case "ts":
						case "js":
							var container = document.getElementsByTagName('head')[0];
							var script = document.createElement("script");
							script.innerHTML = data;
							container.insertBefore(script, container.firstChild);
							break;

						case "css":
						case "less":
						case "sass":
						case "scss":
							var style = document.createElement("style");
							style.innerHTML = data;
							style.lang = getExt(source);
							document.getElementsByTagName('head')[0].appendChild(style);
							break;
					}
				}
			},
			async: false
		});
	}
};


