const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const hbs = require('hbs');
const net = require('net'); // Node.js module to check TCP connections

const app = express();
const port = 3000;

// Set the view engine to 'hbs'
app.set('view engine', 'hbs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Define servers for status checking
const servers = [
  {
    name: 'Server 1',
    host: 'ccscloud.dlsu.edu.ph',
    port: 21952,
    user: 'user'
  },
  {
    name: 'Server 2',
    host: 'ccscloud.dlsu.edu.ph',
    port: 21961,
    user: 'server1'
  },
  {
    name: 'Server 3',
    host: 'ccscloud.dlsu.edu.ph',
    port: 21972,
    user: 'vince'
  },
];

// Helper function to check server status
const checkServerStatus = async () => {
  const statuses = await Promise.all(
    servers.map(async (server) => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 5000; // 5 seconds timeout

        socket.setTimeout(timeout);

        socket
          .connect(server.port, server.host, () => {
            socket.destroy(); // Clean up
            resolve({ name: server.name, status: 'Online' });
          })
          .on('error', () => {
            resolve({ name: server.name, status: 'Offline' });
          })
          .on('timeout', () => {
            socket.destroy(); // Clean up on timeout
            resolve({ name: server.name, status: 'Offline' });
          });
      });
    })
  );

  return statuses;
};

// MySQL Connection Setup
const createDBConnection = () => {
  return mysql.createConnection({
    host: 'ccscloud.dlsu.edu.ph',
    user: 'user', // Replace with your MySQL username
    password: 'Str0ngP@ss!', // Replace with your MySQL password
    database: 'server1', // Replace with your database name
    port: 21952,
    connectTimeout: 10000, // Set timeout for connection
  });
};

let db = null;
let dbConnected = false; // Track MySQL connection status

// Try connecting to MySQL and log result (Initial connection attempt)
const tryConnecting = () => {
  db = createDBConnection();
  db.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err.message);
      dbConnected = false;
    } else {
      console.log('Connected to MySQL database.');
      dbConnected = true;
    }
  });
};

// Try connecting to the database on app start
tryConnecting();

// Register HBS helpers
hbs.registerHelper('eq', function (a, b) {
  return a === b;
});
hbs.registerHelper('formatDate', function (date) {
  const formattedDate = new Date(date).toISOString().replace('T', ' ').substring(0, 19);
  return formattedDate;
});

// Routes
app.get('/report', (req, res) => {
  res.render('report.hbs');
});

app.get('/insert', (req, res) => {
  res.render('insert.hbs');
});

const validColumns = [
  'Game_ID', 'Game_Name', 'Release_Date', 'Developer', 'Publisher',
  'Price', 'Genres', 'Positive_Reviews', 'Negative_Reviews'
];

app.get('/', async (req, res) => {
  const { filterBy, search } = req.query; // Get filter and search query parameters
  const column = validColumns.includes(filterBy) ? filterBy : 'Game_ID'; // Validate the column
  let sqlQuery = 'SELECT * FROM mco2';

  // Add filtering conditionally
  if (search) {
    sqlQuery += ` WHERE ${column} LIKE ?`; // Add search filter
  }

  try {
    const [records, serverStatuses] = await Promise.all([
      new Promise((resolve, reject) => {
        if (dbConnected) {
          db.query(sqlQuery, [`%${search}%`], (err, rows) => {
            if (err) reject(err); // Handle DB errors
            else resolve(rows); // Pass query results
          });
        } else {
          resolve([]); // Return empty array if DB is unavailable
        }
      }),
      checkServerStatus(), // Call server status check function
    ]);

    // Render the 'home.hbs' view with both game records and server statuses
    res.render('home.hbs', {
      records, // Pass fetched game records (empty if DB is down)
      serverStatuses, // Pass server statuses
      searchOption: filterBy, // Current search option
      search, // Current search input
    });
  } catch (err) {
    console.error('Error fetching data:', err.message);
    res.send('Error fetching data');
  }
});

// Serve static files from the 'views' directory
app.use(express.static(path.join(__dirname, 'views')));

// Periodic MySQL reconnect attempt (every 5 seconds)
setInterval(() => {
  if (!dbConnected) {
    console.log('Attempting to reconnect to MySQL...');
    tryConnecting();
  }
}, 5000);

// Start the Express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
