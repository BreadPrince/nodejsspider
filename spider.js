var http = require('http');
var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var n = 0;   // 已爬取招聘简章数量
var MAX = 120;   // 设置最大爬取招聘简章数
var pageNum = 60; // 每页数据量


var location = [
	'厦门',
	'福州',
	'深圳',
	'广州',
	'上海',
];
var jobLocation = URLLocation(location);
var keyword = "前端";
var page = 1; // 当前页
var urlsuffix = "pd=7&jl=" + jobLocation + "&kw=" + keyword + "&sm=0&p=" + page + "&sf=8001&st=20000&et=2&isadv=1";
urlsuffix = encodeURI(urlsuffix);
var url = "http://sou.zhaopin.com/jobs/searchresult.ashx?" + urlsuffix;   // 初始url
var nextLink = "";   // 下一页URL

function createSkill( name ) {
	var object = new Object();
	object.name = name;
	object.count = 0;

	object.getName = function () {
		return this.name;
	};
	object.getCount = function () {
		return this.count;
	};
	return object;
}
// 获取技能名称最长的长度，用于格式化输出数据
function getLongestSkillNameLength( skill ) {
	var length = [];
	for (var i = 0; i < skill.length; i++) {
		length[i] = skill[i].name.length;
	}
	length.sort(function(a, b) {
		return b - a;
	});
	return length[0];
}
var skill = [
	createSkill( "jQuery" ),
	createSkill( "Bootstrap" ),
	createSkill( "Angular" ),
	createSkill( "React" ),
	createSkill( "Vue" ),
	createSkill( "YUI" ),
	createSkill( "ExtJS" ),
];
var getResult = false;


function fetchPage(x) {
	startRequest(x);
}

function URLLocation( location ) {
	var i, jobLocation="";
	var len = location.length;
	for ( i = 0; i < len; i++ ) {
		if ( i == len-1 ) {
			jobLocation = jobLocation + location[i];
		} else {
			jobLocation = jobLocation + location[i] + "%2B";
		}
	};
	return jobLocation;
}


function startRequest(x) {
	// 采用http模块向服务器发起一次get请求
	http.get(x, function(res) {
		var html = '';   // 用来存储请求网页的整个html内容
		res.setEncoding('utf-8');   // 防止中文乱码
		// 监听data事件，每次取一块数据
		res.on('data', function(chunk) {
			html += chunk;
		});
		// 监听end事件，如果整个网页内容的html都获取完毕，就执行回调函数
		res.on('end', function() {
			var $ = cheerio.load(html);   // 采用cheerio模块解析html

			var detailLink = $('.zwmc div a');
			for ( var i = 0; i < detailLink.length; i++) {
				var detailURL = detailLink[i].attribs.href;
				detailRequest(detailURL);
			}

			nextLink = $('.pagesDown-pos a').attr('href');
		});

	}).on('error', function (err) {
		console.log(err);
	});
}

function detailRequest( detailURL ) {
	http.get( detailURL, function(res) {
		var html = '';
		res.setEncoding('utf-8');
		res.on('data', function(chunk) {
			html += chunk;
		});
		res.on('end', function() {
			var $ = cheerio.load(html);
			var detail = $('.tab-cont-box .tab-inner-cont:first-child').text().toLowerCase();

			for ( var i = 0; i < skill.length; i++ ) {
				var pattern = new RegExp( skill[i].name.toLowerCase(), 'g' );
				var m = detail.search(pattern);
				if ( m > -1 ) {
					skill[i].count+=1;
					// console.log(skill[i].name, skill[i].count);
				}
			}

			// 输出数据
			n+=1;
			if ( n < MAX ) {
				process.stdout.write("当前进度: "+(n/MAX*100).toFixed(0)+"%"+"\r");
			}
			if ( n == pageNum * page && n < MAX ) {
				page++;
				startRequest(nextLink);
			}
			if ( n == MAX ) {
				process.stdout.write("当前进度: "+(n/MAX*100).toFixed(0)+"%"+"\r\n");
				skill.sort(function( x, y ) {
					return y.count - x.count;
				});
				for ( var j = 0; j < skill.length; j++ ) {
					var name = skill[j].name;
					var count = skill[j].count;
					var longestLength = getLongestSkillNameLength(skill);
					// 格式化技能名
					if ( name.length < longestLength ) {
						var cut = longestLength - name.length;
						while (cut--) {
							name+=" ";
						}
					}
					// 格式化技能统计次数
					if ( count.toString().length < n.toString().length ) {
						var cut = n.toString().length - count.toString().length;
						while (cut--) {
							count = " " + count;
						}
					}
					// 格式化技能统计百分比
					var percent = (skill[j].count/n*100).toFixed(2) + "%";
					if ( percent.length < 6 ) {
						var cut = 6 - percent.length;
						while (cut--) {
							percent = " " + percent;
						}
					}
					console.log( name, " : ", count, "  占比: ", percent );
				}
			}
		});
	}).on('error', function (err) {
		console.log(err);
	});
}

// 主程序开始运行
fetchPage(url);