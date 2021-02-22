//##############################################################################
//
// キャッシュクリア用スクリプトファイル
//
//##############################################################################
$(function() {
	const cssFileName = "style.css";
	const jsFileName = "script.js";

	$('link').each(function(index, element) {
		// <link>要素の参照先が該当CSSファイルと一致する場合
		if ($(element).attr('href').startsWith(cssFileName)) {
			$(element).attr('href', cssFileName + '?' + new Date().getTime());
			console.log($(element).attr('href'));
		}
	})

	$('script').each(function(index, element) {
		// <script>要素の参照先が該当JSファイルと一致する場合
		if ($(element).attr('src').startsWith(jsFileName)) {
			$(element).attr('src', jsFileName + '?' + new Date().getTime());
			console.log($(element).attr('src'));
		}
	})
});
