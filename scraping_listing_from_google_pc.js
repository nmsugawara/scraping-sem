var cheerioHttpCli = require('cheerio-httpcli');
var dateUtils = require('date-utils');
var Promise = require('promise');

module.exports = function (word) {
	return new Promise(function (resolve, reject) {
		var listingResultObjList = [];
		cheerioHttpCli.fetch('https://www.google.co.jp/search', { q: word })
		.then(function(result) {
			// リンク一覧を取得
			result.$('a').each(function (index) {
				var linkUrl = result.$(this).attr('href');
				var linkObj = String(linkUrl);
			  	// リスティング広告のリンクでない場合
//				if (linkObj.match(/^https:\/\/www.google.co.jp\/aclk/) == null) {
				if (linkObj.match(/^\/aclk/) == null) {
					return;
				}
				// サブリンクの場合は「ctype」パラメータが有る
				if (linkObj.match(/ctype/) != null) {
					return;
				}
				// リンクテキスト取得
				var linkId = result.$(this).attr('id');
				var linkText = result.$('body #v' + linkId).text();

				// 実際のサイトURL取得
				var afterRedirectUrl = linkUrl.match(/adurl=(https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+)$/);
				if (afterRedirectUrl != null && afterRedirectUrl.length > 0) {
					linkUrl = afterRedirectUrl[1];
				}
				// URLデコード
				linkUrl = decodeURIComponent(linkUrl);
				linkUrl = linkUrl.replace(/(\?|&){1}utm_source=[\w/:%#\$&\?\(\)~\.=\+\-]+/, '');
				var listingLinkObj = {
					text: linkText,
					url: linkUrl
				};
				var dateObj = new Date();
				var dateTime = dateObj.toFormat("YYYY/MM/DD HH24:MI:SS");
				listingResultObjList.push(listingLinkObj);
			});
			resolve(listingResultObjList);
		})
		.catch(function (error) {
			reject(error);
		});
	});
};