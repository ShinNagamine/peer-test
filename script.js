//##############################################################################
//
// script.js
//
// スクリプトファイル
//
//##############################################################################

//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
//
// 定数
//
//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
// SkyWay APIキー
const API_KEY = "4bc300c2-d192-4bfa-aa15-45bfb80d6c1d";


//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
//
// グローバル変数
//
//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

let _peer = null;
let _conn = null;
let _id = null;

const _localVideo = document.querySelector('#localVideo');
const _remoteVideo = document.querySelector('#remoteVideo');

let _localStream = null;
//let _remoteStream = null;

let _cameraFound = false;

//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
//
// メソッド
//
//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
$(function() {
	//++++++++++++++++++++++++++++++++++++++++++++++++++++++
	// ページ表示状態変化イベント
	// ※ タブコンテンツが表示状態または非表示状態に変化した時に発生
	//  ①スキャンモード切替
	//    ・タブ表示 ⇒ カメラ起動
	//    ・タブ非表示 ⇒ カメラ・スキャンモード停止
	//++++++++++++++++++++++++++++++++++++++++++++++++++++++
	document.addEventListener("visibilitychange", function() {
		if (document.visibilityState === 'visible') {
//			toggleCamera(true);
		} else {
//			toggleCamera(false);
		}
	});

	// peerオブジェクト作成
	// ※ debug: 3 ⇒ 詳細出力
	_peer = new Peer({
		key: API_KEY,
		debug: 3
	});

	//++++++++++++++++++++++
	// peerオープン時
	//++++++++++++++++++++++
	_peer.on('open', function(id) {
		_id = id;

		// 自身ID表示
		$('#localIdLabel').html(id);

		// [更新]ボタンクリック
		$('#updateBtn').trigger('click');
	});

	//++++++++++++++++++++++
	// peer接続時
	//++++++++++++++++++++++
	_peer.on('connection', function(conn) {
		// グローバル変数にセット
		_conn = conn;

		$('#status').html("Connected with " + conn.peer);

		// メッセージ受信イベントリスナー追加
		addReceiveMessageEventListener();
	});



	//++++++++++++++++++++++
	// 着信時
	//++++++++++++++++++++++
	_peer.on('call', call => {
		addMessage("着信あり");

		call.answer(_localStream);

// 接続先映像再生
		playRemoteVideo(call);
	});

	// ボタンクリックイベントリスナー追加
	addButtonClickEventListeners();
});

/**
 * ボタンクリックイベントリスナーを追加する。
 */
function addButtonClickEventListeners() {
	// [ビデオON]ボタンクリックイベント
	// ビデオカメラをONにする。
	$('#videoOnBtn').click(function() {
		toggleCamera(true);
	});

	// [ビデオOFF]ボタンクリックイベント
	// ビデオカメラをOFFにする。
	$('#videoOffBtn').click(function() {
		toggleCamera(false);
	});

	// [更新]ボタンクリックイベント
	// PeerIDリストを更新する。
	$('#updateBtn').click(function() {
		// 現在アクティブなpeer IDのリストを取得
		_peer.listAllPeers((peers) => {
			console.log(peers);

			// 全選択肢を一旦削除
			$('#remoteIdCombobox').html("");

			for (let i=0; i<peers.length; i++) {
				if (peers[i] != _id) {
					$('#remoteIdCombobox').append('<option value="' + peers[i] + '">' + peers[i] + '</option>');
				}
			}
		});
	});

	// [接続]ボタンクリックイベント
	// 指定した「接続先ID」に接続する。
	$('#connectBtn').click(function() {
		_conn = _peer.connect(getRemoteId());

		if (_conn && _conn.open) {
			$('#status').html("Connected with " + getRemoteId());
		}

		// メッセージ受信イベントリスナー追加
		addReceiveMessageEventListener();
	});


	// [ビデオ接続]ボタンクリックイベント
	$('#videoConnectBtn').click(function() {

addMessage("ビデオ接続開始");

		// カメラON
		toggleCamera(true);

		// 接続先呼出
		let call = _peer.call(getRemoteId(), _localStream);

		// 接続先映像再生
		playRemoteVideo(call);
	});




	// [送信]ボタンクリックイベント
	$('#sendBtn').click(function() {
		if (_conn && _conn.open) {
			// メッセージ送信
			_conn.send($('#sMsg').val());

			// ログ出力
			console.log("Sent message: " + $('#sMsg').val());
		}
	});
}



