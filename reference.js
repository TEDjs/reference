	/**
	 * Loaded the code comiler based on the mode selected
	 */
	function handleModeRequirements(mode) {
		// Exit if already loaded
		var d = deferred();
		if (modes[mode].hasLoaded) {
			d.resolve();
			return d.promise;
		}

		function setLoadedFlag() {
			modes[mode].hasLoaded = true;
			d.resolve();
		}

		if (mode === HtmlModes.JADE) {
			loadJS('lib/jade.js').then(setLoadedFlag);
		} else if (mode === HtmlModes.MARKDOWN) {
			loadJS('lib/marked.js').then(setLoadedFlag);
		} else if (mode === CssModes.LESS) {
			loadJS('lib/less.min.js').then(setLoadedFlag);
		} else if (mode === CssModes.SCSS || mode === CssModes.SASS) {
			loadJS('lib/sass.js').then(function() {
				sass = new Sass('lib/sass.worker.js');
				setLoadedFlag();
			});
		} else if (mode === CssModes.STYLUS) {
			loadJS('lib/stylus.min.js').then(setLoadedFlag);
		} else if (mode === CssModes.ACSS) {
			loadJS('lib/atomizer.browser.js').then(setLoadedFlag);
		} else if (mode === JsModes.COFFEESCRIPT) {
			loadJS('lib/coffee-script.js').then(setLoadedFlag);
		} else if (mode === JsModes.ES6) {
			loadJS('lib/babel.min.js').then(setLoadedFlag);
		} else if (mode === JsModes.TS) {
			loadJS('lib/typescript.js').then(setLoadedFlag);
		} else {
			d.resolve();
		}

		return d.promise;
	}

	function updateHtmlMode(value) {
		htmlMode = value;
		htmlModelLabel.textContent = modes[value].label;
		// FIXME - use a better selector for the mode selectbox
		htmlModelLabel.parentElement.querySelector('select').value = value;
		scope.cm.html.setOption('mode', modes[value].cmMode);
		CodeMirror.autoLoadMode(
			scope.cm.html,
			modes[value].cmPath || modes[value].cmMode
		);
		return handleModeRequirements(value);
	}
	function updateCssMode(value) {
		cssMode = value;
		cssModelLabel.textContent = modes[value].label;
		// FIXME - use a better selector for the mode selectbox
		cssModelLabel.parentElement.querySelector('select').value = value;
		scope.cm.css.setOption('mode', modes[value].cmMode);
		scope.cm.css.setOption('readOnly', modes[value].cmDisable);
		CodeMirror.autoLoadMode(
			scope.cm.css,
			modes[value].cmPath || modes[value].cmMode
		);
		return handleModeRequirements(value);
	}
	function updateJsMode(value) {
		jsMode = value;
		jsModelLabel.textContent = modes[value].label;
		// FIXME - use a better selector for the mode selectbox
		jsModelLabel.parentElement.querySelector('select').value = value;
		scope.cm.js.setOption('mode', modes[value].cmMode);
		CodeMirror.autoLoadMode(
			scope.cm.js,
			modes[value].cmPath || modes[value].cmMode
		);
		return handleModeRequirements(value);
	}

	// computeHtml, computeCss & computeJs evaluate the final code according
	// to whatever mode is selected and resolve the returned promise with the code.
	function computeHtml() {
		var d = deferred();
		var code = scope.cm.html.getValue();
		if (htmlMode === HtmlModes.HTML) {
			d.resolve(code);
		} else if (htmlMode === HtmlModes.MARKDOWN) {
			d.resolve(marked ? marked(code) : code);
		} else if (htmlMode === HtmlModes.JADE) {
			d.resolve(window.jade ? jade.render(code) : code);
		}

		return d.promise;
	}
	function computeCss() {
		var d = deferred();
		var code = scope.cm.css.getValue();
		cleanupErrors('css');

		if (cssMode === CssModes.CSS) {
			d.resolve(code);
		} else if (cssMode === CssModes.SCSS || cssMode === CssModes.SASS) {
			if (sass && code) {
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
			} else {
				d.resolve(code);
			}
		} else if (cssMode === CssModes.LESS) {
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
		} else if (cssMode === CssModes.STYLUS) {
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
		} else if (cssMode === CssModes.ACSS) {
			const html = scope.cm.html.getValue();
			const foundClasses = atomizer.findClassNames(html);
			const finalConfig = atomizer.getConfig(foundClasses, {});
			const acss = atomizer.getCss(finalConfig);
			scope.cm.css.setValue(acss);
			d.resolve(acss);
		}

		return d.promise;
	}
	function computeJs(shouldPreventInfiniteLoops) {
		var d = deferred();
		var code = scope.cm.js.getValue();

		cleanupErrors('js');
		if (!code) {
			d.resolve('');
			return d.promise;
		}

		if (jsMode === JsModes.JS) {
			try {
				esprima.parse(code, {
					tolerant: true
				});
			} catch (e) {
				showErrors('js', [
					{ lineNumber: e.lineNumber - 1, message: e.description }
				]);
			} finally {
				if (shouldPreventInfiniteLoops !== false) {
					code = utils.addInfiniteLoopProtection(code);
				}
				d.resolve(code);
			}
		} else if (jsMode === JsModes.COFFEESCRIPT) {
			var coffeeCode;
			if (!window.CoffeeScript) {
				d.resolve('');
				return d.promise;
			}
			try {
				coffeeCode = CoffeeScript.compile(code, { bare: true });
			} catch (e) {
				showErrors('js', [
					{ lineNumber: e.location.first_line, message: e.message }
				]);
			} finally {
				if (shouldPreventInfiniteLoops !== false) {
					code = utils.addInfiniteLoopProtection(coffeeCode);
				}
				d.resolve(code);
			}
		} else if (jsMode === JsModes.ES6) {
			if (!window.Babel) {
				d.resolve('');
				return d.promise;
			}
			try {
				esprima.parse(code, {
					tolerant: true,
					jsx: true
				});
			} catch (e) {
				showErrors('js', [
					{ lineNumber: e.lineNumber - 1, message: e.description }
				]);
			} finally {
				code = Babel.transform(code, {
					presets: ['latest', 'stage-2', 'react']
				}).code;
				if (shouldPreventInfiniteLoops !== false) {
					code = utils.addInfiniteLoopProtection(code);
				}
				d.resolve(code);
			}
		} else if (jsMode === JsModes.TS) {
			try {
				if (!window.ts) {
					d.resolve('');
					return d.promise;
				}
				code = ts.transpileModule(code, {
					reportDiagnostics: true,
					compilerOptions: {
						noEmitOnError: true,
						diagnostics: true,
						module: ts.ModuleKind.ES2015
					}
				});
				if (code.diagnostics.length) {
					/* eslint-disable no-throw-literal */
					throw {
						description: code.diagnostics[0].messageText,
						lineNumber: ts.getLineOfLocalPosition(
							code.diagnostics[0].file,
							code.diagnostics[0].start
						)
					};
				}
				if (shouldPreventInfiniteLoops !== false) {
					code = utils.addInfiniteLoopProtection(code.outputText);
				}
				d.resolve(code);
			} catch (e) {
				showErrors('js', [
					{ lineNumber: e.lineNumber - 1, message: e.description }
				]);
			}
		}

		return d.promise;
	}




