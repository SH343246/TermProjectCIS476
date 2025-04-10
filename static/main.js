// main.js sets up the front end ui components
import mediator from './ui_mediator.js';
import {
  NavigationComponent,
  AuthComponent,
  CarSearchComponent,
  BookingComponent,
  NotificationComponent,
  PaymentComponent,
  CarListingComponent,
  MyBookingsComponent,
  MessagingComponent,
  InboxComponent,
  ProfileDisplayComponent
} from './ui_components.js';

document.addEventListener('DOMContentLoaded', () => { // instantiate all components
  const navigationComponent = new NavigationComponent();
  const authComponent = new AuthComponent();
  const carSearchComponent = new CarSearchComponent();
  const bookingComponent = new BookingComponent();
  const notificationComponent = new NotificationComponent();
  const paymentComponent = new PaymentComponent();
  const carListingComponent = new CarListingComponent();
  const myBookingComponent = new MyBookingsComponent();
  const messagingComponent = new MessagingComponent();
  const inboxComponent = new InboxComponent();
  const profileDisplayComponent = new ProfileDisplayComponent();

  const token = localStorage.getItem('token'); // If someone recently or is already logged in, load it in
  if (token) {
    loadUserInfo(token);
  }
  console.log('DriveShare UI initialized.');
});

async function loadUserInfo(token) {
  try {
    const response = await fetch('/user/info', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      const userInfo = await response.json();
      mediator.notify('userInfoLoaded', userInfo);
    } else {
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.error('Failed to load user info:', error);
  }
}
