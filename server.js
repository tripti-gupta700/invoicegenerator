
const Invoice = mongoose.model('Invoice', invoiceSchema);
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const mongoose = require("mongoose");

// Set up MongoDB connection
mongoose.connect('mongodb://localhost:27017/invoiceDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.log("Error connecting to MongoDB:", err));

// Create a schema for storing invoice data
const invoiceSchema = new mongoose.Schema({
    customerName: String,
    invoiceDate: String,
    items: Array,
    totalAmount: Number,
    invoicePath: String,
    createdAt: { type: Date, default: Date.now }
});



const app = express();
const PORT = 5000;

app.get('/invoice-history', async (req, res) => {
    const invoices = await Invoice.find({});
    res.json(invoices);
});

app.use(cors());
app.use(bodyParser.json());

// Serve frontend files (Assuming index.html is in 'public' folder)
app.use(express.static("public"));
app.use(express.static("invoices"));
app.use('/invoices', express.static('invoices'));


// API to generate an invoice PDF
app.post("/generate-invoice", async (req, res) => {
    const { customerName, invoiceDate, items, totalAmount } = req.body;

    // Create a new PDF document
    const doc = new PDFDocument();
    const filePath =`invoices/${customerName.replace(/\s+/g, "_")}_invoice.pdf`;

    doc.pipe(fs.createWriteStream(filePath));

    // Add invoice content
    doc.fontSize(20).text("Invoice", { align: "center" }).moveDown();
    doc.fontSize(14).text(`Customer: ${customerName}`);
    doc.text(`Date: ${invoiceDate}`).moveDown();
    doc.fontSize(12).text("Items:", { underline: true });
    items.forEach((item, index) => {
        doc.text(`${index + 1}. ${item.name} - Qty: ${item.quantity} @ ₹${item.price} = ₹${item.total}`);
    });
    doc.moveDown().fontSize(16).text(`Total Amount: ₹${totalAmount}`, { bold: true });
    doc.end();

    // Save invoice to MongoDB
    const invoice = new Invoice({
        customerName,
        invoiceDate,
        items,
        totalAmount,
        invoicePath: filePath
    });

    try {
        await invoice.save();
        res.json({ message: "Invoice generated", path: `/invoices/${customerName.replace(/\s+/g, "_")}_invoice.pdf` });

    } catch (error) {
        res.status(500).json({ error: "Error saving invoice to database" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
