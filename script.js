//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//
// JavaScript記述用ファイル
//
// Copyright (C) 2021 Asahi Shokuhin Co., Ltd.
// All Rights Reserved.
//
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
// グローバル変数
//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

// Quaggaプラグインの初期化時、<div id="cameraView"> 要素内に生成される <video> 要素
let _video;

// Quaggaプラグインの初期化時、<div id="cameraView"> 要素内に生成される ポリゴン描画キャンバス
// <canvas class="drawingBuffer">
let _polygonCanvas1D;
let _polygonCtx1D;

// QRコード用ポリゴン描画キャンバス
const _polygonCanvas2D = document.querySelector('#polygonCanvas2D');
const _polygonCtx2D = _polygonCanvas2D.getContext('2d');

// QRコード作成用オブジェクト
let _qrcodeCreator;

/**
 * HTML読込完了時イベントリスナー
 */
$(function() {
  // 現在時刻表示(一定時間おきに自動更新)
  showCurrentTime();

  // バーコードリーダー初期化(初期化後、カメラ自動起動)
  initBarcodeReader();

  // ウィンドウとカメラビュー上にタッチイベント追加
  addTouchEvent();

  //++++++++++++++++++++++++++++++++++++++++++++++++++++++
  // ページ表示状態変化イベント
  // ※ タブコンテンツが表示状態または非表示状態に変化した時に発生
  //  ①スキャンモード切替
  //    ・タブ表示 ⇒ カメラ起動
  //    ・タブ非表示 ⇒ カメラ・スキャンモード停止
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++
  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === 'visible') {
      toggleCamera(true);
    } else {
      toggleCamera(false);
    }
  });

  //++++++++++++++++++++++++++++++++++++++++++
  // [カメラ]トグルボタン変更イベント
  //  ①カメラモード切替
  //    ・トグルON ⇒ カメラ起動
  //    ・トグルOFF ⇒ カメラ・スキャンモード停止
  //++++++++++++++++++++++++++++++++++++++++++
  $('#toggleCameraBtn')
    .change(function() {
      toggleCamera($(this).prop('checked'));
    });

  //++++++++++++++++++++++++++++++++++++++++++++++
  // スキャンモードトグルボタン変更イベント
  //
  //  ①バーコード情報ラベルを初期化
  //  ②スキャンモード切替
  //    ・トグルON ⇒ スキャン開始
  //    ・トグルOFF ⇒ スキャン停止
  //++++++++++++++++++++++++++++++++++++++++++++++
  $('#toggleScan1DBtn, #toggleScan2DBtn')
    .change(function() {
      // 既存情報初期化
      initBarcodeInfo();

      // トグルON時
      if ($(this).prop('checked')) {
        // 「1次元バーコードスキャン」の場合
        if (this.id == "toggleScan1DBtn") {
          // 「QRコードスキャン」ON時
          if ($('#toggleScan2DBtn').prop('checked')) {
            // 強制クリックでOFFにする
            $('#toggleScan2DBtn').trigger("click");
          }
          // 1次元バーコードスキャン開始
          toggleScan1D(true);
        }
        // 「QRコードスキャン」の場合
        else {
          // 「1次元バーコードスキャン」ON時
          if ($('#toggleScan1DBtn').prop('checked')) {
            // 強制クリックでOFFにする
            $('#toggleScan1DBtn').trigger("click");
          }
          // QRコードスキャン開始
          toggleScan2D(true);
        }
      } else {
        // 「1次元バーコードスキャン」の場合
        if (this.id == "toggleScan1DBtn") {
          // 1次元バーコードスキャン停止
          toggleScan1D(false);
        }
        // 「QRコードスキャン」の場合
        else {
          // QRコードスキャン停止
          toggleScan2D(false);
        }
       }

      // スキャンモード切替通知メッセージの表示状態変更
      switchNotification();
    });
});

/**
 * ウィンドウ全体とカメラビューにタッチイベントを追加する。
 *
 * ウィンドウ：カメラビュー内のピンチイン／アウト時は、ウィンドウのズームイン／アウトを無効にする。
 * カメラビュー：ビュー内のピンチイン／アウト時は、カメラのズーム値を変更する。
 */
