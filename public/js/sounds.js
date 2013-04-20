(function() {

	var soundFiles = [{
		kick: "A_KICK_02.wav"
	}, {
		snare: "B_SNARE_2.wav"
	}, {
		hihat: "G_HAT_9.wav"
	}]
	var contextProto = window.AudioContext || window.webkitAudioContext || (function() {
		throw "ruh roh, no audioContext"
	})(),
		context = new contextProto(),
		sounds = {},
		soundBuffer;

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

	_.each(soundFiles, function(sound) {
		getSound('/audio/' + sound).done(audioGraph(sound));
	});
	
	window.enterArea.add(function(data){
		var sound = _.find(list, function(value,key){return key === data.sound;};
  		if (!sounds[sound[data.sound]]) return console.log(data.sound + " not yet loaded");
		var ss = context.createBufferSource();
		ss.buffer = context.createBuffer(sounds[sound[data.sound]], true /* make mono */ )
		ss.connect(context.destination);
		ss.connect(context.destination);
		ss.noteOn(0);
	});
})();