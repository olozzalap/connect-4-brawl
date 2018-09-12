const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
	name: {
		type: String
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
	// id: {
	// 	type: String,
	// 	default: 
	// }
});

module.exports = User = mongoose.model('user', UserSchema);