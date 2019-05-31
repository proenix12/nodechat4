let mongoose = require('mongoose')
    , Schema = mongoose.Schema;

let userSchema = Schema({
    userName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        required: true
    },
    friends: [{ type: Schema.Types.ObjectId, ref: 'Friends' }]
});

var friendSchema = Schema({
    _creator : { type: Number, ref: 'Users' },
    title    : String,
    fans     : [{ type: Number, ref: 'Users' }]
});
let Users = mongoose.model('Users', userSchema);
let userFriends = mongoose.model('Friends', friendSchema);
module.exports = {
    'Users': Users,
    'Friends': userFriends
};
