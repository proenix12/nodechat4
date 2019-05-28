const express = require('express');
const router = express.Router();
const Users = require('../models/users');
const passport = require('passport');
const bcrypt = require('bcryptjs');

/* GET users listing. */

router.get('/login', function (req, res) {
    res.render('login');
});

router.post('/login', function (req, res, next) {
    passport.authenticate('local', {
        successRedirect: '/app',
        failureRedirect: '/users/login',
        failureFlash: true
    })(req, res, next);
});

router.get('/register', function (req, res, next) {
    res.render('register');
});

router.post('/register', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.useremail;

    req.checkBody('username', 'Name is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('useremail', 'Password is required').notEmpty();
    req.checkBody('useremail', 'Please provide valid email').isEmail();

    let errors = req.validationErrors();
    let errorMsg = '';

    if (errors) {
        res.render('register', {errors: errors});

    } else {
        let query = {userName: username};
        Users.findOne(query, function (err, user) {
            if (err) throw err;
            if (user) {
                errorMsg = 'user is taken';
            } else {
                let users = new Users({
                    userName: username,
                    password: password,
                    email: email,
                });
                const saltRounds = 10;
                const myPlaintextPassword = password;

                bcrypt.genSalt(saltRounds, function (err, salt) {
                    bcrypt.hash(myPlaintextPassword, salt, function (err, hash) {
                        if (err) {
                            console.log(err);
                        }
                        users.password = hash;
                        users.save();
                        errorMsg = 'This is a flash message using the express-flash module.';
                    })
                });
            }
        });
        req.flash('success', errorMsg);
        res.redirect('/users/register');
    }
});

router.get('/logout', function (req, res) {
    req.logout();
    req.flash('success', 'You are logged out');
    res.redirect('/users/login');
});

module.exports = router;
