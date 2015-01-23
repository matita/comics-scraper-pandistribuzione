var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var urls = require('url');

var baseUrl = 'http://www.pandistribuzione.it/web/guest/latest',
	pages = [baseUrl],
	comics = [],
	delay = 5000;

step();



function getSeries(title) { 
	return title.replace(/(.+?)(\s+(#|vol\.?|n\.?)?\s*(\d+)(\s+.+)?)?$/i,'$1');
}


function step() {
	var page = pages.shift()
		url = page && page.url || page;

	if (!page) {
		console.log('Saving file comics.json');
		fs.writeFile('comics.json', JSON.stringify(comics), function(err) {
			if (err)
				console.error('Error saving file comics.json', err);
			else
				console.log('File comics.json saved succesfully');
		});
	} else {
		console.log('-----');
		console.log('loading page', url);

		request(page, function(error, response, html) {
			if (error || response.statusCode != 200) {
				console.error(error, 'status:', response);
				return;
			}

			var $ = cheerio.load(html);
			$('.item').each(function(i) {
				var $item = $(this),
					$cover = $item.find('.cover img'),
					title = $cover.attr('alt');

				comics.push({
					title: title,
					cover: urls.resolve(url, $cover.attr('src')),
					outDate: $item.find('.desc h4').next().text().replace(/Acquistabile dal( (\d{1,2})\/(\d{1,2})\/(\d{2,4}))?\s*/i, '$4-$3-$2'),
					price: $item.find('.price strong').text(),
					publisher: $item.find('.logo_brand img').attr('alt'),
					subtitle: $item.find('.subtitle').text(),
					itemUrl: urls.resolve(url, $item.find('.desc h3 a').attr('href')),
					series: getSeries(title)
				});
			});

			
			var nextPage = $('.more .current').next().text();
			if (nextPage && nextPage.match(/^\d+$/)) {
				console.log('Next page:', nextPage);
				var $form = $('[name="displayItemSearchFilterForm"]');
				$form.find('[name="pager.offset"]').val(((+nextPage)-1)*20);

				var page = {
					url: $form.attr('action'),
					method: 'POST',
					form: {}
				};

				$form.find('input').each(function() {
					var $this = $(this);
					page.form[$this.attr('name')] = $this.val();
				});

				pages.push(page);
			}

			console.log('Found', comics.length, 'comics so far');
			console.log('Saving file comics.json');
			fs.writeFile('comics.json', JSON.stringify(comics), function(err) {
				if (err)
					console.error('Error saving file comics.json', err);
				else
					console.log('File comics.json saved succesfully');

				console.log('Waiting', delay / 1000, 'seconds for the next page');
				setTimeout(function() {
					step();
				}, delay);
			});
		});
	}
}