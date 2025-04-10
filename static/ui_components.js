// ui_components.js contains the front ui logic
import mediator from './ui_mediator.js';

class NavigationComponent { // deals with navigation tabs
  constructor() {
    mediator.registerComponent('navigation', this);
    this.setupTabListeners();
  }

  setupTabListeners() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = e.target.dataset.tab;
        mediator.notify('tabChanged', tabName);
        this.setActiveTab(tabName);
      });
    });
  }

  setActiveTab(tabName) {
    // Hide all content sections.
    document.querySelectorAll('.content-section').forEach(section => {
      section.style.display = 'none';
    });
    // Show the selected section.
    const activeSection = document.getElementById(`${tabName}-section`);
    if (activeSection) {
      activeSection.style.display = 'block';
    }
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
  }
}

class AuthComponent { // login, registration, logout actions are implemented here
  constructor() {
    this.loginModal = document.getElementById('login-modal');
    this.registerModal = document.getElementById('register-modal');
    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');
    this.loginLink = document.getElementById('login-link');
    this.registerLink = document.getElementById('register-link');
    this.profileTab = document.querySelector('[data-tab="profile"]');

    mediator.registerComponent('auth', this);
    this.initializeAuthState();
    this.setupEventListeners();
  }

  initializeAuthState() {
    this.token = localStorage.getItem('token');
    this.updateUIState(!!this.token);
  }

  setupEventListeners() {
    //Login form submission
    this.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin({
        email: this.loginForm.querySelector('#login-email').value,
        password: this.loginForm.querySelector('#login-password').value
      });
    });

    // Registration form submission
    this.registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegistration({
        username: this.registerForm.querySelector('#register-username').value,
        email: this.registerForm.querySelector('#register-email').value,
        password: this.registerForm.querySelector('#register-password').value,
        security_question_1: this.registerForm.querySelector('#security-question-1').value,
        security_answer_1: this.registerForm.querySelector('#security-answer-1').value,
        security_question_2: this.registerForm.querySelector('#security-question-2').value,
        security_answer_2: this.registerForm.querySelector('#security-answer-2').value,
        security_question_3: this.registerForm.querySelector('#security-question-3').value,
        security_answer_3: this.registerForm.querySelector('#security-answer-3').value
      });
    });

    this.loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showModal('login');
    });

    this.registerLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showModal('register');
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    } else {
      console.warn("Logout button with id 'logout-btn' not found.");
    }

    document.querySelectorAll('.modal .close').forEach(closeBtn => {
      closeBtn.addEventListener('click', () => this.closeModals());
    });

    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModals();
      }
    });
  }

  async handleLogin(credentials) {
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      if (response.ok) {
        const { access_token, user_id } = await response.json();
        this.token = access_token;
        localStorage.setItem('token', access_token);
        this.updateUIState(true);
        this.closeModals();
        mediator.notify('userLoggedIn', { userId: user_id });
        mediator.notify('notification', 'success', 'Login successful!');
      } else {
        const error = await response.json();
        mediator.notify('notification', 'error', error.error || 'Login failed');
      }
    } catch (error) {
      mediator.notify('notification', 'error', 'Network error. Please try again.');
    }
  }

  async handleRegistration(userData) {
    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (response.ok) {
        mediator.notify('notification', 'success', 'Registration successful! Please login.');
        this.showModal('login');
        this.registerForm.reset();
      } else {
        const error = await response.json();
        mediator.notify('notification', 'error', error.error || 'Registration failed');
      }
    } catch (error) {
      mediator.notify('notification', 'error', 'Network error. Please try again.');
    }
  }

  updateUIState(isLoggedIn) {
    if (isLoggedIn) {
      this.loginLink.parentElement.style.display = 'none';
      this.registerLink.parentElement.style.display = 'none';
      this.profileTab.parentElement.style.display = 'list-item';
    } else {
      this.loginLink.parentElement.style.display = 'list-item';
      this.registerLink.parentElement.style.display = 'list-item';
      this.profileTab.parentElement.style.display = 'none';
    }
  }

  showModal(type) {
    this.closeModals();
    if (type === 'login') {
      this.loginModal.style.display = 'block';
    } else if (type === 'register') {
      this.registerModal.style.display = 'block';
    }
  }

  closeModals() {
    this.loginModal.style.display = 'none';
    this.registerModal.style.display = 'none';
  }

  logout() {
    localStorage.removeItem('token');
    this.token = null;
    this.updateUIState(false);
    mediator.notify('userLoggedOut');
    mediator.notify('notification', 'success', 'Logged out successfully');
  }
}

// All these components, carsearchcomponent, booking component, mybookingscomponent, etc. all have a similar structure, in that they have constructors, listeners and use the mediator pattern


class CarSearchComponent {
  constructor() {
    this.searchForm = document.getElementById('car-search-form');
    mediator.registerComponent('carSearch', this);
    this.setupEventListeners();

    mediator.on('carListingCreated', () => this.fetchCars());
  }

