(function() {

	var soundFiles = [
		"A_KICK_02.wav",
		"B_SNARE_2.wav",
		"G_HAT_9.wav"
	];
	var  contextProto = window.AudioContext || window.webkitAudioContext || (function() {throw "ruh roh, no audioContext"})()
		,context = new contextProto()
		,sounds = {}
		,soundBuffer
		;
	_.each(soundFiles, function(sound) {
		getSound('/audio/' + sound).done(audioGraph(sound));
	});

	window.enterArea.add(function(data) {
		var sound = soundFiles[data.sound];
		if (!sounds[sound]) return console.log(sounds[sound] + " not yet loaded");
		var ss = context.createBufferSource();
		ss.buffer = context.createBuffer(sounds[sound], true /* make mono */ )
		ss.connect(context.destination);
		ss.connect(context.destination);
		ss.noteOn(0);
	});

	function getSound(url) {
		return $.Deferred(function(d) {
			var request = new XMLHttpRequest();
			request.open("GET", url, true);
			request.responseType = "arraybuffer";
			request.onload = function() {
				d.resolve(request.response, request);
			}
			request.onerror = function() {
				d.reject(request.response, request);
			}
			request.send();
		});
	}

	function audioGraph(sound) {
		return function(audioData) {
			sounds[sound] = audioData;
		}
	}

})();