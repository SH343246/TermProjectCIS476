from models import Car 
""" Simple builder that creates cars in a step by step way, like making the model, then year, then price, etc."""
class CarBuilder:
    def __init__(self):
        self.car = Car()
    
    def set_make(self, make):
        self.car.make = make
        return self
    
    def set_model(self, model):
        self.car.model = model
        return self
    
    def set_year(self, year):
        self.car.year = year
        return self
    
    def set_price(self, price):
        self.car.price_per_day = price
        return self
    
    def set_location(self, location):
        self.car.location = location
        return self
    
    def build(self):
        return self.car
