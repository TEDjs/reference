// JS
	// pure js
	//esprima.parse(code, {
	//	tolerant: true
	//});

	// coffeescript
	coffeeCode = CoffeeScript.compile(code, { bare: true });

	// babel
	code = Babel.transform(code, {
		presets: ['latest', 'stage-2', 'react']
	}).code;

	// typescript?

// CSS
	// scss/sass 
	sass.compile(
		code,
		{ indentedSyntax: cssMode === CssModes.SASS },
		function(result) {
			// Something was wrong
			if (result.line && result.message) {
				showErrors('css', [
					{ lineNumber: result.line - 1, message: result.message }
				]);
			}
			d.resolve(result.text);
		}
	);


	// less
	less.render(code).then(
		function(result) {
			d.resolve(result.css);
		},
		function(error) {
			showErrors('css', [
				{ lineNumber: error.line, message: error.message }
			]);
		}
	);

	// stylus
	stylus(code).render(function(error, result) {
		if (error) {
			window.err = error;
			// Last line of message is the actual message
			var tempArr = error.message.split('\n');
			tempArr.pop(); // This is empty string in the end
			showErrors('css', [
				{
					lineNumber: +error.message.match(/stylus:(\d+):/)[1] - 298,
					message: tempArr.pop()
				}
			]);
		}
		d.resolve(result);
	});

	// acss
	//const html = scope.cm.html.getValue();
	//const foundClasses = atomizer.findClassNames(html);
	//const finalConfig = atomizer.getConfig(foundClasses, {});
	//const acss = atomizer.getCss(finalConfig);
	//scope.cm.css.setValue(acss);
	//d.resolve(acss);

// HTML
	// markdown
	marked(code)

	// jade/pug
	jade.render(code) 

	// haml?