function addTouchEvent() {
  //++++++++++++++++++++++++++++++
  // ①ウィンドウ用タッチイベント
  //++++++++++++++++++++++++++++++
  // タッチ座標が2箇所共に<video>タグ内に存在するか否か
  let touchesInVideo = false;

  // 1-1: ウィンドウ全体のタッチ時イベントリスナー
  // ※ 引数 "passive" を false にする必要がある為、jQueryではなく Native Javascriptで記述
  document.addEventListener('touchstart',
    function(e) {
      if (e.touches.length == 2) {
        // カメラビュー座標
        const cvLeft = $('#cameraView').offset().left;
        const cvTop = $('#cameraView').offset().top;
        const cvRight = cvLeft + $('#cameraView').width();
        const cvBottom = cvTop + $('#cameraView').height();

        // タッチ座標
        const x1 = e.touches[0].clientX;
        const y1 = e.touches[0].clientY;
        const x2 = e.touches[1].clientX;
        const y2 = e.touches[1].clientY;

        // 1点目・2点目のタッチ座標が<video>タグ内に存在するか否か
        const touchesInVideo1 = ((x1 >= cvLeft) && (x1 <= cvRight) && (y1 >= cvTop) && (y1 <= cvBottom));
        const touchesInVideo2 = ((x2 >= cvLeft) && (x2 <= cvRight) && (y2 >= cvTop) && (y2 <= cvBottom));

        touchesInVideo = (touchesInVideo1 && touchesInVideo2);
      } else {
        touchesInVideo = false;
      }
    }, { passive: false }
  );

  // 1-2: ウィンドウ全体のムーブ時イベントリスナー
  // ※ 引数 "passive" を false にする必要がある為、jQueryではなく Native Javascriptで記述
  document.addEventListener('touchmove',
    function(e) {
      // 2箇所タッチ時およびタッチ座標が2箇所共に<video>タグ内に存在する場合
      if (e.touches.length == 2 && touchesInVideo) {
        e.preventDefault();
      }
    }, { passive: false }
  );

  //++++++++++++++++++++++++++++++
  // ②カメラビュー用タッチイベント
  //++++++++++++++++++++++++++++++
  // タッチ時の2点間距離
  let d1;

  // 2-1: カメラビューのタッチ時イベントリスナー
  $('#cameraView').on('touchstart', function(e) {
    if (e.originalEvent.touches.length >= 2) {
      // タッチ時の2点間の幅・高さ・2点間距離
      const w = Math.abs(e.originalEvent.touches[1].clientX - e.originalEvent.touches[0].clientX);
      const h = Math.abs(e.originalEvent.touches[1].clientY - e.originalEvent.touches[0].clientY);
      d1 = Math.round(Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2)));
    }
  });

  // 2-2: カメラビューのムーブ時イベントリスナー
  $('#cameraView').on('touchmove', function(e) {
    if (e.originalEvent.touches.length >= 2) {
      // カメラのズーム情報(ズーム機能未対応の場合、undefined が返る)
      const zoomInfo = getZoomInfo();

      if (zoomInfo) {
        // ムーブ時の2点間の幅・高さ・2点間距離
        const w = Math.abs(e.originalEvent.touches[1].clientX - e.originalEvent.touches[0].clientX);
        const h = Math.abs(e.originalEvent.touches[1].clientY - e.originalEvent.touches[0].clientY);
        const d2 = Math.round(Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2)));

        // 変更後のズーム値
        let newZoomValue = Math.round(zoomInfo.value * d2 / d1);

        // ズーム下限値未満の場合
        if (newZoomValue < zoomInfo.min) {
          newZoomValue = zoomInfo.min;
        }
        // ズーム上限値超過の場合
        else if (newZoomValue > zoomInfo.max) {
          newZoomValue = zoomInfo.max;
        }

        // カメラズーム値セット
        setZoomValue(newZoomValue);

        // ズームスライダー値更新
        $('#zoomSlider').val(newZoomValue).change();
      }
    }
  });
}

/**
 * キャンバスをクリアする。
 *
 * @param {HTMLElement} canvas: 対象<canvas>要素
 */
function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * QRコード検出場所にポリゴンを描画する。
 *
 * @param {JSON} location: 画像内におけるQRコード部分の座標情報
 *   location {
 *     topLeftCorner     { x: 0.0, y: 0.0 }, // 左上端座標
 *     topRightCorner    { x: 0.0, y: 0.0 }, // 右上端座標
 *     bottomLeftCorner  { x: 0.0, y: 0.0 }, // 左下端座標
 *     bottomRightCorner { x: 0.0, y: 0.0 }  // 右下端座標
 *   }
 */
function drawPolygonOn2DCanvas(location) {
  // キャンバスクリア
  clearCanvas(_polygonCanvas2D);

  // 描画設定
  _polygonCtx2D.strokeStyle = '#f00';
  _polygonCtx2D.lineWidth = 3;

  // ポリゴン描画
  _polygonCtx2D.beginPath();
  _polygonCtx2D.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
  _polygonCtx2D.lineTo(location.topRightCorner.x, location.topRightCorner.y);
  _polygonCtx2D.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
  _polygonCtx2D.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
  _polygonCtx2D.lineTo(location.topLeftCorner.x, location.topLeftCorner.y);
  _polygonCtx2D.closePath();
  _polygonCtx2D.stroke();
}

/**
 * <video>要素に表示されている映像のImageDataを取得する。
 */
