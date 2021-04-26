const express = require("express");
const app = express();
const fs = require("fs");
var formidable = require("formidable");
// var { getVideoDuration } = require("get-video-duration");
// const cors = require('cors')
// app.use(cors())
const server = require('http').Server(app)
const mongoose = require('mongoose');
const sha256 = require('js-sha256');
const session = require('express-session');
var bodyParser = require("body-parser");
const { type } = require('os');
app.use(bodyParser.urlencoded({ extended: true })); 
app.set('view engine', 'ejs')
app.use(express.static('public'))
var ObjectId = require('mongoose').Types.ObjectId; 


app.use(session({ 
  secret: "John Wick", 
  resave: false, 
  saveUninitialized: false
}));

mongoose.connect("mongodb+srv://harsh:harshmistry@cluster0.uiiax.mongodb.net/CCMiniproject?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
}).then(() => {
  console.log('Mongo Connection Successful');
}).catch(err => {
  console.log('ERROR:', err.message);
})

// Schemas
var UserSchema = new mongoose.Schema(
  { 
   user_name: {
        type: String,
        require: true
      },
   user_password: {
        type: String,
        require: true
      },
   email:  {
        type: String,
        require: true
      },
    contact: {
      type: String,
      require: true
    }
},{collection: 'users'});

var PostSchema = new mongoose.Schema(
  { 
   title: {
        type: String,
        require: true
      },
   file_name: {
        type: String,
        require: true
      },
   description:  {
        type: String,
        require: true
      },
    user_email: {
      type: String,
      require: true
    },
    user_name: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      require: true
    }
},{collection: 'posts'});

var Users = mongoose.model('Users',UserSchema);
var Posts = mongoose.model('Posts',PostSchema);

const redirectLogin = (req, res, next) => {
  if (!req.session.email){
    res.redirect('/login');
  }
  else{
    next();
  }
}

app.get('/login', (req, res) => {
  res.render('login', { message: "", message_category: 'danger' })
})

app.post('/login', (req, res) => {
  var email = req.body.email;
  var password = req.body.password;

  Users.findOne({email: email, user_password: sha256(password)}, (err, data) => {
    if (err) {
      console.log(err);
      res.render('login', { message: "Something went wrong !!!", message_category: 'danger' });
    }
    else{
      if(data == null){
          res.render("login", {message: "Invalid Email or Password !!!", message_category: 'danger'});
      }
      else{
        // User exits
        console.log(data);
        req.session.user = data;
        req.session.email = email;
        req.session.name = data.user_name;
        res.redirect('/upload_post');
      }
    }
  });

})

app.get('/logout', redirectLogin, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      res.redirect('/')
    }
    else{
      res.redirect('/login')
    }
  })
})

app.get('/register', (req, res) => {
  res.render('register', { message: "", message_category: 'danger' });
})

app.post('/register', (req, res) => {
  var name = req.body.name;
  var email = req.body.email;
  var contact = req.body.contact;
  var password = req.body.password;
  var confirm_password = req.body.confirm_password;

  // check if user already exists
  Users.findOne({email: email}, (err, data) => {
    if (err) {
      console.log(err);
      res.render('register', { message: "Something went wrong !!!", message_category: 'danger' });   
    }
    else{
      if(data == null){
        // no user with this email make new one
        if (password != confirm_password){
          res.render('register', { message: "Passwords does not match.", message_category: 'danger' }); 
        }
        else{
          Users.create(
            {
              user_name: name,
              user_password: sha256(password),
              email: email,
              contact: contact 
            },
            function (err, Users) {
              if (err) {
                console.log(err);
              }
              else {
                console.log(Users);
              }
            }
          );
          res.render("login", { message: "User Created Successfully.", message_category: 'success'});
        }
      }
      else{
        // User already exits
        res.render('register', { message: "User already exists.", message_category: 'danger'}); 
      }
    }
  });
})



app.get("/upload_post", redirectLogin, (req, res) => {
    var user = req.session.user;
    res.render('upload_post', {user: user, message: "", message_category: 'success'})
});

