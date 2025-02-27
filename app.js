// Import Required Modules
    
const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');  // Import CORS
const path = require("path");
const fs = require("fs");


const app = express();
const PORT =  process.env.PORT || 9005;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

app.use(cors());
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve images

// MySQL Connection Setup
/*const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',        // Replace with your MySQL username
    password: 'root',        // Replace with your MySQL password
    database: 'CRM_DB'
});*/

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'CRM_DB'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Ensure Uploads Directory Exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure Multer for Image Upload
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage });

// Routes
app.get('/', (req, res) => {
    res.send('<h2>Welcome to the Login App!</h2>');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and Password are required!');
    }

    const query = 'SELECT username, password, EmployeeID,companyname, isActive FROM users WHERE username = ? AND password = ? AND isActive = 1';
    
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (results.length > 0) {
            const user = results[0]; // Get the first matching user
            res.status(200).json({
                message: `Welcome, ${user.username}! 🎉`,
                user: {
                    username: user.username,
                    EmployeeID: user.EmployeeID,
                    companyName:user.companyname
                }
            });
        } else {
            res.status(401).send('Invalid Username, Password, or Inactive Account!');
        }
    });
});

// Add this after the login route
app.post('/save-lead', (req, res) => {
    const { employeeid, name, email, phone, company, message } = req.body;

    if (!employeeid || !name || !email) {
        return res.status(400).send('Employee ID, Name, and Email are required!');
    }

    const query = 'INSERT INTO leads (employeeid, name, email, phone, company, message) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [employeeid, name, email, phone, company, message], (err, result) => {
        if (err) {
            console.error('Error saving lead:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.status(201).json({ message: 'Lead saved successfully!', leadId: result.insertId });
    });
});


// Get leads by EmployeeID
app.get('/get-leads/:employeeid', (req, res) => {
    const employeeid = req.params.employeeid;

    const query = 'SELECT * FROM leads WHERE employeeid = ?';
    db.query(query, [employeeid], (err, results) => {
        if (err) {
            console.error('Error fetching leads:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.status(200).json(results);
    });
});

app.post('/savecontacts', (req, res) => {
    const { employeeid,name, email, phone, company, position } = req.body;
    const sql = 'INSERT INTO contacts (employeeid,name, email, phone, company, position) VALUES (?,?, ?, ?, ?, ?)';

    db.query(sql, [employeeid,name, email, phone, company, position], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to save contact' });
        }
        res.status(201).json({ message: 'Contact saved successfully', id: result.insertId });
    });
});

app.get('/getcontact/:employeeid', (req, res) => {
    const employeeid = req.params.employeeid;

    // Validate employee ID
    if (isNaN(employeeid)) {
        return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const sql = 'SELECT * FROM contacts WHERE employeeId = ?';
    db.query(sql, [employeeid], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch contact' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        // Return all contacts if multiple exist
        res.json(result);
    });
});


// API to Save Opportunity
app.post('/add-opportunity', (req, res) => {
    const {employeeid, opportunity_name, client_name, stage, amount, close_date } = req.body;

    if (!opportunity_name || !client_name) {
        return res.status(400).json({ error: 'Opportunity Name and Client Name are required' });
    }

    const sql = `INSERT INTO opportunities (employeeid,opportunity_name, client_name, stage, amount, close_date)
                 VALUES (?, ?, ?, ?, ?,?)`;

    db.query(sql, [employeeid, opportunity_name, client_name, stage, amount, close_date], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to add opportunity' });
        }
        res.json({ message: 'Opportunity added successfully', id: result.insertId });
    });
});