function getImageOnVideo() {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  // キャンバスサイズ変更
  tempCanvas.width = _video.videoWidth;
  tempCanvas.height = _video.videoHeight;

  // キャンバスに描画
  tempCtx.drawImage(_video, 0, 0, _video.videoWidth, _video.videoHeight);

  return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
}

/**
 * 現在のスキャンモードを取得する。
 *
 * @return {Number}: スキャンモード
 *   0: スキャン停止
 *   1: 1次元バーコードスキャン
 *   2: QRコードスキャン
 */
function getScanMode() {
  if ($('#toggleScan1DBtn').prop('checked')) {
    return 1;
  } else if ($('#toggleScan2DBtn').prop('checked')) {
    return 2;
  } else {
    return 0;
  }
}

/**
 * カメラのズーム情報を取得する。
 *
 * @return {JSON}: カメラのズーム情報
 *   <info>.min: 最小値
 *   <info>.max: 最大値
 *   <info>.value: 現在のズーム値
 */
function getZoomInfo() {
  // カメラ起動中の場合
  if (_video && _video.srcObject.getTracks()) {
    // MediaStreamTrackオブジェクト取得
    const track = _video.srcObject.getTracks()[0];

    // 設定オプション取得
    const capabilities = track.getCapabilities();

    // ズーム機能対応時
    if (capabilities.zoom) {
      return {
        "min": capabilities.zoom.min,
        "max": capabilities.zoom.max,
        "value": track.getSettings().zoom
      };
    }
  }
}

/**
 * バーコード情報を初期化する。
 */
function initBarcodeInfo() {
  $('#barcodeType').html("");

  // ※ 要素変更時に備え、html(), val() 両方を初期化
  $('#barcodeInfo').html("").val("");

  $('#scannedImage').attr('src', '').css('visibility', 'collapse');

  // バーコード出力用要素を初期化し、非表示化
  $('#barcode img').attr('src', '').hide();

  // QRコード作成オブジェクトが存在する場合
  if (_qrcodeCreator) {
    _qrcodeCreator.clear();
  }
}

/**
 * バーコードリーダー(1次元バーコード、QRコード)を初期化する。
 *
 * @see: https://github.com/ericblade/quagga2/blob/master/README.md
 */
