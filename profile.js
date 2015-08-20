module.exports = {
	main: './app/main.js',
	base: './app/',
	kjs: './app/',
	release: './app-released',
	compress: true,
	maps: {

	},
	plugins: {
		"dojo/text": {
			inline: true,
			transform: function( mid, deps, cst, kjs, profile ) {
				var code = cst[2];
				if (/\.(html|tpl)$/.test(mid)) {
					code = kjs.util.minifyhtml(code);
					code = kjs.util.escape(code);
				} else if (/\.css$/.test(mid)) {
					code = kjs.util.minifycss(code);
				} else {
					code = kjs.util.escape(code);
				}
				return (cst.left || '') + 'define("' + (cst[0] || mid) + '",' + deps + "," + ('"' + code + '"') + ")" + (cst.right === undefined ? ';' : cst.right);
			}
		}
	}
};