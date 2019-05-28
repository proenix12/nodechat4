let mongoose = require('mongoose');

let userSchema = mongoose.Schema({
    userName:{
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
    friends: {
        type: Array,
    }
});

let Users = module.exports = mongoose.model('Users', userSchema);