function initBarcodeReader() {
  //++++++++++++++++++++++
  // バーコードリーダー初期化
  //++++++++++++++++++++++
  Quagga.init({
    inputStream: {
      type : "LiveStream",
      target: document.querySelector("#cameraView"),
      constraints: {
        width: $(window).height() / 2,
        height: $(window).width() / 2,
        facingMode: "environment"
      },
      area: {top: "0%", bottom:"0%", left: "0%", right: "0%"},
      singleChannel: false, // trueの場合は赤色のみ読み取り
    },
    frequency: 10, // 1秒間に読み込む回数
    locator: {
        // カメラを離す x-small small medium large x-large近づける
        patchSize: "medium",
        halfSample: false  // trueの場合は縦横半分にリサイズした画像で解析
    },
    locate: true,
    numOfWorkers: 0,
    decoder: {
      // code_39_reader, code_39_vin_reader, code_93_reader, code_128_reader,
      // codabar_reader, ean_reader, ean_8_reader, 
      // upc_reader, upc_e_reader, i2of5_reader, 2of5_reader から指定
      readers: ["ean_reader","ean_8_reader"],
      multiple: false // 複数バーコード同時解析設定
    }
  },
  // 初期化完了後
  function (err) {
    // エラー発生時
    if (err) {
      switch (err.name) {
        // カメラ未搭載時
        //   err ⇒ "NotFoundError: Requested device not found"
        //   err.name ⇒ "NotFoundError"
        //   err.message ⇒ "Requested device not found"
        case "NotFoundError":
          alert("カメラが見つかりません。\n\n" + err);
          break;
        default:
          alert("エラーが発生しました。\n\n" + err);
      }
      return;
    }

    //++++++++++++++++++++++++++++++++++++++
    // ①グルーバル変数に要素オブジェクトをセット
    //++++++++++++++++++++++++++++++++++++++
    _video = document.querySelector('#cameraView>video');
    _polygonCanvas1D = document.querySelector('#cameraView>.drawingBuffer');
    _polygonCtx1D = _polygonCanvas1D.getContext('2d');

    //++++++++++++++++++++++++++++++++++++++
    // ②カメラビュー・左側・右側パネルリサイズ
    //++++++++++++++++++++++++++++++++++++++
    // カメラサイズに合わせてカメラビューサイズをリサイズ
    $('#cameraView')
      .width(_video.videoWidth)
      .height(_video.videoHeight);
    $('#leftPanel').width(_video.videoWidth);
//    $('#rightPanel').width($(window).width() - _video.videoWidth);

    //++++++++++++++++++++++++++++++++++++++
    // ③QRコード検出位置描画用キャンバスリサイズ
    //++++++++++++++++++++++++++++++++++++++
    _polygonCanvas2D.width = _video.videoWidth;
    _polygonCanvas2D.height = _video.videoHeight;

    //++++++++++++++++++++++++++++++++++++++
    // ④「カメラ」トグルボタン表示＆ON
    //++++++++++++++++++++++++++++++++++++++
    $('#toggleCamera').css('visibility', 'visible')
    $('#toggleCameraBtn').prop('checked', true);

    //++++++++++++++++++++++++++++++++++++++
    // ⑤メッセージ表示
    //++++++++++++++++++++++++++++++++++++++
    $('#notification').css('visibility', 'visible');

    //++++++++++++++++++++++++++++++
    // ⑥カメラズーム用スライダーセット
    //++++++++++++++++++++++++++++++
    setZoomSlider();
  });

  //++++++++++++++++++++++
  // バーコードスキャン中
  //++++++++++++++++++++++
  Quagga.onProcessed(function(result) {
//#############################################################################################
// 時刻表示（1Dスキャン稼働状況確認用）
$('#time1').html(new Date().toString().split(" ")[4]);
//#############################################################################################
    if (result) {
      // ポリゴンキャンバスクリア
      clearCanvas(_polygonCanvas1D);

      // 検出成功時
      if (result.box) {
        // 矩形描画
        Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, _polygonCtx1D, {color: "blue", lineWidth: 2});
      }

      // 検出成功時
      if (result.codeResult && result.codeResult.code) {
        // 中心線描画
        Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, _polygonCtx1D, {color: 'red', lineWidth: 3});
      }
    }
  });

  //++++++++++++++++++++++
  // バーコード検出時
  //++++++++++++++++++++++
  let detectedCount = 0;
  let detectedCode = "";

  Quagga.onDetected(function (result) {
    //++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // 読み取り誤差が大きいので、誤検出を防ぐ為、
    // 複数回連続で同一結果が検出された場合に成功とする
    //++++++++++++++++++++++++++++++++++++++++++++++++++++++

    // 連続で同一結果が検出された場合
    if (detectedCode == result.codeResult.code) {
      detectedCount++;
    } else {
      detectedCount = 0;
      detectedCode = result.codeResult.code;
    }

    // 3回連続で同一結果が検出された場合
    if (detectedCount > 3) {
      //++++++++++++++++++++++
      // ①バーコード種別出力
      //++++++++++++++++++++++
      $('#barcodeType').html(function() {
        switch (result.codeResult.format) {
          case "codabar": return "NW-7(Codabar)";
          case "code_39": return "Code-39";
          case "code_128": return "Code-128";
          case "ean_8": return "JAN-8";
          case "ean_13": return "JAN-13";
          case "upc_a": return "UPC-A";
          case "upc_e": return "UPC-E";
        }
      });

      //++++++++++++++++++++++++++++++++++++++++++++++
      // ②スキャン結果出力
      // ※ 要素変更時に備え、html(), val() 両方をセット
      //++++++++++++++++++++++++++++++++++++++++++++++
      $('#barcodeInfo')
        .html(result.codeResult.code)
        .val(result.codeResult.code);

      //++++++++++++++++++++++
      // ③スキャン画像出力
      //++++++++++++++++++++++
      outputScanned1DImage(result.box);

      //++++++++++++++++++++++
      // ④バーコード生成
      //++++++++++++++++++++++
      // 出力フォーマット
      let outputFormat;
      switch (result.codeResult.format) {
        case "codabar":  outputFormat = "codabar"; break;
        case "code_39":  outputFormat = "CODE39";  break;
        case "code_128": outputFormat = "CODE128"; break;
        case "ean_8":    outputFormat = "EAN8";    break;
        case "ean_13":   outputFormat = "EAN13";   break;
        case "upc_a":    outputFormat = "UPC";     break;
        case "upc_e":    outputFormat = "UPC";     break;
      }

      // バーコード作成
      JsBarcode("#barcode1DImage", result.codeResult.code, {format: outputFormat});

      // バーコード画像作成完了時
      $('#barcode1DImage').bind('load', function() {
        // <div>要素内余白
        const MARGIN = 5;

        // 親要素に合わせて幅・高さをリサイズ
        const imgW = $('#barcode1D').width() - MARGIN * 2;
        const imgH = imgW * $(this).height() / $(this).width();
        const marginTop = ($('#barcode1D').height() - imgH) / 2;

        // サイズ指定、表示位置指定、注釈付与
        $(this)
          .width(imgW)
          .css('margin-top', marginTop)
          .attr('alt', 'barcode')
          .show();
      });

      detectedCode = '';
      detectedCount = 0;
    }
  });
}

/**
 * カメラが起動状態を取得する。
 *
 * @return {Boolean}: カメラ起動状態
 */
function isCameraRunning() {
  // カメラ起動中の場合、true を返す
  return (_video && _video.srcObject.getTracks()[0].readyState == "live");
}

