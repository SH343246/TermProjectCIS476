from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from config import Config
from models import db, User, Car, Booking, Message
from datetime import datetime
from cop_passwordrecovery import PasswordRecoveryChain
from singleton_userauthandencrypt import SessionManager
from observer_bookingnotifications import booking_observer
from builder_carlisting import CarBuilder
import os

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, supports_credentials=True)


db.init_app(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

# -------------- Authentication-----#
@app.route("/register", methods=["POST"]) # Registers a new user, by creating username, email, security questions, and password fields
def register():
    data = request.get_json()
    
    required_fields = [
        "username", "email", "password",
        "security_question_1", "security_answer_1",
        "security_question_2", "security_answer_2",
        "security_question_3", "security_answer_3"
    ]
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 400

    try:
        user = User(
            username=data["username"],
            email=data["email"],
            security_question_1=data["security_question_1"],
            security_answer_1=data["security_answer_1"],
            security_question_2=data["security_question_2"],
            security_answer_2=data["security_answer_2"],
            security_question_3=data["security_question_3"],
            security_answer_3=data["security_answer_3"]
        )
        user.set_password(data["password"])
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "User registered successfully!"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route("/login", methods=["POST"])
def login(): #logs in the user via an email and password, as well as returning a JWT access token which ensures it was #successful
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if user and user.check_password(password):
        
        access_token = create_access_token(identity=str(user.id))
        session_manager = SessionManager()
        session_manager.add_session(user.id, access_token)
        return jsonify({
            "access_token": access_token,
            "user_id": user.id
        })
    return jsonify({"error": "Invalid email or password"}), 401


# -All user endpoints- #
@app.route('/user/info')
@jwt_required() #Shows basic user infor, such as the id, username and email
def get_user_info():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email
    })

@app.route('/user/profile', methods=['PUT'])
@jwt_required() # Various info can be updated, such as the email and username.
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    if 'email' in data: #Duplicate emails can't have multiple accounts
        if User.query.filter(User.email == data['email']).first():
            return jsonify({"error": "Email already in use"}), 400
        user.email = data['email']
    
    if 'username' in data:
        user.username = data['username']

    db.session.commit()
    return jsonify({"message": "Profile updated successfully"})