  setupEventListeners() {
    this.searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      //fetch cars.
      const formData = new FormData(this.searchForm);
      const searchData = {
        location: formData.get('location'),
        startDate: formData.get('start_date'),
        endDate: formData.get('end_date')
      };
      mediator.notify('carSearchSubmitted', searchData);
      // Fetch cars using the current search criteria.
      await this.fetchCars();
    });
  }

  async fetchCars() {
    const locationInput = document.getElementById('location');
    let query = "";
    if (locationInput && locationInput.value) {
      query = `?location=${encodeURIComponent(locationInput.value)}`;
    }
    try {
      const response = await fetch(`/cars${query}`);
      if (response.ok) {
        const cars = await response.json();
        console.log("Fetched cars:", cars);
        this.displayResults(cars);
      } else {
        console.error("Failed to fetch cars", response.status);
      }
    } catch (error) {
      console.error("Error fetching cars", error);
    }
  }

  displayResults(cars) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    cars.forEach(car => {
      const carElement = document.createElement('div');
      carElement.className = 'car-item';
      carElement.innerHTML = `
        <h3>${car.make} ${car.model} (${car.year})</h3>
        <p>$${car.price_per_day} per day</p>
        <p>Location: ${car.location}</p>
        <button class="book-now-btn" data-car-id="${car.id}">Book Now</button>
      `;
      resultsContainer.appendChild(carElement);
    });
    document.querySelectorAll('.book-now-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const carId = e.target.getAttribute('data-car-id');
        mediator.notify('bookingRequested', { carId });
      });
    });
  }
}

class BookingComponent {
  constructor() {
    this.bookingForm = document.getElementById('booking-form');
    this.bookingModal = document.getElementById('booking-modal');
    mediator.registerComponent('booking', this);
    this.setupEventListeners();
    mediator.on('bookingRequested', (data) => this.showBookingForm(data.carId));
  }

  setupEventListeners() {
    this.bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(this.bookingForm);
      const bookingData = {
        car_id: formData.get('car_id'),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date')
      };
      this.createBooking(bookingData);
    });
  }

  async createBooking(bookingData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
      });
      const result = await response.json();
      if (response.ok) {
        mediator.notify('bookingCreated', result);
        this.closeBookingForm();
      } else {
        mediator.notify('bookingError', result.error);
      }
    } catch (error) {
      mediator.notify('bookingError', 'Network error. Please try again.');
    }
  }

  showBookingForm(carId) {
    this.bookingModal.style.display = 'block';
    document.getElementById('car_id').value = carId;
  }

  closeBookingForm() {
    this.bookingModal.style.display = 'none';
  }
}



class MyBookingsComponent {
  constructor() {
    //where bookings will be shown
    this.bookingsList = document.getElementById('bookings-list');

    mediator.registerComponent('myBookings', this);

    mediator.on('tabChanged', (tabName) => {
      if (tabName === 'bookings') {
        this.fetchMyBookings();
      }
    });
  }

  async fetchMyBookings() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/mybookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const bookings = await response.json();
        console.log("Fetched my bookings:", bookings);
        this.displayBookings(bookings);
      } else {
        console.error("Failed to fetch my bookings:", response.status);
      }
    } catch (error) {
      console.error("Error fetching my bookings:", error);
    }
  }

  displayBookings(bookings) {
    this.bookingsList.innerHTML = '';
    if (!bookings.length) {
      this.bookingsList.innerHTML = '<p>You have no bookings yet.</p>';
      return;
    }
    bookings.forEach(booking => {
      const bookingEl = document.createElement('div');
      bookingEl.classList.add('booking-card');
      bookingEl.innerHTML = `
        <h3>Booking #${booking.id}</h3>
        <p>Car ID: ${booking.car_id}</p>
        <p>Start: ${booking.start_date}</p>
        <p>End: ${booking.end_date}</p>
      `;
      this.bookingsList.appendChild(bookingEl);
    });
  }
}



class NotificationComponent {
  constructor() {
    this.notificationContainer = document.getElementById('notification-area');
    mediator.registerComponent('notification', this);
    this.setupEventListeners();
  }

  setupEventListeners() {
    mediator.on('bookingCreated', (data) => {
      this.showNotification('success', `Booking created successfully! Booking ID: ${data.booking_id}`);
    });
    mediator.on('bookingError', (error) => {
      this.showNotification('error', `Booking error: ${error}`);
    });
    mediator.on('paymentCompleted', (data) => {
      this.showNotification('success', 'Payment completed successfully!');
    });
  }

  showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    this.notificationContainer.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

class PaymentComponent {
  constructor() {
    mediator.registerComponent('payment', this);
    mediator.on('paymentRequested', (data) => this.processPayment(data.bookingId));
  }

  async processPayment(bookingId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (response.ok) {
        mediator.notify('paymentCompleted', result);
      } else {
        mediator.notify('paymentError', result.error);
      }
    } catch (error) {
      mediator.notify('paymentError', 'Network error during payment.');
    }
  }
}

