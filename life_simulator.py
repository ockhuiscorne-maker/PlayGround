"""Life Simulator - a small text-based life sim.

Fixes over the original draft:
  * University is actually reachable (tuition lowered to $800 so the
    starting $1,000 can cover it, leaving you nearly broke).
  * Health/happiness are clamped after every change, and death is checked
    after the debt penalty, so stats can't linger below 0 for a year.
  * Career income rebalanced: Retail is steady, Content Creator is a
    high-variance gamble, Software Engineer is the late-game payoff.
  * Mild aging decay adds some tension to long runs.
  * EOF / Ctrl-C no longer crash the game.
"""

import random


class LifeSimulator:
    UNIVERSITY_COST = 800
    MAX_AGE = 80

    def __init__(self):
        self.age = 18
        self.health = 100
        self.happiness = 100
        self.money = 1000
        self.career = "Unemployed"
        self.is_alive = True

    def display_status(self):
        print("\n" + "=" * 30)
        print(f" Age: {self.age} | Career: {self.career}")
        print(f" Money: ${self.money}")
        print(f" Health: {self.health}% | Happiness: {self.happiness}%")
        print("=" * 30)

    @staticmethod
    def ask(prompt, default=None):
        """input() that survives EOF and Ctrl-C."""
        try:
            return input(prompt)
        except (EOFError, KeyboardInterrupt):
            print()
            return default

    def clamp_stats(self):
        self.health = max(0, min(100, self.health))
        self.happiness = max(0, min(100, self.happiness))

    def choose_career(self):
        print("\nChoose your path:")
        print(f"1. Go to University (Cost: ${self.UNIVERSITY_COST}, Leads to better jobs)")
        print("2. Get an Entry-Level Job (Fast food / Retail)")
        print("3. Try to be a Freelance Creator / Streamer")

        choice = self.ask("Enter your choice (1-3): ", default="")

        if choice == '1':
            if self.money >= self.UNIVERSITY_COST:
                self.money -= self.UNIVERSITY_COST
                self.career = "College Student"
                print("You enrolled in university! It's tough, but your future looks bright.")
            else:
                print("You don't have enough money for college! You took a retail job instead.")
                self.career = "Retail Worker"
        elif choice == '2':
            self.career = "Retail Worker"
            print("You started working in retail. Steady, but pays the bills.")
        elif choice == '3':
            self.career = "Content Creator"
            print("You bought a webcam and started streaming. Fingers crossed!")
        else:
            self.career = "Unemployed"
            print("You decided to take a gap year and figure things out.")

    def random_event(self):
        events = [
            ("Found $50 on the street!", {"money": 50, "happiness": 5}),
            ("Got the flu. You had to pay for medicine.", {"health": -15, "money": -100, "happiness": -10}),
            ("Hung out with close friends and had an amazing time!", {"happiness": 15}),
            ("Your phone screen cracked and you had to fix it.", {"money": -150, "happiness": -10}),
            ("Won a small local gaming tournament!", {"money": 200, "happiness": 20}),
        ]

        event, effects = random.choices(events, weights=[2, 1, 3, 2, 2])[0]
        print(f"\n[Life Event] {event}")

        for key, value in effects.items():
            if key == "money":
                self.money += value
            elif key == "health":
                self.health += value
            elif key == "happiness":
                self.happiness += value

        self.clamp_stats()

    def update_yearly_finances(self):
        # Earn money based on career
        if self.career == "College Student":
            self.money += 1500
        elif self.career == "Retail Worker":
            self.money += 24000
        elif self.career == "Content Creator":
            # High variance: most years are quiet, the occasional viral year pays out.
            earnings = random.choices([2000, 15000, 80000], weights=[4, 5, 1])[0]
            self.money += earnings
            print(f"Your channel earned ${earnings} this year!")
        elif self.career == "Software Engineer":
            self.money += 75000

        # Graduate college after a few years
        if self.career == "College Student" and self.age >= 22:
            print("\n🎉 Congratulations! You graduated college!")
            self.career = "Software Engineer"

    def apply_aging(self):
        if self.age >= 70:
            self.health -= 3
        elif self.age >= 55:
            self.health -= 2
        elif self.age >= 35:
            self.health -= 1

        if self.age >= 40:
            self.happiness -= 1

        # A comfortable life takes the edge off, and money buys healthcare.
        if self.money > 10000:
            self.happiness += 2
            self.health += 2
        elif self.money > 3000:
            self.health += 1

        self.clamp_stats()

    def check_health(self):
        if self.health <= 0 or self.happiness <= 0:
            print("\n💀 Game Over: Your body or mind gave out. Take care of yourself!")
            self.is_alive = False

    def play(self):
        print("Welcome to Life Simulator!")
        name = self.ask("What is your character's name? ", default="Alex")
        print(f"Welcome to the world, {name}!")

        self.choose_career()

        while self.is_alive and self.age < self.MAX_AGE:
            self.display_status()

            if self.ask("\nPress [Enter] to live through the next year...") is None:
                print("\nInput closed - ending the simulation.")
                break

            self.age += 1
            self.update_yearly_finances()
            self.random_event()
            self.apply_aging()

            if self.money < 0:
                print("⚠️ You are in debt! Your happiness takes a hit.")
                self.happiness -= 10
                self.clamp_stats()

            # Reaching 80 is a full life, so don't declare game over that year.
            if self.age < self.MAX_AGE:
                self.check_health()

        if self.age >= self.MAX_AGE:
            print(f"\n🏆 You lived a long and full life until age 80. Thanks for playing, {name}!")
        elif not self.is_alive:
            print(f"\nYour story ended at age {self.age}. Thanks for playing, {name}!")


if __name__ == "__main__":
    game = LifeSimulator()
    game.play()
