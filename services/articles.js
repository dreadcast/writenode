import ArticleCollection from './../Article/ArticleCollection';
import ArticleModel from './../Article/ArticleModel';
import Path from 'path';
import fs from 'fs-extra';
import marked from 'marked';
import Bluebird from 'bluebird';
import FrontMatter from 'front-matter';
import Lowerdash from 'lowerdash';

export default function(Writenode){
	let articles = new ArticleCollection,
		readFile = Bluebird.promisify(fs.readFile),
		readdir = Bluebird.promisify(fs.readdir),
		{ timestamp, getService } = Writenode,
		{ pathToBlog, defaultTemplates, pathToTheme } = getService('conf');

	articles.setDefaultTemplates(defaultTemplates, pathToTheme);

	function parseMarkdown(rawMarkdown, filePath){
		let { attributes, body } = FrontMatter(rawMarkdown);

		if(typeof attributes.tags == 'string'){
			attributes.tags = attributes.tags.split(/,\s?/);
		}

		attributes.id = filePath.replace('data/', '').replace('/data.md', '');
		var parsedContent = body.match(/#(.*)\n/);

		if(parsedContent){
			attributes.title = parsedContent[1];
			attributes.content = marked(parsedContent.input.replace(parsedContent[0], ''));

		} else {
			attributes.content = body;
		}

		if(attributes.medias){
			attributes.medias.forEach(media => {
				if(!media.id){
					media.id = media.url;
				}
			});
		}

		return Bluebird.resolve(attributes);
	}

	function setArticleAttributes(attributes){
		let article = new ArticleModel({
			id: attributes.id,
			url: attributes.id
		}, {
			pathToBlog
		});

		article.on('change:tags', article => {
			articles.addTags(article.get('tags'));
		});

		return Bluebird.resolve({ attributes, article });
	}

	function setArticleTemplates(attributes){
		let defaultTemplates = articles.getDefaultTemplates('article');

		if(attributes.templates){
			let articleTemplates = articles.setTemplatesPath(attributes.templates, pathToTheme);

			Lowerdash.assign(attributes.templates, defaultTemplates, articleTemplates);
		} else {
			attributes.templates = defaultTemplates;
		}

		return Bluebird.resolve(attributes);
	}

	function cache(){

	}

	let watcher = Writenode.getService('watcher');

	function handleFileChange(filePath){
		// console.info('UPDATE ARTICLE: ', filePath);

		return readFile(filePath, {
				encoding: 'utf-8'
			})
			.catch(error => console.error(error))
			.then(rawMarkdown => parseMarkdown(rawMarkdown, Path.relative(pathToBlog, filePath)))
			.then(setArticleTemplates)
			.then(setArticleAttributes)
			.then(({ attributes, article }) => {
				articles.add(article);
				article.set(attributes);

				// console.info(attributes);
				return article;
			});
	}

	return watcher.addChangeHandler([
		pathToBlog + '/data/**/data.md'
	], path => handleFileChange(path))
		.then(a => articles);
}