/**
 * 引数で指定された4隅座標が全てキャンバス内に存在するか否かを返す。
 *
 * @param {JSON} location: 画像内におけるQRコード部分の座標情報
 *   location {
 *     topLeftCorner     { x: 0.0, y: 0.0 }, // 左上端座標
 *     topRightCorner    { x: 0.0, y: 0.0 }, // 右上端座標
 *     bottomLeftCorner  { x: 0.0, y: 0.0 }, // 左下端座標
 *     bottomRightCorner { x: 0.0, y: 0.0 }  // 右下端座標
 *   }
 * @return {Boolean}: 4隅座標が全てキャンバス内に存在する場合は true、それ以外の場合は false を返す。
 */
function isWithinCanvas(location) {
  const flag1 = (location.topLeftCorner.x >= 0) && (location.topLeftCorner.x <= _polygonCanvas2D.width)
             && (location.topLeftCorner.y >= 0) && (location.topLeftCorner.y <= _polygonCanvas2D.height);

  const flag2 = (location.topRightCorner.x >= 0) && (location.topRightCorner.x <= _polygonCanvas2D.width)
             && (location.topRightCorner.y >= 0) && (location.topRightCorner.y <= _polygonCanvas2D.height);

  const flag3 = (location.bottomLeftCorner.x >= 0) && (location.bottomLeftCorner.x <= _polygonCanvas2D.width)
             && (location.bottomLeftCorner.y >= 0) && (location.bottomLeftCorner.y <= _polygonCanvas2D.height);

  const flag4 = (location.bottomRightCorner.x >= 0) && (location.bottomRightCorner.x <= _polygonCanvas2D.width)
             && (location.bottomRightCorner.y >= 0) && (location.bottomRightCorner.y <= _polygonCanvas2D.height);

/////////////////////////////////////////////////////////////////////////
// 以下はデバッグコード
  $('#canvasW').html(_polygonCanvas2D.width);
  $('#canvasH').html(_polygonCanvas2D.height);

  $('#ulx').html(location.topLeftCorner.x.toFixed(1));
  $('#uly').html(location.topLeftCorner.y.toFixed(1));
  if (flag1) {$('#ulx, #uly').css('color', 'black');}
  else       {$('#ulx, #uly').css('color', 'red');}

  $('#urx').html(location.topRightCorner.x.toFixed(1));
  $('#ury').html(location.topRightCorner.y.toFixed(1));
  if (flag2) {$('#urx, #ury').css('color', 'black');}
  else       {$('#urx, #ury').css('color', 'red');}

  $('#llx').html(location.bottomLeftCorner.x.toFixed(1));
  $('#lly').html(location.bottomLeftCorner.y.toFixed(1));
  if (flag3) {$('#llx, #lly').css('color', 'black');}
  else       {$('#llx, #lly').css('color', 'red');}

  $('#lrx').html(location.bottomRightCorner.x.toFixed(1));
  $('#lry').html(location.bottomRightCorner.y.toFixed(1));
  if (flag4) {$('#lrx, #lry').css('color', 'black');}
  else       {$('#lrx, #lry').css('color', 'red');}
/////////////////////////////////////////////////////////////////////////

  return (flag1 && flag2 && flag3 && flag4);
}

/**
 * QR情報を出力する。
 *
 * @param {String} textInfo: QRコード内テキスト情報
 */
function outputQrInfo(textInfo) {
  //++++++++++++++++++++++++++++++
  // ①QR情報出力
  //++++++++++++++++++++++++++++++
  // コード種別出力
  $('#barcodeType').html("QR");

  // QRコード内テキスト情報出力
  // ※ 要素変更時に備え、html(), val() 両方をセット
  $('#barcodeInfo')
    .html(textInfo)
    .val(textInfo);

  //++++++++++++++++++++++++++++++
  // ③QRコード生成
  //   (qrcode.jsライブラリ使用)
  //++++++++++++++++++++++++++++++
  // QRコード生成用オブジェクトが存在する場合
  if (_qrcodeCreator) {
    _qrcodeCreator.clear();
    _qrcodeCreator.makeCode(textInfo);
  } else {
    // QRコード縦横ピクセル数
    const QR_SIZE = 128;

    // <div>要素内余白
    const MARGIN = 5;

    // QRコード生成
    // ※ 誤り訂正レベルは最も一般的な「M」を適用
    //      レベルL：約 7%
    //      レベルM：約15%
    //      レベルQ：約20%
    //      レベルH：約30%
    _qrcodeCreator = new QRCode(document.querySelector('#barcode2D'), {
      text: textInfo,
      width: QR_SIZE,
      height: QR_SIZE,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.M
    });

    // 親要素に合わせてサイズ・余白を設定
    const imgW = $('#barcode2D').width() - MARGIN * 2;
    const imgH = $('#barcode2D').height() - MARGIN * 2;
    const marginLeft = ($('#barcode2D').width() - imgW - MARGIN * 2) / 2;
    const marginTop = ($('#barcode2D').height() - imgH - MARGIN * 2) / 2;

    // サイズ・余白セット、注釈付与
    $('#barcode2D img')
      .width(imgW)
      .css('margin-left', marginLeft)
      .css('margin-top', marginTop)
      .attr('alt', 'QR code')
      .show();
  }
}

