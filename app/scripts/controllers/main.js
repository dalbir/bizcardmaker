app.controller('MainCtrl', function($rootScope, $scope, $routeParams, $location, $timeout, $q) {
	'use strict';

	var model = $scope.model = {};

	model.iOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);

	model.cardPictureFile = '';
	model.cardPicture = '';
	model.generatingCard = false;
	model.generatingPdf = false;

	model.imageData = '';
	model.imageFilename = 'bizcardmaker-com.jpg';

	model.pdfData = '';
	model.pdfFilename = 'bizcardmaker-com.pdf';

	$scope.$on('$routeUpdate', function(){
		model.activeTheme = parseInt($routeParams.theme, 10) || 0;
	});

	$scope.$broadcast('$routeUpdate');

	model.themes = [
		{
			name: 'simple-black'
		},
		{
			name: 'simple-white'
		},
		{
			name: 'simple-blue'
		},
		{
			name: 'simple-dark-blue'
		},
		{
			name: 'simple-turquoise'
		},
		{
			name: 'simple-red'
		},
		{
			name: 'black-corners'
		},
		{
			name: 'black-white'
		},
		{
			name: 'diagonals'
		},
		{
			name: 'black-border'
		},
		{
			name: 'line-one'
		},
		{
			name: 'asphalt-half'
		}
	];

	$scope.$watch('model.cardPictureFile', function() {

		if(model.cardPictureFile) {

			var imageType = /image.*/;

			if (model.cardPictureFile.type.match(imageType)) {
				var reader = new FileReader();

				reader.onload = function() {

					$timeout(function() {
						model.cardPicture = reader.result;
					});

				};

				reader.readAsDataURL(model.cardPictureFile);

			} else {

				window.alert('File not supported!');

			}

		}

	});

	var generatePicture = function() {

		var deferred = $q.defer();

		var $cardPreview = $('.card-preview').get(0);

		// before generation, cleanup funky fontsizes
		// generated by the editor
		fixEditorSizes($cardPreview);

		model.generatingCard = true;

		if(model.iOS) {
			var popupWindow = window.open('/generating.html', '_blank');
		}

		html2canvas($cardPreview, {
			letterRendering: true,
			onrendered: function(canvas) {

				$timeout(function() {
					model.generatingCard = false;
				});

				deferred.resolve(canvas);

			}
		});

		return deferred.promise;

	};

	// clear all inline styles
	// generated by editor
	var cardChildren = document.querySelector('.card-preview').querySelectorAll('*');
	angular.forEach(cardChildren, function(c) {
		c.removeAttribute('style');
	});

	// because the editor uses funky x-small, xx-small, etc. font-sizes
	// I have to replace those with em sizes
	// so that I can later enlarge the entire business card with ems
	var fixEditorSizes = function(container) {
		var editors = container.querySelectorAll('[contenteditable]');

		var children,
			parentStyle,
			style;
		angular.forEach(editors, function(e) {
			children = e.querySelectorAll('*');
			parentStyle = window.getComputedStyle(e, null);
			angular.forEach(children, function(c) {
				if(c.style.fontSize.indexOf('em') === -1) {
					style = window.getComputedStyle(c, null);
					c.style.fontSize = parseInt(style.fontSize, 10) / parseInt(parentStyle.fontSize, 10) + 'em';
				}
			});
		});

		// fix dragged possitions
		var lists = container.querySelectorAll('li[style]'),
			picture = container.querySelector('.card-picture[style]');

		angular.forEach(lists, function(li) {
			if(li.style.left.indexOf('em') === -1) {
				parentStyle = window.getComputedStyle(li.parentNode, null);
				li.style.left = (parseInt(li.style.left, 10) / parseInt(parentStyle.fontSize, 10)) + 'em';
				li.style.top = (parseInt(li.style.top, 10) / parseInt(parentStyle.fontSize, 10)) + 'em';
			}
		});

		if(picture) {
			if(picture.style.left.indexOf('em') === -1) {
				parentStyle = window.getComputedStyle(picture.parentNode, null);

				picture.style.left = (parseInt(picture.style.left, 10) / parseInt(parentStyle.fontSize, 10)) + 'em';
				picture.style.top = (parseInt(picture.style.top, 10) / parseInt(parentStyle.fontSize, 10)) + 'em';
			}
		}

	};

	$scope.DownloadPdf = function() {

		model.generatingPdf = true;

		generatePicture().then(function(canvas) {
			model.generatingPdf = false;

			var doc = new jsPDF();

			var imgData = canvas.toDataURL('image/jpeg', 1.0);

			// full bleed size 92 x 54

			// place images on page
			for(var i = 0; i < 2; i++) {
				for(var j = 0; j < 5; j++) {
					doc.addImage(imgData, 'JPEG', 10 + i * 93, 10 + j * 55, 92, 54);
				}
			}

			if(model.iOS) {
				// mobile devices
				popupWindow.location.href = doc.output('dataurlstring');
			} else {
				doc.save(model.pdfFilename);
			}
		});

		// track analytics
		analytics.track('Download PDF', {
			category: 'Download',
			label: model.themes[model.activeTheme].name
		});


	};

	$scope.DownloadPicture = function() {

		generatePicture().then(function(canvas) {

			if(model.iOS) {

				// mobile devices
				model.imageData = canvas.toDataURL('image/jpeg', 1.0);
				popupWindow.location.href = model.imageData;

			} else {

				// make the canvas a blob, so we can download it with downloadify
				canvas.toBlob(
					function (blob) {

						// saveAs is global from Downloadify and FileSaver.js
						// Downloadify is included in jsPDF
						// FileSaver included from bower_components
						saveAs(blob, model.imageFilename);

					},
					'image/jpeg'
				);

			}
		});

		// track analytics
		analytics.track('Download picture', {
			category: 'Download',
			label: model.themes[model.activeTheme].name
		});

	};

	$scope.$on('$viewContentLoaded', function() {

		// extremely hacky way to implement dragging
		var $preview = $('.card-preview'),
			$picture = $preview.find('.card-picture'),
			$li = $preview.find('li');

		new Draggabilly($picture.get(0), {
			containment: $preview.get(0),
			handle: '.drag-handle',
			grid: [ 20, 20 ]
		});

		$li.each(function(i, li) {
			setTimeout(function() {
				var liDrag = new Draggabilly(li, {
					containment: $preview.get(0),
					handle: '.drag-handle',
					grid: [ 20, 20 ]
				});

				liDrag.on('dragStart', function() {
					$(li).addClass('drag-handle-show');
				});

				liDrag.on('dragEnd', function() {
					$(li).removeClass('drag-handle-show');
				});

			}, 1000);
		});

	});

});
