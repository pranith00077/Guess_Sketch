const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

const TURN_DURATION = 60; // seconds

const words = [
  // Animals
  "cat",
  "dog",
  "cow",
  "goat",
  "sheep",
  "horse",
  "donkey",
  "pig",
  "rabbit",
  "mouse",
  "rat",
  "lion",
  "tiger",
  "elephant",
  "monkey",
  "bear",
  "deer",
  "fox",
  "wolf",
  "zebra",
  "giraffe",
  "kangaroo",
  "panda",
  "camel",
  "hippo",
  "rhino",
  "crocodile",
  "snake",
  "frog",
  "turtle",
  "fish",
  "shark",
  "dolphin",
  "whale",
  "octopus",
  "crab",
  "starfish",
  "penguin",

  // Birds
  "bird",
  "crow",
  "parrot",
  "peacock",
  "pigeon",
  "duck",
  "hen",
  "chicken",
  "rooster",
  "eagle",
  "owl",
  "swan",
  "sparrow",
  "flamingo",
  "ostrich",

  // Insects
  "ant",
  "bee",
  "butterfly",
  "spider",
  "mosquito",
  "fly",
  "ladybug",
  "grasshopper",
  "dragonfly",

  // Basic Pokemon
  "pikachu",
  "charmander",
  "bulbasaur",
  "squirtle",
  "jigglypuff",
  "meowth",
  "psyduck",
  "snorlax",
  "eevee",
  "charizard",
  "mewtwo",

  // Daily use things
  "phone",
  "laptop",
  "computer",
  "keyboard",
  "mouse",
  "chair",
  "table",
  "bed",
  "sofa",
  "door",
  "window",
  "fan",
  "light",
  "bulb",
  "clock",
  "watch",
  "bag",
  "book",
  "pen",
  "pencil",
  "eraser",
  "sharpener",
  "scale",
  "bottle",
  "cup",
  "plate",
  "spoon",
  "fork",
  "knife",
  "glass",
  "mirror",
  "brush",
  "comb",
  "soap",
  "towel",
  "shoe",
  "shirt",
  "pants",
  "cap",
  "umbrella",
  "key",
  "lock",
  "wallet",
  "money",
  "camera",
  "remote",
  "television",
  "fridge",
  "stove",
  "oven",
  "bucket",
  "basket",
  "pillow",
  "blanket",

  // Food
  "apple",
  "banana",
  "mango",
  "orange",
  "grapes",
  "watermelon",
  "pineapple",
  "strawberry",
  "coconut",
  "carrot",
  "potato",
  "tomato",
  "onion",
  "corn",
  "pizza",
  "burger",
  "sandwich",
  "cake",
  "ice cream",
  "chocolate",
  "bread",
  "egg",
  "rice",
  "noodles",
  "milk",
  "tea",
  "coffee",

  // Vehicles
  "car",
  "bus",
  "bike",
  "bicycle",
  "train",
  "truck",
  "tractor",
  "auto",
  "boat",
  "ship",
  "plane",
  "helicopter",
  "rocket",
  "scooter",

  // Nature
  "sun",
  "moon",
  "star",
  "cloud",
  "rain",
  "tree",
  "flower",
  "leaf",
  "mountain",
  "river",
  "sea",
  "beach",
  "island",
  "forest",
  "fire",
  "snow",
  "rainbow",
  "grass",
  "rock",

  // Places and buildings
  "house",
  "school",
  "college",
  "hospital",
  "shop",
  "temple",
  "church",
  "mosque",
  "bank",
  "park",
  "zoo",
  "bridge",
  "road",
  "farm",
  "castle",

  // Sports and games
  "ball",
  "bat",
  "football",
  "cricket",
  "basketball",
  "tennis",
  "volleyball",
  "chess",
  "carrom",
  "kite",

  // Simple actions/objects
  "smile",
  "heart",
  "gift",
  "crown",
  "ring",
  "flag",
  "map",
  "ladder",
  "bell",
  "drum",
  "guitar",
  "balloon",
  "robot",
  "ghost",
  "alien",
  "snowman"
];

function getRandomWord(excludeWord = "") {
  const pool = words.filter(w => w !== excludeWord);
  return pool[Math.floor(Math.random() * pool.length)];
}

function startTurn(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.players.length === 0) return;

  // Clear any existing timer
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  const currentDrawer = room.players[room.currentDrawerIndex];
  room.currentWord = getRandomWord(room.currentWord);
  room.timeLeft = TURN_DURATION;
  room.turnActive = true;

  // Clear canvas for everyone
  io.to(roomCode).emit("clear-canvas");

  // Tell everyone who is drawing
  io.to(roomCode).emit("turn-started", {
    drawerId: currentDrawer.id,
    drawerName: currentDrawer.name,
    timeLeft: TURN_DURATION
  });

  // Send word only to current drawer
  io.to(currentDrawer.id).emit("your-word", room.currentWord);

  // Only start countdown when there are other players to guess
  if (room.players.length < 2) return;

  // Start countdown
  room.timerInterval = setInterval(() => {
    if (!rooms[roomCode]) {
      clearInterval(room.timerInterval);
      return;
    }

    room.timeLeft -= 1;
    io.to(roomCode).emit("timer-update", { timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      room.turnActive = false;

      io.to(roomCode).emit("chat-message", {
        name: "System",
        message: `Time is up! The word was: ${room.currentWord}`
      });

      setTimeout(() => {
        nextTurn(roomCode);
      }, 2000);
    }
  }, 1000);
}