/**
 * バーコードスキャン画像を出力する。
 *
 * @param {Array} points: 画像内におけるバーコード部分の座標格納2次元配列
 *   points[0][0]: 1点目のX座標, points[0][1]: 1点目のY座標 
 *   points[1][0]: 2点目のX座標, points[1][1]: 2点目のY座標 
 *   points[2][0]: 3点目のX座標, points[2][1]: 3点目のY座標 
 *   points[3][0]: 4点目のX座標, points[3][1]: 4点目のY座標 
 */
function outputScanned1DImage(points) {
  //++++++++++++++++++++++++++++++++++++++
  // ①該当座標情報からトリミングサイズを算出
  //++++++++++++++++++++++++++++++++++++++
  // バーコード表示領域のX・Y座標の最小値・最大値・幅・高さ(画像トリミング用)
  const minX = Math.floor(Math.min(points[0][0], points[1][0], points[2][0], points[3][0]));
  const minY = Math.floor(Math.min(points[0][1], points[1][1], points[2][1], points[3][1]));
  const maxX = Math.ceil(Math.max(points[0][0], points[1][0], points[2][0], points[3][0]));
  const maxY = Math.ceil(Math.max(points[0][1], points[1][1], points[2][1], points[3][1]));
  const trimmedW = maxX - minX;
  const trimmedH = maxY - minY;

  //++++++++++++++++++++++++++++++++++++++
  // ②カメラ映像トリミング
  //++++++++++++++++++++++++++++++++++++++
  const imgCtx = Quagga.canvas.ctx.image;
  const imgData = imgCtx.getImageData(minX, minY, trimmedW, trimmedH);

  //++++++++++++++++++++++++++++++++++++++
  // ③トリミング画像を出力
  //++++++++++++++++++++++++++++++++++++++
  // トリミング画像出力用にキャンバスを一時作成
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  // キャンバスサイズ設定
  tempCanvas.width = trimmedW;
  tempCanvas.height = trimmedH;

  // トリミング画像貼り付け
  tempCtx.putImageData(imgData, 0, 0);

  //++++++++++++++++++++++++++++++++++++++++++++++++++
  // ④<img>要素に出力(画像ダウンロードを可能にする)
  //++++++++++++++++++++++++++++++++++++++++++++++++++
  // トリミング画像読込完了時
  $('#scannedImage').bind('load', function() {
    // <div>要素内余白
    const MARGIN = 5;

    // 画像サイズ、余白
    let imgW, imgH, marginTop, marginLeft;

    // <img>要素が親要素よりも縦長の場合 ⇒ <img>要素高さを親要素の高さに合わせる
    if ((trimmedH / trimmedW) >= ($('#barcode1D').height() / $('#barcode1D').width())) {
      imgH = $('#barcode1D').height() - MARGIN * 2;
      imgW = imgH * trimmedW / trimmedH;
      marginTop = MARGIN;
      marginLeft = ($('#barcode1D').width() - imgW) / 2;
    }
    // <img>要素が親要素よりも横長の場合 ⇒ <img>要素幅を親要素の幅に合わせる
    else {
      imgW = $('#barcode1D').width() - MARGIN * 2;
      imgH = imgW * trimmedH / trimmedW;
      marginLeft = MARGIN;
      marginTop = ($('#barcode1D').height() - imgH) / 2;
    }

    // <img>タグ属性値セット
    $(this)
      .width(imgW)
      .height(imgH)
      .css('margin-left', marginLeft)
      .css('margin-top', marginTop)
      .css('visibility', 'visible');
  });

  // 一旦削除
  $('#scannedImage').attr('src', '');

    // <img>タグに出力
  $('#scannedImage').attr('src', tempCanvas.toDataURL());
}

/**
 * QRコードスキャン画像を出力する。
 *
 * @param {ImageData} imgData: 画像データ
 * @param {JSON} location: 画像内におけるQRコード部分の座標情報
 *   location {
 *     topLeftCorner     { x: 0.0, y: 0.0 }, // 左上端座標
 *     topRightCorner    { x: 0.0, y: 0.0 }, // 右上端座標
 *     bottomLeftCorner  { x: 0.0, y: 0.0 }, // 左下端座標
 *     bottomRightCorner { x: 0.0, y: 0.0 }  // 右下端座標
 *   }
 */
