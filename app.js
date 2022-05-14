
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require("mongoose")
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20')
const findOrCreate = require('mongoose-findorcreate')
const FacebookStrategy = require('passport-facebook')


const app = express()

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))

const PORT = 3000

app.use(session({
    secret: 'This is little secret',
    resave: false,
    saveUninitialized: false
    // cookie: { secure: true }
}))
app.use(passport.initialize())
app.use(passport.session())

mongoose.connect('mongodb://0.0.0.0:27017/userDB')

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
})
userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema)

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username, name: user.displayName });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

// Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRETS,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile)
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

//Facebook OAuth
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRETS,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile)
        User.findOrCreate({ facebookId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get('/', (req, res) => {
    res.render('home')
})

//google
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }))

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

// facebook
app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/register', (req, res) => {
    res.render('register')
})

app.get('/secrets', (req, res) => {
    // if(req.isAuthenticated()){
    // res.render('secrets')
    // } else {
    //     res.redirect('/login')
    // }
    User.find({ "secret": { $ne: null } }, (err, foundUser) => {
        if (err) {
            console.log(err)
        } else {
            if (foundUser) {
                res.render("secrets", { usersWithSecrets: foundUser })
            }
        }
    })
})

app.get('/submit', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('submit')
    } else {
        res.redirect('/login')
    }
})

app.get('/logout', (req, res) => {
    req.logout()
    res.redirect("/")
})

app.post('/register', (req, res) => {

    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            console.log(err)
            res.render('/register')

        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect('/secrets')
            })
        }
    })


})

app.post('/login', (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user, (err) => {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect('/secrets')
            })
        }
    })

})

app.post('/submit', (req, res) => {
    const submittedSecret = req.body.secret

    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err)
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret
                foundUser.save(() => {
                    res.redirect('/secrets')
                })
            }
        }
    })
})

app.listen(PORT, (req, res) => {
    console.log(`App is listen on port ${PORT}`)
})