/**
 * 接続先映像を受信し、<video>要素に表示する。
 *
 * @param {} call: 
 */
function playRemoteVideo(call) {

//////////////////////////////
addMessage(typeof(call));
//////////////////////////////

	call.on('stream', stream => {
addMessage("Remote stream on");
		// ストリーミングデータ受信処理
		_remoteVideo.srcObject = stream;
		_remoteVideo.play();
	});
}




/**
 * メッセージを追加する。
 *
 * @param {String} msg: メッセージ
 */
function addMessage(msg) {
	const $p = $('<p>');
	const $timeLabel = $('<span>').addClass('msg-time').html(getCurrentTime()).appendTo($p);
	const $msgLabel = $('<span>').html(" - " + msg).appendTo($p);
	$('#rMsg').append($p);
};

/**
 * メッセージ受信イベントリスナーを追加する。
 */
function addReceiveMessageEventListener() {
	//++++++++++++++++++++++++++
	// コネクションオープン時
	//++++++++++++++++++++++++++
	_conn.on('open', function() {
		// メッセージ受信時
		_conn.on('data', function(data) {
			// 受信メッセージ出力
			addMessage(data);

			// ログ出力
			console.log("Received message: " + data);
		});
	});
}

/**
 * メッセージをクリアする。
 */
function clearMessages() {
	$('#rMsg').html("");
	addMessage("メッセージクリア");
};

/**
 * 現在時刻を "hh:mm:ss" として返す。
 *
 * @return {String}: 現在時刻
 */
function getCurrentTime() {
	const now = new Date();
	const h = ("0" + now.getHours()).slice(-2);
	const m = ("0" + now.getMinutes()).slice(-2);
	const s = ("0" + now.getSeconds()).slice(-2);
	return (h + ":" + m + ":" + s);
}

/**
 * 接続先ID(テキストボックス入力値)を取得する。
 *
 * @return {String}: 接続先ID
 */
function getRemoteId() {
	return $('#remoteIdCombobox').val();
}

/**
 * カメラが起動状態を取得する。
 *
 * @return {Boolean}: カメラ起動状態
 */
function isCameraRunning() {
	// カメラ起動中の場合、true を返す
	return (_localVideo.srcObject && _localVideo.srcObject.getTracks() && _localVideo.srcObject.getTracks()[0].readyState == "live");
}

/**
 * カメラのON／OFFを切り替える。
 *
 * @param {Boolean} flag: 切替フラグ
 */
function toggleCamera(flag) {
	if (flag) {
		// カメラ停止時
		if (!isCameraRunning()) {
			//++++++++++++++++++++++++++++++
			// カメラ起動
			//++++++++++++++++++++++++++++++
			navigator.mediaDevices
				.getUserMedia({
					audio: true,
					video: {
						width: $(window).height() / 2,
						height: $(window).width() / 2,
						facingMode: "user"
					}
				})
				.then(function(stream) {
addMessage("カメラON");
					_localVideo.srcObject = stream;
					_localVideo.play();
					_localStream = stream;
				})
				.catch(function(err) {
					switch (err.name) {
						// カメラ未搭載時
						//   err ⇒ "NotFoundError: Requested device not found"
						//   err.name ⇒ "NotFoundError"
						//   err.message ⇒ "Requested device not found"
						case "NotFoundError":
							alert("マイクやカメラが接続されていないか、またはデバイスが無効になっています。\n\n" + err);
							break;
						case "NotAllowedError":
							alert("ブラウザからマイクやカメラへのアクセスがブロックされています。\n\n"
								+ "ブラウザ設定を変更してください。\n\n"
								+ "　設定 ＞ プライバシー ＞ コンテンツ ＞ マイク ＞ 許可"
								+ err);
							break;
						default:
							alert("エラーが発生しました。\n\n" + err);
					}
					console.log(err);
				});
		}
	} else {
		// カメラ停止
		_localVideo.srcObject.getTracks().forEach(function(track) {
			track.stop();
		});
	}
}