app.post("/upload_post", redirectLogin, (req, res) => {
    var user = req.session.user;
    var formData = new formidable.IncomingForm();
    formData.maxFileSize = 1000 * 1024 * 1024;
    formData.parse(req, function (error, fields, files) {
        var title = fields.title;
        var description = fields.description;
        console.log(files);
        var oldPathImage = files.image.path;
        var imageName = new Date().getTime() + "-" + files.image.name;
        var newPath = "public/assets/images/" + imageName;
        fs.rename(oldPathImage, newPath, function (error) {
            if(error){
                console.log(error);
                res.render('upload_post', {user: user, message: "Something Went Wrong", message_category: 'danger'});
            }
            else{
                Posts.create({
                    title: title,
                    file_name: imageName,
                    description: description,
                    user_email: user.email,
                    user_name: user.user_name,
                    date: new Date(),
                }, function (err, posts) {
                    if (err) {
                      console.log(err);
                        res.render('upload_post', {user: user, message: "Something Went Wrong", message_category: 'danger'});
                    }
                    else{
                        console.log(posts);
                        res.render('upload_post', {user: user, message: "Post Uploaded Successfully", message_category: 'success'});
                    }
                });
            }
        });
    });
});

app.get("/posts", redirectLogin, (req, res) => {
    var user = req.session.user;

    Posts.find({}, (err, data) => {
        if(err){
            console.log(err);
            res.render('posts', {user: user, posts: null});
        }
        else{
            console.log(data);
            res.render('posts', {user: user, posts: data});
        }
    });
});


app.get("/my_posts", redirectLogin, (req, res) => {
    var user = req.session.user;

    Posts.find({user_email: user.email}, (err, data) => {
        if(err){
            console.log(err);
            res.render('my_posts', {user: user, posts: null});
        }
        else{
            console.log(data);
            res.render('my_posts', {user: user, posts: data});
        }
    });
});



app.get("/edit_post/:post_id", redirectLogin, (req, res) => {
    var user = req.session.user;
    var postid = req.params.post_id;

    console.log(postid);
    Posts.findOne({_id: ObjectId(postid)}, (err, data) => {
        if(err){
            console.log(err);
            res.redirect("/my_posts");
        }
        else{
            console.log(data);
            res.render('edit_post', {user: user, post: data, message: "", message_category: 'success'})
        }
    });

});

app.post("/edit_post/:post_id", redirectLogin, (req, res) => {
    var user = req.session.user;
    var postid = req.params.post_id;

    console.log(postid);
    Posts.findOne({_id: ObjectId(postid)}, (err, data) => {
        if(err){
            console.log(err);
            res.redirect("/my_posts");
        }
        else{
            console.log(data);

            var formData = new formidable.IncomingForm();
            formData.maxFileSize = 1000 * 1024 * 1024;

            formData.parse(req, function (error, fields, files) {
              var title = fields.title;
              data.title = title;

              var description = fields.description;
              data.description = description;

              console.log(files.image.name);
              if(files.image.name != ""){
                var oldPathImage = files.image.path;
                var imageName = new Date().getTime() + "-" + files.image.name;
                var newPath = "public/assets/images/" + imageName;
                data.file_name = imageName;
                fs.rename(oldPathImage, newPath, function (error) {
                    if(error){
                        console.log(error);
                        res.render('edit_post', {user: user, message: "Something Went Wrong", message_category: 'danger'});
                    }
                    else{
                        console.log(imageName);
                    }
                });
              }
              
              data.save();

             });
            
          res.render('edit_post', {user: user, post: data, message: "Post Updated Successfully", message_category: 'success'})
        }
    });

});


app.get("/delete_post/:post_id", redirectLogin, (req, res) => {
  var user = req.session.user;
  var postid = req.params.post_id;

  console.log(postid);
  Posts.deleteOne({_id: ObjectId(postid)}, (err,_) => {
      if(err){
          console.log(err);
        }
      res.redirect("/my_posts");     
  });

});


server.listen(process.env.PORT||3030, "0.0.0.0")