function outputScanned2DImage(imgData, location) {
  //++++++++++++++++++++++++++++++++++++++
  // ①該当座標情報からトリミングサイズを算出
  //++++++++++++++++++++++++++++++++++++++
  // バーコード表示領域のX・Y座標の最小値・最大値・幅・高さ(画像トリミング用)
  const minX = Math.floor(Math.min(location.topLeftCorner.x, location.bottomLeftCorner.x));
  const minY = Math.floor(Math.min(location.topLeftCorner.y, location.topRightCorner.y));
  const maxX = Math.ceil(Math.max(location.topRightCorner.x, location.bottomRightCorner.x));
  const maxY = Math.ceil(Math.max(location.bottomLeftCorner.y, location.bottomRightCorner.y));
  const trimmedW = maxX - minX;
  const trimmedH = maxY - minY;

  //++++++++++++++++++++++++++++++++++++++
  // ②トリミング画像を出力
  //++++++++++++++++++++++++++++++++++++++
  // トリミング画像出力用にキャンバスを一時作成
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  // キャンバスサイズ設定
  tempCanvas.width = trimmedW;
  tempCanvas.height = trimmedH;

  // トリミング画像貼り付け
  tempCtx.putImageData(imgData, -minX, -minY, minX, minY, trimmedW, trimmedH);

  //++++++++++++++++++++++++++++++++++++++++++++++++++
  // ③<img>要素に出力(画像ダウンロードを可能にする)
  //++++++++++++++++++++++++++++++++++++++++++++++++++
  // トリミング画像読込完了時
  $('#scannedImage').bind('load', function() {
    // <div>要素内余白
    const MARGIN = 5;

    // <img>要素サイズ
    //   幅：ラッパー要素幅
    //   高さ：キャンバスサイズの比に合わせる
    const imgW = $('#barcode').width() - MARGIN * 2;
    const imgH = parseInt(imgW * tempCanvas.height / tempCanvas.width);

    const marginLeft = MARGIN;
    const marginTop = ($('#barcode2D').height() - imgH) / 2;

    // <img>タグ属性値セット
    $(this)
      .width(imgW)
      .height(imgH)
      .css('margin-left', marginLeft)
      .css('margin-top', marginTop)
      .css('visibility', 'visible');
  });

    // <img>タグに出力
  $('#scannedImage').attr('src', tempCanvas.toDataURL());
}

/**
 * カメラ撮影映像を解析してQRコード情報を出力する。
 */
function scanQR() {
  // QRスキャンモードの場合
  if (getScanMode() == 2) {
    // カメラ撮影映像の画像データ取得
    const imgData = getImageOnVideo();

    // QR解析ライブラリ『jsQR』で画像解析
    // [戻り値]
    //   binaryData: QRコード画像データ
    //   data: QRコード内テキスト情報
    //   location: 送信画像内におけるQRコード部分の座標情報
    const code = jsQR(imgData.data, imgData.width, imgData.height);

//#############################################################################################
// 時刻表示（QRコード稼働状況確認用）
$('#time2').html(new Date().toString().split(" ")[4]);
//#############################################################################################
    // QRコード読取成功時
    // ※ codeには以下データが含まれる
    //   code {
    //     binaryData: "********", // QRコード画像バイナリデータ
    //     data: "********", //QRコード内テキスト情報
    //     location { // 送信画像内におけるQRコード部分の座標情報
    //       topLeftCorner     { x: 0.0, y: 0.0 }, // 左上端座標
    //       topRightCorner    { x: 0.0, y: 0.0 }, // 右上端座標
    //       bottomLeftCorner  { x: 0.0, y: 0.0 }, // 左下端座標
    //       bottomRightCorner { x: 0.0, y: 0.0 }  // 右下端座標
    //     }
    //   }
    if (code) {
      //++++++++++++++++++++++++++
      // ①QR情報出力
      //++++++++++++++++++++++++++
      outputQrInfo(code.data);

      // 4隅座標が全てキャンバス内に存在する場合
      if (isWithinCanvas(code.location)) {
        //++++++++++++++++++++++++++
        // ②検出場所にポリゴン描画
        //++++++++++++++++++++++++++
  //#####################################################################################
  // TODO:ポリゴンはみだしエラー調査中
        drawPolygonOn2DCanvas(code.location);
//#####################################################################################
        //++++++++++++++++++++++++++
        // ③キャプチャ画像出力
        //++++++++++++++++++++++++++
        outputScanned2DImage(imgData, code.location);
      }
    }

    // 一定時間おきに再帰呼出
    setInterval(scanQR, 500);
  }
}

/**
 * ズームスライダーをセットする。
 *
 * @see: https://rangeslider.js.org/
 */
