var Promise = require('promise');
var stringifyObject = require('stringify-object');
var dateUtils = require('date-utils');

var scrapingListingFromYahooPc = require('./scraping_listing_from_yahoo_pc.js');
var scrapingListingFromGooglePc = require('./scraping_listing_from_google_pc.js');
var fetchSiteContents = require('./fetch_site_contents.js');

var ENGINE_TYPE_YAHOO = 'yahoo';
var ENGINE_TYPE_GOOGLE = 'google';
var DEVICE_TYPE_PC = 'pc';

var stringifyOption = {
	indent: "",
	singleQuotes: false
};

// 1サイトあたりのアクセス回数上限
var ACCESS_LIMIT_PER_SITE = 50;

// 引数チェック
// TODO: 入力値形式チェック
if (process.argv.length < 3) {
    console.log('missing argument.');
    return;
}

var word = process.argv[2];

var wordList = [];
wordList.push(word);
var listingAdObjList = [];

// 検索エンジンから指定キーワードのリスティング結果を取得
Promise.all(wordList.map(function (word) {
	return _fetchListingResultObjectListJson(word);
}))
// リスティング結果のURL毎にサイト解析
.then(function (listingResultList) {
	console.log("***** リスティング結果　Start *******");
	console.log(listingResultList[0][0]);
	console.log(listingResultList[0][1]);
	console.log("***** リスティング結果　End *******");
//	console.log(listingResultList[0][1].result);
	if (listingResultList == null || listingResultList.length == 0) {
		console.log("no listing.");
		return;
	}
	var fetchSiteResultList = [];
	Promise.all(listingResultList[0][0].result.map(_fetchSiteContentsList))
	.then(function(testList) {
		fetchSiteResultList.push(testList);
//		console.dir(testList);
	})
	.finally( function () {
		console.log("***** リスティングサイト内リンク抽出結果　Start *******");
		console.dir(fetchSiteResultList[0]);
		console.log("***** リスティングサイト内リンク抽出結果　End *******");
	});
})
.catch(function (error) {
	_onRejected(error);
});

/**
 * キーワード検索結果のリスティングリンクリストをJSON形式で取得
 **/
function _fetchListingResultObjectListJson(word) {
	return new Promise(function(resolve, reject) {
		var listingResultObjList = [];
		var dateObj = new Date();
		var dateTime = dateObj.toFormat("YYYY/MM/DD HH24:MI:SS");
		// yahoo:PCのリスティング結果取得
		scrapingListingFromYahooPc(word)
		.then(function (yahooResultObjList) {
			var listingResultObj = {
				keyword: word,
				engine: ENGINE_TYPE_YAHOO,
				device: DEVICE_TYPE_PC,
				request_time: dateTime,
				result: yahooResultObjList
			};
			listingResultObjList.push(listingResultObj);
			return scrapingListingFromGooglePc(word);
		})
		// google:PCのリスティング結果取得
		.then(function (googleResultObjList) {
			var listingResultObj = {
				keyword: word,
				engine: ENGINE_TYPE_GOOGLE,
				device: DEVICE_TYPE_PC,
				request_time: dateTime,
				result: googleResultObjList
			};
			listingResultObjList.push(listingResultObj);
			// return
			resolve(listingResultObjList);
		})
		.catch(function (error) {
			reject(error);
		});
	});
}

/**
 * 
 **/
function _fetchLinkListFromListingResultList(listingResult) {
	return new Promise(function(resolve, reject) {
		var resultList = [];
		var url = listingResult.url;
		while(resultList.length <= ACCESS_LIMIT_PER_SITE) {
			_fetchSiteContentsList(url)
			.then(function (linkInSiteList) {
				resultList.push(linkInSiteList);
//				url = 
			});
		}
		resolve(resultList);
	});
}

/**
 * 指定URLのサイトコンテンツを取得
 **/
function _fetchSiteContentsList(url) {
	return new Promise(function(resolve, reject) {
		fetchSiteContents(url.url)
		.then(function (result) {
			var list = {};
			list.text = url.text;
			list.url = url.url;
			list.link = result
			resolve(list);
		})
		.catch(function (error) {
			reject(error);
		});
	});
}

function _onRejected(error) {
	console.log(error);
}