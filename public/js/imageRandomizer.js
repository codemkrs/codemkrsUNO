$(function(){

var  container = $('.video-container')
	,video = $('.video', container)
	,videoContainerWidth = container.width()
	,containerPadding = parseInt( container.css('padding'), 10)
	,halfPadding = containerPadding / 2
	,images = $('.visualEffect')
	,orientOn = _.pairs({'top': 'left', 'right': 'top', 'bottom': 'left', 'left':'top'})
	;
window.enterArea.add(_.throttle(function () {
	var randomImage = images.eq( _.random(0, images.length) );
	randomImage.hide().css({ left: 'auto', top: 'auto', right: 'auto', bottom: 'auto'}); //reset

	var orientation = orientOn[_.random(3)];
	var position = {}
	position[orientation[0]] = _.random(halfPadding);
	position[orientation[1]] = _.random(videoContainerWidth)

	randomImage.css(position).show().fadeOut(_.random(250, 800));
}, 250));

})