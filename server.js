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
 
  // ── Animals (mammals) ──
  "cat", "dog", "elephant", "lion", "tiger", "bear", "wolf", "fox", "rabbit",
  "horse", "cow", "pig", "sheep", "goat", "deer", "giraffe", "zebra", "hippo",
  "rhino", "gorilla", "chimpanzee", "orangutan", "baboon", "kangaroo", "koala",
  "platypus", "wombat", "panda", "polar bear", "grizzly bear", "leopard",
  "cheetah", "jaguar", "cougar", "hyena", "meerkat", "mongoose", "otter",
  "beaver", "squirrel", "chipmunk", "hedgehog", "porcupine", "armadillo",
  "sloth", "anteater", "tapir", "llama", "alpaca", "camel", "bison", "moose",
  "elk", "reindeer", "walrus", "seal", "sea lion", "dolphin", "whale", "orca",
  "manatee", "narwhal", "bat", "mole", "rat", "mouse", "hamster", "guinea pig",
 
  // ── Birds ──
  "eagle", "owl", "parrot", "penguin", "flamingo", "peacock", "toucan",
  "crow", "sparrow", "pigeon", "hawk", "falcon", "vulture", "albatross",
  "pelican", "stork", "heron", "crane", "ostrich", "emu", "kiwi", "swan",
  "goose", "duck", "turkey", "rooster", "hen", "woodpecker", "hummingbird",
  "kingfisher", "puffin", "seagull", "condor", "macaw", "cockatoo", "canary",
  "finch", "robin", "magpie", "raven", "nightingale", "swallow", "swift",
 
  // ── Reptiles & Amphibians ──
  "crocodile", "alligator", "lizard", "gecko", "iguana", "chameleon",
  "komodo dragon", "tortoise", "turtle", "snake", "cobra", "python",
  "anaconda", "frog", "toad", "salamander", "newt", "axolotl",
 
  // ── Sea creatures ──
  "shark", "fish", "clownfish", "swordfish", "octopus", "squid", "jellyfish",
  "crab", "lobster", "shrimp", "starfish", "seahorse", "stingray", "pufferfish",
  "anglerfish", "manta ray", "barracuda", "piranha", "salmon", "tuna",
  "goldfish", "blowfish", "clam", "oyster", "sea turtle", "coral",
 
  // ── Insects & bugs ──
  "butterfly", "bee", "ant", "mosquito", "dragonfly", "grasshopper",
  "cricket", "beetle", "ladybug", "firefly", "moth", "cockroach", "fly",
  "wasp", "hornet", "termite", "caterpillar", "centipede", "millipede",
  "scorpion", "spider", "tarantula", "praying mantis", "stick insect",
  "flea", "louse", "silkworm", "locust",
 
  // ── Anime characters ──
  "Naruto", "Sasuke", "Sakura", "Kakashi", "Goku", "Vegeta", "Gohan",
  "Piccolo", "Luffy", "Zoro", "Nami", "Sanji", "Usopp", "Robin",
  "Ichigo", "Rukia", "Orihime", "Aizen", "Edward Elric", "Alphonse Elric",
  "Roy Mustang", "Winry", "Mikasa", "Eren", "Armin", "Levi", "Historia",
  "Gojo", "Itadori", "Megumi", "Nobara", "Sukuna", "Light Yagami",
  "L Lawliet", "Ryuk", "Tanjiro", "Nezuko", "Zenitsu", "Inosuke", "Muzan",
  "Giyu", "Shinobu", "Rengoku", "Killua", "Gon", "Hisoka", "Kurapika",
  "Leorio", "Meruem", "Spike Spiegel", "Gintoki", "Saitama", "Genos",
  "All Might", "Deku", "Bakugo", "Todoroki", "Uraraka", "Aizawa",
  "Sailor Moon", "Vegeta", "Bulma", "Krillin", "Android 18", "Frieza",
  "Cell", "Majin Buu", "Broly", "Jiren", "Rem", "Emilia", "Subaru",
  "Asuna", "Kirito", "Leafa", "Sinon", "Yui", "Natsu", "Lucy", "Erza",
  "Gray", "Happy", "Zeref", "Mavis", "Inuyasha", "Kagome", "Sesshomaru",
  "Miroku", "Sango", "Totoro", "Spirited Away", "Howl", "Calcifer",
  "Conan Edogawa", "Shinichi", "Ran", "Heiji", "Kaito Kid", "Lupin III",
  "Jotaro", "Dio", "Giorno", "Jolyne", "Rohan", "Joseph Joestar",
  "Nami", "Boa Hancock", "Whitebeard", "Shanks", "Ace", "Sabo",
  "Kaido", "Big Mom", "Blackbeard", "Trafalgar Law", "Chopper",
  "Zero Two", "Hiro", "Ichika", "Naofumi", "Raphtalia", "Filo",
  "Rimuru", "Shuna", "Milim", "Benimaru", "Ainz Ooal Gown", "Albedo",
  "Shalltear", "Demiurge", "Cocytus", "Koneko", "Rias", "Issei",
  "Aqua", "Kazuma", "Darkness", "Megumin", "Yugi Moto", "Kaiba",
 
  // ── Famous places ──
  "Eiffel Tower", "Big Ben", "Colosseum", "Statue of Liberty", "Great Wall",
  "Taj Mahal", "Pyramids", "Stonehenge", "Machu Picchu", "Angkor Wat",
  "Acropolis", "Sagrada Familia", "Burj Khalifa", "Sydney Opera House",
  "Niagara Falls", "Grand Canyon", "Mount Everest", "Amazon River",
  "Sahara Desert", "Great Barrier Reef", "Victoria Falls", "Dead Sea",
  "Mount Fuji", "Leaning Tower of Pisa", "Louvre", "Vatican", "Alhambra",
  "Petra", "Chichen Itza", "Easter Island", "Yellowstone", "Serengeti",
  "Galapagos Islands", "Santorini", "Maldives", "Times Square", "Red Square",
  "Tower Bridge", "Golden Gate Bridge", "Hoover Dam", "Panama Canal",
  "Suez Canal", "Mount Kilimanjaro", "Himalaya", "Sahara", "Gobi Desert",
  "Nile River", "Congo Rainforest", "Antarctica", "Arctic", "Silicon Valley",
  "Hollywood", "Las Vegas", "Broadway", "Wall Street",
 
  // ── Countries ──
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Bolivia", "Brazil", "Canada", "Chile", "China",
  "Colombia", "Croatia", "Cuba", "Czech Republic", "Denmark", "Ecuador",
  "Egypt", "Ethiopia", "Finland", "France", "Germany", "Ghana", "Greece",
  "Hungary", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kenya", "Mexico", "Mongolia",
  "Morocco", "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway",
  "Pakistan", "Peru", "Philippines", "Poland", "Portugal", "Romania",
  "Russia", "Saudi Arabia", "South Africa", "South Korea", "Spain",
  "Sri Lanka", "Sweden", "Switzerland", "Thailand", "Turkey", "Ukraine",
  "United Kingdom", "United States", "Venezuela", "Vietnam", "Zimbabwe",
 
  // ── Continents ──
  "Africa", "Antarctica", "Asia", "Australia", "Europe",
  "North America", "South America",
 
  // ── Vehicles & transport ──
  "car", "bicycle", "motorcycle", "bus", "train", "airplane", "helicopter",
  "rocket", "submarine", "sailboat", "speedboat", "hot air balloon",
  "skateboard", "scooter", "tractor", "ambulance", "fire truck", "tank",
  "spacecraft", "cable car", "gondola", "canoe", "kayak", "ferry",
 
  // ── Food & drinks ──
  "pizza", "burger", "sushi", "taco", "pasta", "ramen", "sandwich",
  "hot dog", "pancake", "waffle", "donut", "croissant", "bagel", "pretzel",
  "ice cream", "cake", "cookie", "chocolate", "candy", "popcorn", "nachos",
  "salad", "soup", "steak", "fried chicken", "dumpling", "spring roll",
  "curry", "paella", "lasagna", "omelette", "spaghetti", "cheesecake",
  "apple", "banana", "strawberry", "watermelon", "mango", "pineapple",
  "coconut", "grape", "lemon", "orange", "cherry", "peach", "pear",
  "coffee", "tea", "milkshake", "lemonade", "smoothie",
 
  // ── Nature & weather ──
  "tree", "flower", "sun", "moon", "star", "cloud", "rainbow", "lightning",
  "tornado", "volcano", "earthquake", "tsunami", "glacier", "waterfall",
  "cave", "island", "mountain", "desert", "forest", "jungle", "swamp",
  "river", "lake", "ocean", "beach", "cliff", "valley", "canyon",
 
  // ── Everyday objects ──
  "house", "umbrella", "guitar", "clock", "castle", "ball", "chair",
  "table", "lamp", "telephone", "television", "computer", "keyboard",
  "camera", "telescope", "microscope", "compass", "map", "book", "pencil",
  "paintbrush", "scissors", "hammer", "wrench", "key", "lock", "mirror",
  "ladder", "rope", "backpack", "suitcase", "hat", "glasses", "crown",
  "sword", "shield", "bow", "arrow", "trophy", "medal", "flag",
  "lantern", "candle", "magnifying glass", "hourglass", "anchor",
  "treasure chest", "drum", "violin", "piano", "trumpet", "microphone",
 
  // ── Sports ──
  "football", "basketball", "baseball", "tennis", "volleyball", "cricket",
  "rugby", "golf", "boxing", "swimming", "surfing", "skiing", "snowboarding",
  "archery", "fencing", "wrestling", "gymnastics", "cycling", "marathon",
  "weightlifting", "diving", "rowing", "polo", "badminton", "table tennis",
 
  // ── Professions ──
  "doctor", "teacher", "firefighter", "police officer", "astronaut",
  "chef", "pilot", "soldier", "scientist", "engineer", "farmer", "sailor",
  "architect", "artist", "musician", "actor", "detective", "judge",
  "ninja", "pirate", "knight", "wizard", "superhero",
 
  // ── Mythical creatures ──
  "dragon", "unicorn", "phoenix", "mermaid", "centaur", "minotaur",
  "griffin", "hydra", "kraken", "werewolf", "vampire", "zombie", "ghost",
  "fairy", "goblin", "troll", "ogre", "cyclops", "sphinx", "yeti", "bigfoot",
  "leprechaun", "genie", "medusa", "cerberus",
 
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