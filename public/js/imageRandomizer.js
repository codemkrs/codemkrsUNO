(function () {
	var body = $('body');
	var images = $('.visualEffects');
	var random = function(max) {
		return Math.floor(Math.random()*max)
	};
	var randomImage = images.eq(random(images.length) );
	var xBounds = body.width() - randomImage.width();
	var yBounds = body.height() - randomImage.height();
	var xCoord = random(xBounds);
	var yCoord = random(yBounds);

	$('.visualEffects').css({position:absolute, left:xCoord, top:yCoord});
	randomImage.appendTo(body).show().fadeOut(200);
})()