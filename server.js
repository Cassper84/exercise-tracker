const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI);

const UserSchema = new Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const ExerciseSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});
const Exercise = mongoose.model('Exercise', ExerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    console.log("Received username:", username);

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const newUser = new User({ username });
    const savedUser = await newUser.save();
    console.log("User saved:", savedUser);

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    console.error("Error while creating user:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users.map(user => ({
      username: user.username,
      _id: user._id
    })));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id.toString(),
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });
  } catch (err) {
    res.status(500).json({ error: 'Error saving exercise' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    const filter = { userId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const limitNum = parseInt(limit) || 500;

    const exercises = await Exercise.find(filter).limit(limitNum);

    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id.toString(),
      log
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
