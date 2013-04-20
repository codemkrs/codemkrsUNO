$(function(){

var container = $('.video-container');
var images = $('.visualEffect');

window.enterArea.add(function () {
	var randomImage = images.eq( _.random(0, images.length) );
	var xBounds = container.width() - randomImage.width();
	var yBounds = container.height() - randomImage.height();
	var xCoord = _.random(0, xBounds);
	var yCoord = _.random(0, yBounds);

	randomImage.css({left:xCoord, top:yCoord});
	randomImage.show().fadeOut(_.random(250, 500));
});

})