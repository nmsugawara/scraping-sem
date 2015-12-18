var request = require('request');
var jschardet = require('jschardet');
var cheerio = require('cheerio');
var iconv = require('iconv').Iconv;
var Promise = require('promise');
var stringifyObject = require('stringify-object');

var options = {
  followRedirect: false, // 3xx系でリダイレクトを行う（default: true）
  timeout: 10000,       // タイムアウトさせるまでのミリ秒（default: タイムアウトしない)
  encoding: 'binary'    // 文字コードの指定（default: UTF-8）、EUC-JP/SHIFT_JISなサイトを開く可能性がある場合は'binary'にする
};

module.exports = function (url) {
	return new Promise(function (resolve, reject) {
		request.get(url, options, function (error, response, body) {
			if (error) {
				reject(error);
			}
			var linkList = [];
			var statusCode = response.statusCode.toString();
			// ステータスコードが4xx系または5xx系の場合
			if (statusCode.match(/(4\d|5\d)+/) != null) {
				// return
				resolve(linkList);
			// ステータスコードが3xx系の場合
			} else if (statusCode.match(/3\d+/) != null) {
				// locationのURLを取得
				var redirectUrl = response.headers.location;
				linkList.push(redirectUrl);
				// return
				resolve(linkList);
			}
			// TODO: UTF-8へのエンコード
			// TODO: javascriptのlocation.hrefにあるリンク取得

			// エンコード用に文字コード取得
//			var charaset = jschardet.detect(body);
//			charaset = charaset.encoding.toLowerCase();
			// 相対パス用にリクエストURLのベース取得
			var urlBase = response.request.uri.protocol + '//' + response.request.uri.host;

			$ = cheerio.load(body);
			// metaタグを用いたリダイレクトの場合のURL取得
			_fetchUrlFromMetaTag($('meta'))
			.then(function (linkFromMetaTagList) {
				if (linkFromMetaTagList != null && linkFromMetaTagList.length > 0) {
					// URL重複チェック
					linkFromMetaTagList.forEach(function (linkFromMetaTag) {
						var isExist = linkList.indexOf(linkFromMetaTag);
						if ( isExist == -1) {
							linkList.push(linkFromMetaTag);
						}
					});
				}
				return _fetchUrlFromATag ($('a'), urlBase);
			})
			// aタグのリンク一覧取得
			.then(function (linkFromATagList) {
				if (linkFromATagList != null && linkFromATagList.length > 0) {
					// URL重複チェック
					linkFromATagList.forEach(function (linkFromATag) {
						var isExist = linkList.indexOf(linkFromATag);
						if ( isExist == -1) {
							linkList.push(linkFromATag);
						}
					});
				}
				// return
				resolve(linkList);
			}).catch(function (error){
				reject(error);
			});
		});
	});
};

/**
 * aタグからURLを取得
 **/
function _fetchUrlFromATag (obj, urlBase) {
	return new Promise(function (resolve, reject) {
		var linkList = [];
		// aタグのリンク一覧取得
		obj.each(function (index) {
			var linkUrl = this.attribs['href'];
			_adjustUrl (urlBase, linkUrl)
			.then(function (adjustedUrl) {
				if (adjustedUrl.length == 0) {
					return true;
				}
				// URLの先頭が「http」で始まらない場合、削除
				if (adjustedUrl.match(/^http/) == null) {
					return true;
				}
				// URL重複チェック
				var isExist = linkList.indexOf(adjustedUrl);
				if ( isExist != -1) {
					return true;
				}
				linkList.push(adjustedUrl);
			}).catch(function (error) {
				reject(error);
			});
		});
		resolve(linkList);
	});
}

/**
 * metaタグからURLを取得
 **/
function _fetchUrlFromMetaTag (obj) {
	return new Promise(function (resolve, reject) {
		var redirectUrlList = [];
		obj.each(function (index) {
			var redirectUrl = '';
			if (this.attribs['http-equiv'] && this.attribs['http-equiv'].match(/refresh/i) == null) {
				return true;
			}
			if (!this.attribs['content']) {
				return true;
			}
			redirectUrl = this.attribs['content'].match(/;url=(https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+)/i);
			if (redirectUrl != null && redirectUrl[1]) {
				redirectUrlList.push(redirectUrl[1]);
			}
		})
		resolve(redirectUrlList);
	});
}

/**
 * URLの整形
 **/
function _adjustUrl (urlBase, linkUrl) {
	return new Promise(function (resolve, reject) {
		// URLにハッシュが含まれている場合、削除
		linkUrl = linkUrl.replace(/#.*$/, '');
		// 相対URLの場合、絶対URLにする
		if (linkUrl.match(/^\//) != null) {
			linkUrl = urlBase + linkUrl;
		}
		resolve(linkUrl);
	});
}