function setZoomSlider() {
  // カメラのズーム情報(ズーム機能未対応の場合、undefined が返る)
  const zoomInfo = getZoomInfo();

  if (zoomInfo) {
    $('#zoomSlider')
      // 最小値・最大値セット
      .attr('min', zoomInfo.min)
      .attr('max', zoomInfo.max)
      // スライダープラグインセット
      .rangeslider({
        polyfill: false,

        // ①初期化終了時
        onInit: function() {
          // 現在のカメラズーム率をセット
          $(this).val(zoomInfo.value);
        },
        // ②スライド中
        onSlide: function(position, value) {
          // カメラズーム値変更
          setZoomValue(value);
        },
        // ③スライド終了時
        onSlideEnd: function(position, value) {}
      });

    $('#zoomSliderWrapper').css('visibility', 'visible');
  }
}

/**
 * カメラにズーム値をセットする。
 *
 * @param {Number} zoomValue: カメラズーム値
 */
function setZoomValue(zoomValue) {
  // ズーム機能対応時
  if (getZoomInfo()) {
    // MediaStreamTrackオブジェクト取得
    const track = _video.srcObject.getTracks()[0];

    // ズーム値セット
    track.applyConstraints({ advanced: [{zoom: zoomValue}] });
  }
}

/**
 * 現在時刻を表示する。
 */
function showCurrentTime() {
  const today = new Date();
 
  const year = today.getFullYear();
  const month = ("0" + (today.getMonth() + 1)).slice(-2);
  const date = ("0" + today.getDate()).slice(-2);
  const hour = ("0" + today.getHours()).slice(-2);
  const minute = ("0" + today.getMinutes()).slice(-2);
  const second = ("0" + today.getSeconds()).slice(-2);

  $('#currentTime').html(year + '/' + month + '/' + date + " " + hour + ":" + minute + ":" + second);

  // 1秒おきに再帰呼出
  setInterval(showCurrentTime, 1000);
}

/**
 * スキャンモード切替通知メッセージの表示状態を変更する。
 */
function switchNotification() {
  // スキャンモードOFFの場合
  if (getScanMode() == 0) {
    $('#notification').css('visibility', 'visible');
  } else {
    $('#notification').css('visibility', 'collapse');
  }
}

/**
 * カメラのON／OFFを切り替える。
 *
 * @param {Boolean} flag: 切替フラグ
 */
function toggleCamera(flag) {
  if ($('#toggleCameraBtn').prop('checked') != flag) {
    $('#toggleCameraBtn').prop('checked', flag);
  }

  if (flag) {
    // カメラ停止時
    if (!isCameraRunning()) {
      //++++++++++++++++++++++++++++++
      // カメラ起動
      //++++++++++++++++++++++++++++++
      navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            width: $(window).height() / 2,
            height: $(window).width() / 2,
            facingMode: "environment"
          }
        })
        .then(function(stream) {
          _video.srcObject = stream;
          _video.onloadedmetadata = function(e) {
            _video.play();
          };
        })
        .catch(function(err) {
          alert(
            "カメラが搭載されていない端末では使用できません。\n\n" +
            "  エラーメッセージ：" + err)
        });
    }
  } else {
    // 1次元バーコード・QRコードスキャン停止
    toggleScan1D(false);
    toggleScan2D(false);

    // カメラ停止
    _video.srcObject.getTracks().forEach(function(track) {
      track.stop();
    });
  }

  // スキャンモード切替通知メッセージの表示状態変更
  switchNotification();
}

/**
 * 1次元バーコードスキャン状態のON／OFFを切り替える。
 *
 * @param {Boolean} flag: 切替フラグ
 */
function toggleScan1D(flag) {
  if ($('#toggleScan1DBtn').prop('checked') != flag) {
    $('#toggleScan1DBtn').prop('checked', flag);
  }

  if (flag) {
    // カメラ停止中の場合、カメラ起動
    toggleCamera(true);

    // 1次元バーコードスキャン開始
    Quagga.start();
  } else {
    // 1次元バーコードスキャン一時停止
    Quagga.pause();

    // ポリゴンクリア
    clearCanvas(_polygonCanvas1D);

//#############################################################################################
// 稼働状況確認用
$('#time1').html("一時停止");
//#############################################################################################
  }
}

/**
 * QRコードスキャン状態のON／OFFを切り替える。
 *
 * @param {Boolean} flag: 切替フラグ
 */
function toggleScan2D(flag) {
  if ($('#toggleScan2DBtn').prop('checked') != flag) {
    $('#toggleScan2DBtn').prop('checked', flag);
  }

  if (flag) {
    // カメラ停止中の場合、カメラ起動
    toggleCamera(true);

    // QRコードスキャン開始
    scanQR();
  } else {
    // ※ QRコードスキャン機能の継続是非は、scanQR()メソッド内にてトグルボタン状態で判定している為、
    //    本メソッド内では処理不要

    // ポリゴンクリア
    clearCanvas(_polygonCanvas2D);

//#############################################################################################
// 稼働状況確認用
$('#time2').html("一時停止");
//#############################################################################################
  }
}
