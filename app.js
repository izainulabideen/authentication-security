
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require("mongoose")
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')


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
    password: String
})
userSchema.plugin(passportLocalMongoose)

const User = new mongoose.model('User', userSchema)

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
    res.render('home')
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/register', (req, res) => {
    res.render('register')
})

app.get('/secrets' , (req , res)=>{
    if(req.isAuthenticated()){
    res.render('secrets')
    } else {
        res.redirect('/login')
    }
})

app.get('/logout' , (req , res)=>{
    req.logout()
    res.redirect("/")
})

app.post('/register', (req, res) => {

    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            console.log(err)
            res.render('/register')

        } else {
            passport.authenticate("local")(req , res , ()=>{
                res.redirect('/secrets')
            })
        }
    })


})

app.post('/login', (req, res) => {

    const user = new User({
        username : req.body.username,
        password : req.body.password 
    })
    req.login(user , (err)=>{
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local")(req , res , ()=>{
                res.redirect('/secrets')
            })
        }
    })

})

app.listen(PORT, (req, res) => {
    console.log(`App is listen on port ${PORT}`)
})