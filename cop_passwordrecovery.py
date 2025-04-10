"""A handler using the cop design pattern. Security questions are checked , and if the handler moves on to the next one if the first one is correct, and so on."""
class SecurityQuestionHandler:
    def __init__(self, question_number, next_handler=None):
        self.question_number = question_number
        self.next = next_handler

    def handle_request(self, user, provided_answer):
        correct_answer = getattr(user, f'security_answer_{self.question_number}')
        if provided_answer.lower() != correct_answer.lower():
            return False, f"Security question {self.question_number} incorrect"
        if self.next:
            return self.next.handle_request(user, provided_answer)
        return True, "All security questions passed"

class PasswordRecoveryChain: # Chain that checks the stored answers
    def __init__(self):
        self.chain = SecurityQuestionHandler(1, 
            SecurityQuestionHandler(2,
                SecurityQuestionHandler(3)))

    def validate_answers(self, user, answers):
        return self.chain.handle_request(user, answers)
