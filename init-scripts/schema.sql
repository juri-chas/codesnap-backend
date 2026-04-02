CREATE TABLE
    users (
        user_id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    );

CREATE TABLE
    code_snippets (
        snippet_id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(100) NOT NULL,
        code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    );

create table
    comments (
        comment_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        snippet_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (snippet_id) REFERENCES code_snippets (snippet_id) ON DELETE CASCADE
    );

create table
    code_languages (
        language_id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL UNIQUE
    );