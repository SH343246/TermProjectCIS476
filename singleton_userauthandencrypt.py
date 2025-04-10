class SessionManager:
    _instance = None
    # Singleton class that stores user sessions
    def __new__(cls): # Ensures only one instance is created.
        if not cls._instance:
            cls._instance = super().__new__(cls)
            cls.active_sessions = {}
        return cls._instance

    def add_session(self, user_id, jwt_token):
        self.active_sessions[user_id] = jwt_token

    def validate_session(self, user_id, token):
        return self.active_sessions.get(user_id) == token
