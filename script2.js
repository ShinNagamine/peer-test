const Peer = window.Peer;

// SkyWay APIキー
const SKYWAY_KEY = "4bc300c2-d192-4bfa-aa15-45bfb80d6c1d";

(async function main() {
	// VIDEO要素
	const _localVideo = document.getElementById('localVideo');
	const _localVideo2 = document.getElementById('localVideo2');
	const remoteVideos = document.getElementById('remoteVideos');

	// ルームID、[参加]、[退出]ボタン
	const roomId = document.getElementById('roomId');
	const joinBtn = document.getElementById('joinBtn');
	const leaveBtn = document.getElementById('leaveBtn');

	// メッセージ入力欄、[送信]ボタン、メッセージ一覧
	const messageText = document.getElementById('messageText');
	const sendBtn = document.getElementById('sendBtn');
	const messages = document.getElementById('messageArea');


	$(document).on('visibilitychange', () => {
		if (document.visibilityState === 'visible') {
//			toggleCamera(true);
		} else {
//			toggleCamera(false);
		}
	});

	// カメラモード
	const facingMode = () => $('input[name=facingMode]').val();

	// Render local stream
	_localVideo2.muted = true;
	_localVideo2.src = "./oz.mp4";
	_localVideo2.playsInline = true;
	_localVideo2.play();

////////////////
	// カメラON
	/*
	const localStream = await navigator.mediaDevices
		.getUserMedia({
			audio: true,
			video: {
				width: $(window).height() / 2,
				height: $(window).width() / 2,
				facingMode: "user"
			}
		})
		.catch(console.error);
		*/

const localStream = _localVideo2.captureStream();


	// Render local stream
	_localVideo.muted = true;
	_localVideo.srcObject = localStream;
	_localVideo.playsInline = true;
	await _localVideo.play().catch(console.error);




	// ピア接続
	const peer = (window.peer = new Peer({
		key: SKYWAY_KEY,
		debug: 2,
	}));

	// [参加]ボタンクリックイベントリスナー追加
	joinBtn.addEventListener('click', () => {
		// Note that you need to ensure the peer has connected to signaling server
		// before using methods of peer instance.
		if (!peer.open) {
			return;
		}

		const room = peer.joinRoom(roomId.value, {
			mode: 'sfu',
			stream: localStream,
		});

		// 自身参加時
		room.once('open', () => {
			messages.textContent += '=== あなたが参加しました。 ===\n';
		});

		// 他メンバー参加時
		room.on('peerJoin', peerId => {
			messages.textContent += `=== ${peerId} が参加しました。 ===\n`;
		});

		// Render remote stream for new peer join in the room
		// 他メンバー映像受信時
		room.on('stream', async stream => {
console.log("＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃");
			// 要素新規作成
			const newVideo = document.createElement('video');
			newVideo.srcObject = stream;
			newVideo.playsInline = true;
console.log(newVideo.outerHTML);

			// mark peerId to find it later at peerLeave event
			newVideo.setAttribute('data-peer-id', stream.peerId);
console.log(1);
			remoteVideos.append(newVideo);
console.log(2);
			await newVideo.play().catch(console.error);
console.log(3);
		});

		// メッセージ受信時
		room.on('data', ({ data, src }) => {
			// Show a message sent to the room and who sent
			messages.textContent += `${src}: ${data}\n`;
		});

		// for closing room members
		// メンバー退出時
		room.on('peerLeave', peerId => {
			const remoteVideo = remoteVideos.querySelector(
				`[data-peer-id="${peerId}"]`
			);
			remoteVideo.srcObject.getTracks().forEach(track => track.stop());
			remoteVideo.srcObject = null;
			remoteVideo.remove();

			messages.textContent += `=== ${peerId} が退出しました。 ===\n`;
		});

		// for closing myself
		// クローズ時
		room.once('close', () => {
			sendBtn.removeEventListener('click', onClickSend);
			messages.textContent += '=== あなたが退出しました。 ===\n';
			Array.from(remoteVideos.children).forEach(remoteVideo => {
				// カメラを停止し、要素削除
				remoteVideo.srcObject.getTracks().forEach(track => track.stop());
				remoteVideo.srcObject = null;
				remoteVideo.remove();
			});
		});

		sendBtn.addEventListener('click', onClickSend);
		leaveBtn.addEventListener('click', () => room.close(), { once: true });

		// [送信]ボタン
		function onClickSend() {
			// Send message to all of the peers in the room via websocket
			room.send(messageText.value);

			messages.textContent += `${peer.id}: ${messageText.value}\n`;
			messageText.value = '';
		}
	});

	//++++++++++++++++++++++
	// peerオープン時
	//++++++++++++++++++++++
	peer.on('open', id => {
		// 自身ID表示
		$('#localIdLabel').html(id);
	});

	//++++++++++++++++++++++
	// エラー発生時
	//++++++++++++++++++++++
	peer.on('error', () => {
		$('#info').html($('#info').html() + '<br>peer error');
	});

	/**
	 * カメラの起動状態を取得する。
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
/*
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
					.then(stream => {
						_localVideo.srcObject = stream;
						_localVideo.play();
						_localStream = stream;
					})
					.catch(err => {
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
			_localVideo.srcObject.getTracks().forEach(track => {
				track.stop();
			});
		}
	}
*/
})();