// API to fetch opportunities by Employee ID
app.get('/opportunities/:employeeId', (req, res) => {
    const { employeeId } = req.params;
    const query = `SELECT * FROM opportunities WHERE employeeId = ?`;

    db.query(query, [employeeId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// API: Save User Profile
// API: Save User Profile
app.post('/api/saveProfile', (req, res) => {
    const { employeeid, full_name, email, phone, address, company } = req.body;

    const sql = `
        INSERT INTO userprofile (employeeid, full_name, email, phone, address, company) 
        VALUES (?, ?, ?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
            employeeid = VALUES(employeeid), 
            full_name = VALUES(full_name), 
            phone = VALUES(phone), 
            address = VALUES(address), 
            company = VALUES(company)
    `;

    db.query(sql, [employeeid, full_name, email, phone, address, company], (err, result) => {
        if (err) {
            console.error('Error saving user:', err);
            return res.status(500).json({ message: 'Failed to save user' });
        }
        res.json({ message: 'Profile saved/updated successfully' });
    });
});


app.get('/api/getProfile/:employeeid', (req, res) => {
    const { employeeid } = req.params;

    const sql = 'SELECT * FROM userprofile WHERE employeeid = ?';
    
    db.query(sql, [employeeid], (err, result) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ message: 'Failed to fetch user' });
        }
        
        if (result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(result[0]); // Return the user data
    });
});



app.delete('/delete-opportunity/:opportunityName', (req, res) => {
    const { opportunityName } = req.params;
    
    const sql = 'DELETE FROM opportunities WHERE opportunity_name = ?';
    
    db.query(sql, [opportunityName], (err, result) => {
        if (err) {
            console.error('Error deleting opportunity:', err);
            res.status(500).json({ message: 'Failed to delete opportunity' });
        } else {
            res.json({ message: 'Opportunity deleted successfully' });
        }
    });
});


app.put('/update-opportunity/:originalName', (req, res) => {
    const originalName = req.params.originalName;
    const { employeeid, opportunity_name, client_name, stage, amount, close_date } = req.body;

    const sql = `
        UPDATE opportunities 
        SET opportunity_name=?, client_name=?, stage=?, amount=?, close_date=?
        WHERE employeeid=? AND opportunity_name=?`;

    db.query(sql, [opportunity_name, client_name, stage, amount, close_date, employeeid, originalName], (err, result) => {
        if (err) {
            console.error('Error updating opportunity:', err);
            res.status(500).json({ message: 'Failed to update opportunity' });
        } else {
            res.json({ message: 'Opportunity updated successfully' });
        }
    });
});


app.get('/api/getCounts', (req, res) => {
    const { employeeId } = req.query; // Get employeeId from request query

    if (!employeeId) {
        return res.status(400).json({ message: 'Employee ID is required' });
    }

    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM leads WHERE employeeId = ?) AS leadCount,
            (SELECT COUNT(*) FROM contacts WHERE employeeId = ?) AS contactCount,
            (SELECT COUNT(*) FROM opportunities WHERE employeeId = ?) AS opportunityCount,
            (SELECT COUNT(*) FROM notes WHERE employeeId = ?) AS noteCount,
            (SELECT COUNT(*) FROM documents WHERE employeeId = ?) AS documentCount
    `;

    db.query(sql, [employeeId, employeeId, employeeId, employeeId, employeeId], (err, results) => {
        if (err) {
            console.error('Error fetching counts:', err);
            return res.status(500).json({ message: 'Failed to get counts' });
        }

        res.json(results[0]); // Return count object
    });
});



// **📌 API to Upload Documents**
app.post("/api/uploadDocument", upload.single("documentUpload"), (req, res) => {
    const { categoryName, companyName, employeeId } = req.body; // Ensure employeeId is extracted
    if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
    }

    const filePath = `${SERVER_URL}/uploads/${req.file.filename}`;

    const sql = "INSERT INTO documents (categoryName, companyName, filePath, employeeId) VALUES (?, ?, ?, ?)";
    db.query(sql, [categoryName, companyName, filePath, employeeId], (err, result) => {
        if (err) {
            console.error("Error inserting document:", err);
            return res.status(500).json({ message: "Failed to upload document" });
        }
        res.json({ message: "Document uploaded successfully", filePath });
    });
});


app.get("/api/getDocuments", (req, res) => {
    const { employeeId } = req.query; // Get employeeId from query parameters

    if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
    }

    const sql = "SELECT id, categoryName, companyName, filePath FROM documents WHERE employeeId = ?";

    db.query(sql, [employeeId], (err, results) => {
        if (err) {
            console.error("Database fetch error:", err);
            return res.status(500).json({ message: "Error fetching documents" });
        }

        res.json(results); // Send the filtered document list
    });
});


app.post("/api/saveNote", (req, res) => {
    const { noteText, employeeId } = req.body;

    if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
    }

    const sql = "INSERT INTO notes (noteText, employeeId) VALUES (?, ?)";
    db.query(sql, [noteText, employeeId], (err, result) => {
        if (err) {
            console.error("Error saving note:", err);
            return res.status(500).json({ message: "Failed to save note" });
        }
        res.json({ message: "Note saved successfully" });
    });
});

app.get("/api/getNotes/:employeeId", (req, res) => {
    const employeeId = req.params.employeeId;

    const sql = "SELECT * FROM notes WHERE employeeId = ? ORDER BY createdAt DESC";
    db.query(sql, [employeeId], (err, results) => {
        if (err) {
            console.error("Error fetching notes:", err);
            return res.status(500).json({ message: "Failed to fetch notes" });
        }
        res.json(results);
    });
});

// **API: Add Product**
app.post('/products', (req, res) => {
    const { name, category, price, stock,employeeId } = req.body;
    const sql = 'INSERT INTO products (name, category, price, stock ,employeeId) VALUES (?, ?, ?, ?,?)';
    db.query(sql, [name, category, price, stock,employeeId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to add product' });
        }
        res.json({ message: 'Product added successfully', id: result.insertId });
    });
});

// **API: Update Product**
app.put('/products/:id', (req, res) => {
    const { name, category, price, stock } = req.body;
    const { id } = req.params;
    const sql = 'UPDATE products SET name = ?, category = ?, price = ?, stock = ? WHERE id = ?';
    db.query(sql, [name, category, price, stock, id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update product' });
        }
        res.json({ message: 'Product updated successfully' });
    });
});

// **API: Delete Product**
app.delete('/products/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM products WHERE id = ?', [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete product' });
        }
        res.json({ message: 'Product deleted successfully' });
    });
});

app.get('/products/:employeeid', (req, res) => {
    const { employeeid } = req.params; // Get employeeid from URL

    if (!employeeid) {
        return res.status(400).json({ error: "Employee ID is required" });
    }

    const sql = 'SELECT * FROM products WHERE employeeId = ?';

    db.query(sql, [employeeid], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch products' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'No products found for this employee' });
        }
        res.json(results);
    });
});


// Add a new sale
app.post('/sales', (req, res) => {
    const { employeeId, productId, customerName, customerEmail, customerPhone, customerAddress, quantity, totalPrice } = req.body;

    // Validate input fields (Check for null or empty values)
    if (!customerName || !customerEmail || !customerPhone || !customerAddress) {
        return res.status(400).json({ error: 'Customer details cannot be empty' });
    }

    // Insert customer details into the database
    db.query('INSERT INTO customers (employeeId, name, email, phone, address) VALUES (?, ?, ?, ?, ?)', 
        [employeeId, customerName, customerEmail, customerPhone, customerAddress], 
        (err, customerResult) => {
            if (err) return res.status(500).json({ error: 'Failed to save customer' });

            const customerId = customerResult.insertId;
            
            // Insert sales record
            db.query('INSERT INTO sales (employeeId, productId, customerId, quantity, total_price) VALUES (?, ?, ?, ?, ?)', 
                [employeeId, productId, customerId, quantity, totalPrice], 
                (err, saleResult) => {
                    if (err) return res.status(500).json({ error: 'Failed to record sale' });
                    res.json({ message: 'Sale recorded successfully', saleId: saleResult.insertId });
                }
            );
        }
    );
});






// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
