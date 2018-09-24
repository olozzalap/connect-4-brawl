const mongoose = require('mongoose');
const User = require('./User');
const Schema = mongoose.Schema;

const GameSchema = new Schema({
	// Each sub-array represents each of the seven game board columns going from top to bottom, left to right
	// Each value is false when unused and will be updated with a users id once the space is occupied. For example from this newBoard if a user (id: '123') selects the third column than newBoard[2][5] === '123'. If the competing user (id: '456') then selects the third column again, since the bottom position (newBoard[2][5]) is occupied, than newBoard[2][4] === '456'
	boardState: {
		type: Array,
		default: [
			[false, false, false, false, false, false],
			[false, false, false, false, false, false],
			[false, false, false, false, false, false],
			[false, false, false, false, false, false],
			[false, false, false, false, false, false],
			[false, false, false, false, false, false],
			[false, false, false, false, false, false]
		]
	},
	users: [ {
		name: {type: String},
		userId: {type: Schema.Types.ObjectId, ref: 'User'},
		isTurn: {
			type: Boolean,
			required: true
		}
	}],
	winner: {type: String},
	createdAt: {
		type: Date,
		default: Date.now()
	},
	finishedAt: {
		type: Date
	}
});

module.exports = Game = mongoose.model('game', GameSchema);