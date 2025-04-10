# observer_bookingnotifications.py maintains a list of callbacks, and notifies them on booking events
from models import Message, db

class BookingObserver:
    def __init__(self):
        self.subscribers = []

    def subscribe(self, callback):
        self.subscribers.append(callback)

    def notify(self, booking, message_type):
        for callback in self.subscribers:
            callback(booking, message_type)

booking_observer = BookingObserver()

def handle_booking_notification(booking, message_type): # Observer function that creates notifications by calling booking_observer.notify
    if message_type == "created":
        content = f"New booking request for {booking.car.make}"
    elif message_type == "confirmed":
        content = f"Booking confirmed for {booking.car.make}"
    else:
        content = "Booking update"
    
   
    notification = Message(
        sender_id=booking.user_id,
        receiver_id=booking.car.owner_id,
        content=content
    )
    db.session.add(notification)

booking_observer.subscribe(handle_booking_notification)