# -- Car Endpoints -#
@app.route("/cars", methods=["POST"])
@jwt_required() # Creates a new car listing then saves it to the database
def create_car():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    required_fields = ["make", "model", "year", "price_per_day", "location"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        builder = CarBuilder()
        car = (builder.set_make(data["make"])
                  .set_model(data["model"])
                  .set_year(int(data["year"]))
                  .set_price(float(data["price_per_day"]))
                  .set_location(data["location"])
                  .build())
        car.owner_id = current_user_id
        
        db.session.add(car)
        db.session.commit()
        return jsonify({"message": "Car listed successfully!"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route("/cars", methods=["GET"])#Shows all cars that are filtered by location, by default all listings are shown
def get_cars():
    location = request.args.get("location", "").strip()
    
    query = Car.query.filter(Car.available == True)
    
    if location:
        query = query.filter(Car.location.ilike(f"%{location}%"))
    
    cars = query.all()
    return jsonify([car.to_dict() for car in cars])


# - Booking Endpoints - #
@app.route("/bookings", methods=["POST"]) #Creates bookings for logged in users, allows to put in start/end dates
@jwt_required()
def create_booking():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    required_fields = ["car_id", "start_date", "end_date"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        end_date = datetime.strptime(data["end_date"], "%Y-%m-%d").date()
        if start_date >= end_date:
            return jsonify({"error": "Invalid date range"}), 400
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    car = Car.query.get(data["car_id"])
    if not car:
        return jsonify({"error": "Car not found"}), 404

    conflicting_bookings = Booking.query.filter(
        Booking.car_id == data["car_id"],
        Booking.start_date <= end_date,
        Booking.end_date >= start_date,
        Booking.status.in_(["pending", "confirmed"])
    ).count()
    
    if conflicting_bookings > 0:
        return jsonify({"error": "Car not available for selected dates"}), 409

    try:
        #Creates a new booking
        booking = Booking(
            car_id=data["car_id"],
            user_id=current_user_id,
            start_date=start_date,
            end_date=end_date
        )
        db.session.add(booking)
        db.session.flush()

        # Through the observer pattern the notification is made
        booking_observer.notify(booking, "created")
        db.session.commit()
        return jsonify({
            "message": "Booking created successfully!",
            "booking_id": booking.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500



@app.route("/mybookings", methods=["GET"]) #Returns all bookings for the user
@jwt_required()
def get_my_bookings():
    current_user_id = get_jwt_identity()

    user_bookings = Booking.query.filter_by(user_id=current_user_id).all()

    
    return jsonify([booking.to_dict() for booking in user_bookings])



# ---- Payment Endpoints --- #
class PaymentProxy: #Handles the payment logic, such as the balances and payment info into the database
    def __init__(self):
        self._real_payment_system = None

    def process_payment(self, sender_id, receiver_id, amount, booking_id):
        sender = User.query.get(sender_id)
        receiver = User.query.get(receiver_id)
        
        if not sender or not receiver:
            return False, "Invalid users"
        if sender.balance < amount:
            return False, "Insufficient funds"
        
        sender.balance -= amount
        receiver.balance += amount
        
        payment = Payment(
            sender_id=sender_id,
            receiver_id=receiver_id,
            amount=amount,
            booking_id=booking_id
        )
        db.session.add(payment)
        self._create_notifications(sender, receiver, booking_id, amount)
        return True, "Payment successful"
    
    def _create_notifications(self, sender, receiver, booking_id, amount):
        notifications = [
            Message(
                sender_id=sender.id,
                receiver_id=receiver.id,
                content=f"Payment of ${amount:.2f} for booking #{booking_id} received"
            ),
            Message(
                sender_id=receiver.id,
                receiver_id=sender.id,
                content=f"Payment of ${amount:.2f} for booking #{booking_id} sent"
            )
        ]
        db.session.add_all(notifications)

payment_proxy = PaymentProxy()

@app.route('/bookings/<int:booking_id>/pay', methods=['POST']) #Payments are processed for bookings
@jwt_required()
def make_payment(booking_id):
    current_user = get_jwt_identity()
    booking = Booking.query.get_or_404(booking_id)
    
    if booking.user_id != current_user:
        return jsonify({"error": "Unauthorized"}), 403
    
    days = (booking.end_date - booking.start_date).days
    amount = days * booking.car.price_per_day
    
    success, message = payment_proxy.process_payment(
        current_user,
        booking.car.owner_id,
        amount,
        booking_id
    )
    
    if not success:
        return jsonify({"error": message}), 400
    
    db.session.commit()
    return jsonify({
        "message": "Payment successful",
        "new_balance": User.query.get(current_user).balance
    })
    
    
# ----- messages -- #
    
@app.route("/messages", methods=["POST"]) # Sends messages from one account to another
@jwt_required()
def send_message():
    current_user_id = get_jwt_identity()
    data = request.get_json()

    required_fields = ["receiver_email", "content"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    receiver = User.query.filter_by(email=data["receiver_email"]).first()
    if not receiver:
        return jsonify({"error": "Receiver not found"}), 404

    if str(receiver.id) == str(current_user_id):
        return jsonify({"error": "Cannot send a message to yourself"}), 400

    message = Message(
        sender_id=current_user_id,
        receiver_id=receiver.id,
        content=data["content"][:256]#delete?
    )
    db.session.add(message)
    db.session.commit()

    return jsonify({
        "message": "Message sent successfully",
        "message_id": message.id
    }), 201




@app.route("/users/<int:user_id>/messages", methods=["GET"])
@jwt_required() # Returns messages where the user is the recipient of a message
def get_received_messages(user_id):
    if str(get_jwt_identity()) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403
    
    messages = Message.query.filter_by(receiver_id=user_id).join(
        User, Message.sender_id == User.id
    ).add_columns(User.email).all()

    return jsonify([{
        "id": m.Message.id,
        "sender_email": m.email,  # Include sender's email
        "content": m.Message.content,
        "timestamp": m.Message.timestamp.isoformat()
    } for m in messages])

@app.route("/users/<int:user_id>/sent_messages", methods=["GET"])
@jwt_required() # Messages are returned to the sender
def get_sent_messages(user_id):
    if str(get_jwt_identity()) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    # Filter messages where the user is the sender
    messages = Message.query.filter_by(sender_id=user_id).all()
    return jsonify([{
        "id": m.id,
        "receiver_id": m.receiver_id,
        "content": m.content,
        "timestamp": m.timestamp.isoformat()
    } for m in messages])

    

# etc #
@app.route("/")
def index():
    return render_template('index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == "__main__":
    app.run(debug=True)
