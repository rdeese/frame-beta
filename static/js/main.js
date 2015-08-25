'use strict';

var remoteVideo;
var localVideo;
var targetCanvas;
var canvasInput;
var otherClientDiv;
var hangupButton;
var headLocP;
var htracker;
var seriously;
var localSource;
var remoteSource;
var transform;
var target;

// FUNCTIONS!
function connectSuccess (e, message) {
	console.log("Connection successful with: ", message);
}

function connectFailure (e, message) {
	console.log("Connection failed with: ", message);
}

function handleUserMedia(stream) {
  console.log('Adding local stream.');

	// easyrtc stuff
	easyrtc.setVideoObjectSrc(localVideo, easyrtc.getLocalStream());
	easyrtc.connect("cdg", connectSuccess, connectFailure);

	htracker.init(localVideo, canvasInput, false);
	htracker.start();	
	document.addEventListener('headtrackingEvent', function (e) {
		// This translation seems natural
		transform.translateX = 20*e.x;
		transform.translateY = 20*e.y;

		// print tracking output to screen
		//headLocP.innerHTML = ~~e.x + ", " + ~~e.y + ", " + ~~e.z;

		if (e.z > 0) {
			// this equation works well for Rupert, with Semolina, at the stand up desk.
			// var scale = 0.03*e.z-0.05;

			// this equation seems to be friendly to users
			var scale = 0.01*e.z + 2;
			transform.scaleX = scale;
			transform.scaleY = scale;
		}
	});
	renderLocalVideo();
}

function renderLocalVideo () {
	seriously.stop();
	// mirror effect
	transform.rotationY = 180;
	transform.source = localSource;
	seriously.go();
}


function renderRemoteVideo () {
	seriously.stop();
	// undo mirror effect
	transform.rotationY = 0;
	transform.source = remoteSource;
	seriously.go();
}

function handleRemoteMedia (callerEasyrtcid, stream) {
	easyrtc.setVideoObjectSrc(remoteVideo, stream);
	renderRemoteVideo();
}

function handleRemoteHangup (callerEasyrtcid) {
	hangupButton.style.display = 'none';
	otherClientDiv.style.display = 'block';
	easyrtc.setVideoObjectSrc(remoteVideo, "");
	renderLocalVideo();
}

function roomListener(roomName, otherPeers) {
	while (otherClientDiv.hasChildNodes()) {
		otherClientDiv.removeChild(otherClientDiv.lastChild);
	}

	var info;
	if (Object.keys(otherPeers).length > 0) {
		info = document.createTextNode("Click on a user to make a call:");
	} else {
		info = document.createTextNode("No other users are available.");
	}
	otherClientDiv.appendChild(info);

	for(var i in otherPeers) {
		var button = document.createElement('button');
		button.onclick = function(easyrtcid) {
			return function() {
				performCall(easyrtcid);
			}
		}(i);

		var label = document.createTextNode(easyrtc.idToName(i));
		button.appendChild(label);
		otherClientDiv.appendChild(button);
	}
}

function performCall (easyrtcid) {
	easyrtc.call(
		easyrtcid,
		function (easyrtcid) { console.log("Call made to " +easyrtcid); },
		function (errorCode, errorText) { console.log("err: " + errorText); },
		function (accepted, bywho) {
			console.log((accepted?"accepted":"rejected")+ " by " + bywho);
			if (accepted) {
				hangupButton.onclick = function (easyrtcid) {
					return function () {
						easyrtc.hangup(easyrtcid);
						hangupButton.style.display = 'none';
						otherClientDiv.style.display = 'block';
					}
				}(easyrtcid);
				hangupButton.style.display = 'block';
				otherClientDiv.style.display = 'none';
			}
		}
	);
}

function main () {
	// get the DOM elements we need
	remoteVideo = document.querySelector('#remoteVideo');
	localVideo = document.querySelector('#localVideo');
	targetCanvas = document.querySelector('#targetCanvas');
	canvasInput = document.querySelector('#inputCanvas');
	otherClientDiv = document.getElementById('otherClients');
	hangupButton = document.querySelector('#hangupButton');
	headLocP = document.querySelector('#headloc');

	// Seriously.js setup
	seriously = new Seriously();
	localSource = seriously.source('#localVideo');
	remoteSource = seriously.source('#remoteVideo');
	transform = seriously.transform('3d');
	target = seriously.target('#targetCanvas');
	target.source = transform;
	target.width = window.innerWidth;
	target.height = window.innerHeight;

	// head tracking setup
	htracker = new headtrackr.Tracker({
		cameraOffset: 0,
		fov: 58.5 // calculated using Yoshiki's pocket ruler: width ~112mm at ~100mm from camera
	});

	// keypress listeners
	window.addEventListener("keypress", function (e) {
		console.log(e.keyCode);
		if (e.keyCode == 114 || e.keyCode == 82) { // 'r' key for reset
			htracker.stop();
			console.log("tracker reset");
			htracker.start();
		}
		if (e.keyCode == 102 || e.keyCode == 70) { // 'r' key for reset
			targetCanvas.requestFullscreen();
		}
	}, false);


	window.onresize = function () {
		target.width = window.innerWidth;
		target.height = window.innerHeight;
	}

	// easyrtc setup
	var name = prompt("Please enter a username");
	if (name != null && name != "") {
		easyrtc.setUsername(name);
	}
	easyrtc.setVideoDims(1280,720);
	easyrtc.setRoomOccupantListener(roomListener);
	easyrtc.setStreamAcceptor(handleRemoteMedia);
	easyrtc.setOnStreamClosed(handleRemoteHangup);
	easyrtc.initMediaSource(handleUserMedia);
}

// run main once the page is loaded
window.onload = main;
