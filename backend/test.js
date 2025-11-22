const express = require('express');
const app = express();
const PORT = 5000;

// Basic middleware only
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Minimal server working!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Minimal server running on http://localhost:${PORT}`);
});