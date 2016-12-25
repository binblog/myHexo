var merge = require('utils-merge');
var pathFn = require('path');
var he = require('he');

var config = hexo.config.search = merge({
	path: 'search.xml',
	field: 'post'
}, hexo.config.search);

// Set default search path
if (!config.path){
  config.path = 'search.xml';
}

// Add extension name if don't have
if (!pathFn.extname(config.path)){
  config.path += '.xml';
}



htmlDecode = function(text) {
	return he.decode(text);
}

stripe_code_line_num = function(str) { // 去除代码行数，根据自己的主题修改
	return str.replace(/<span class="line">[0-9]*<\/span>/ig, '');
}
removeHtml = function (str) { // 去除html标签
	return str.replace(/(<([^>]+)>)/ig, '');
}
minify = function (str) { // 压缩成一行
	return str.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
}

hexo.extend.generator.register('search', require('./lib/generator'));
