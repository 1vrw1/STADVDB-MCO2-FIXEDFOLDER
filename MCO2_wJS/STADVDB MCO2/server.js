const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Replace with your MySQL username
  password: '', // Replace with your MySQL password
  database: 'game_records', // Replace with your database name
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database.');
});

// POST form submission
app.post('/gamedata', (req, res) => {
  const {
    game_id,
    name,
    release_date,
    about_game,
    developer,
    publisher,
    price,
    genres,
    positive_reviews,
    negative_reviews,
  } = req.body;

  // SQL Query
  const query = `
    INSERT INTO games (game_id, name, release_date, about_game, developer, publisher, price, genres, positive_reviews, negative_reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    game_id,
    name,
    release_date,
    about_game,
    developer,
    publisher,
    price,
    genres,
    positive_reviews,
    negative_reviews,
  ];

  // Fetch games endpoint
app.get('/games', (req, res) => {
    const { column, operator, value, limit } = req.query;

    let query = 'SELECT * FROM games';
    const queryParams = [];

    if (column && operator && value) {
        query += ` WHERE ?? ${operator} ?`;
        queryParams.push(column, value);
    }
    if (limit) {
        query += ' LIMIT ?';
        queryParams.push(Number(limit));
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: 'Database query failed.' });
            return;
        }
        res.json(results);
    });
});

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      res.status(500).json({ error: 'Database insertion failed.' });
      return;
    }
    res.json({ message: 'Game record added successfully.', id: result.insertId });
  });
});

// Update a game record
app.put('/games/:game_id', (req, res) => {
    const { game_id } = req.params;
    const data = req.body;

    const query = `
        UPDATE games SET 
        name = ?, release_date = ?, about_game = ?, developer = ?, publisher = ?, 
        price = ?, genres = ?, positive_reviews = ?, negative_reviews = ?
        WHERE game_id = ?`;

    const values = [
        data.name, data.release_date, data.about_game, data.developer, data.publisher,
        data.price, data.genres, data.positive_reviews, data.negative_reviews, game_id,
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating record:', err);
            res.status(500).json({ error: 'Failed to update record.' });
            return;
        }
        res.json({ message: 'Record updated successfully.' });
    });
});

// Delete a game record
app.delete('/games/:game_id', (req, res) => {
    const { game_id } = req.params;

    const query = 'DELETE FROM games WHERE game_id = ?';
    db.query(query, [game_id], (err, result) => {
        if (err) {
            console.error('Error deleting record:', err);
            res.status(500).json({ error: 'Failed to delete record.' });
            return;
        }
        res.json({ message: 'Record removed successfully.' });
    });
});

// Top 10 genres
app.get('/reports/top-genres', (req, res) => {
    const query = 'SELECT genre AS name, COUNT(*) AS count FROM games GROUP BY genre ORDER BY count DESC LIMIT 10';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).send(err);
            return;
        }
        res.json(results);
    });
});

// Most used platforms
app.get('/reports/top-platforms', (req, res) => {
    const query = 'SELECT platform AS name, COUNT(*) AS count FROM games GROUP BY platform ORDER BY count DESC';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).send(err);
            return;
        }
        res.json(results);
    });
});

// Highest positive reviews
app.get('/reports/highest-positive-reviews', (req, res) => {
    const query = 'SELECT name, positive_reviews FROM games ORDER BY positive_reviews DESC LIMIT 10';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).send(err);
            return;
        }
        res.json(results);
    });
});

// Most reviews
app.get('/reports/highest-reviews', (req, res) => {
    const query = 'SELECT name, (positive_reviews + negative_reviews) AS total_reviews FROM games ORDER BY total_reviews DESC LIMIT 10';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).send(err);
            return;
        }
        res.json(results);
    });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});