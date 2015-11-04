import { clean, stripTags, truncate } from 'superscore.string';
import MediaCollection from './../Media/MediaCollection';
import SuperModel from './../base/SuperModel';
import { omit } from 'lowerdash';
import Yaml from 'json2yaml';

var schema = {
	'id': {},
	'source': {},
	'geo.lat': {},
	'geo.lng': {},
	// 'templates': {},
	'title': {
		change: clean
	},
	'tags': {
		forceType: 'array'
	},
	'created': {
		forceType: 'date'
	},
	'status': {},
	'path': {},
	'content': {},
	'summary': {
		compute(){
			var str = this.get('content');

			str = clean(str);
			str = stripTags(str);
			str = truncate(str, 300);

			return str;
		}
	},
	'cover': {},
	'medias': {},
	'mediaCollection': {
		initial(){
			return new MediaCollection();
		}
	},
};

export default class ArticleModel extends SuperModel {
	toJSON(){
		var rawObj = super.toJSON();

		rawObj.medias = this.get('mediaCollection')
			.map(media => media.toJSON());

		return omit(rawObj, 'mediaCollection');
	}

	setSchema(){
		this.schema = schema;

		return this;
	}

	toMarkDown(){
		var rawAttributes = this.get('rawAttributes');

		rawAttributes.created = rawAttributes.created.toJSON();
		rawAttributes.medias = this.get('mediaCollection').toYAML();

		var attributes = Yaml.stringify(rawAttributes),
			markdown = this.get('markdown');

		return attributes + markdown;
	}
}