class CarListingComponent {
  constructor() {
    this.listingModal = document.getElementById('car-listing-modal');
    this.listingForm = document.getElementById('car-listing-form');
    this.addCarBtn = document.getElementById('add-car-btn');

    console.log("CarListingComponent initialized", {
      listingModal: this.listingModal,
      listingForm: this.listingForm,
      addCarBtn: this.addCarBtn
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.addCarBtn) {
      console.error("addCarBtn not found. Check that your button with id 'add-car-btn' exists in the DOM.");
      return;
    }

    this.addCarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("List New Car button clicked");
      this.showModal();
    });

    if (this.listingModal) {
      this.listingModal.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
          console.log("Close button in Car Listing modal clicked");
          this.closeModal();
        });
      });
    } else {
      console.error("listingModal not found. Check that your element with id 'car-listing-modal' exists.");
    }

    if (!this.listingForm) {
      console.error("listingForm not found. Check that your form with id 'car-listing-form' exists.");
      return;
    }
    
    this.listingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log("Car listing form submitted");

      const formData = new FormData(this.listingForm);
      const carData = {
        make: formData.get('make'),
        model: formData.get('model'),
        year: parseInt(formData.get('year')),
        price_per_day: parseFloat(formData.get('price_per_day')),
        location: formData.get('location')
      };
      console.log("Car data to send:", carData);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/cars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(carData)
        });
        const result = await response.json();
        if (response.ok) {
          console.log("Car listed successfully:", result);
          mediator.notify('notification', 'success', result.message || 'Car listed successfully!');
          this.closeModal();
          this.listingForm.reset();
          mediator.notify('carListingCreated');
        } else {
          console.error("Failed to list car:", result);
          mediator.notify('notification', 'error', result.error || 'Failed to list car.');
        }
      } catch (error) {
        console.error("Network error while listing car:", error);
        mediator.notify('notification', 'error', 'Network error while listing car.');
      }
    });
  }

  showModal() {
    if (this.listingModal) {
      console.log("Opening car listing modal");
      this.listingModal.style.display = 'block';
    } else {
      console.error("Cannot open modal: listingModal not found");
    }
  }

  closeModal() {
    if (this.listingModal) {
      console.log("Closing car listing modal");
      this.listingModal.style.display = 'none';
    }
  }
}

class MessagingComponent {
  constructor() {
    this.sendMessageForm = document.getElementById('send-message-form');
    mediator.registerComponent('messaging', this);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.sendMessageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSendMessage();
    });
  }

  async handleSendMessage() {
    const token = localStorage.getItem('token');
    const receiverEmailValue = document.getElementById('receiver_email').value;
    const contentValue = document.getElementById('message-content').value;

    const messageData = {
      receiver_email: receiverEmailValue,
      content: contentValue
    };

    try {
      const response = await fetch('/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messageData)
      });
      const result = await response.json();
      if (response.ok) {
        mediator.notify('notification', 'success', result.message);
        console.log("Message sent successfully:", result);
        this.sendMessageForm.reset();
      } else {
        mediator.notify('notification', 'error', result.error || 'Message send failed');
        console.error("Failed to send message:", result);
      }
    } catch (error) {
      mediator.notify('notification', 'error', 'Network error while sending message.');
      console.error("Network error while sending message:", error);
    }
  }
}


class InboxComponent {
    constructor() {
        this.inboxList = document.getElementById('inbox-messages');
        mediator.registerComponent('inbox', this);
        
        this.currentUserId = null;
        
        mediator.on('userInfoLoaded', (userInfo) => {
            this.currentUserId = userInfo.id;
        });
        
        mediator.on('tabChanged', (tabName) => {
            if (tabName === 'messages') {
                this.fetchInboxMessages();
            }
        });
    }
    
    async fetchInboxMessages() {
        if (!this.currentUserId) {
            console.warn("No current user ID; can't fetch messages yet.");
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/users/${this.currentUserId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
            });
            if (response.ok) {
                const messages = await response.json();
                console.log("Fetched my inbound messages:", messages);
                this.displayMessages(messages);
            } else {
                console.error("Failed to fetch messages:", response.status);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    }
    
    displayMessages(messages) {
        this.inboxList.innerHTML = '';
        if (!messages.length) {
            this.inboxList.innerHTML = '<p>No inbound messages yet.</p>';
            return;
        }
        
        messages.forEach(msg => {
            const msgEl = document.createElement('div');
            msgEl.classList.add('message');
            msgEl.innerHTML = `
                <h4>From: ${msg.sender_email}</h4>  <!-- Changed from sender_id to sender_email -->
                <p>${msg.content}</p>
                <small>${new Date(msg.timestamp).toLocaleString()}</small>
            `;
            this.inboxList.appendChild(msgEl);
        });
    }
}

class ProfileDisplayComponent {
  constructor() {
    this.profileUsernameEl = document.getElementById('profile-username');
    this.profileEmailEl = document.getElementById('profile-email');

    mediator.registerComponent('profileDisplay', this);

    mediator.on('userInfoLoaded', (userInfo) => {
      if (this.profileUsernameEl && this.profileEmailEl) {
        this.profileUsernameEl.textContent = userInfo.username;
        this.profileEmailEl.textContent = userInfo.email;
      }
    });
  }
}



export {
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
};