function nextTurn(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.players.length === 0) return;

  room.currentDrawerIndex = (room.currentDrawerIndex + 1) % room.players.length;
  startTurn(roomCode);
}

function getSortedLeaderboard(room) {
  return [...room.players].sort((a, b) => b.score - a.score);
}

app.get("/random-room", (req, res) => {
  const availableRooms = Object.keys(rooms).filter((roomCode) => {
    return rooms[roomCode].players.length > 0;
  });

  if (availableRooms.length === 0) {
    return res.json({ success: false, message: "No rooms available" });
  }

  const randomRoomCode = availableRooms[Math.floor(Math.random() * availableRooms.length)];
  res.json({ success: true, roomCode: randomRoomCode });
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ name, roomCode }) => {
    socket.join(roomCode);

    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        players: [],
        currentDrawerIndex: 0,
        currentWord: "",
        timeLeft: TURN_DURATION,
        timerInterval: null,
        turnActive: false
      };
    }

    rooms[roomCode].players.push({ id: socket.id, name, score: 0 });

    socket.data.roomCode = roomCode;
    socket.data.name = name;

    const room = rooms[roomCode];

    io.to(roomCode).emit("players-updated", getSortedLeaderboard(room));

    io.to(roomCode).emit("chat-message", {
      name: "System",
      message: `${name} joined the game.`
    });

    if (room.players.length === 1) {
      startTurn(roomCode);
    } else {
      // Send current turn state to the newly joined player
      const currentDrawer = room.players[room.currentDrawerIndex];
      io.to(socket.id).emit("turn-started", {
        drawerId: currentDrawer.id,
        drawerName: currentDrawer.name,
        timeLeft: room.timeLeft
      });
      io.to(socket.id).emit("timer-update", { timeLeft: room.timeLeft });

      // If this is the second player and timer has not started yet, kick it off
      if (room.players.length === 2 && !room.timerInterval) {
        room.timerInterval = setInterval(() => {
          if (!rooms[roomCode]) { clearInterval(room.timerInterval); return; }
          room.timeLeft -= 1;
          io.to(roomCode).emit("timer-update", { timeLeft: room.timeLeft });
          if (room.timeLeft <= 0) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
            room.turnActive = false;
            io.to(roomCode).emit("chat-message", {
              name: "System",
              message: "Time is up! The word was: " + room.currentWord
            });
            setTimeout(() => { nextTurn(roomCode); }, 2000);
          }
        }, 1000);
      }
    }
  });

  socket.on("draw", (data) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;

    const currentDrawer = room.players[room.currentDrawerIndex];
    if (currentDrawer.id !== socket.id) return;

    socket.to(roomCode).emit("draw", data);
  });

  socket.on("clear-canvas-request", () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;

    const currentDrawer = room.players[room.currentDrawerIndex];
    if (currentDrawer.id !== socket.id) return;

    io.to(roomCode).emit("clear-canvas");
  });

  socket.on("send-message", (message) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;

    const currentDrawer = room.players[room.currentDrawerIndex];

    if (currentDrawer.id === socket.id) {
      io.to(socket.id).emit("chat-message", {
        name: "System",
        message: "Drawer cannot guess the word."
      });
      return;
    }

    const playerName = socket.data.name;

    io.to(roomCode).emit("chat-message", { name: playerName, message });

    if (message.trim().toLowerCase() === room.currentWord.toLowerCase()) {
      // Stop timer
      if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
      }
      room.turnActive = false;

      // Add score
      const guesserPlayer = room.players.find(p => p.id === socket.id);
      if (guesserPlayer) guesserPlayer.score += 10;

      io.to(roomCode).emit("players-updated", getSortedLeaderboard(room));

      io.to(roomCode).emit("correct-guess", {
        name: playerName,
        message: `${playerName} guessed it right! (+10 pts)`
      });

      setTimeout(() => {
        nextTurn(roomCode);
      }, 2000);
    }
  });

  socket.on("leave-room", () => {
    handleDisconnect(socket, true);
  });

  socket.on("disconnect", () => {
    handleDisconnect(socket, false);
  });
});

function handleDisconnect(socket, voluntary) {
  const roomCode = socket.data.roomCode;
  if (!roomCode || !rooms[roomCode]) return;

  const room = rooms[roomCode];
  const playerName = socket.data.name || "A player";

  const disconnectedIndex = room.players.findIndex(p => p.id === socket.id);
  room.players = room.players.filter(p => p.id !== socket.id);

  io.to(roomCode).emit("chat-message", {
    name: "System",
    message: `${playerName} left the game.`
  });

  if (room.players.length === 0) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    delete rooms[roomCode];
    return;
  }

  if (disconnectedIndex <= room.currentDrawerIndex) {
    room.currentDrawerIndex = Math.max(0, room.currentDrawerIndex - 1);
  }
  room.currentDrawerIndex = room.currentDrawerIndex % room.players.length;

  io.to(roomCode).emit("players-updated", getSortedLeaderboard(room));

  // If the disconnected player was the drawer, start a new turn
  if (disconnectedIndex === room.currentDrawerIndex || room.turnActive === false) {
    startTurn(roomCode);
  } else {
    startTurn(roomCode);
  }
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});