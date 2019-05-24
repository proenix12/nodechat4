const LocalStrategy = require('passport-local').Strategy;
let Users = require('../models/users');
const config = require('../config/database');
let bcrypt = require('bcryptjs');

module.exports = function(passport){
    // Local Strategy
    passport.use(new LocalStrategy(function(username, password, done){
        // Match Username
        let query = {userName:username};
        Users.findOne(query, function(err, user){
            if(err) throw err;
            if(!user){
                return done(null, false, {message: 'No user found'});
            }

            // Match Password
            console.log(user.password);
            bcrypt.compare(password, user.password, function(err, res){
                if(err) throw err;

                console.log(res);
                if(res){
                    return done(null, user);
                } else {
                    return done(null, false, {message: 'Wrong password'});
                }

            });
        });
    }));

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        Users.findById(id, function(err, user) {
            done(err, user);
        });
    });
};