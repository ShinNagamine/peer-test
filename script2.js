const Peer = window.Peer;

// SkyWay APIキー
const SKYWAY_KEY = "4bc300c2-d192-4bfa-aa15-45bfb80d6c1d";

(async function main() {
	// VIDEO要素
	const localVideo = document.getElementById('localVideo');
	const remoteVideos = document.getElementById('remoteVideos');

	// ルームID、[参加]、[退出]ボタン
	const roomId = document.getElementById('roomId');
	const joinBtn = document.getElementById('joinBtn');
	const leaveBtn = document.getElementById('leaveBtn');

	// メッセージ入力欄、[送信]ボタン、メッセージ一覧
	const messageText = document.getElementById('messageText');
	const sendBtn = document.getElementById('sendBtn');
	const messages = document.getElementById('messageArea');

	// カメラON
	const localStream = await navigator.mediaDevices
		.getUserMedia({
			audio: true,
			video: true,
		})
		.catch(console.error);

	// Render local stream
	localVideo.muted = true;
	localVideo.srcObject = localStream;
	localVideo.playsInline = true;
	await localVideo.play().catch(console.error);

	// ピア接続
	const peer = (window.peer = new Peer({
		key: SKYWAY_KEY,
		debug: 3,
	}));

alert(1);

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
			// 要素新規作成
			const newVideo = document.createElement('video');
			newVideo.srcObject = stream;
			newVideo.playsInline = true;

			// mark peerId to find it later at peerLeave event
			newVideo.setAttribute('data-peer-id', stream.peerId);
			remoteVideos.append(newVideo);
			await newVideo.play().catch(console.error);
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
alert(2);
	//++++++++++++++++++++++
	// peerオープン時
	//++++++++++++++++++++++
	peer.on('open', id => {
		// 自身ID表示
		$('#localIdLabel').html(id);
	});
alert(3);

	//++++++++++++++++++++++
	// エラー発生時
	//++++++++++++++++++++++
	peer.on('error', () => {
		$('#info').html($('#info').html() + '<br>peer error');
	});
})();
