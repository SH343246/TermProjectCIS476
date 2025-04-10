from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model): #Represents the user, storing things like balance, login info, sequrity questions
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    security_question_1 = db.Column(db.String(100))
    security_answer_1 = db.Column(db.String(100))
    security_question_2 = db.Column(db.String(100))
    security_answer_2 = db.Column(db.String(100))
    security_question_3 = db.Column(db.String(100))
    security_answer_3 = db.Column(db.String(100))
    balance = db.Column(db.Float, default=0.0)
    cars = db.relationship('Car', backref='owner', lazy=True)
    bookings = db.relationship('Booking', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Car(db.Model): #Various car information stored in the database, like the id, make, model
    id = db.Column(db.Integer, primary_key=True)
    make = db.Column(db.String(50), nullable=False)
    model = db.Column(db.String(50), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    price_per_day = db.Column(db.Float, nullable=False)
    location = db.Column(db.String(100), nullable=False)
    available = db.Column(db.Boolean, default=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    bookings = db.relationship('Booking', backref='car', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "make": self.make,
            "model": self.model,
            "year": self.year,
            "price_per_day": self.price_per_day,
            "location": self.location,
            "available": self.available
        }

class Booking(db.Model): # Represents the bookings that users can make, covering the car, user id, start/end dates
    id = db.Column(db.Integer, primary_key=True)
    car_id = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='pending')

    def to_dict(self):
        return {
            "id": self.id,
            "car_id": self.car_id,
            "user_id": self.user_id,
            "start_date": self.start_date.strftime("%m/%d/%Y"),
            "end_date": self.end_date.strftime("%m/%d/%Y"),
            "status": self.status
        }


class Message(db.Model): # message info, id, content, etc. are also stored
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(256))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_messages')

class Payment(db.Model): #Payment information is stored aswell such as the sender, id, and amount
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id', name='fk_payment_sender'),
        nullable=False
    )
    receiver_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id', name='fk_payment_receiver'),
        nullable=False
    )
    amount = db.Column(db.Float, nullable=False)
    booking_id = db.Column(
        db.Integer,
        db.ForeignKey('booking.id', name='fk_payment_booking'),
        nullable=False
    )
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
