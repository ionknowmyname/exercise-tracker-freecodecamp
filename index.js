const express = require('express')
const mongoose = require('mongoose');
const app = express()
const cors = require('cors')
require('dotenv').config()



// Basic Configuration
const port = process.env.PORT || 3000;

const  uri = process.env.DB_URI;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 7000
});

const connection = mongoose.connection;

connection.on('error', console.error.bind(console, 'Connnection  error: '));
connection.once('open', () => {
  console.log("MongoDB connected successfully");

  app.listen(port, () => {
    console.log('Your app is listening on port ' + port)
  })
})



app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware error handling
app.use((err, req, res, next) => {
  let errCode;
  let errMessage;

  if (err.errors) {
      //mongoose validation error
      errCode = 400 // bad request
      const keys = Object.keys(err.errors);
      //report the first validation error
      errMessage = err.errors[keys[0]].message
  } else {
      //generic custom error
      errCode = err.status || 500
      errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt').send(errMessage)
});

//create userSchema
let userSchema = new mongoose.Schema({
  username: String
});

let User = mongoose.model('User', userSchema);


// create exerciseShema
let exerciseSchema = new mongoose.Schema({
  userId: {
      type: String,
      required: true
  },
  description: {
      type: String,
      required: true
  },
  duration: {
      type: Number,
      required: true
  },
  date: {
      type: Date,
      default: Date.now
  }
});

let Exercise = mongoose.model('Exercise', exerciseSchema);




// Add new user
app.post('/api/users', async (req, res) => {
  let username = req.body.username;

  try {
    const userExists = await User.findOne({ username });

    if (userExists) {
      res.send('the username <' + username + ' > has already been taken :(');
    } else {
      let newUser = new User({
          username: username
      });

      newUser.save()
      .then((createdUser) => {
        res.json({
          username: createdUser.username,
          _id: createdUser._id
        });
      }).catch((err) => {
        console.log(err);
      });
      
    }   
     
  } catch (err) {
    console.log(err);
  }   

});

//get all users 
app.get('/api/users', async (req, res) => {

  let output = [];
  try{
    const users = await User.find({});
    users.map((user) => {
      output.push(user);
    });

    res.send(output);
  } catch (err) {
    console.log(err);
  }
});




// Add new exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  let userId = req.params._id;
  // let userId = req.body._id;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;
  if (!date) {
    date = new Date(date).toISOString().substring(0, 10);;
  }

  try {
    const user = await User.findById(userId);

    if(user) {
      let newExercise = new Exercise({
          userId: user._id,
          description: description,
          duration: duration,
          date: date
      });
      

      newExercise.save()
      .then((createdExercise) => {
        res.json({
          _id: user._id,
          username: user.username,
          date: createdExercise.date.toDateString(),
          duration: createdExercise.duration,
          description: createdExercise.description,          
        });
      }).catch((err) => {
        console.log(err);
      });
      
    }
  } catch (err) {
    console.log(err);
  }
})

//get list of all exercises per user
app.get('/api/users/:_id/logs', async (req, res) => {
  let userId = req.params._id;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;

  if (from === undefined) {
    from = new Date(0);
  }
  if (to === undefined) {
      to = new Date();
  }
  if (limit === undefined) {
      limit = 0;
  } else {
      limit = parseInt(limit);
  }


  try {
    const user = await User.findById(userId);

    if(user) {
      let exercises = await Exercise.find({
        userId: user._id,
        date: { $gte: from, $lte: to }
      }).select('description duration date _id')
      .sort({ date: -1 }).limit(limit).exec(); 

      let parsedDatesLog = exercises.map((exercise) => {
        return {
          description: exercise.description,
          duration: exercise.duration,
          date: new Date(exercise.date).toDateString(),
        };
      });
    
      res.json({
        _id: user._id,
        username: user.username,
        count: parsedDatesLog.length,
        log: parsedDatesLog,
      });
    }

  } catch (err) {
    console.log(err);
  }
});





// const listener = app.listen(process.env.PORT || 3000, () => {
//   console.log('Your app is listening on port ' + listener.address().port)
// })
