-- Návrh databázové struktury pro Revizone App

-- 1. Uživatelé (Zákazníci, Technici, Admini)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'technician', 'admin') NOT NULL DEFAULT 'customer',
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(255), -- Pro firemní zákazníky
    ico VARCHAR(20),
    dic VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Objednávky revizí
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    technician_id INT, -- Může být NULL, dokud není přiřazen technik
    status ENUM('new', 'waiting_payment', 'paid', 'scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'new',
    service_type VARCHAR(100) NOT NULL, -- např. 'elektro_byt', 'hromosvod', 'plyn'
    property_address TEXT NOT NULL, -- Adresa objektu revize
    property_details JSON, -- Specifické detaily (velikost bytu, počet okruhů atd.)
    scheduled_date DATETIME, -- Naplánovaný termín
    price DECIMAL(10, 2),
    valid_until DATE, -- Důležité pro "Hlídač termínů"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (technician_id) REFERENCES users(id)
);

-- 3. Dokumenty (Revizní zprávy, Faktury)
CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    uploader_id INT NOT NULL, -- Kdo nahrál (technik nebo admin)
    file_type ENUM('report', 'invoice', 'photo', 'other') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (uploader_id) REFERENCES users(id)
);

-- 4. Zprávy (Komunikace mezi zákazníkem a technikem/adminem)
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- 5. Notifikace (Upozornění na termíny, zprávy)
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('expiry_warning', 'new_message', 'order_update') NOT NULL,
    content VARCHAR(255) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
