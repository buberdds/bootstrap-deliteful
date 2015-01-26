var Handlebars = require("handlebars"),
	path = require("path"),
	ls = require('list-directory-contents'),
	_ = require("lodash"),
	rm = require("rimraf"),
	fs = require("fs");

require('handlebars-layouts')(Handlebars);

Handlebars.registerPartial('layout', fs.readFileSync('./templates/layout.html', 'utf8'));
Handlebars.registerHelper('is', function(widget) {
	return new Handlebars.SafeString(this.deliteful ? 'is="' + widget + '"' : '');
});

function compile(source) {
	var template = Handlebars.compile(fs.readFileSync(source, 'utf8')); 
	var differentiated = source.match(/bd--/);
	source = source.replace(/b.?--/, ""); // removing b-- and bd--
	var versions = differentiated ? ["bootstrap", "deliteful"] : ["bootstrap"];

	versions.forEach(function (version) {
		var data = {
			title: version + "-" + path.basename(source, ".html"),
			deliteful: version == "deliteful",
			differentiated: differentiated,
			states: ["success", "error", "warning"],
			sizes: ["lg","default", "sm"]
		};
		var output = template(data);
		var filepath = path.join("./compiled", version 
			+ "--" + path.basename(source))
		fs.writeFile(filepath, output, {encoding: "utf8"}, function(err){
			if (err) {
				console.warn("compiling failed for", source);
				throw err;
			} else {
				console.info("compiled", version, source, "successfully");
			}
		});
	})
}

ls("./sources", function (err, sources) {
	rm.sync("./compiled");
	fs.mkdirSync("./compiled");
	sources.forEach(function(source){
		compile(source);
	});
	
	ls("./compiled", function (err, pages) {
		var wrapper = Handlebars.compile(fs.readFileSync("./templates/wrapper.html", "utf8"));

		pages = pages.map(function (page) { // keep only basename
			return path.basename(page);
		})
		pages = _.filter(pages, function (page) { // remove all and all-<widget> files
			return page.split(/[-\.]/)[0] != "all";
		}).sort();
		pages = _.groupBy(pages, function (page) { // group by widget
			return page.replace(/[a-z]*--([^.]*)\.html/, "$1")
		});

		pages = _.mapValues(pages, function (page, key) { // make a hash where key is the widget
			var bootstrap = page[0].match(/^bootstrap-/) ? page[0] : page[1];
			var deliteful = page[0].match(/^deliteful-/) ? page[0] : page[1];
			return {
				bootstrap: bootstrap,
				deliteful: deliteful,
				url: "all-" + key + ".html",
				current: false
			}	
		});

		pages = _.forEach(pages, function(page, widget){
			_.forEach(pages, function(p){p.current = (p == page)});

			var result = wrapper({pages: pages, current_page: page, widget: widget});
			var filepath = "compiled/all-" + widget + ".html";
			fs.writeFile(filepath, result, {encoding: "utf8"}, function (err) {
				if (err) {
					console.warn("failed to compile", filepath)
				} else {
					console.info("compiled", filepath)
				}
			});
		});

	})
});








