var sound = new Audio("audio/success.mp3");
var postTrigger = 0;
var outMessage = ": signed out";
var inMessage = "Welcome back, "
var student = "";

var playSound = function() {
  sound.play();
};

var rect = function(w, h, border_color, border_width) {
  var NS = "http://www.w3.org/2000/svg";
  var SVGObj = document.createElementNS(NS, "rect");
  SVGObj.width.baseVal.value = w;
  SVGObj.height.baseVal.value = h;
  SVGObj.setAttribute("height", h);
  SVGObj.style.fill = "none";
  SVGObj.style.stroke = border_color;
  SVGObj.style.strokeWidth = border_width;
  return SVGObj;
}

var showElements = function(is_scan) {
  var elements = document.querySelectorAll(".show-on-success");
  for (var e = 0; e < elements.length; ++e) {
    var el = elements[e];
    if (is_scan) {
      el.style.display = 'none';
    } else {
      el.style.display = 'block';
    }
  }
  elements = document.querySelectorAll(".show-on-scan");
  for (var e = 0; e < elements.length; ++e) {
    var el = elements[e];
    if (is_scan) {
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }
};

var start = function() {
  showElements(true);
};

onload = function() {
  var capSize = 240;
  var vidSize = 480;
  var video = document.querySelector('video');
  var canvas = document.querySelector('canvas');
  var scanLog = document.querySelector("#scanlog");
  var ctx = canvas.getContext('2d');
  var localMediaStream = null;
  var viewfinderPulse = 0.5;
  var viewfinderPulseDelta = 0.1;
  var viewfinderRect = rect(capSize, capSize, "red", 3);
  viewfinderRect.x.baseVal.value = (vidSize - capSize) / 2;
  viewfinderRect.y.baseVal.value = (vidSize - capSize) / 2;

  var svg = document.querySelector("#svg");
  svg.width = vidSize;
  svg.height = vidSize;
  svg.appendChild(viewfinderRect);
  setInterval(function() {
    viewfinderPulse += viewfinderPulseDelta;
    if (viewfinderPulse >= 1.0 || viewfinderPulse <= 0.3) {
      viewfinderPulseDelta = -viewfinderPulseDelta;
    }
    viewfinderRect.style.strokeOpacity = viewfinderPulse;
  }, 100);

  start();

  canvas.width = capSize;
  canvas.height = capSize;

  var onFailSoHard = function(e) {
    console.log('Error!', e);
  };

  var watchdogId = null;
  function resetLogWatchdog() {
    if (watchdogId) clearTimeout(watchdogId);
    watchdogId = setTimeout(function() {
      scanLog.innerText = "";
    }, 3000);
  }

  var areOffsetsUpdated = false;
  var clipX, clipY;
  function maybeUpdateOffsets() {
    if (areOffsetsUpdated)
      return;

    if (video.videoWidth > 0) {
      areOffsetsUpdated = true;
      var videoOffsetX = (video.videoWidth - vidSize) >> 1;
      var videoOffsetY = (video.videoHeight - vidSize) >> 1;
      video.style.webkitTransform = "rotateY(180deg)"
        + " translateX(" + videoOffsetX + "px)"
        + " translateY(" + videoOffsetY + "px)";
      clipX = (video.videoWidth >> 1) - (capSize >> 1);
      clipY = (video.videoHeight >> 1) - (capSize >> 1);
    }
  }

  function getMessage(s) {
    if(s == student) {
      student = "";
      return inMessage + s.replace("+", " ");
    } else {
      student = s;
      return s.replace("+", " ") + outMessage;
    }
  }

  function scanSnapshot() {
    if (localMediaStream) {
      maybeUpdateOffsets();
      if (areOffsetsUpdated) {
        ctx.drawImage(video, clipX, clipY, capSize, capSize,
                      0, 0, capSize, capSize);
      }
      try {
        qrcode.decode();
      } catch (e) {
        if (e != "Couldn't find enough finder patterns") {
          scanLog.innerText = e;
          resetLogWatchdog();
        }
        setTimeout(scanSnapshot.bind(this), 250);
      }
    }
  }

  function restartScan() {
    resetLogWatchdog();
    start();
    scanSnapshot();
  }

  var finish = function(result) {
    var postUrl = result.split('?')[0];
    var keyValue = result.split('?')[1];
    var s = keyValue.split('=')[1];

    var http = new XMLHttpRequest();
    http.open('POST', postUrl, true);
  
    //Send the proper header information along with the request
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
    http.send(keyValue);

    http.onreadystatechange = function() { 
      if (this.readyState === 4) {
        sign.innerText = getMessage(s);
        showElements(false);
        playSound(false);
        setTimeout(restartScan, 1500); 
      } 
      else if (this.status === 404) {
        scanLog.innerText = "404 NOT FOUND";
        setTimeout(restartScan, 1500); 
      } 
    };
  }

  qrcode.callback = finish;

  navigator.webkitGetUserMedia({video: true}, function(stream) {
    try {
      // Thanks https://github.com/killebrewj for the fix!
      video.srcObject = stream;
    } catch (e) {
      video.src = window.URL.createObjectURL(stream);
    }
    localMediaStream = stream;
    scanSnapshot();
  }, onFailSoHard);
}

