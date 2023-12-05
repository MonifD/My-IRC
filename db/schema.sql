DROP DATABASE IF EXISTS ts_server;
CREATE DATABASE ts_server;

USE ts_server;

CREATE TABLE IF NOT EXISTS roles (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);


CREATE TABLE IF NOT EXISTS channels (
    id INT NOT NULL AUTO_INCREMENT,
    channel_name varchar(255),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    channel_id INT NOT NULL,
    content VARCHAR(5000) NOT NULL,
    date_time  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (channel_id) REFERENCES channels (id)
);

CREATE TABLE inter_channel_user (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    channel_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (channel_id) REFERENCES channels (id)
);

INSERT INTO roles (name) VALUES('chatter');
INSERT INTO roles (name) VALUES('admin');
INSERT INTO channels (channel_name, id) VALUES('main', 1);
INSERT INTO users (username, password, role_id) VALUES ('charlie', 'toto', 1);
INSERT INTO users (username, password, role_id) VALUES ('mathieu', 'toto', 1);
INSERT INTO users (username, password, role_id) VALUES ('claire', 'toto', 1);
INSERT INTO users (username, password, role_id) VALUES ('caroll', 'adminpass', 2);

